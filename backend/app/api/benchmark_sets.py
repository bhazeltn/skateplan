"""Coach-owned reusable benchmark sets (Sprint 7).

A coach curates named benchmark sets and applies them to any athlete they are
authorized for. Every route is coach-gated (``require_coach``) and strictly
scoped to the owning coach (``current_user.id``). Applying a set copies each item
into ``skater_benchmarks`` as ``NOT_STARTED``, skipping case-insensitive
(category, title) duplicates the skater already has.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import authorize_skater_access
from app.api.standards import require_coach
from app.core.database import get_db
from app.models.benchmark_set import BenchmarkSet, BenchmarkSetItem
from app.models.standard import SkaterBenchmark
from app.models.user import User
from app.schemas.benchmark_set import (
    AppliedBenchmark,
    ApplySetResult,
    BenchmarkSetCreate,
    BenchmarkSetItemIn,
    BenchmarkSetOut,
    BenchmarkSetUpdate,
)

router = APIRouter(prefix="/benchmark-sets", tags=["benchmark-sets"])


def _get_owned_set(set_id: uuid.UUID, current_user: User, db: Session) -> BenchmarkSet:
    row = db.get(BenchmarkSet, set_id)
    if row is None or row.coach_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Benchmark set not found"
        )
    return row


def _build_items(items: list[BenchmarkSetItemIn]) -> list[BenchmarkSetItem]:
    return [
        BenchmarkSetItem(
            category=item.category,
            title=item.title,
            notes=item.notes,
            sort_order=index,
        )
        for index, item in enumerate(items)
    ]


@router.get("", response_model=list[BenchmarkSetOut])
def list_sets(
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> list[BenchmarkSetOut]:
    stmt = (
        select(BenchmarkSet)
        .where(BenchmarkSet.coach_id == current_user.id)
        .order_by(BenchmarkSet.created_at.desc())
    )
    rows = db.execute(stmt).scalars().all()
    return [BenchmarkSetOut.model_validate(r) for r in rows]


@router.post("", response_model=BenchmarkSetOut, status_code=status.HTTP_201_CREATED)
def create_set(
    payload: BenchmarkSetCreate,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> BenchmarkSetOut:
    row = BenchmarkSet(
        coach_id=current_user.id,
        name=payload.name,
        description=payload.description,
        items=_build_items(payload.items),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return BenchmarkSetOut.model_validate(row)


@router.patch("/{set_id}", response_model=BenchmarkSetOut)
def update_set(
    set_id: uuid.UUID,
    payload: BenchmarkSetUpdate,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> BenchmarkSetOut:
    row = _get_owned_set(set_id, current_user, db)
    if payload.name is not None:
        row.name = payload.name
    if payload.description is not None:
        row.description = payload.description
    if payload.items is not None:
        row.items = _build_items(payload.items)
    db.commit()
    db.refresh(row)
    return BenchmarkSetOut.model_validate(row)


@router.delete("/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_set(
    set_id: uuid.UUID,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> None:
    row = _get_owned_set(set_id, current_user, db)
    db.delete(row)
    db.commit()


def _existing_keys(skater_id: int, db: Session) -> set[tuple[str, str]]:
    stmt = select(SkaterBenchmark.category, SkaterBenchmark.name).where(
        SkaterBenchmark.skater_id == skater_id
    )
    return {(c.lower(), n.lower()) for c, n in db.execute(stmt).all()}


@router.post("/{set_id}/apply/{skater_id}", response_model=ApplySetResult)
def apply_set(
    set_id: uuid.UUID,
    skater_id: int,
    current_user: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> ApplySetResult:
    bset = _get_owned_set(set_id, current_user, db)
    authorize_skater_access(current_user, skater_id, db)
    seen = _existing_keys(skater_id, db)
    created: list[AppliedBenchmark] = []
    skipped = 0
    for item in bset.items:
        key = (item.category.lower(), item.title.lower())
        if key in seen:
            skipped += 1
            continue
        seen.add(key)
        db.add(
            SkaterBenchmark(
                skater_id=skater_id,
                category=item.category,
                name=item.title,
                status="NOT_STARTED",
                notes=item.notes,
            )
        )
        created.append(AppliedBenchmark(category=item.category, title=item.title))
    db.commit()
    return ApplySetResult(
        created_count=len(created), skipped_count=skipped, created_items=created
    )
