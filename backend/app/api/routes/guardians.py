"""
API routes for guardian-skater relationships.

Guardians are parents/legal guardians who can view skater information.
Age-gating ensures only minors (<18) require guardians.
"""
import uuid
from typing import List
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel

from app.api.deps import get_session, get_current_user
from app.models.user_models import Profile, GuardianLink

router = APIRouter()


class GuardianLinkCreate(BaseModel):
    guardian_id: uuid.UUID
    skater_id: uuid.UUID


class GuardianLinkRead(BaseModel):
    id: uuid.UUID
    guardian_id: uuid.UUID
    skater_id: uuid.UUID
    status: str


@router.post("/", response_model=GuardianLinkRead, status_code=status.HTTP_201_CREATED)
def create_guardian_link(
    *,
    session: Session = Depends(get_session),
    link_in: GuardianLinkCreate,
    current_user: Profile = Depends(get_current_user),
) -> GuardianLink:
    """Create a guardian-skater link."""
    # Age validation: only allow if skater is under 18
    skater = session.get(Profile, link_in.skater_id)
    if not skater or skater.role != "skater":
        raise HTTPException(status_code=404, detail="Skater not found")

    if skater.dob:
        age = (date.today() - skater.dob).days // 365
        if age >= 18:
            raise HTTPException(
                status_code=400,
                detail="Guardian links only allowed for skaters under 18"
            )

    link = GuardianLink(**link_in.model_dump(), status="pending")
    session.add(link)
    session.commit()
    session.refresh(link)
    return link


@router.get("/wards", response_model=List[GuardianLinkRead])
def get_my_wards(
    *,
    session: Session = Depends(get_session),
    current_user: Profile = Depends(get_current_user),
) -> List[GuardianLink]:
    """Get all skaters linked to current guardian."""
    links = session.exec(
        select(GuardianLink).where(GuardianLink.guardian_id == current_user.id)
    ).all()
    return list(links)
