import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel

from app.api.deps import get_session, get_current_user
from app.models.user_models import Profile, Partnership, SkaterCoachLink

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
