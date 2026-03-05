"""Events and Competitions API Routes.

Endpoints for managing competitions and skater events for the Yearly Training Plan.
"""
import uuid
from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from pydantic import BaseModel, Field, ConfigDict

from app.api.deps import get_session, get_current_user
from app.models.user_models import Profile
from app.models.events import Competition, SkaterEvent, EventType

router = APIRouter()


# ==================== Pydantic Schemas ====================

class CompetitionCreate(BaseModel):
    """Schema for creating a competition."""
    name: str = Field(max_length=200)
    start_date: date
    end_date: date
    location: Optional[str] = Field(None, max_length=200)
    city: Optional[str] = Field(None, max_length=100)
    region: Optional[str] = Field(None, max_length=10)


class CompetitionRead(BaseModel):
    """Schema for reading a competition."""
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    start_date: date
    end_date: date
    location: Optional[str]
    city: Optional[str]
    region: Optional[str]
    is_verified: bool
    created_at: datetime


class SkaterEventCreate(BaseModel):
    """Schema for creating a skater event."""
    event_type: EventType
    competition_id: Optional[uuid.UUID] = None
    name: Optional[str] = Field(None, max_length=200)
    start_date: date
    end_date: date
    is_peak_event: bool = False


class SkaterEventRead(BaseModel):
    """Schema for reading a skater event."""
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    skater_id: uuid.UUID
    event_type: EventType
    competition_id: Optional[uuid.UUID]
    name: Optional[str]
    start_date: date
    end_date: date
    is_peak_event: bool
    created_at: datetime


# ==================== Helper Functions ====================

def _get_skater_or_404(
    skater_id: uuid.UUID,
    session: Session,
    current_user: Profile
) -> Profile:
    """Get skater profile or raise 404. Also checks coach ownership."""
    skater = session.get(Profile, skater_id)
    if not skater:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skater not found"
        )

    # Check if current user (coach) has permission to access this skater
    from app.models.user_models import SkaterCoachLink

    link = session.exec(
        select(SkaterCoachLink).where(
            SkaterCoachLink.skater_id == skater_id,
            SkaterCoachLink.coach_id == current_user.id,
            SkaterCoachLink.status == "active"
        )
    ).first()

    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skater not found or no permission"
        )

    return skater


# ==================== Competition Endpoints ====================

@router.post("/competitions/", response_model=CompetitionRead, status_code=status.HTTP_200_OK)
def create_competition(
    competition: CompetitionCreate,
    session: Session = Depends(get_session),
    current_user: Profile = Depends(get_current_user)
):
    """Create a new competition."""
    db_competition = Competition(
        name=competition.name,
        start_date=competition.start_date,
        end_date=competition.end_date,
        location=competition.location,
        city=competition.city,
        region=competition.region,
        is_verified=False
    )
    session.add(db_competition)
    session.commit()
    session.refresh(db_competition)
    return db_competition


@router.get("/competitions/", response_model=List[CompetitionRead])
def list_competitions(
    q: Optional[str] = Query(None, description="Search query for competition name"),
    session: Session = Depends(get_session),
    current_user: Profile = Depends(get_current_user)
):
    """List all competitions, optionally filtered by search query."""
    statement = select(Competition)

    if q:
        # Case-insensitive search on name
        statement = statement.where(Competition.name.ilike(f"%{q}%"))

    competitions = session.exec(statement).all()
    return competitions


# ==================== Skater Event Endpoints ====================

@router.post("/skaters/{skater_id}/events/", response_model=SkaterEventRead, status_code=status.HTTP_200_OK)
def create_skater_event(
    skater_id: uuid.UUID,
    event: SkaterEventCreate,
    session: Session = Depends(get_session),
    current_user: Profile = Depends(get_current_user)
):
    """Create a new skater event."""
    # Verify skater exists and user has permission
    _get_skater_or_404(skater_id, session, current_user)

    db_event = SkaterEvent(
        skater_id=skater_id,
        event_type=event.event_type,
        competition_id=event.competition_id,
        name=event.name,
        start_date=event.start_date,
        end_date=event.end_date,
        is_peak_event=event.is_peak_event
    )
    session.add(db_event)
    session.commit()
    session.refresh(db_event)
    return db_event


@router.get("/skaters/{skater_id}/events/", response_model=List[SkaterEventRead])
def get_skater_events(
    skater_id: uuid.UUID,
    session: Session = Depends(get_session),
    current_user: Profile = Depends(get_current_user)
):
    """Get all events for a specific skater, ordered by date."""
    # Verify skater exists and user has permission
    _get_skater_or_404(skater_id, session, current_user)

    events = session.exec(
        select(SkaterEvent)
        .where(SkaterEvent.skater_id == skater_id)
        .order_by(SkaterEvent.start_date.asc())
    ).all()

    return events
