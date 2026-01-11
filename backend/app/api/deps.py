from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlmodel import Session
import uuid

from app.core.db import get_session
from app.core.config import settings
from app.models.user_models import Profile

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_user(
    session: Session = Depends(get_session),
    token: str = Depends(oauth2_scheme)
) -> Profile:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user_uuid = uuid.UUID(user_id)
    user = session.get(Profile, user_uuid)
    
    if user is None:
        # In a real Supabase setup, the user might exist in auth.users but not yet in public.profiles
        # For this backend, we strictly require a profile.
        raise credentials_exception
        
    return user