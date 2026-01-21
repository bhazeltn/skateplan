import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel

from app.api.deps import get_session, get_current_user
from app.models.user_models import Profile, Partnership, SkaterCoachLink
from app.models.federation_models import Federation

router = APIRouter()


# Pydantic schemas
class PartnershipCreate(BaseModel):
    skater_a_id: uuid.UUID
    skater_b_id: uuid.UUID
    discipline: str  # "PAIRS", "ICE_DANCE", "SYNCHRO"
    team_level: str | None = None


class PartnershipRead(BaseModel):
    id: uuid.UUID
    skater_a_id: uuid.UUID
    skater_a_name: str
    skater_b_id: uuid.UUID
    skater_b_name: str
    discipline: str
    team_level: str | None
    is_active: bool


class SkaterDetail(BaseModel):
    """Detailed skater info for partnership detail view."""
    id: uuid.UUID
    full_name: str
    dob: str | None
    federation_code: str | None
    federation_name: str | None
    federation_iso_code: str | None
    country_name: str | None
    current_level: str | None


class PartnershipDetail(BaseModel):
    """Detailed partnership info including full skater details."""
    id: uuid.UUID
    skater_a: SkaterDetail
    skater_b: SkaterDetail
    discipline: str
    team_level: str | None
    is_active: bool


class PartnershipUpdate(BaseModel):
    """Schema for updating partnership."""
    discipline: str | None = None
    team_level: str | None = None


@router.post("/", response_model=PartnershipRead)
def create_partnership(
    *,
    session: Session = Depends(get_session),
    partnership_in: PartnershipCreate,
    current_user: Profile = Depends(get_current_user),
) -> PartnershipRead:
    """
    Create a new partnership (Pairs/Ice Dance/Synchro team).

    Links two existing skater profiles together. Coach must have permission
    to manage both skaters.
    """
    # Verify both skaters exist and are skaters
    skater_a = session.get(Profile, partnership_in.skater_a_id)
    skater_b = session.get(Profile, partnership_in.skater_b_id)

    if not skater_a or skater_a.role != "skater":
        raise HTTPException(
            status_code=404,
            detail=f"Skater A not found"
        )

    if not skater_b or skater_b.role != "skater":
        raise HTTPException(
            status_code=404,
            detail=f"Skater B not found"
        )

    # Verify coach has permission for both skaters
    link_a = session.exec(
        select(SkaterCoachLink)
        .where(SkaterCoachLink.skater_id == partnership_in.skater_a_id)
        .where(SkaterCoachLink.coach_id == current_user.id)
        .where(SkaterCoachLink.status == "active")
    ).first()

    link_b = session.exec(
        select(SkaterCoachLink)
        .where(SkaterCoachLink.skater_id == partnership_in.skater_b_id)
        .where(SkaterCoachLink.coach_id == current_user.id)
        .where(SkaterCoachLink.status == "active")
    ).first()

    if not link_a or not link_b:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to create partnership for these skaters"
        )

    # Validate discipline
    valid_disciplines = ["PAIRS", "ICE_DANCE", "SYNCHRO"]
    if partnership_in.discipline.upper() not in valid_disciplines:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid discipline. Must be one of: {', '.join(valid_disciplines)}"
        )

    # Create partnership
    partnership = Partnership(
        skater_a_id=partnership_in.skater_a_id,
        skater_b_id=partnership_in.skater_b_id,
        discipline=partnership_in.discipline.upper(),
        team_level=partnership_in.team_level,
        is_active=True
    )

    session.add(partnership)
    session.commit()
    session.refresh(partnership)

    return PartnershipRead(
        id=partnership.id,
        skater_a_id=partnership.skater_a_id,
        skater_a_name=skater_a.full_name,
        skater_b_id=partnership.skater_b_id,
        skater_b_name=skater_b.full_name,
        discipline=partnership.discipline,
        team_level=partnership.team_level,
        is_active=partnership.is_active
    )


@router.get("/", response_model=List[PartnershipRead])
def list_partnerships(
    *,
    session: Session = Depends(get_session),
    active_only: bool = True,
    current_user: Profile = Depends(get_current_user),
) -> List[PartnershipRead]:
    """
    List all partnerships for skaters coached by the current user.

    Returns teams where the coach has permission for at least one skater.
    """
    # Get all skater IDs coached by current user
    skater_ids_query = (
        select(SkaterCoachLink.skater_id)
        .where(SkaterCoachLink.coach_id == current_user.id)
        .where(SkaterCoachLink.status == "active")
    )
    skater_ids = [row for row in session.exec(skater_ids_query).all()]

    # Find partnerships involving any of these skaters
    query = select(Partnership).where(
        (Partnership.skater_a_id.in_(skater_ids)) |
        (Partnership.skater_b_id.in_(skater_ids))
    )

    if active_only:
        query = query.where(Partnership.is_active == True)

    partnerships = session.exec(query).all()

    # Build response with skater names
    result = []
    for p in partnerships:
        skater_a = session.get(Profile, p.skater_a_id)
        skater_b = session.get(Profile, p.skater_b_id)

        if skater_a and skater_b:
            result.append(PartnershipRead(
                id=p.id,
                skater_a_id=p.skater_a_id,
                skater_a_name=skater_a.full_name,
                skater_b_id=p.skater_b_id,
                skater_b_name=skater_b.full_name,
                discipline=p.discipline,
                team_level=p.team_level,
                is_active=p.is_active
            ))

    return result


