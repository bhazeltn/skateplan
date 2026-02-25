import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel

from app.api.deps import get_session, get_current_user
from app.models.user_models import Profile
from app.models.benchmark_models import (
    BenchmarkSession,
    SessionResult,
    MetricDefinition,
    BenchmarkProfile,
    MetricCategory,
    MetricDataType
)

router = APIRouter()

# ==================== Pydantic Schemas ====================

class ResultCreate(BaseModel):
    """Schema for creating a session result."""
    metric_id: str
    value: str


class ResultRead(BaseModel):
    """Schema for reading a session result."""
    id: str
    metric_id: str
    metric_name: str
    metric_category: MetricCategory
    metric_data_type: MetricDataType
    metric_unit: Optional[str]
    value: str


class SessionCreate(BaseModel):
    """Schema for creating a benchmark session."""
    profile_id: str
    skater_id: Optional[str] = None
    team_id: Optional[str] = None
    date: str
    notes: Optional[str] = None
    results: List[ResultCreate]


class SessionRead(BaseModel):
    """Schema for reading a benchmark session."""
    id: str
    profile_id: str
    skater_id: Optional[str]
    team_id: Optional[str]
    coach_id: str
    date: str
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    results: List[ResultRead]


# ==================== Helper Functions ====================

def _get_profile_or_404(
    profile_id: uuid.UUID,
    coach_id: uuid.UUID,
    session: Session
) -> BenchmarkProfile:
    """Get profile or raise 404 if not found or not owned by coach."""
    stmt = select(BenchmarkProfile).where(
        BenchmarkProfile.id == profile_id,
        BenchmarkProfile.coach_id == coach_id
    )
    profile = session.exec(stmt).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


def _get_metric_or_404(
    metric_id: uuid.UUID,
    coach_id: uuid.UUID,
    session: Session
) -> MetricDefinition:
    """Get metric or raise 404 if not found or not owned by coach."""
    stmt = select(MetricDefinition).where(
        MetricDefinition.id == metric_id,
        MetricDefinition.coach_id == coach_id
    )
    metric = session.exec(stmt).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    return metric


def _result_to_read(
    result: SessionResult,
    metric: MetricDefinition
) -> ResultRead:
    """Convert SessionResult to read schema."""
    return ResultRead(
        id=str(result.id),
        metric_id=str(result.metric_id),
        metric_name=metric.name,
        metric_category=metric.category,
        metric_data_type=metric.data_type,
        metric_unit=metric.unit,
        value=result.actual_value
    )


def _session_to_read(
    session: BenchmarkSession,
    db_session: Session
) -> SessionRead:
    """Convert BenchmarkSession to read schema with results."""
    # Load results for this session
    results_stmt = select(SessionResult).where(SessionResult.session_id == session.id)
    session_results = db_session.exec(results_stmt).all()

    results_data = []
    for result in session_results:
        # Load metric definition
        metric_stmt = select(MetricDefinition).where(MetricDefinition.id == result.metric_id)
        metric = db_session.exec(metric_stmt).first()
        if metric:
            results_data.append(_result_to_read(result, metric))

    return SessionRead(
        id=str(session.id),
        profile_id=str(session.profile_id),
        skater_id=str(session.skater_id) if session.skater_id else None,
        team_id=str(session.team_id) if session.team_id else None,
        coach_id=str(session.coach_id),
        date=session.recorded_at.isoformat() if session.recorded_at else None,
        notes=session.notes,
        created_at=session.created_at,
        updated_at=session.updated_at,
        results=results_data
    )


# ==================== Endpoints ====================

@router.post("/sessions", response_model=SessionRead, status_code=status.HTTP_201_CREATED)
def create_session(
    *,
    session: Session = Depends(get_session),
    session_in: SessionCreate,
    current_user: Profile = Depends(get_current_user)
) -> SessionRead:
    """
    Create a new benchmark session.

    Validates:
    - Either skater_id OR team_id is provided (not both, not neither)
    - profile_id is provided and owned by coach
    - All metric_ids exist and are owned by coach
    """
    # Validate: either skater_id or team_id must be provided
    if not session_in.skater_id and not session_in.team_id:
        raise HTTPException(
            status_code=422,
            detail="Either skater_id or team_id must be provided"
        )

    # Validate: cannot provide both skater_id and team_id
    if session_in.skater_id and session_in.team_id:
        raise HTTPException(
            status_code=422,
            detail="Cannot provide both skater_id and team_id"
        )

    # Get and validate profile
    profile_id = uuid.UUID(session_in.profile_id)
    profile = _get_profile_or_404(profile_id, current_user.id, session)

    # Parse date
    try:
        recorded_date = datetime.fromisoformat(session_in.date)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail="Invalid date format. Use ISO format (e.g., 2024-01-15)"
        )

    # Create session
    db_session = BenchmarkSession(
        profile_id=profile_id,
        coach_id=current_user.id,
        recorded_at=recorded_date,
        notes=session_in.notes
    )

    if session_in.skater_id:
        db_session.skater_id = uuid.UUID(session_in.skater_id)

    if session_in.team_id:
        db_session.team_id = uuid.UUID(session_in.team_id)

    session.add(db_session)
    session.flush()  # Get ID but don't commit yet

    # Create results
    results_data = []
    for result_in in session_in.results:
        # Validate metric exists and is owned by coach
        metric_id = uuid.UUID(result_in.metric_id)
        metric = _get_metric_or_404(metric_id, current_user.id, session)

        # Create session result
        result = SessionResult(
            session_id=db_session.id,
            metric_id=metric_id,
            actual_value=result_in.value
        )
        session.add(result)

    session.commit()
    session.refresh(db_session)

    return _session_to_read(db_session, session)


@router.get("/sessions/{entity_id}", response_model=List[SessionRead])
def get_sessions(
    *,
    session: Session = Depends(get_session),
    current_user: Profile = Depends(get_current_user),
    entity_id: uuid.UUID
) -> List[SessionRead]:
    """
    Get all benchmark sessions for a skater or team.

    The entity_id can be either a skater_id or team_id.
    Returns all sessions linked to that entity.
    """
    # Query sessions by either skater_id or team_id
    stmt = select(BenchmarkSession).where(
        (BenchmarkSession.skater_id == entity_id) | (BenchmarkSession.team_id == entity_id)
    ).order_by(BenchmarkSession.recorded_at.desc())

    sessions = session.exec(stmt).all()

    return [_session_to_read(s, session) for s in sessions]
