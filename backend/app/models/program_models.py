"""
Program models for managing skating programs and their assets.

A Program represents a specific skating program (Short Program, Free Skate, etc.)
with associated music, choreography, costumes, and technical content.
"""
import uuid
from datetime import datetime, date
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship


class Program(SQLModel, table=True):
    """
    Represents a skating program (Short Program, Free Skate, etc.)

    A program is owned by a skater and contains metadata about the program
    plus links to assets (music, choreography notes, costume details, etc.)
    """
    __tablename__ = "programs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    skater_id: uuid.UUID = Field(foreign_key="profiles.id", index=True)
    name: str  # e.g., "Free Skate 2024-25"
    discipline: str  # singles, pairs, ice_dance, synchro
    season: str  # e.g., "2024-25"
    level: Optional[str] = None  # Junior, Senior, etc.
    music_duration_seconds: Optional[int] = None  # Total music length
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    asset_links: List["ProgramAssetLink"] = Relationship(back_populates="program")
    elements: List["ProgramElement"] = Relationship(back_populates="program")


class ProgramAssetLink(SQLModel, table=True):
    """
    Links assets (music, costume, choreography notes, etc.) to programs.

    This is a bridge table between programs and program_assets.
    """
    __tablename__ = "program_asset_links"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    program_id: uuid.UUID = Field(foreign_key="programs.id", index=True)
    asset_id: uuid.UUID = Field(foreign_key="program_assets.id", index=True)
    asset_type: str  # music, costume, choreography, video, technical
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    program: Program = Relationship(back_populates="asset_links")


class ProgramElement(SQLModel, table=True):
    """
    Technical elements planned for a program (for PPC - Planned Program Content).

    Each row represents one element in the program with its base value.
    """
    __tablename__ = "program_elements"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    program_id: uuid.UUID = Field(foreign_key="programs.id", index=True)
    element_id: uuid.UUID = Field(foreign_key="elements.id")  # FK to ISU library
    sequence_number: int  # Order in the program (1, 2, 3, ...)
    notes: Optional[str] = None  # e.g., "combo", "second half"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    program: Program = Relationship(back_populates="elements")


# Pydantic schemas for API
class ProgramCreate(SQLModel):
    name: str
    discipline: str
    season: str
    level: Optional[str] = None
    music_duration_seconds: Optional[int] = None


class ProgramRead(SQLModel):
    id: uuid.UUID
    skater_id: uuid.UUID
    name: str
    discipline: str
    season: str
    level: Optional[str]
    music_duration_seconds: Optional[int]
    is_active: bool
    created_at: datetime


class ProgramUpdate(SQLModel):
    name: Optional[str] = None
    level: Optional[str] = None
    music_duration_seconds: Optional[int] = None


class ProgramAssetLinkCreate(SQLModel):
    program_id: uuid.UUID
    asset_id: uuid.UUID
    asset_type: str
    notes: Optional[str] = None


class ProgramAssetLinkRead(SQLModel):
    id: uuid.UUID
    program_id: uuid.UUID
    asset_id: uuid.UUID
    asset_type: str
    notes: Optional[str]
    created_at: datetime


class ProgramElementCreate(SQLModel):
    program_id: uuid.UUID
    element_id: uuid.UUID
    sequence_number: int
    notes: Optional[str] = None


class ProgramElementRead(SQLModel):
    id: uuid.UUID
    program_id: uuid.UUID
    element_id: uuid.UUID
    sequence_number: int
    notes: Optional[str]
