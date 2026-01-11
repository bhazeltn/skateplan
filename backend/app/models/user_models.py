import uuid
from typing import Optional
from sqlmodel import Field, SQLModel

class Profile(SQLModel, table=True):
    __tablename__ = "profiles"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    role: str # 'skater', 'coach', 'admin', 'guardian'
    full_name: str
    email: str = Field(index=True, unique=True)
    home_club: Optional[str] = None
    hashed_password: str = Field(nullable=False) # User confirmed this exists in DB

class GuardianLink(SQLModel, table=True):
    __tablename__ = "guardian_links"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    guardian_id: uuid.UUID = Field(foreign_key="profiles.id")
    skater_id: uuid.UUID = Field(foreign_key="profiles.id")
    status: str = "pending" # pending, active

class BetaWaitlist(SQLModel, table=True):
    __tablename__ = "beta_waitlist"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True)
    name: Optional[str] = None
    role: Optional[str] = None