@router.delete("/{partnership_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_partnership(
    *,
    session: Session = Depends(get_session),
    partnership_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
) -> None:
    """
    Delete a partnership (set is_active=False).

    Coach must have permission for at least one skater in the partnership.
    """
    partnership = session.get(Partnership, partnership_id)
    if not partnership:
        raise HTTPException(status_code=404, detail="Partnership not found")

    # Verify coach has permission for at least one skater
    link_a = session.exec(
        select(SkaterCoachLink)
        .where(SkaterCoachLink.skater_id == partnership.skater_a_id)
        .where(SkaterCoachLink.coach_id == current_user.id)
        .where(SkaterCoachLink.status == "active")
    ).first()

    link_b = session.exec(
        select(SkaterCoachLink)
        .where(SkaterCoachLink.skater_id == partnership.skater_b_id)
        .where(SkaterCoachLink.coach_id == current_user.id)
        .where(SkaterCoachLink.status == "active")
    ).first()

    if not link_a and not link_b:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to delete this partnership"
        )

    # Soft delete by setting is_active=False
    partnership.is_active = False
    session.add(partnership)
    session.commit()


@router.get("/{partnership_id}", response_model=PartnershipDetail)
def get_partnership(
    *,
    session: Session = Depends(get_session),
    partnership_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
) -> PartnershipDetail:
    """
    Get detailed information about a specific partnership.

    Includes full skater details with federations, levels, etc.
    Coach must have permission for at least one skater.
    """
    partnership = session.get(Partnership, partnership_id)
    if not partnership:
        raise HTTPException(status_code=404, detail="Partnership not found")

    # Verify coach has permission for at least one skater
    link_a = session.exec(
        select(SkaterCoachLink)
        .where(SkaterCoachLink.skater_id == partnership.skater_a_id)
        .where(SkaterCoachLink.coach_id == current_user.id)
        .where(SkaterCoachLink.status == "active")
    ).first()

    link_b = session.exec(
        select(SkaterCoachLink)
        .where(SkaterCoachLink.skater_id == partnership.skater_b_id)
        .where(SkaterCoachLink.coach_id == current_user.id)
        .where(SkaterCoachLink.status == "active")
    ).first()

    if not link_a and not link_b:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to view this partnership"
        )

    # Get full skater details
    skater_a = session.get(Profile, partnership.skater_a_id)
    skater_b = session.get(Profile, partnership.skater_b_id)

    if not skater_a or not skater_b:
        raise HTTPException(status_code=404, detail="Skater not found")

    # Get federation details for both skaters
    fed_a = None
    if skater_a.federation:
        fed_a = session.exec(
            select(Federation).where(Federation.code == skater_a.federation)
        ).first()

    fed_b = None
    if skater_b.federation:
        fed_b = session.exec(
            select(Federation).where(Federation.code == skater_b.federation)
        ).first()

    return PartnershipDetail(
        id=partnership.id,
        skater_a=SkaterDetail(
            id=skater_a.id,
            full_name=skater_a.full_name,
            dob=str(skater_a.dob) if skater_a.dob else None,
            federation_code=skater_a.federation,
            federation_name=fed_a.name if fed_a else None,
            federation_iso_code=fed_a.iso_code if fed_a else None,
            country_name=fed_a.country_name if fed_a else None,
            current_level=link_a.current_level if link_a else None
        ),
        skater_b=SkaterDetail(
            id=skater_b.id,
            full_name=skater_b.full_name,
            dob=str(skater_b.dob) if skater_b.dob else None,
            federation_code=skater_b.federation,
            federation_name=fed_b.name if fed_b else None,
            federation_iso_code=fed_b.iso_code if fed_b else None,
            country_name=fed_b.country_name if fed_b else None,
            current_level=link_b.current_level if link_b else None
        ),
        discipline=partnership.discipline,
        team_level=partnership.team_level,
        is_active=partnership.is_active
    )


@router.patch("/{partnership_id}", response_model=PartnershipDetail)
def update_partnership(
    *,
    session: Session = Depends(get_session),
    partnership_id: uuid.UUID,
    partnership_in: PartnershipUpdate,
    current_user: Profile = Depends(get_current_user),
) -> PartnershipDetail:
    """
    Update a partnership's discipline or team level.

    Cannot change the skaters in a partnership - must delete and recreate instead.
    Coach must have permission for at least one skater.
    """
    partnership = session.get(Partnership, partnership_id)
    if not partnership:
        raise HTTPException(status_code=404, detail="Partnership not found")

    # Verify coach has permission for at least one skater
    link_a = session.exec(
        select(SkaterCoachLink)
        .where(SkaterCoachLink.skater_id == partnership.skater_a_id)
        .where(SkaterCoachLink.coach_id == current_user.id)
        .where(SkaterCoachLink.status == "active")
    ).first()

    link_b = session.exec(
        select(SkaterCoachLink)
        .where(SkaterCoachLink.skater_id == partnership.skater_b_id)
        .where(SkaterCoachLink.coach_id == current_user.id)
        .where(SkaterCoachLink.status == "active")
    ).first()

    if not link_a and not link_b:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to update this partnership"
        )

    # Validate discipline if provided
    if partnership_in.discipline:
        valid_disciplines = ["PAIRS", "ICE_DANCE", "SYNCHRO"]
        if partnership_in.discipline.upper() not in valid_disciplines:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid discipline. Must be one of: {', '.join(valid_disciplines)}"
            )
        partnership.discipline = partnership_in.discipline.upper()

    # Update team level if provided
    if partnership_in.team_level is not None:
        partnership.team_level = partnership_in.team_level

    session.add(partnership)
    session.commit()
    session.refresh(partnership)

    # Return full details using the GET endpoint logic
    return get_partnership(
        session=session,
        partnership_id=partnership_id,
        current_user=current_user
    )
