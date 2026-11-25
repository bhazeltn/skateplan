"""Skater development-goal routes (role-gated edits).

Reads are open to anyone with skater access (``authorize_skater_access``).
Create/update/delete require ``can_edit_goals`` (``require_goal_editor``) — so
the skater themselves and primary/collaborator coaches (and admins) may edit,
while viewers get 403. ``skater_id`` is the athlete's ``users.id``.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import authorize_skater_access, get_current_user
from app.core.database import get_db
from app.core.skater_permissions import require_goal_editor
from app.models.skater_goal import SkaterGoal
from app.models.user import User
from app.schemas.goal import GoalCreate, GoalOut, GoalUpdate

skater_router = APIRouter(prefix="/skaters", tags=["goals"])


def _get_goal(goal_id: uuid.UUID, skater_id: int, db: Session) -> SkaterGoal:
    row = db.get(SkaterGoal, goal_id)
    if row is None or row.skater_id != skater_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    return row


@skater_router.get("/{skater_id}/goals", response_model=list[GoalOut])
def list_goals(
    skater_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[GoalOut]:
    authorize_skater_access(current_user, skater_id, db)
    stmt = (
        select(SkaterGoal)
        .where(SkaterGoal.skater_id == skater_id)
        .order_by(SkaterGoal.created_at)
    )
    return [GoalOut.model_validate(r) for r in db.execute(stmt).scalars().all()]


@skater_router.post(
    "/{skater_id}/goals", response_model=GoalOut, status_code=status.HTTP_201_CREATED
)
def create_goal(
    skater_id: int,
    payload: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GoalOut:
    require_goal_editor(current_user, skater_id, db)
    row = SkaterGoal(
        skater_id=skater_id, created_by_user_id=current_user.id, **payload.model_dump()
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return GoalOut.model_validate(row)


@skater_router.patch("/{skater_id}/goals/{goal_id}", response_model=GoalOut)
def update_goal(
    skater_id: int,
    goal_id: uuid.UUID,
    payload: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GoalOut:
    require_goal_editor(current_user, skater_id, db)
    row = _get_goal(goal_id, skater_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return GoalOut.model_validate(row)


@skater_router.delete(
    "/{skater_id}/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_goal(
    skater_id: int,
    goal_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    require_goal_editor(current_user, skater_id, db)
    row = _get_goal(goal_id, skater_id, db)
    db.delete(row)
    db.commit()
