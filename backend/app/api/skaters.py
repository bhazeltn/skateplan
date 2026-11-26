"""Skater onboarding orchestration (atomic multi-write)."""
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import hash_password
from app.core.skater_permissions import require_skater_editor
from app.models.enums import DisciplineType, RoleInUnit, SystemRole
from app.models.federation import Federation
from app.models.training import CoachAssignment, TrainingUnit, TrainingUnitRoster
from app.models.user import SkaterProfile, User
from app.schemas.skater import (
    OrchestrateSkaterRequest,
    OrchestrateSkaterResponse,
    SkaterUpdate,
)
from app.schemas.skater_detail import SkaterDetailOut
from app.services.skater_service import get_skater_detail

router = APIRouter(prefix="/skaters", tags=["skaters"])

# Map the coaching-function role to an initial access permission_level. The
# onboarding coach is the primary; others default to collaborator.
_PERMISSION_FOR_UNIT_ROLE = {
    RoleInUnit.primary: "primary",
    RoleInUnit.secondary: "collaborator",
    RoleInUnit.choreographer: "viewer",
}


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def _new_skater_user(payload: OrchestrateSkaterRequest) -> User:
    """Build a skater User. Password optional.

    With email+password an active login account is created; otherwise a
    login-less placeholder athlete (unactivated, no usable password).
    """
    active = bool(payload.email and payload.password)
    return User(
        email=payload.email if active else f"skater-{uuid4().hex}@placeholder.skateplan.local",
        password_hash=hash_password(payload.password) if active else "",
        system_role=SystemRole.athlete,
        first_name=payload.first_name,
        last_name=payload.last_name,
        is_account_active=active,
    )


def _resolve_skater_user(payload: OrchestrateSkaterRequest, db: Session) -> User:
    """Return an existing skater user or create one (flushed)."""
    if payload.skater_user_id is not None:
        user = db.get(User, payload.skater_user_id)
        if user is None:
            raise _bad_request(f"skater_user_id {payload.skater_user_id} not found")
        return user
    user = _new_skater_user(payload)
    db.add(user)
    db.flush()
    return user


def _build_profile(payload: OrchestrateSkaterRequest, skater_id: int) -> SkaterProfile:
    return SkaterProfile(
        skater_id=skater_id,
        date_of_birth=payload.date_of_birth,
        home_club=payload.home_club,
        federation_registration_id=payload.federation_registration_id,
        federation_id=payload.federation_id,
        current_level_id=payload.current_level_id,
        competitive_level=payload.competitive_level,
        contact_email=payload.contact_email,
    )


def _unit_name_for(payload: OrchestrateSkaterRequest) -> str:
    """Derive a training-unit name when none is supplied by the client."""
    if payload.unit_name:
        return payload.unit_name
    if payload.home_club:
        return payload.home_club
    who = " ".join(filter(None, [payload.first_name, payload.last_name])).strip()
    return f"{who} unit" if who else "Training unit"


def _attach_unit(
    payload: OrchestrateSkaterRequest, profile: SkaterProfile, coach: User, db: Session
) -> tuple[TrainingUnit, TrainingUnitRoster, CoachAssignment]:
    """Create the training unit, roster entry and coach assignment."""
    unit = TrainingUnit(
        discipline_type=DisciplineType.singles,
        unit_name=_unit_name_for(payload),
        is_active=True,
    )
    db.add(unit)
    db.flush()
    roster = TrainingUnitRoster(
        training_unit_id=unit.training_unit_id, skater_id=profile.skater_id
    )
    assignment = CoachAssignment(
        coach_user_id=coach.id,
        training_unit_id=unit.training_unit_id,
        role_in_unit=payload.role_in_unit,
        permission_level=_PERMISSION_FOR_UNIT_ROLE.get(payload.role_in_unit, "collaborator"),
    )
    db.add_all([roster, assignment])
    db.flush()
    return unit, roster, assignment


def _persist_graph(
    payload: OrchestrateSkaterRequest, db: Session
) -> OrchestrateSkaterResponse:
    """Create profile, unit, roster and coach assignment in one transaction."""
    skater_user = _resolve_skater_user(payload, db)
    coach = db.get(User, payload.coach_user_id)
    if coach is None:
        raise _bad_request(f"coach_user_id {payload.coach_user_id} not found")
    profile = _build_profile(payload, skater_user.id)
    db.add(profile)
    db.flush()
    unit, roster, assignment = _attach_unit(payload, profile, coach, db)
    db.commit()
    return OrchestrateSkaterResponse(
        skater_id=profile.skater_id,
        training_unit_id=unit.training_unit_id,
        roster_entry_id=roster.roster_entry_id,
        assignment_id=assignment.assignment_id,
    )


@router.post(
    "/orchestrate",
    response_model=OrchestrateSkaterResponse,
    status_code=status.HTTP_201_CREATED,
)
def orchestrate_skater(
    payload: OrchestrateSkaterRequest, db: Session = Depends(get_db)
) -> OrchestrateSkaterResponse:
    """Atomically create a skater profile, training unit, roster entry and
    primary coach assignment. Any failure rolls back the whole transaction.
    """
    try:
        return _persist_graph(payload, db)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        raise _bad_request(f"Onboarding failed and was rolled back: {exc}")


_PROFILE_FIELDS = ("contact_email", "federation_id", "competitive_level",
                   "date_of_birth", "home_club")


def _apply_full_name(user: User, full_name: str | None) -> None:
    name = (full_name or "").strip()
    if not name:
        return
    first, _, last = name.partition(" ")
    user.first_name = first
    user.last_name = last or None


def _apply_update(user: User, profile: SkaterProfile, data: dict, db: Session) -> None:
    if "full_name" in data:
        _apply_full_name(user, data["full_name"])
    fed_id = data.get("federation_id")
    if "federation_id" in data and fed_id is not None and db.get(Federation, fed_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Federation not found"
        )
    for field in _PROFILE_FIELDS:
        if field in data:
            setattr(profile, field, data[field])


@router.patch("/{skater_id}", response_model=SkaterDetailOut)
def update_skater(
    skater_id: int,
    payload: SkaterUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SkaterDetailOut:
    """Partially update a skater's identity + profile. Plan-editors only."""
    require_skater_editor(current_user, skater_id, db)  # 403 for viewers/skaters
    user = db.get(User, skater_id)
    profile = db.get(SkaterProfile, skater_id)
    if user is None or profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Skater not found"
        )
    _apply_update(user, profile, payload.model_dump(exclude_unset=True), db)
    db.commit()
    return get_skater_detail(skater_id, db)
