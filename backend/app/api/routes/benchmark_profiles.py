import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel

from app.api.deps import get_session, get_current_user
from app.models.user_models import Profile
from app.models.benchmark_models import (
    BenchmarkProfile,
    ProfileMetric,
    MetricDefinition,
    MetricCategory,
    MetricDataType
)

router = APIRouter()

# ==================== Pydantic Schemas ====================

class ProfileCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ProfileMetricAdd(BaseModel):
    metric_id: str
    target_value: str
    display_order: int = 0

class ProfileMetricUpdate(BaseModel):
    target_value: Optional[str] = None
    display_order: Optional[int] = None

class ProfileMetricRead(BaseModel):
    id: str
    metric_id: str
    metric_name: str
    metric_category: MetricCategory
    metric_data_type: MetricDataType
    metric_unit: Optional[str]
    target_value: str
    display_order: int

class ProfileRead(BaseModel):
    id: str
    coach_id: str
    name: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    metrics: List[ProfileMetricRead] = []

class ProfileClone(BaseModel):
    name: str
    description: Optional[str] = None

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

def _profile_metric_to_read(pm: ProfileMetric) -> ProfileMetricRead:
    """Convert ProfileMetric to read schema."""
    return ProfileMetricRead(
        id=str(pm.id),
        metric_id=str(pm.metric_id),
        metric_name=pm.metric.name,
        metric_category=pm.metric.category,
        metric_data_type=pm.metric.data_type,
        metric_unit=pm.metric.unit,
        target_value=pm.target_value,
        display_order=pm.display_order
    )

def _profile_to_read(profile: BenchmarkProfile, session: Session) -> ProfileRead:
    """Convert BenchmarkProfile to read schema with metrics."""
    # Load metrics for this profile
    stmt = select(ProfileMetric).where(
        ProfileMetric.profile_id == profile.id
    ).order_by(ProfileMetric.display_order)
    profile_metrics = session.exec(stmt).all()

    # Load metric definitions
    metrics_data = []
    for pm in profile_metrics:
        # Load metric
        metric_stmt = select(MetricDefinition).where(
            MetricDefinition.id == pm.metric_id
        )
        metric = session.exec(metric_stmt).first()
        if metric:
            pm.metric = metric  # Attach for helper function
            metrics_data.append(_profile_metric_to_read(pm))

    return ProfileRead(
        id=str(profile.id),
        coach_id=str(profile.coach_id),
        name=profile.name,
        description=profile.description,
        is_active=profile.is_active,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
        metrics=metrics_data
    )

# ==================== Endpoints ====================

@router.post("/", response_model=ProfileRead, status_code=status.HTTP_201_CREATED)
def create_profile(
    *,
    session: Session = Depends(get_session),
    profile_in: ProfileCreate,
    current_user: Profile = Depends(get_current_user)
) -> ProfileRead:
    """
    Create a new benchmark profile.

    Validates:
    - No duplicate profile names for this coach (among active profiles)
    """
    # Check for duplicate name among active profiles
    stmt = select(BenchmarkProfile).where(
        BenchmarkProfile.coach_id == current_user.id,
        BenchmarkProfile.name == profile_in.name,
        BenchmarkProfile.is_active == True
    )
    existing = session.exec(stmt).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="A profile with this name already exists"
        )

    # Create profile
    db_profile = BenchmarkProfile(
        coach_id=current_user.id,
        name=profile_in.name,
        description=profile_in.description,
        is_active=True
    )

    session.add(db_profile)
    session.commit()
    session.refresh(db_profile)

    return _profile_to_read(db_profile, session)


@router.get("/", response_model=List[ProfileRead])
def list_profiles(
    *,
    session: Session = Depends(get_session),
    current_user: Profile = Depends(get_current_user),
    include_inactive: bool = False
) -> List[ProfileRead]:
    """
    List all benchmark profiles for coach.

    By default, only returns active profiles.
    """
    stmt = select(BenchmarkProfile).where(
        BenchmarkProfile.coach_id == current_user.id
    )

    if not include_inactive:
        stmt = stmt.where(BenchmarkProfile.is_active == True)

    stmt = stmt.order_by(BenchmarkProfile.name)

    profiles = session.exec(stmt).all()

    return [_profile_to_read(p, session) for p in profiles]


@router.get("/{profile_id}", response_model=ProfileRead)
def get_profile(
    *,
    session: Session = Depends(get_session),
    profile_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user)
) -> ProfileRead:
    """Get a specific profile with all metrics."""
    profile = _get_profile_or_404(profile_id, current_user.id, session)
    return _profile_to_read(profile, session)


