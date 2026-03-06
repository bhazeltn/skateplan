import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel

from app.api.deps import get_session, get_current_user
from app.models.user_models import Profile, SkaterCoachLink
from app.models.team_models import Team
from app.models.benchmark_models import (
    MetricDefinition,
    BenchmarkProfile,
    ProfileMetric,
    MetricDataType
)
from app.models.gap_analysis_models import GapAnalysis, GapAnalysisEntry

router = APIRouter()

# ==================== Pydantic Schemas ====================

class GapEntryCreate(BaseModel):
    metric_id: str
    current_value: str
    target_value: str
    notes: Optional[str] = None

class GapEntryUpdate(BaseModel):
    current_value: Optional[str] = None
    target_value: Optional[str] = None
    notes: Optional[str] = None

class GapEntryFromProfile(BaseModel):
    profile_id: str

class GapEntryRead(BaseModel):
    id: str
    metric_id: str
    metric_name: str
    metric_category: str
    metric_data_type: str
    metric_unit: Optional[str]
    current_value: str
    target_value: str
    gap_value: str
    gap_percentage: float
    status: str  # on_target, close, needs_work
    notes: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

class GapAnalysisRead(BaseModel):
    id: str
    skater_id: Optional[str]
    team_id: Optional[str]
    last_updated: datetime
    created_at: datetime
    entries: List[GapEntryRead] = []

# ==================== Helper Functions ====================

def calculate_gap(current: str, target: str, data_type: MetricDataType) -> tuple[str, float]:
    """
    Calculate gap value and gap percentage.

    Returns: (gap_value, gap_percentage)
    """
    try:
        current_val = float(current)
        target_val = float(target)

        if target_val == 0:
            return "0", 0.0

        gap_val = target_val - current_val
        gap_pct = (gap_val / target_val) * 100

        return str(gap_val), round(gap_pct, 1)
    except (ValueError, TypeError):
        return "0", 0.0


def determine_status(gap_percentage: float) -> str:
    """
    Determine status based on gap percentage.

    - on_target: <5% gap
    - close: 5-15% gap
    - needs_work: >15% gap
    """
    if gap_percentage < 5:
        return "on_target"
    elif gap_percentage < 15:
        return "close"
    else:
        return "needs_work"


def _entry_to_read(entry: GapAnalysisEntry, metric: MetricDefinition) -> GapEntryRead:
    """Convert GapAnalysisEntry to read schema with calculations."""
    gap_value, gap_percentage = calculate_gap(
        entry.current_value,
        entry.target_value,
        metric.data_type
    )
    status = determine_status(gap_percentage)

    return GapEntryRead(
        id=str(entry.id),
        metric_id=str(entry.metric_id),
        metric_name=metric.name,
        metric_category=metric.category.value,
        metric_data_type=metric.data_type.value,
        metric_unit=metric.unit,
        current_value=entry.current_value,
        target_value=entry.target_value,
        gap_value=gap_value,
        gap_percentage=gap_percentage,
        status=status,
        notes=entry.notes,
        is_active=entry.is_active,
        created_at=entry.created_at,
        updated_at=entry.updated_at
    )


def _get_or_create_gap_analysis(
    skater_id: Optional[uuid.UUID],
    team_id: Optional[uuid.UUID],
    session: Session
) -> GapAnalysis:
    """Get existing gap analysis or create new one (singleton pattern)."""
    if skater_id:
        stmt = select(GapAnalysis).where(GapAnalysis.skater_id == skater_id)
    elif team_id:
        stmt = select(GapAnalysis).where(GapAnalysis.team_id == team_id)
    else:
        raise ValueError("Must provide either skater_id or team_id")

    gap_analysis = session.exec(stmt).first()

    if not gap_analysis:
        gap_analysis = GapAnalysis(
            skater_id=skater_id,
            team_id=team_id
        )
        session.add(gap_analysis)
        session.commit()
        session.refresh(gap_analysis)

    return gap_analysis


