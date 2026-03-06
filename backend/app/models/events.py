from datetime import date, datetime, timezone
from uuid import UUID, uuid4
from typing import Optional
from sqlmodel import Field, SQLModel, Relationship
from enum import Enum


class EventType(str, Enum):
    COMPETITION = "COMPETITION"
    TEST_DAY = "TEST_DAY"
    SIMULATION = "SIMULATION"
    CAMP = "CAMP"


class CompetitionBase(SQLModel):
    name: str
    start_date: date
    end_date: date
    country: Optional[str] = None
    state_province: Optional[str] = None
    city: Optional[str] = None
    is_verified: bool = Field(default=False)  # True if admin imported


class Competition(CompetitionBase, table=True):
    __tablename__ = "competitions"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SkaterEventBase(SQLModel):
    skater_id: UUID = Field(foreign_key="profiles.id")
    event_type: EventType
    competition_id: Optional[UUID] = Field(default=None, foreign_key="competitions.id")
    name: Optional[str] = None  # Used if it's a custom simulation/test day
    start_date: date
    end_date: date
    country: Optional[str] = None
    state_province: Optional[str] = None
    city: Optional[str] = None
    is_peak_event: bool = Field(default=False)  # Tells the YTP to build a peak macrocycle


class SkaterEvent(SkaterEventBase, table=True):
    __tablename__ = "skater_events"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
