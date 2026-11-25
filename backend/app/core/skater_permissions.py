"""Role-scoped access-control helpers for skater-owned data.

Resolves a caller's *access role* for a given skater and derives a capability
matrix from it. Reuses the join/proxy primitives in ``app.api.deps`` so the
SafeSport boundaries stay identical; this layer only adds the finer
primary/collaborator/viewer distinction carried on
``CoachAssignment.permission_level``.
"""
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import _parent_proxy_authorized, enforce_safesport_access
from app.models.enums import SystemRole
from app.models.training import CoachAssignment, TrainingUnitRoster
from app.models.user import User

# Access roles (distinct from SystemRole / RoleInUnit).
ROLE_ADMIN = "admin"
ROLE_PRIMARY = "primary_coach"
ROLE_COLLABORATOR = "collaborator"
ROLE_SKATER = "skater"
ROLE_VIEWER = "viewer"

# coach_assignments.permission_level -> access role, with a privilege rank used
# to aggregate across the (usually one) units rostering a skater.
_LEVEL_TO_ROLE = {
    "primary": ROLE_PRIMARY,
    "collaborator": ROLE_COLLABORATOR,
    "viewer": ROLE_VIEWER,
}
_LEVEL_RANK = {"primary": 3, "collaborator": 2, "viewer": 1}

_NO_CAPS = {
    "can_edit_plan": False,
    "can_edit_goals": False,
    "can_log_training": False,
    "can_manage_access": False,
}
_CAPABILITIES: dict[str, dict[str, bool]] = {
    ROLE_ADMIN: {"can_edit_plan": True, "can_edit_goals": True, "can_log_training": True, "can_manage_access": True},
    ROLE_PRIMARY: {"can_edit_plan": True, "can_edit_goals": True, "can_log_training": True, "can_manage_access": True},
    ROLE_COLLABORATOR: {"can_edit_plan": True, "can_edit_goals": True, "can_log_training": True, "can_manage_access": False},
    ROLE_SKATER: {"can_edit_plan": False, "can_edit_goals": True, "can_log_training": True, "can_manage_access": False},
    ROLE_VIEWER: {"can_edit_plan": False, "can_edit_goals": False, "can_log_training": True, "can_manage_access": False},
}

_FORBIDDEN = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Not authorized to perform this action on this skater's data",
)


def _highest_coach_role(coach_user_id: int, skater_id: int, db: Session) -> str | None:
    """Best (highest-privilege) access role from this coach's assignments."""
    stmt = (
        select(CoachAssignment.permission_level)
        .join(
            TrainingUnitRoster,
            TrainingUnitRoster.training_unit_id == CoachAssignment.training_unit_id,
        )
        .where(
            CoachAssignment.coach_user_id == coach_user_id,
            TrainingUnitRoster.skater_id == skater_id,
        )
    )
    levels = list(db.execute(stmt).scalars().all())
    if not levels:
        return None
    best = max(levels, key=lambda lvl: _LEVEL_RANK.get(lvl, 0))
    return _LEVEL_TO_ROLE.get(best, ROLE_VIEWER)


def get_skater_access_role(current_user: User, skater_id: int, db: Session) -> str | None:
    """Return the caller's access role for a skater, or ``None`` if no access.

    Mirrors ``authorize_skater_access`` ordering: admin, the skater themselves
    (SafeSport Tier 1 -> 403), an assigned coach (level-resolved), then an
    active parent proxy (mapped to viewer). Everyone else -> ``None``.
    """
    if current_user.system_role == SystemRole.admin:
        return ROLE_ADMIN
    if current_user.id == skater_id:
        enforce_safesport_access(current_user, db)  # Tier 1 -> 403
        return ROLE_SKATER
    if current_user.system_role == SystemRole.coach:
        role = _highest_coach_role(current_user.id, skater_id, db)
        if role is not None:
            return role
    if _parent_proxy_authorized(current_user.id, skater_id, db):
        return ROLE_VIEWER
    return None


def get_skater_capabilities(current_user: User, skater_id: int, db: Session) -> dict:
    """Role + capability flags for the caller against a skater."""
    role = get_skater_access_role(current_user, skater_id, db)
    caps = _CAPABILITIES.get(role, _NO_CAPS)
    return {"role": role, **caps}


def _require_capability(
    current_user: User, skater_id: int, db: Session, capability: str
) -> str:
    role = get_skater_access_role(current_user, skater_id, db)
    if role is None or not _CAPABILITIES.get(role, _NO_CAPS)[capability]:
        raise _FORBIDDEN
    return role


def require_skater_editor(current_user: User, skater_id: int, db: Session) -> str:
    """Caller may edit plan/benchmark/program data (implies read)."""
    return _require_capability(current_user, skater_id, db, "can_edit_plan")


def require_goal_editor(current_user: User, skater_id: int, db: Session) -> str:
    """Caller may create/update the skater's goals."""
    return _require_capability(current_user, skater_id, db, "can_edit_goals")


def require_skater_primary_coach(current_user: User, skater_id: int, db: Session) -> str:
    """Caller may manage access (invite/modify/remove coaches)."""
    return _require_capability(current_user, skater_id, db, "can_manage_access")
