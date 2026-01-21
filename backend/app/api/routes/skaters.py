import uuid
from typing import List, Dict, Any
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel
from app.api.deps import get_session, get_current_user
from app.models.user_models import Profile, SkaterCoachLink
from app.models.federation_models import Federation
from app.core.age_calculator import calculate_age_info

router = APIRouter()

# Pydantic schemas for API requests/responses
class SkaterCreate(BaseModel):
    full_name: str
    dob: date
    federation_code: str = "ISU"  # Default to ISU
    training_site: str | None = None
    home_club: str | None = None
    is_active: bool = True

    # Coach relationship fields - discipline and level stored on SkaterCoachLink
    discipline: str  # Required: What discipline is coach working with skater in
    current_level: str  # Required: What level in that discipline

class SkaterRead(BaseModel):
    id: str
    full_name: str
    email: str
    dob: date | None
    federation_code: str | None
    federation_name: str | None = None
    federation_iso_code: str | None = None
    country_name: str | None = None
    training_site: str | None
    home_club: str | None
    is_active: bool

    # From SkaterCoachLink (for this coach)
    discipline: str
    current_level: str

class SkaterUpdate(BaseModel):
    full_name: str | None = None
    dob: date | None = None
    training_site: str | None = None
    is_active: bool | None = None
    home_club: str | None = None

    # Allow updating discipline and level on the link
    discipline: str | None = None
    current_level: str | None = None


@router.post("/", response_model=SkaterRead)
def create_skater(
    *,
    session: Session = Depends(get_session),
    skater_in: SkaterCreate,
    current_user: Profile = Depends(get_current_user),
) -> SkaterRead:
    """
    Create a new skater profile and link it to the current coach.

    Creates a Profile with role='skater' and establishes a SkaterCoachLink
    with discipline and current_level specific to this coach-skater relationship.
    """
    # Generate email for skater (temporary - should be set by user later)
    skater_email = f"skater.{uuid.uuid4().hex[:8]}@temp.skateplan.local"

    # Create profile with role='skater' (without level - that's on the link now)
    skater = Profile(
        role="skater",
        full_name=skater_in.full_name,
        email=skater_email,
        dob=skater_in.dob,
        federation=skater_in.federation_code,
        training_site=skater_in.training_site,
        home_club=skater_in.home_club,
        is_active=skater_in.is_active,
    )
    session.add(skater)
    session.flush()  # Get the skater ID

    # Create coach-skater link WITH discipline and current_level
    link = SkaterCoachLink(
        skater_id=skater.id,
        coach_id=current_user.id,
        discipline=skater_in.discipline,
        current_level=skater_in.current_level,
        is_primary=True,
        permission_level="edit",
        status="active"
    )
    session.add(link)
    session.commit()
    session.refresh(skater)

    # Get federation details
    federation = session.exec(
        select(Federation).where(Federation.code == skater.federation)
    ).first()

    return SkaterRead(
        id=str(skater.id),
        full_name=skater.full_name,
        email=skater.email,
        dob=skater.dob,
        federation_code=skater.federation,
        federation_name=federation.name if federation else None,
        federation_iso_code=federation.iso_code if federation else None,
        country_name=federation.country_name if federation else None,
        training_site=skater.training_site,
        home_club=skater.home_club,
        is_active=skater.is_active,
        discipline=link.discipline,
        current_level=link.current_level
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
    Returns discipline and current_level from the coach-skater relationship.
    """
    # Query skaters via coach-skater links, joining federation for details
    query = (
        select(Profile, SkaterCoachLink, Federation)
        .join(SkaterCoachLink, SkaterCoachLink.skater_id == Profile.id)
        .join(Federation, Profile.federation == Federation.code, isouter=True)
        .where(SkaterCoachLink.coach_id == current_user.id)
        .where(Profile.role == "skater")
        .where(SkaterCoachLink.status == "active")
    )

    if active_only:
        query = query.where(Profile.is_active == True)

    statement = query.offset(skip).limit(limit)
    results = session.exec(statement).all()

    return [
        SkaterRead(
            id=str(profile.id),
            full_name=profile.full_name,
            email=profile.email,
            dob=profile.dob,
            federation_code=profile.federation,
            federation_name=federation.name if federation else None,
            federation_iso_code=federation.iso_code if federation else None,
            country_name=federation.country_name if federation else None,
            training_site=profile.training_site,
            home_club=profile.home_club,
            is_active=profile.is_active,
            discipline=link.discipline,
            current_level=link.current_level
        )
        for profile, link, federation in results
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

    # Get federation details
    federation = session.exec(
        select(Federation).where(Federation.code == skater.federation)
    ).first()

    return SkaterRead(
        id=str(skater.id),
        full_name=skater.full_name,
        email=skater.email,
        dob=skater.dob,
        federation_code=skater.federation,
        federation_name=federation.name if federation else None,
        federation_iso_code=federation.iso_code if federation else None,
        country_name=federation.country_name if federation else None,
        training_site=skater.training_site,
        home_club=skater.home_club,
        is_active=skater.is_active,
        discipline=link.discipline,
        current_level=link.current_level
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

    # Get federation details
    federation = session.exec(
        select(Federation).where(Federation.code == skater.federation)
    ).first()

    return SkaterRead(
        id=str(skater.id),
        full_name=skater.full_name,
        email=skater.email,
        dob=skater.dob,
        federation_code=skater.federation,
        federation_name=federation.name if federation else None,
        federation_iso_code=federation.iso_code if federation else None,
        country_name=federation.country_name if federation else None,
        training_site=skater.training_site,
        home_club=skater.home_club,
        is_active=skater.is_active,
        discipline=link.discipline,
        current_level=link.current_level
    )


@router.patch("/{skater_id}", response_model=SkaterRead)
def update_skater(
    *,
    session: Session = Depends(get_session),
    skater_id: uuid.UUID,
    skater_in: SkaterUpdate,
    current_user: Profile = Depends(get_current_user),
) -> SkaterRead:
    """Update a skater's profile information and/or coach-skater relationship."""
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

    # Separate link fields from profile fields
    update_data = skater_in.model_dump(exclude_unset=True)
    link_fields = {"discipline", "current_level"}

    # Update link fields
    for key in link_fields:
        if key in update_data:
            setattr(link, key, update_data.pop(key))

    # Update profile fields
    for key, value in update_data.items():
        setattr(skater, key, value)

    session.add(skater)
    session.add(link)
    session.commit()
    session.refresh(skater)
    session.refresh(link)

    # Get federation details
    federation = session.exec(
        select(Federation).where(Federation.code == skater.federation)
    ).first()

    return SkaterRead(
        id=str(skater.id),
        full_name=skater.full_name,
        email=skater.email,
        dob=skater.dob,
        federation_code=skater.federation,
        federation_name=federation.name if federation else None,
        federation_iso_code=federation.iso_code if federation else None,
        country_name=federation.country_name if federation else None,
        training_site=skater.training_site,
        home_club=skater.home_club,
        is_active=skater.is_active,
        discipline=link.discipline,
        current_level=link.current_level
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
