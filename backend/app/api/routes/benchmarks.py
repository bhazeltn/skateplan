import uuid
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from app.api.deps import get_session, get_current_user
from app.models.user_models import Profile
from app.models.benchmark_models import (
    BenchmarkTemplate, 
    MetricDefinition, 
    BenchmarkSession, 
    BenchmarkResult,
    MetricDataType
)

router = APIRouter()

# --- Pydantic Models for Requests ---

class MetricCreate(BaseModel):
    label: str
    unit: Optional[str] = None
    data_type: MetricDataType

class TemplateCreate(BaseModel):
    name: str
    metrics: List[MetricCreate]

class ResultCreate(BaseModel):
    metric_id: uuid.UUID
    value: str

class SessionCreate(BaseModel):
    template_id: uuid.UUID
    skater_id: uuid.UUID
    date: date
    results: List[ResultCreate]

# --- Routes ---

@router.post("/templates", response_model=dict)
def create_template(
    *,
    session: Session = Depends(get_session),
    template_in: TemplateCreate,
    current_user: Profile = Depends(get_current_user),
):
    # 1. Create Template
    db_template = BenchmarkTemplate(
        name=template_in.name,
        created_by_id=current_user.id
    )
    session.add(db_template)
    session.commit()
    session.refresh(db_template)

    # 2. Create Metrics
    db_metrics = []
    for m in template_in.metrics:
        db_metric = MetricDefinition(
            template_id=db_template.id,
            label=m.label,
            unit=m.unit,
            data_type=m.data_type
        )
        session.add(db_metric)
        db_metrics.append(db_metric)
    
    session.commit()
    
    # Return structure matching test expectation
    return {
        "id": db_template.id,
        "name": db_template.name,
        "created_by_id": db_template.created_by_id,
        "metrics": [{"id": m.id, "label": m.label, "unit": m.unit, "data_type": m.data_type} for m in db_metrics]
    }

@router.get("/templates", response_model=List[BenchmarkTemplate])
def list_templates(
    *,
    session: Session = Depends(get_session),
    current_user: Profile = Depends(get_current_user),
):
    # Return system templates (created_by_id=None) AND user's templates
    statement = select(BenchmarkTemplate).where(
        (BenchmarkTemplate.created_by_id == None) | 
        (BenchmarkTemplate.created_by_id == current_user.id)
    )
    return session.exec(statement).all()

@router.post("/results", response_model=dict)
def record_results(
    *,
    session: Session = Depends(get_session),
    session_in: SessionCreate,
    current_user: Profile = Depends(get_current_user),
):
    # 1. Create Session
    db_session = BenchmarkSession(
        template_id=session_in.template_id,
        skater_id=session_in.skater_id,
        recorded_by_id=current_user.id,
        date=session_in.date
    )
    session.add(db_session)
    session.commit()
    session.refresh(db_session)

    # 2. Create Results
    db_results = []
    for r in session_in.results:
        db_result = BenchmarkResult(
            session_id=db_session.id,
            metric_definition_id=r.metric_id,
            value=r.value
        )
        session.add(db_result)
        db_results.append(db_result)
    
    session.commit()

    return {
        "id": db_session.id,
        "skater_id": db_session.skater_id,
        "date": db_session.date,
        "results": [{"metric_id": r.metric_definition_id, "value": r.value} for r in db_results]
    }