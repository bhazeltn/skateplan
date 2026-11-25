"""Consolidated roster-schedule read endpoint (same /competitions prefix).

Split out of competitions.py (which is at the line limit). Read-only: builds a
competition-by-competition view of the authorized skaters entered in each,
scoped with the same coach-roster join used across the app. Skaters outside the
caller's authorization are never leaked, including when include_empty=true.
"""
import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import authorize_skater_access, enforce_safesport_access, get_current_user
from app.core.database import get_db
from app.models.competition import Competition, CompetitionEntry
from app.models.enums import AccessState, SystemRole
from app.models.federation import CompetitionLevel
from app.models.training import CoachAssignment, TrainingUnitRoster
from app.models.user import AccountProxyLink, User
from app.schemas.competition_schedule import RosterCompetitionOut, RosterEntrySummaryOut

router = APIRouter(prefix="/competitions", tags=["competitions"])


def _coach_roster_ids(coach_id: int, db: Session) -> set[int]:
    stmt = (
        select(TrainingUnitRoster.skater_id)
        .join(
            CoachAssignment,
            CoachAssignment.training_unit_id == TrainingUnitRoster.training_unit_id,
        )
        .where(CoachAssignment.coach_user_id == coach_id)
    )
    return set(db.execute(stmt).scalars().all())


def _proxy_skater_ids(parent_id: int, db: Session) -> set[int]:
    stmt = select(AccountProxyLink.skater_id).where(
        AccountProxyLink.parent_user_id == parent_id,
        AccountProxyLink.is_active_observer.is_(True),
        AccountProxyLink.access_state == AccessState.active,
    )
    return set(db.execute(stmt).scalars().all())


def _authorized_skater_ids(user: User, db: Session) -> set[int]:
    """Skater ids the caller may view, matching authorize_skater_access rules."""
    if user.system_role == SystemRole.admin:
        rows = db.execute(
            select(User.id).where(User.system_role == SystemRole.athlete)
        ).scalars().all()
        return set(rows)
    if user.system_role == SystemRole.coach:
        return _coach_roster_ids(user.id, db)
    ids = _proxy_skater_ids(user.id, db)
    if user.system_role == SystemRole.athlete:
        try:
            enforce_safesport_access(user, db)  # Tier 1 -> 403, excluded
            ids.add(user.id)
        except HTTPException:
            pass
    return ids


def _entry_summary(entry: CompetitionEntry, user: User, level: CompetitionLevel | None):
    name = " ".join(filter(None, [user.first_name, user.last_name])).strip()
    scores = [r.tss for r in entry.results if r.tss is not None]
    overall = float(sum(scores)) if scores else None
    return RosterEntrySummaryOut(
        entry_id=entry.id,
        skater_id=entry.skater_id,
        skater_name=name,
        level=level.level_name if level else None,
        status=entry.status,
        overall_score=overall,
    )


def _entry_rows(allowed: set[int], db: Session) -> list:
    if not allowed:
        return []
    stmt = (
        select(CompetitionEntry, User, CompetitionLevel)
        .join(User, User.id == CompetitionEntry.skater_id)
        .outerjoin(CompetitionLevel, CompetitionLevel.level_id == CompetitionEntry.level_id)
        .where(CompetitionEntry.skater_id.in_(allowed))
        .options(selectinload(CompetitionEntry.results))
    )
    return list(db.execute(stmt).all())


def _comp_out(comp: Competition, entries: list[RosterEntrySummaryOut]) -> RosterCompetitionOut:
    entries.sort(key=lambda e: e.skater_name)
    location = ", ".join(filter(None, [comp.city, comp.country])) or None
    return RosterCompetitionOut(
        id=comp.id,
        name=comp.name,
        start_date=comp.start_date,
        end_date=comp.end_date,
        city=comp.city,
        country=comp.country,
        location=location,
        entries=entries,
    )


def _build(rows: list, include_empty: bool, db: Session) -> list[RosterCompetitionOut]:
    grouped: dict[uuid.UUID, list[RosterEntrySummaryOut]] = {}
    for entry, user, level in rows:
        grouped.setdefault(entry.competition_id, []).append(_entry_summary(entry, user, level))
    if include_empty:
        comps = list(db.execute(select(Competition)).scalars().all())
    elif grouped:
        comps = list(
            db.execute(select(Competition).where(Competition.id.in_(grouped.keys())))
            .scalars()
            .all()
        )
    else:
        comps = []
    out = [_comp_out(c, grouped.get(c.id, [])) for c in comps]
    out.sort(key=lambda c: (c.start_date is None, c.start_date or date.min, c.name))
    return out


@router.get("/roster-schedule", response_model=list[RosterCompetitionOut])
def roster_schedule(
    skater_id: Optional[int] = Query(None),
    include_empty: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[RosterCompetitionOut]:
    if skater_id is not None:
        authorize_skater_access(current_user, skater_id, db)  # 403 if unauthorized
        allowed = {skater_id}
    else:
        allowed = _authorized_skater_ids(current_user, db)
    return _build(_entry_rows(allowed, db), include_empty, db)
