import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel

from app.api.deps import get_session, get_current_user
from app.models.user_models import Profile
from app.models.benchmark_models import (
    MetricDefinition,
    MetricCategory,
    MetricDataType,
    ProfileMetric
)

router = APIRouter()

# ==================== Pydantic Schemas ====================

class MetricCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: MetricCategory
    data_type: MetricDataType
    unit: Optional[str] = None
    scale_min: Optional[int] = None
    scale_max: Optional[int] = None

class MetricUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[MetricCategory] = None
    unit: Optional[str] = None
    scale_min: Optional[int] = None
    scale_max: Optional[int] = None

class MetricRead(BaseModel):
    id: str
    coach_id: str
    name: str
    description: Optional[str]
    category: MetricCategory
    data_type: MetricDataType
    unit: Optional[str]
    scale_min: Optional[int]
    scale_max: Optional[int]
    is_system: bool
    created_at: datetime

# ==================== Endpoints ====================

@router.post("/", response_model=MetricRead, status_code=status.HTTP_201_CREATED)
def create_metric(
    *,
    session: Session = Depends(get_session),
    metric_in: MetricCreate,
    current_user: Profile = Depends(get_current_user)
) -> MetricRead:
    """
    Create a new metric in coach's library.

    Validates:
    - No duplicate metric names for this coach
    - Numeric metrics can have unit
    - Scale metrics must have min/max
    """
    # Check for duplicate name
    stmt = select(MetricDefinition).where(
        MetricDefinition.coach_id == current_user.id,
        MetricDefinition.name == metric_in.name
    )
    existing = session.exec(stmt).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="A metric with this name already exists in your library"
        )

    # Create metric
    db_metric = MetricDefinition(
        coach_id=current_user.id,
        name=metric_in.name,
        description=metric_in.description,
        category=metric_in.category,
        data_type=metric_in.data_type,
        unit=metric_in.unit,
        scale_min=metric_in.scale_min,
        scale_max=metric_in.scale_max,
        is_system=False
    )

    session.add(db_metric)
    session.commit()
    session.refresh(db_metric)

    return MetricRead(
        id=str(db_metric.id),
        coach_id=str(db_metric.coach_id),
        name=db_metric.name,
        description=db_metric.description,
        category=db_metric.category,
        data_type=db_metric.data_type,
        unit=db_metric.unit,
        scale_min=db_metric.scale_min,
        scale_max=db_metric.scale_max,
        is_system=db_metric.is_system,
        created_at=db_metric.created_at
    )


@router.get("/", response_model=List[MetricRead])
def list_metrics(
    *,
    session: Session = Depends(get_session),
    current_user: Profile = Depends(get_current_user),
    category: Optional[MetricCategory] = None
) -> List[MetricRead]:
    """
    List all metrics in coach's library.

    Optional filters:
    - category: Filter by metric category
    """
    stmt = select(MetricDefinition).where(
        MetricDefinition.coach_id == current_user.id
    )

    if category:
        stmt = stmt.where(MetricDefinition.category == category)

    stmt = stmt.order_by(MetricDefinition.category, MetricDefinition.name)

    metrics = session.exec(stmt).all()

    return [
        MetricRead(
            id=str(m.id),
            coach_id=str(m.coach_id),
            name=m.name,
            description=m.description,
            category=m.category,
            data_type=m.data_type,
            unit=m.unit,
            scale_min=m.scale_min,
            scale_max=m.scale_max,
            is_system=m.is_system,
            created_at=m.created_at
        )
        for m in metrics
    ]


@router.get("/{metric_id}", response_model=MetricRead)
def get_metric(
    *,
    session: Session = Depends(get_session),
    metric_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user)
) -> MetricRead:
    """Get a specific metric by ID."""
    stmt = select(MetricDefinition).where(
        MetricDefinition.id == metric_id,
        MetricDefinition.coach_id == current_user.id
    )
    metric = session.exec(stmt).first()

    if not metric:
        raise HTTPException(
            status_code=404,
            detail="Metric not found"
        )

    return MetricRead(
        id=str(metric.id),
        coach_id=str(metric.coach_id),
        name=metric.name,
        description=metric.description,
        category=metric.category,
        data_type=metric.data_type,
        unit=metric.unit,
        scale_min=metric.scale_min,
        scale_max=metric.scale_max,
        is_system=metric.is_system,
        created_at=metric.created_at
    )


@router.patch("/{metric_id}", response_model=MetricRead)
def update_metric(
    *,
    session: Session = Depends(get_session),
    metric_id: uuid.UUID,
    metric_in: MetricUpdate,
    current_user: Profile = Depends(get_current_user)
) -> MetricRead:
    """
    Update a metric's details.

    Note: Cannot change data_type after creation.
    """
    stmt = select(MetricDefinition).where(
        MetricDefinition.id == metric_id,
        MetricDefinition.coach_id == current_user.id
    )
    metric = session.exec(stmt).first()

    if not metric:
        raise HTTPException(
            status_code=404,
            detail="Metric not found"
        )

    # Update fields
    update_data = metric_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(metric, key, value)

    session.add(metric)
    session.commit()
    session.refresh(metric)

    return MetricRead(
        id=str(metric.id),
        coach_id=str(metric.coach_id),
        name=metric.name,
        description=metric.description,
        category=metric.category,
        data_type=metric.data_type,
        unit=metric.unit,
        scale_min=metric.scale_min,
        scale_max=metric.scale_max,
        is_system=metric.is_system,
        created_at=metric.created_at
    )


@router.delete("/{metric_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_metric(
    *,
    session: Session = Depends(get_session),
    metric_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user)
):
    """
    Delete a metric if it's not in use.

    Fails if the metric is used in any benchmark profiles.
    """
    stmt = select(MetricDefinition).where(
        MetricDefinition.id == metric_id,
        MetricDefinition.coach_id == current_user.id
    )
    metric = session.exec(stmt).first()

    if not metric:
        raise HTTPException(
            status_code=404,
            detail="Metric not found"
        )

    # Check if metric is in use (in any profile_metrics)
    usage_stmt = select(ProfileMetric).where(ProfileMetric.metric_id == metric_id)
    in_use = session.exec(usage_stmt).first()

    if in_use:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete metric that is in use in benchmark profiles"
        )

    session.delete(metric)
    session.commit()
