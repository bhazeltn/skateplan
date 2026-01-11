import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.api.deps import get_session, get_current_user
from app.models.user_models import Profile
from app.models.skater_models import Skater, SkaterCreate, SkaterRead, SkaterUpdate

router = APIRouter()

@router.post("/", response_model=SkaterRead)
def create_skater(
    *,
    session: Session = Depends(get_session),
    skater_in: SkaterCreate,
    current_user: Profile = Depends(get_current_user),
) -> Skater:
    skater = Skater.model_validate(skater_in, update={"coach_id": current_user.id})
    session.add(skater)
    session.commit()
    session.refresh(skater)
    return skater

@router.get("/", response_model=List[SkaterRead])
def read_skaters(
    *,
    session: Session = Depends(get_session),
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    current_user: Profile = Depends(get_current_user),
) -> List[Skater]:
    query = select(Skater).where(Skater.coach_id == current_user.id)
    if active_only:
        query = query.where(Skater.is_active == True)
    
    statement = query.offset(skip).limit(limit)
    skaters = session.exec(statement).all()
    return skaters

@router.patch("/{skater_id}/archive", response_model=SkaterRead)
def archive_skater(
    *,
    session: Session = Depends(get_session),
    skater_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
) -> Skater:
    skater = session.get(Skater, skater_id)
    if not skater:
        raise HTTPException(status_code=404, detail="Skater not found")
    
    if skater.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    skater.is_active = False
    session.add(skater)
    session.commit()
    session.refresh(skater)
    return skater

@router.patch("/{skater_id}/restore", response_model=SkaterRead)
def restore_skater(
    *,
    session: Session = Depends(get_session),
    skater_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
) -> Skater:
    skater = session.get(Skater, skater_id)
    if not skater:
        raise HTTPException(status_code=404, detail="Skater not found")
    
    if skater.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    skater.is_active = True
    session.add(skater)
    session.commit()
    session.refresh(skater)
    return skater

@router.patch("/{skater_id}", response_model=SkaterRead)
def update_skater(
    *,
    session: Session = Depends(get_session),
    skater_id: uuid.UUID,
    skater_in: SkaterUpdate,
    current_user: Profile = Depends(get_current_user),
) -> Skater:
    skater = session.get(Skater, skater_id)
    if not skater:
        raise HTTPException(status_code=404, detail="Skater not found")
    
    if skater.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this skater")
    
    skater_data = skater_in.model_dump(exclude_unset=True)
    for key, value in skater_data.items():
        setattr(skater, key, value)
        
    session.add(skater)
    session.commit()
    session.refresh(skater)
    return skater
