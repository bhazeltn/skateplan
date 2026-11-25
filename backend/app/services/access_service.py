"""Shared helpers for skater access management (coach assignments + invites).

A coach↔skater link is expressed as ``CoachAssignment`` rows on every training
unit that rosters the skater (onboarding creates exactly one such unit, but the
model permits several). ``permission_level`` carries the access role.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import RoleInUnit
from app.models.training import CoachAssignment, TrainingUnitRoster

INVITE_TTL_DAYS = 7


def units_rostering(skater_id: int, db: Session) -> list[int]:
    stmt = select(TrainingUnitRoster.training_unit_id).where(
        TrainingUnitRoster.skater_id == skater_id
    )
    return list(db.execute(stmt).scalars().all())


def assignments_for(coach_user_id: int, skater_id: int, db: Session) -> list[CoachAssignment]:
    """CoachAssignment rows linking this coach to this skater (across units)."""
    unit_ids = units_rostering(skater_id, db)
    if not unit_ids:
        return []
    stmt = select(CoachAssignment).where(
        CoachAssignment.coach_user_id == coach_user_id,
        CoachAssignment.training_unit_id.in_(unit_ids),
    )
    return list(db.execute(stmt).scalars().all())


def is_primary(coach_user_id: int, skater_id: int, db: Session) -> bool:
    return any(
        a.permission_level == "primary"
        for a in assignments_for(coach_user_id, skater_id, db)
    )


def link_coach(coach_user_id: int, skater_id: int, level: str, db: Session) -> int:
    """Create/update assignments so the coach has ``level`` on every unit.

    Returns the number of units affected. Existing rows are updated in place
    (never duplicated); missing ones are created with a supplemental
    ``role_in_unit`` so primary coaching function is not implied.
    """
    unit_ids = units_rostering(skater_id, db)
    existing = {a.training_unit_id: a for a in assignments_for(coach_user_id, skater_id, db)}
    for unit_id in unit_ids:
        row = existing.get(unit_id)
        if row is None:
            db.add(
                CoachAssignment(
                    coach_user_id=coach_user_id,
                    training_unit_id=unit_id,
                    role_in_unit=RoleInUnit.secondary,
                    permission_level=level,
                )
            )
        else:
            row.permission_level = level
    return len(unit_ids)


def set_level(coach_user_id: int, skater_id: int, level: str, db: Session) -> None:
    for row in assignments_for(coach_user_id, skater_id, db):
        row.permission_level = level


def remove_coach(coach_user_id: int, skater_id: int, db: Session) -> None:
    for row in assignments_for(coach_user_id, skater_id, db):
        db.delete(row)


def invite_expiry(now: datetime | None = None) -> datetime:
    return (now or datetime.now(timezone.utc)) + timedelta(days=INVITE_TTL_DAYS)
