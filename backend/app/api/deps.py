from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session
import uuid

from app.core.db import get_session
from app.core.supabase import verify_supabase_jwt
from app.models.user_models import Profile

# Use HTTPBearer for Supabase JWT authentication
security = HTTPBearer()

def get_current_user(
    session: Session = Depends(get_session),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Profile:
    """
    Dependency to get the current authenticated user from Supabase JWT token.

    Verifies the Supabase JWT and fetches the corresponding profile.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Verify Supabase JWT token
        user_data = verify_supabase_jwt(credentials.credentials)

        if not user_data or "id" not in user_data:
            raise credentials_exception

        user_id = user_data["id"]
        user_uuid = uuid.UUID(user_id)

        # Fetch profile from database
        user = session.get(Profile, user_uuid)

        if user is None:
            # Profile doesn't exist yet - this shouldn't happen if trigger is working
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found. Please contact support."
            )

        return user

    except ValueError as e:
        # Invalid UUID format
        raise credentials_exception
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )