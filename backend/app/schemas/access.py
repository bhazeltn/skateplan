"""Schemas for skater access management + invitations."""
import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class CapabilityOut(BaseModel):
    """Caller's resolved access role + capability flags for a skater."""

    role: str | None
    can_edit_plan: bool
    can_edit_goals: bool
    can_log_training: bool
    can_manage_access: bool


class CoachAccessOut(BaseModel):
    coach_user_id: int
    email: str
    first_name: str | None = None
    last_name: str | None = None
    permission_level: str


class PendingInviteOut(BaseModel):
    invite_id: uuid.UUID
    email: str
    target_role: str
    expires_at: datetime
    accepted_at: datetime | None = None


class AccessListOut(BaseModel):
    coaches: list[CoachAccessOut]
    pending_invites: list[PendingInviteOut]


class InviteCreate(BaseModel):
    email: EmailStr
    role: str  # "skater" | "collaborator" | "viewer"


class InviteCreateResult(BaseModel):
    status: str  # "linked" | "invited"
    invite_id: uuid.UUID | None = None
    token: str | None = None
    invite_path: str | None = None
    coach_user_id: int | None = None


class CoachRoleUpdate(BaseModel):
    role: str  # "collaborator" | "viewer"


class PublicInviteOut(BaseModel):
    email: str
    target_role: str
    skater_name: str | None = None
    expires_at: datetime


class AcceptInviteRequest(BaseModel):
    token: str
    full_name: str
    password: str = Field(min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)
