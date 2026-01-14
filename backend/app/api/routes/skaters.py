import uuid
from typing import List, Dict, Any
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel
from app.api.deps import get_session, get_current_user
from app.models.user_models import Profile, SkaterCoachLink
from app.core.age_calculator import calculate_age_info

router = APIRouter()

# Pydantic schemas for API requests/responses
class SkaterCreate(BaseModel):
    full_name: str
    dob: date
    level: str
    federation_code: str = "ISU"  # Default to ISU
    is_active: bool = True

class SkaterRead(BaseModel):
    id: str
    full_name: str
    email: str
    dob: date | None
    level: str | None
    is_active: bool
    home_club: str | None

class SkaterUpdate(BaseModel):
    full_name: str | None = None
    dob: date | None = None
    level: str | None = None
    is_active: bool | None = None
    home_club: str | None = None


@router.post("/", response_model=SkaterRead)
def create_skater(
    *,
    session: Session = Depends(get_session),
    skater_in: SkaterCreate,
    current_user: Profile = Depends(get_current_user),
) -> SkaterRead:
    """
    Create a new skater profile and link it to the current coach.

    Creates a Profile with role='skater' and establishes a SkaterCoachLink.
    """
    # Generate email for skater (temporary - should be set by user later)
    skater_email = f"skater.{uuid.uuid4().hex[:8]}@temp.skateplan.local"

    # Create profile with role='skater'
    skater = Profile(
        role="skater",
        full_name=skater_in.full_name,
        email=skater_email,
        dob=skater_in.dob,
        level=skater_in.level,
        federation_code=skater_in.federation_code,
        is_active=skater_in.is_active,
    )
    session.add(skater)
    session.flush()  # Get the skater ID

    # Create coach-skater link
    link = SkaterCoachLink(
        skater_id=skater.id,
        coach_id=current_user.id,
        is_primary=True,
        permission_level="edit",
        status="active"
    )
    session.add(link)
    session.commit()
    session.refresh(skater)

    return SkaterRead(
        id=str(skater.id),
        full_name=skater.full_name,
        email=skater.email,
        dob=skater.dob,
        level=skater.level,
        is_active=skater.is_active,
        home_club=skater.home_club
    )


@router.get("/", response_model=List[SkaterRead])
def read_skaters(
    *,
    session: Session = Depends(get_session),
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    current_user: Profile = Depends(get_current_user),
) -> List[SkaterRead]:
    """
    List all skaters linked to the current coach.

    Uses SkaterCoachLink to find skaters associated with this coach.
    """
    # Query skaters via coach-skater links
    query = (
        select(Profile)
        .join(SkaterCoachLink, SkaterCoachLink.skater_id == Profile.id)
        .where(SkaterCoachLink.coach_id == current_user.id)
        .where(Profile.role == "skater")
        .where(SkaterCoachLink.status == "active")
    )

    if active_only:
        query = query.where(Profile.is_active == True)

    statement = query.offset(skip).limit(limit)
    skaters = session.exec(statement).all()

    return [
        SkaterRead(
            id=str(s.id),
            full_name=s.full_name,
            email=s.email,
            dob=s.dob,
            level=s.level,
            is_active=s.is_active,
            home_club=s.home_club
        )
        for s in skaters
    ]


@router.patch("/{skater_id}/archive", response_model=SkaterRead)
def archive_skater(
    *,
    session: Session = Depends(get_session),
    skater_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
) -> SkaterRead:
    """Archive a skater (set is_active=False)."""
    skater = session.get(Profile, skater_id)
    if not skater or skater.role != "skater":
        raise HTTPException(status_code=404, detail="Skater not found")

    # Verify coach has permission
    link = session.exec(
        select(SkaterCoachLink)
        .where(SkaterCoachLink.skater_id == skater_id)
        .where(SkaterCoachLink.coach_id == current_user.id)
        .where(SkaterCoachLink.status == "active")
    ).first()

    if not link:
        raise HTTPException(status_code=403, detail="Not authorized")

    skater.is_active = False
    session.add(skater)
    session.commit()
    session.refresh(skater)

    return SkaterRead(
        id=str(skater.id),
        full_name=skater.full_name,
        email=skater.email,
        dob=skater.dob,
        level=skater.level,
        is_active=skater.is_active,
        home_club=skater.home_club
    )


@router.patch("/{skater_id}/restore", response_model=SkaterRead)
def restore_skater(
    *,
    session: Session = Depends(get_session),
    skater_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
) -> SkaterRead:
    """Restore an archived skater (set is_active=True)."""
    skater = session.get(Profile, skater_id)
    if not skater or skater.role != "skater":
        raise HTTPException(status_code=404, detail="Skater not found")

    # Verify coach has permission
    link = session.exec(
        select(SkaterCoachLink)
        .where(SkaterCoachLink.skater_id == skater_id)
        .where(SkaterCoachLink.coach_id == current_user.id)
        .where(SkaterCoachLink.status == "active")
    ).first()

    if not link:
        raise HTTPException(status_code=403, detail="Not authorized")

    skater.is_active = True
    session.add(skater)
    session.commit()
    session.refresh(skater)

    return SkaterRead(
        id=str(skater.id),
        full_name=skater.full_name,
        email=skater.email,
        dob=skater.dob,
        level=skater.level,
        is_active=skater.is_active,
        home_club=skater.home_club
    )


@router.patch("/{skater_id}", response_model=SkaterRead)
def update_skater(
    *,
    session: Session = Depends(get_session),
    skater_id: uuid.UUID,
    skater_in: SkaterUpdate,
    current_user: Profile = Depends(get_current_user),
) -> SkaterRead:
    """Update a skater's profile information."""
    skater = session.get(Profile, skater_id)
    if not skater or skater.role != "skater":
        raise HTTPException(status_code=404, detail="Skater not found")

    # Verify coach has permission
    link = session.exec(
        select(SkaterCoachLink)
        .where(SkaterCoachLink.skater_id == skater_id)
        .where(SkaterCoachLink.coach_id == current_user.id)
        .where(SkaterCoachLink.status == "active")
    ).first()

    if not link or link.permission_level not in ["edit"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this skater")

    # Update fields
    update_data = skater_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(skater, key, value)

    session.add(skater)
    session.commit()
    session.refresh(skater)

    return SkaterRead(
        id=str(skater.id),
        full_name=skater.full_name,
        email=skater.email,
        dob=skater.dob,
        level=skater.level,
        is_active=skater.is_active,
        home_club=skater.home_club
    )

@router.get("/{skater_id}/age-info", response_model=Dict[str, Any])
def get_skater_age_info(
    *,
    session: Session = Depends(get_session),
    skater_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Get comprehensive age information for a skater.

    Returns skating age (July 1st rule), chronological age, and adult age class.
    Reference: docs/16_DOMAIN_LOGIC_AND_RULES.md Section 4
    """
    skater = session.get(Profile, skater_id)
    if not skater or skater.role != "skater":
        raise HTTPException(status_code=404, detail="Skater not found")

    # Verify coach has permission to view this skater
    link = session.exec(
        select(SkaterCoachLink)
        .where(SkaterCoachLink.skater_id == skater_id)
        .where(SkaterCoachLink.coach_id == current_user.id)
        .where(SkaterCoachLink.status == "active")
    ).first()

    if not link:
        raise HTTPException(status_code=403, detail="Not authorized to view this skater")

    # Check if DOB is available
    if not skater.dob:
        raise HTTPException(
            status_code=400,
            detail="Date of birth not set for this skater"
        )

    # Calculate age information
    age_info = calculate_age_info(skater.dob)

    return age_info