def _verify_skater_access(skater_id: uuid.UUID, coach_id: uuid.UUID, session: Session) -> Profile:
    """Verify skater exists and coach has access."""
    stmt = select(Profile).where(Profile.id == skater_id)
    skater = session.exec(stmt).first()
    if not skater:
        raise HTTPException(status_code=404, detail="Skater not found")

    # Check if current user (coach) has permission to access this skater
    link = session.exec(
        select(SkaterCoachLink).where(
            SkaterCoachLink.skater_id == skater_id,
            SkaterCoachLink.coach_id == coach_id,
            SkaterCoachLink.status == "active"
        )
    ).first()

    if not link:
        raise HTTPException(
            status_code=404,
            detail="Skater not found or no permission"
        )

    return skater


def _verify_team_access(team_id: uuid.UUID, coach_id: uuid.UUID, session: Session) -> Team:
    """Verify team exists and coach has access."""
    stmt = select(Team).where(Team.id == team_id, Team.coach_id == coach_id)
    team = session.exec(stmt).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


# ==================== Endpoints ====================

@router.get("/skaters/{skater_id}/gap-analysis", response_model=GapAnalysisRead)
def get_skater_gap_analysis(
    *,
    session: Session = Depends(get_session),
    skater_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
    include_inactive: bool = False
) -> GapAnalysisRead:
    """
    Get gap analysis for skater (creates if doesn't exist).

    Returns singleton gap analysis with all entries.
    """
    # Verify access
    _verify_skater_access(skater_id, current_user.id, session)

    # Get or create gap analysis
    gap_analysis = _get_or_create_gap_analysis(skater_id, None, session)

    # Load entries
    stmt = select(GapAnalysisEntry).where(
        GapAnalysisEntry.gap_analysis_id == gap_analysis.id
    )

    if not include_inactive:
        stmt = stmt.where(GapAnalysisEntry.is_active == True)

    stmt = stmt.order_by(GapAnalysisEntry.created_at)
    entries = session.exec(stmt).all()

    # Load metrics and convert to read schema
    entry_reads = []
    for entry in entries:
        metric_stmt = select(MetricDefinition).where(
            MetricDefinition.id == entry.metric_id
        )
        metric = session.exec(metric_stmt).first()
        if metric:
            entry_reads.append(_entry_to_read(entry, metric))

    return GapAnalysisRead(
        id=str(gap_analysis.id),
        skater_id=str(gap_analysis.skater_id) if gap_analysis.skater_id else None,
        team_id=str(gap_analysis.team_id) if gap_analysis.team_id else None,
        last_updated=gap_analysis.last_updated,
        created_at=gap_analysis.created_at,
        entries=entry_reads
    )


@router.get("/teams/{team_id}/gap-analysis", response_model=GapAnalysisRead)
def get_team_gap_analysis(
    *,
    session: Session = Depends(get_session),
    team_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
    include_inactive: bool = False
) -> GapAnalysisRead:
    """
    Get gap analysis for team (creates if doesn't exist).

    Returns singleton gap analysis with all entries.
    """
    # Verify access
    _verify_team_access(team_id, current_user.id, session)

    # Get or create gap analysis
    gap_analysis = _get_or_create_gap_analysis(None, team_id, session)

    # Load entries
    stmt = select(GapAnalysisEntry).where(
        GapAnalysisEntry.gap_analysis_id == gap_analysis.id
    )

    if not include_inactive:
        stmt = stmt.where(GapAnalysisEntry.is_active == True)

    stmt = stmt.order_by(GapAnalysisEntry.created_at)
    entries = session.exec(stmt).all()

    # Load metrics and convert to read schema
    entry_reads = []
    for entry in entries:
        metric_stmt = select(MetricDefinition).where(
            MetricDefinition.id == entry.metric_id
        )
        metric = session.exec(metric_stmt).first()
        if metric:
            entry_reads.append(_entry_to_read(entry, metric))

    return GapAnalysisRead(
        id=str(gap_analysis.id),
        skater_id=str(gap_analysis.skater_id) if gap_analysis.skater_id else None,
        team_id=str(gap_analysis.team_id) if gap_analysis.team_id else None,
        last_updated=gap_analysis.last_updated,
        created_at=gap_analysis.created_at,
        entries=entry_reads
    )