@router.post("/{profile_id}/clone", response_model=ProfileRead, status_code=status.HTTP_201_CREATED)
def clone_profile(
    *,
    session: Session = Depends(get_session),
    profile_id: uuid.UUID,
    clone_data: ProfileClone,
    current_user: Profile = Depends(get_current_user)
) -> ProfileRead:
    """
    Clone an existing profile with all metrics.

    Creates a new profile with the same metrics and target values.
    """
    # Get source profile
    source = _get_profile_or_404(profile_id, current_user.id, session)

    # Check for duplicate name
    stmt = select(BenchmarkProfile).where(
        BenchmarkProfile.coach_id == current_user.id,
        BenchmarkProfile.name == clone_data.name,
        BenchmarkProfile.is_active == True
    )
    existing = session.exec(stmt).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="A profile with this name already exists"
        )

    # Create new profile
    new_profile = BenchmarkProfile(
        coach_id=current_user.id,
        name=clone_data.name,
        description=clone_data.description or source.description,
        is_active=True
    )
    session.add(new_profile)
    session.flush()  # Get ID but don't commit yet

    # Clone all metrics
    stmt = select(ProfileMetric).where(ProfileMetric.profile_id == profile_id)
    source_metrics = session.exec(stmt).all()

    for pm in source_metrics:
        new_pm = ProfileMetric(
            profile_id=new_profile.id,
            metric_id=pm.metric_id,
            target_value=pm.target_value,
            display_order=pm.display_order
        )
        session.add(new_pm)

    session.commit()
    session.refresh(new_profile)

    return _profile_to_read(new_profile, session)


@router.patch("/{profile_id}", response_model=ProfileRead)
def update_profile(
    *,
    session: Session = Depends(get_session),
    profile_id: uuid.UUID,
    profile_in: ProfileUpdate,
    current_user: Profile = Depends(get_current_user)
) -> ProfileRead:
    """Update profile name and/or description."""
    profile = _get_profile_or_404(profile_id, current_user.id, session)

    # Update fields
    update_data = profile_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)

    profile.updated_at = datetime.utcnow()

    session.add(profile)
    session.commit()
    session.refresh(profile)

    return _profile_to_read(profile, session)


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(
    *,
    session: Session = Depends(get_session),
    profile_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user)
):
    """
    Soft delete profile (sets is_active=false).

    Profile remains in database but won't appear in lists by default.
    """
    profile = _get_profile_or_404(profile_id, current_user.id, session)

    profile.is_active = False
    profile.updated_at = datetime.utcnow()

    session.add(profile)
    session.commit()


@router.post("/{profile_id}/metrics", response_model=ProfileMetricRead, status_code=status.HTTP_201_CREATED)
def add_metric_to_profile(
    *,
    session: Session = Depends(get_session),
    profile_id: uuid.UUID,
    metric_in: ProfileMetricAdd,
    current_user: Profile = Depends(get_current_user)
) -> ProfileMetricRead:
    """
    Add a metric with target value to profile.

    Validates:
    - Profile exists and is owned by coach
    - Metric exists and is owned by coach
    - Metric is not already in profile
    """
    # Verify profile ownership
    profile = _get_profile_or_404(profile_id, current_user.id, session)

    # Verify metric exists and is owned by coach
    metric_id = uuid.UUID(metric_in.metric_id)
    metric = _get_metric_or_404(metric_id, current_user.id, session)

    # Check if already exists
    stmt = select(ProfileMetric).where(
        ProfileMetric.profile_id == profile_id,
        ProfileMetric.metric_id == metric_id
    )
    existing = session.exec(stmt).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="This metric is already in the profile"
        )

    # Create profile metric
    pm = ProfileMetric(
        profile_id=profile_id,
        metric_id=metric_id,
        target_value=metric_in.target_value,
        display_order=metric_in.display_order
    )
    session.add(pm)
    session.commit()
    session.refresh(pm)

    # Attach metric for response
    pm.metric = metric

    return _profile_metric_to_read(pm)


@router.patch("/{profile_id}/metrics/{metric_id}", response_model=ProfileMetricRead)
def update_metric_target(
    *,
    session: Session = Depends(get_session),
    profile_id: uuid.UUID,
    metric_id: uuid.UUID,
    metric_in: ProfileMetricUpdate,
    current_user: Profile = Depends(get_current_user)
) -> ProfileMetricRead:
    """Update target value for metric in profile."""
    # Verify profile ownership
    profile = _get_profile_or_404(profile_id, current_user.id, session)

    # Get profile metric
    stmt = select(ProfileMetric).where(
        ProfileMetric.profile_id == profile_id,
        ProfileMetric.metric_id == metric_id
    )
    pm = session.exec(stmt).first()

    if not pm:
        raise HTTPException(status_code=404, detail="Metric not in profile")

    # Update fields
    update_data = metric_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(pm, key, value)

    session.add(pm)
    session.commit()
    session.refresh(pm)

    # Load metric for response
    metric = _get_metric_or_404(metric_id, current_user.id, session)
    pm.metric = metric

    return _profile_metric_to_read(pm)


@router.delete("/{profile_id}/metrics/{metric_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_metric_from_profile(
    *,
    session: Session = Depends(get_session),
    profile_id: uuid.UUID,
    metric_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user)
):
    """Remove a metric from profile."""
    # Verify profile ownership
    profile = _get_profile_or_404(profile_id, current_user.id, session)

    # Get profile metric
    stmt = select(ProfileMetric).where(
        ProfileMetric.profile_id == profile_id,
        ProfileMetric.metric_id == metric_id
    )
    pm = session.exec(stmt).first()

    if not pm:
        raise HTTPException(status_code=404, detail="Metric not in profile")

    session.delete(pm)
    session.commit()
