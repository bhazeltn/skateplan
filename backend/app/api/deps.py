from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session
from app.core.db import get_session
from app.models.user_models import Profile

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_user(
    session: Session = Depends(get_session),
    token: str = Depends(oauth2_scheme)
) -> Profile:
    # In a real app, decode JWT here.
    # For Stage 1/MVP/Testing, we might Mock this or use a simple lookup if token matches a known user.
    # For now, we'll just return a mock user or raise if token is missing.
    # To make life easy for testing, if token is "test-token", we return a dummy admin.
    
    if token == "test-token":
        return Profile(role="admin", full_name="Test Admin", email="admin@example.com", id="00000000-0000-0000-0000-000000000000")
        
    # TODO: Implement actual JWT decode with python-jose
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
