import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.api.deps import get_session, get_current_user
from app.models.user_models import Profile

router = APIRouter()

@router.post("/", response_model=Profile)
def create_skater(
    *,
    session: Session = Depends(get_session),
    skater_in: Profile,
    current_user: Profile = Depends(get_current_user),
) -> Profile:
    # Minimal logic: just create the profile. 
    # In real app, check permissions (current_user.role == 'coach' etc.)
    skater_in.role = "skater" # Force role
    session.add(skater_in)
    session.commit()
    session.refresh(skater_in)
    return skater_in

@router.get("/", response_model=List[Profile])
def read_skaters(
    *,
    session: Session = Depends(get_session),
    skip: int = 0,
    limit: int = 100,
    current_user: Profile = Depends(get_current_user),
) -> List[Profile]:
    statement = select(Profile).where(Profile.role == "skater").offset(skip).limit(limit)
    skaters = session.exec(statement).all()
    return skaters