@router.post("/skaters/{skater_id}/gap-analysis/entries", response_model=GapEntryRead, status_code=status.HTTP_201_CREATED)
def add_gap_entry(
    *,
    session: Session = Depends(get_session),
    skater_id: uuid.UUID,
    entry_in: GapEntryCreate,
    current_user: Profile = Depends(get_current_user)
) -> GapEntryRead:
    """Add a single gap analysis entry."""
    # Verify access
    _verify_skater_access(skater_id, current_user.id, session)

    # Get or create gap analysis
    gap_analysis = _get_or_create_gap_analysis(skater_id, None, session)

    # Verify metric exists and is owned by coach
    metric_id = uuid.UUID(entry_in.metric_id)
    metric_stmt = select(MetricDefinition).where(
        MetricDefinition.id == metric_id,
        MetricDefinition.coach_id == current_user.id
    )
    metric = session.exec(metric_stmt).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")

    # Check for duplicate
    dup_stmt = select(GapAnalysisEntry).where(
        GapAnalysisEntry.gap_analysis_id == gap_analysis.id,
        GapAnalysisEntry.metric_id == metric_id,
        GapAnalysisEntry.is_active == True
    )
    existing = session.exec(dup_stmt).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This metric already exists in the gap analysis"
        )

    # Validate SCALE type metrics are within range
    if metric.data_type == MetricDataType.SCALE:
        try:
            current_val = float(entry_in.current_value)
            target_val = float(entry_in.target_value)
            if metric.scale_min is not None and current_val < metric.scale_min:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Current value must be at least {metric.scale_min}"
                )
            if metric.scale_max is not None and current_val > metric.scale_max:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Current value must be at most {metric.scale_max}"
                )
            if metric.scale_min is not None and target_val < metric.scale_min:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Target value must be at least {metric.scale_min}"
                )
            if metric.scale_max is not None and target_val > metric.scale_max:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Target value must be at most {metric.scale_max}"
                )
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Values must be valid numbers for SCALE metrics"
            )

    # Create entry
    entry = GapAnalysisEntry(
        gap_analysis_id=gap_analysis.id,
        metric_id=metric_id,
        current_value=entry_in.current_value,
        target_value=entry_in.target_value,
        notes=entry_in.notes
    )
    session.add(entry)

    # Update gap analysis timestamp
    gap_analysis.last_updated = datetime.utcnow()
    session.add(gap_analysis)

    session.commit()
    session.refresh(entry)

    return _entry_to_read(entry, metric)


