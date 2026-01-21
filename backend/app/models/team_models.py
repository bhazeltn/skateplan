import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, Relationship
from pydantic import BaseModel

class Team(SQLModel, table=True):
    """
    Team table for Ice Dance and Pairs teams.

    A team consists of 2 skaters (partners) competing together.
    Each team has a federation, discipline, and level.
    """
    __tablename__ = "teams"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    coach_id: uuid.UUID = Field(foreign_key="profiles.id", index=True)
    team_name: Optional[str] = None  # Optional custom team name
    federation: str  # Federation code (e.g., "CAN", "USA")
    discipline: str  # "Pairs" or "Ice_Dance"
    current_level: str  # Team's current level
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class TeamMember(SQLModel, table=True):
    """
    Team members table linking skaters to teams.

    For Ice Dance/Pairs, there are exactly 2 members per team.
    """
    __tablename__ = "team_members"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    team_id: uuid.UUID = Field(foreign_key="teams.id", index=True, ondelete="CASCADE")
    skater_id: uuid.UUID = Field(foreign_key="profiles.id", index=True)
    role: str = "partner"  # "partner" for both in Ice Dance/Pairs
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Pydantic schemas for API
class TeamCreate(BaseModel):
    skater1_id: str
    skater2_id: str
    federation_code: str
    discipline: str  # "Pairs" or "Ice_Dance"
    current_level: str
    team_name: Optional[str] = None


class TeamMemberRead(BaseModel):
    id: str
    full_name: str


class TeamRead(BaseModel):
    id: str
    team_name: Optional[str]
    partner1_name: str
    partner2_name: str
    federation_code: str
    federation_name: Optional[str]
    federation_iso_code: Optional[str]
    country_name: Optional[str]
    discipline: str
    current_level: str
    is_active: bool
