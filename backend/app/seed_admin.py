"""Idempotent admin/coach bootstrap for a fresh database.

Creates the first login-capable coach/admin user from environment variables so a
freshly migrated, empty database has someone who can sign in. Safe to run on every
deploy: if a user with ADMIN_EMAIL already exists, it does nothing.

Required env vars:
    ADMIN_EMAIL     login email for the bootstrap user
    ADMIN_PASSWORD  plaintext password (hashed before storage)
Optional env vars:
    ADMIN_NAME      full name, e.g. "Jane Doe" (default "Admin User")
    ADMIN_ROLE      system role: "admin" or "coach" (default "admin")

Usage:
    python -m app.seed_admin
"""
import os
import sys

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.enums import SystemRole
from app.models.user import User
from sqlalchemy import select


def _split_name(full_name: str) -> tuple[str, str | None]:
    parts = full_name.strip().split(None, 1)
    if not parts:
        return "Admin", "User"
    return parts[0], (parts[1] if len(parts) > 1 else None)


def _resolve_role(raw: str) -> SystemRole:
    try:
        return SystemRole(raw.strip().lower())
    except ValueError:
        return SystemRole.admin


def seed_admin() -> int:
    """Create the bootstrap admin if absent. Returns a process exit code."""
    email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    password = os.environ.get("ADMIN_PASSWORD", "")
    if not email or not password:
        print("seed_admin: ADMIN_EMAIL and ADMIN_PASSWORD must be set; skipping.")
        return 1

    first, last = _split_name(os.environ.get("ADMIN_NAME", "Admin User"))
    role = _resolve_role(os.environ.get("ADMIN_ROLE", "admin"))

    db = SessionLocal()
    try:
        existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if existing is not None:
            print(f"seed_admin: user {email} already exists (id={existing.id}); nothing to do.")
            return 0
        user = User(
            email=email,
            password_hash=hash_password(password),
            system_role=role,
            first_name=first,
            last_name=last,
            is_account_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"seed_admin: created {role.value} {email} (id={user.id}).")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(seed_admin())
