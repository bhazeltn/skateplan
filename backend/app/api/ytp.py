"""Yearly Training Plan (YTP) routes (backend-only).

Season macrocycle CRUD for a skater, split into ordered phases that may link
existing custom benchmarks. Reads use ``authorize_skater_access``; writes also
require ``require_coach``. Plan/phase-scoped routes resolve the owning skater from
the loaded row, then authorize. ``skater_id`` is the athlete's ``users.id``.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import authorize_skater_access, get_current_user
from app.api.standards import require_coach
from app.core.database import get_db
from app.models.standard import SkaterBenchmark
from app.models.user import User
from app.models.ytp import YearlyPlan, YtpPhase, YtpPhaseBenchmark
from app.schemas.ytp import (
    YearlyPlanCreate,
    YearlyPlanOut,
    YearlyPlanUpdate,
    YtpPhaseCreate,
    YtpPhaseOut,
    YtpPhaseUpdate,
)

skater_router = APIRouter(prefix="/skaters", tags=["ytp"])
router = APIRouter(prefix="/ytp", tags=["ytp"])


# --- helpers --------------------------------------------------------------
def _serialize_phase(phase: YtpPhase) -> YtpPhaseOut:
    out = YtpPhaseOut.model_validate(phase)
    out.benchmark_ids = [link.benchmark_id for link in phase.benchmark_links]
    return out


def _serialize_plan(plan: YearlyPlan) -> YearlyPlanOut:
    out = YearlyPlanOut.model_validate(plan)
    out.phases = [_serialize_phase(p) for p in plan.phases]
    return out


def _get_owned_plan(plan_id: uuid.UUID, current_user: User, db: Session) -> YearlyPlan:
    plan = db.get(YearlyPlan, plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    authorize_skater_access(current_user, plan.skater_id, db)
    return plan


def _get_owned_phase(phase_id: uuid.UUID, current_user: User, db: Session) -> YtpPhase:
    phase = db.get(YtpPhase, phase_id)
    if phase is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phase not found")
    authorize_skater_access(current_user, phase.plan.skater_id, db)
    return phase


def _validate_benchmark_ids(skater_id: int, ids: list[uuid.UUID], db: Session) -> None:
    if not ids:
        return
    stmt = select(SkaterBenchmark.id).where(
        SkaterBenchmark.skater_id == skater_id, SkaterBenchmark.id.in_(ids)
    )
    owned = {row for row in db.execute(stmt).scalars().all()}
    if set(ids) - owned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more benchmark_ids do not belong to this skater",
        )


def _set_phase_links(phase: YtpPhase, ids: list[uuid.UUID]) -> None:
    phase.benchmark_links = [YtpPhaseBenchmark(benchmark_id=b) for b in ids]


# --- plan routes ----------------------------------------------------------
@skater_router.get("/{skater_id}/ytp", response_model=list[YearlyPlanOut])
def list_plans(
    skater_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[YearlyPlanOut]:
    authorize_skater_access(current_user, skater_id, db)
    stmt = (
        select(YearlyPlan)
        .where(YearlyPlan.skater_id == skater_id)
        .order_by(YearlyPlan.start_date.desc())
    )
    return [_serialize_plan(p) for p in db.execute(stmt).scalars().all()]


@skater_router.post(
    "/{skater_id}/ytp", response_model=YearlyPlanOut, status_code=status.HTTP_201_CREATED
)
def create_plan(
    skater_id: int,
    payload: YearlyPlanCreate,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> YearlyPlanOut:
    authorize_skater_access(current_user, skater_id, db)
    plan = YearlyPlan(skater_id=skater_id, **payload.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return _serialize_plan(plan)


@router.patch("/plans/{plan_id}", response_model=YearlyPlanOut)
def update_plan(
    plan_id: uuid.UUID,
    payload: YearlyPlanUpdate,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> YearlyPlanOut:
    plan = _get_owned_plan(plan_id, current_user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)
    db.commit()
    db.refresh(plan)
    return _serialize_plan(plan)


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(
    plan_id: uuid.UUID,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> None:
    plan = _get_owned_plan(plan_id, current_user, db)
    db.delete(plan)
    db.commit()


# --- phase routes ---------------------------------------------------------
@router.post(
    "/plans/{plan_id}/phases",
    response_model=YtpPhaseOut,
    status_code=status.HTTP_201_CREATED,
)
def create_phase(
    plan_id: uuid.UUID,
    payload: YtpPhaseCreate,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> YtpPhaseOut:
    plan = _get_owned_plan(plan_id, current_user, db)
    data = payload.model_dump()
    benchmark_ids = data.pop("benchmark_ids")
    _validate_benchmark_ids(plan.skater_id, benchmark_ids, db)
    phase = YtpPhase(plan_id=plan.id, **data)
    _set_phase_links(phase, benchmark_ids)
    db.add(phase)
    db.commit()
    db.refresh(phase)
    return _serialize_phase(phase)


@router.patch("/phases/{phase_id}", response_model=YtpPhaseOut)
def update_phase(
    phase_id: uuid.UUID,
    payload: YtpPhaseUpdate,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> YtpPhaseOut:
    phase = _get_owned_phase(phase_id, current_user, db)
    data = payload.model_dump(exclude_unset=True)
    benchmark_ids = data.pop("benchmark_ids", None)
    for field, value in data.items():
        setattr(phase, field, value)
    if benchmark_ids is not None:
        _validate_benchmark_ids(phase.plan.skater_id, benchmark_ids, db)
        _set_phase_links(phase, benchmark_ids)
    db.commit()
    db.refresh(phase)
    return _serialize_phase(phase)


@router.delete("/phases/{phase_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_phase(
    phase_id: uuid.UUID,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> None:
    phase = _get_owned_phase(phase_id, current_user, db)
    db.delete(phase)
    db.commit()
