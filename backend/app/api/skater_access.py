"""Skater access-management routes (coach roster + invitations).

All mutating routes require ``can_manage_access`` (primary coach or admin) via
``require_skater_primary_coach``. ``GET .../access/me`` is open to anyone with
access and reports their resolved role + capabilities.
"""
import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.skater_permissions import (
    get_skater_capabilities,
    require_skater_primary_coach,
)
from app.models.enums import SystemRole
from app.models.skater_invite import SkaterInvite
from app.models.training import CoachAssignment
from app.models.user import User
from app.schemas.access import (
    AccessListOut,
    CapabilityOut,
    CoachAccessOut,
    CoachRoleUpdate,
    InviteCreate,
    InviteCreateResult,
    PendingInviteOut,
)
from app.services.access_service import (
    assignments_for,
    invite_expiry,
    is_primary,
    link_coach,
    remove_coach,
    set_level,
    units_rostering,
)

router = APIRouter(prefix="/skaters", tags=["access"])

_VALID_INVITE_ROLES = ("skater", "collaborator", "viewer")
_VALID_COACH_ROLES = ("collaborator", "viewer")
_LEVEL_RANK = {"primary": 3, "collaborator": 2, "viewer": 1}


def _active_coach_by_email(email: str, db: Session) -> User | None:
    stmt = select(User).where(
        User.email == email,
        User.system_role == SystemRole.coach,
        User.is_account_active.is_(True),
    )
    return db.execute(stmt).scalar_one_or_none()


def _list_coaches(skater_id: int, db: Session) -> list[CoachAccessOut]:
    unit_ids = units_rostering(skater_id, db)
    if not unit_ids:
        return []
    stmt = (
        select(CoachAssignment, User)
        .join(User, User.id == CoachAssignment.coach_user_id)
        .where(CoachAssignment.training_unit_id.in_(unit_ids))
    )
    best: dict[int, tuple[int, CoachAccessOut]] = {}
    for assign, user in db.execute(stmt).all():
        rank = _LEVEL_RANK.get(assign.permission_level, 0)
        if user.id not in best or rank > best[user.id][0]:
            best[user.id] = (
                rank,
                CoachAccessOut(
                    coach_user_id=user.id,
                    email=user.email,
                    first_name=user.first_name,
                    last_name=user.last_name,
                    permission_level=assign.permission_level,
                ),
            )
    return [entry[1] for entry in best.values()]


def _pending_invites(skater_id: int, db: Session) -> list[PendingInviteOut]:
    stmt = select(SkaterInvite).where(
        SkaterInvite.skater_id == skater_id, SkaterInvite.accepted_at.is_(None)
    )
    return [PendingInviteOut.model_validate(i, from_attributes=True) for i in db.execute(stmt).scalars().all()]


@router.get("/{skater_id}/access/me", response_model=CapabilityOut)
def my_access(
    skater_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CapabilityOut:
    caps = get_skater_capabilities(current_user, skater_id, db)
    if caps["role"] is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="No access to this skater"
        )
    return CapabilityOut(**caps)


@router.get("/{skater_id}/access", response_model=AccessListOut)
def list_access(
    skater_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AccessListOut:
    require_skater_primary_coach(current_user, skater_id, db)
    return AccessListOut(
        coaches=_list_coaches(skater_id, db),
        pending_invites=_pending_invites(skater_id, db),
    )


@router.post(
    "/{skater_id}/access/invites",
    response_model=InviteCreateResult,
    status_code=status.HTTP_201_CREATED,
)
def create_invite(
    skater_id: int,
    payload: InviteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InviteCreateResult:
    require_skater_primary_coach(current_user, skater_id, db)
    if payload.role not in _VALID_INVITE_ROLES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
    if payload.role in _VALID_COACH_ROLES:
        coach = _active_coach_by_email(payload.email, db)
        if coach is not None:
            link_coach(coach.id, skater_id, payload.role, db)
            db.commit()
            return InviteCreateResult(status="linked", coach_user_id=coach.id)
    token = secrets.token_urlsafe(32)
    invite = SkaterInvite(
        token=token,
        email=payload.email,
        skater_id=skater_id,
        target_role=payload.role,
        created_by_user_id=current_user.id,
        expires_at=invite_expiry(),
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return InviteCreateResult(
        status="invited",
        invite_id=invite.id,
        token=token,
        invite_path=f"/accept-invite?token={token}",
    )


@router.patch("/{skater_id}/access/coaches/{coach_user_id}", response_model=CoachAccessOut)
def update_coach_role(
    skater_id: int,
    coach_user_id: int,
    payload: CoachRoleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CoachAccessOut:
    require_skater_primary_coach(current_user, skater_id, db)
    if payload.role not in _VALID_COACH_ROLES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
    if not assignments_for(coach_user_id, skater_id, db):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coach not assigned")
    if is_primary(coach_user_id, skater_id, db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot modify the primary coach"
        )
    set_level(coach_user_id, skater_id, payload.role, db)
    db.commit()
    coach = db.get(User, coach_user_id)
    return CoachAccessOut(
        coach_user_id=coach.id,
        email=coach.email,
        first_name=coach.first_name,
        last_name=coach.last_name,
        permission_level=payload.role,
    )


@router.delete(
    "/{skater_id}/access/coaches/{coach_user_id}", status_code=status.HTTP_204_NO_CONTENT
)
def remove_coach_access(
    skater_id: int,
    coach_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    require_skater_primary_coach(current_user, skater_id, db)
    if not assignments_for(coach_user_id, skater_id, db):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coach not assigned")
    if is_primary(coach_user_id, skater_id, db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove the primary coach"
        )
    remove_coach(coach_user_id, skater_id, db)
    db.commit()


@router.delete(
    "/{skater_id}/access/invites/{invite_id}", status_code=status.HTTP_204_NO_CONTENT
)
def revoke_invite(
    skater_id: int,
    invite_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    require_skater_primary_coach(current_user, skater_id, db)
    invite = db.get(SkaterInvite, invite_id)
    if invite is None or invite.skater_id != skater_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    db.delete(invite)
    db.commit()
