"""Public invite acceptance + authenticated password change.

Invite acceptance logs the user in immediately by returning the same ``Token``
payload ``/auth/login`` issues. A "skater" invite CLAIMS the pre-existing
placeholder athlete ``User`` (preserving its id and all skater_id FKs); a
"collaborator"/"viewer" invite creates or links a coach ``User`` and attaches a
``CoachAssignment`` at the invited permission level.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.enums import SystemRole
from app.models.skater_invite import SkaterInvite
from app.models.user import User
from app.schemas.access import (
    AcceptInviteRequest,
    ChangePasswordRequest,
    PublicInviteOut,
)
from app.schemas.auth import Token
from app.services.access_service import link_coach

router = APIRouter(prefix="/auth", tags=["auth"])


def _split_name(full_name: str) -> tuple[str, str]:
    parts = full_name.strip().split(None, 1)
    first = parts[0] if parts else ""
    last = parts[1] if len(parts) > 1 else ""
    return first, last


def _load_valid_invite(token: str, db: Session) -> SkaterInvite:
    invite = db.execute(
        select(SkaterInvite).where(SkaterInvite.token == token)
    ).scalar_one_or_none()
    if invite is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    if invite.accepted_at is not None:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invite already accepted")
    if invite.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invite expired")
    return invite


def _issue_token(user: User) -> Token:
    token = create_access_token(subject=user.id, role=user.system_role.value)
    return Token(access_token=token, user_id=user.id, role=user.system_role.value)


def _claim_skater(invite: SkaterInvite, pwd: str, first: str, last: str, db: Session) -> User:
    user = db.get(User, invite.skater_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skater not found")
    user.email = invite.email
    user.password_hash = hash_password(pwd)
    user.is_account_active = True
    user.first_name = first or user.first_name
    user.last_name = last or user.last_name
    return user


def _accept_coach(invite: SkaterInvite, pwd: str, first: str, last: str, db: Session) -> User:
    coach = db.execute(
        select(User).where(User.email == invite.email)
    ).scalar_one_or_none()
    if coach is None:
        coach = User(
            email=invite.email,
            password_hash=hash_password(pwd),
            system_role=SystemRole.coach,
            first_name=first,
            last_name=last,
            is_account_active=True,
        )
        db.add(coach)
        db.flush()
    link_coach(coach.id, invite.skater_id, invite.target_role, db)
    return coach


@router.get("/invites/{token}", response_model=PublicInviteOut)
def get_invite(token: str, db: Session = Depends(get_db)) -> PublicInviteOut:
    invite = _load_valid_invite(token, db)
    skater = db.get(User, invite.skater_id)
    name = None
    if skater is not None:
        name = " ".join(filter(None, [skater.first_name, skater.last_name])) or None
    return PublicInviteOut(
        email=invite.email,
        target_role=invite.target_role,
        skater_name=name,
        expires_at=invite.expires_at,
    )


@router.post("/accept-invite", response_model=Token)
def accept_invite(payload: AcceptInviteRequest, db: Session = Depends(get_db)) -> Token:
    invite = _load_valid_invite(payload.token, db)
    first, last = _split_name(payload.full_name)
    if invite.target_role == "skater":
        user = _claim_skater(invite, payload.password, first, last, db)
    else:
        user = _accept_coach(invite, payload.password, first, last, db)
    invite.accepted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return _issue_token(user)


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect"
        )
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"status": "password_changed"}
