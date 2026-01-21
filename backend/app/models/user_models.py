import uuid
from datetime import date
from typing import Optional, Dict, Any, List
from sqlmodel import Field, SQLModel
from sqlalchemy.types import JSON

class Profile(SQLModel, table=True):
    """
    Unified profile model for all users (coaches, skaters, admins, guardians).

    Replaces separate 'skaters' table - all users are profiles with different roles.
    Authentication is handled by Supabase Auth (auth.users), this table stores
    application-specific profile data.
    """
    __tablename__ = "profiles"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    role: str # 'skater', 'coach', 'admin', 'guardian'
    full_name: str
    email: str = Field(index=True, unique=True)
    home_club: Optional[str] = None
    # NOTE: No hashed_password - authentication handled by Supabase Auth (auth.users)

    # Skater-specific fields (only used when role='skater')
    dob: Optional[date] = None
    level: Optional[str] = None  # DEPRECATED: Use SkaterCoachLink.current_level instead
    is_active: bool = Field(default=True)  # Active vs archived
    is_adaptive: bool = Field(default=False)

    # Coach/Location fields
    training_site: Optional[str] = None
    federation: Optional[str] = None  # ISU, USFS, SC, OTHER
    isu_level_anchor: Optional[str] = None  # NOVICE, JUNIOR, SENIOR

    # Multi-discipline support
    active_disciplines: List[str] = Field(default=[], sa_type=JSON)

class GuardianLink(SQLModel, table=True):
    __tablename__ = "guardian_links"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    guardian_id: uuid.UUID = Field(foreign_key="profiles.id")
    skater_id: uuid.UUID = Field(foreign_key="profiles.id")
    status: str = "pending" # pending, active

class SkaterCoachLink(SQLModel, table=True):
    """
    Bridge table linking skaters to coaches.
    Supports multi-coach collaboration with permission levels.

    Discipline and level are stored here (not on Profile) since different
    coaches can work with the same skater in different disciplines at different levels.
    """
    __tablename__ = "skater_coach_links"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    skater_id: uuid.UUID = Field(foreign_key="profiles.id", index=True)
    coach_id: uuid.UUID = Field(foreign_key="profiles.id", index=True)

    # Discipline and level for this coach-skater relationship
    discipline: str  # "Singles", "Solo_Dance", "Ice_Dance", "Pairs", "Artistic", "Showcase", "Synchro"
    current_level: str  # The level this coach is working with skater at

    permission_level: str = Field(default="view")  # 'view', 'edit'
    is_primary: bool = Field(default=False)  # Primary coach flag
    created_at: date = Field(default_factory=date.today)
    status: str = Field(default="active")  # 'active', 'pending', 'archived'

class Partnership(SQLModel, table=True):
    """
    Bridge model linking two skaters into Pairs/Dance/Synchro teams.
    Does not create separate user accounts - links existing profiles.
    """
    __tablename__ = "partnerships"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    skater_a_id: uuid.UUID = Field(foreign_key="profiles.id")
    skater_b_id: uuid.UUID = Field(foreign_key="profiles.id")
    discipline: str  # PAIRS, ICE_DANCE, SYNCHRO
    team_level: Optional[str] = None  # e.g., "Junior"
    created_at: date = Field(default_factory=date.today)
    is_active: bool = Field(default=True)

class BetaWaitlist(SQLModel, table=True):
    __tablename__ = "beta_waitlist"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True)
    name: Optional[str] = None
    role: Optional[str] = None
