"""Authentication routes using Supabase Auth (GoTrue)."""
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlmodel import Session, select
from app.api.deps import get_session
from app.core.supabase import get_supabase_client
from app.models.user_models import Profile
import uuid

router = APIRouter()

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "coach"  # Default role

class SigninRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: dict

@router.post("/auth/signup", response_model=AuthResponse)
def signup(
    request: SignupRequest,
    session: Session = Depends(get_session)
) -> Any:
    """
    Register a new user with Supabase Auth.

    This creates a user in auth.users and relies on a database trigger
    to automatically create the corresponding profile in public.profiles.
    """
    supabase = get_supabase_client()

    try:
        # Sign up user with Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "full_name": request.full_name,
                    "role": request.role
                }
            }
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User registration failed"
            )

        # Profile will be created automatically by database trigger
        # Return auth tokens
        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "user": {
                "id": auth_response.user.id,
                "email": auth_response.user.email,
                "role": request.role
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Signup failed: {str(e)}"
        )

@router.post("/auth/signin", response_model=AuthResponse)
def signin(request: SigninRequest) -> Any:
    """
    Sign in with email and password using Supabase Auth.
    """
    supabase = get_supabase_client()

    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "user": {
                "id": auth_response.user.id,
                "email": auth_response.user.email,
                "role": auth_response.user.user_metadata.get("role", "coach")
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )

@router.post("/auth/signout")
def signout() -> Any:
    """Sign out current user."""
    supabase = get_supabase_client()

    try:
        supabase.auth.sign_out()
        return {"message": "Signed out successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sign out failed: {str(e)}"
        )

@router.post("/auth/refresh")
def refresh_token(refresh_token: str) -> Any:
    """Refresh access token using refresh token."""
    supabase = get_supabase_client()

    try:
        auth_response = supabase.auth.refresh_session(refresh_token)

        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token refresh failed: {str(e)}"
        )