@router.post("/skaters/{skater_id}/gap-analysis/from-profile", response_model=GapAnalysisRead, status_code=status.HTTP_201_CREATED)
def add_entries_from_profile(
    *,
    session: Session = Depends(get_session),
    skater_id: uuid.UUID,
    profile_in: GapEntryFromProfile,
    current_user: Profile = Depends(get_current_user)
) -> GapAnalysisRead:
    """Add multiple entries from a benchmark profile."""
    # Verify access
    _verify_skater_access(skater_id, current_user.id, session)

    # Get or create gap analysis
    gap_analysis = _get_or_create_gap_analysis(skater_id, None, session)

    # Get profile
    profile_id = uuid.UUID(profile_in.profile_id)
    profile_stmt = select(BenchmarkProfile).where(
        BenchmarkProfile.id == profile_id,
        BenchmarkProfile.coach_id == current_user.id
    )
    profile = session.exec(profile_stmt).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Get profile metrics
    pm_stmt = select(ProfileMetric).where(
        ProfileMetric.profile_id == profile_id
    )
    profile_metrics = session.exec(pm_stmt).all()

    # Create entries for each metric
    for pm in profile_metrics:
        # Check if already exists
        dup_stmt = select(GapAnalysisEntry).where(
            GapAnalysisEntry.gap_analysis_id == gap_analysis.id,
            GapAnalysisEntry.metric_id == pm.metric_id,
            GapAnalysisEntry.is_active == True
        )
        existing = session.exec(dup_stmt).first()
        if not existing:
            entry = GapAnalysisEntry(
                gap_analysis_id=gap_analysis.id,
                metric_id=pm.metric_id,
                current_value="0",  # Default current value
                target_value=pm.target_value
            )
            session.add(entry)

    # Update gap analysis timestamp
    gap_analysis.last_updated = datetime.utcnow()
    session.add(gap_analysis)

    session.commit()

    # Return full gap analysis
    return get_skater_gap_analysis(
        session=session,
        skater_id=skater_id,
        current_user=current_user,
        include_inactive=False
    )


@router.patch("/gap-analysis/entries/{entry_id}", response_model=GapEntryRead)
def update_gap_entry(
    *,
    session: Session = Depends(get_session),
    entry_id: uuid.UUID,
    entry_in: GapEntryUpdate,
    current_user: Profile = Depends(get_current_user)
) -> GapEntryRead:
    """Update a gap analysis entry."""
    # Get entry
    stmt = select(GapAnalysisEntry).where(GapAnalysisEntry.id == entry_id)
    entry = session.exec(stmt).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    # Verify access through gap analysis
    gap_stmt = select(GapAnalysis).where(GapAnalysis.id == entry.gap_analysis_id)
    gap_analysis = session.exec(gap_stmt).first()
    if not gap_analysis:
        raise HTTPException(status_code=404, detail="Gap analysis not found")

    # Verify ownership (either through skater or team)
    if gap_analysis.skater_id:
        _verify_skater_access(gap_analysis.skater_id, current_user.id, session)
    elif gap_analysis.team_id:
        _verify_team_access(gap_analysis.team_id, current_user.id, session)

    # Update fields
    update_data = entry_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(entry, key, value)

    entry.updated_at = datetime.utcnow()
    session.add(entry)

    # Update gap analysis timestamp
    gap_analysis.last_updated = datetime.utcnow()
    session.add(gap_analysis)

    session.commit()
    session.refresh(entry)

    # Load metric
    metric_stmt = select(MetricDefinition).where(
        MetricDefinition.id == entry.metric_id
    )
    metric = session.exec(metric_stmt).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")

    return _entry_to_read(entry, metric)


@router.delete("/gap-analysis/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def archive_gap_entry(
    *,
    session: Session = Depends(get_session),
    entry_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user)
):
    """Archive a gap analysis entry (soft delete)."""
    # Get entry
    stmt = select(GapAnalysisEntry).where(GapAnalysisEntry.id == entry_id)
    entry = session.exec(stmt).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    # Verify access through gap analysis
    gap_stmt = select(GapAnalysis).where(GapAnalysis.id == entry.gap_analysis_id)
    gap_analysis = session.exec(gap_stmt).first()
    if not gap_analysis:
        raise HTTPException(status_code=404, detail="Gap analysis not found")

    # Verify ownership
    if gap_analysis.skater_id:
        _verify_skater_access(gap_analysis.skater_id, current_user.id, session)
    elif gap_analysis.team_id:
        _verify_team_access(gap_analysis.team_id, current_user.id, session)

    # Archive entry
    entry.is_active = False
    entry.updated_at = datetime.utcnow()
    session.add(entry)

    # Update gap analysis timestamp
    gap_analysis.last_updated = datetime.utcnow()
    session.add(gap_analysis)

    session.commit()
