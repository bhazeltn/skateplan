"""
Models for skating levels system.

Levels are organized within streams, which belong to federations.
Supports dual fallback: ISU for youth, UNIVERSAL for adult.
"""
import uuid
from datetime import datetime
from typing import Optional, Tuple
from sqlmodel import Field, SQLModel
from sqlalchemy import UniqueConstraint
from pydantic import BaseModel


class Level(SQLModel, table=True):
    """
    Skating level within a stream.

    Each level belongs to a stream (e.g., Podium_Pathway, STARSkate_Singles).
    Levels are ordered within their stream and can be age-gated for adults.

    Dual Fallback System:
    - Youth/Competitive: If federation doesn't have discipline → use ISU
    - Adult: If federation doesn't have adult levels → use UNIVERSAL

    Examples:
    - CAN Podium_Pathway: Pre-Juvenile, Juvenile, Pre-Novice, Novice, Junior, Senior
    - USA Well_Balanced: Pre-Preliminary, Preliminary, Pre-Juvenile, Juvenile
    - ISU Singles_Pairs: Novice, Junior, Senior
    - UNIVERSAL Adult: Bronze, Silver, Gold, Masters I-V
    """
    __tablename__ = "levels"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    stream_id: uuid.UUID = Field(foreign_key="streams.id", ondelete="CASCADE", index=True)
    level_name: str  # e.g., "Junior", "STAR 5", "Intermediate"
    display_name: str  # How to display: "Podium Pathway: Junior" or "Junior"
    level_order: int = Field(index=True)  # For sorting in dropdown (1, 2, 3, ...)
    is_adult: bool = Field(default=False, index=True)  # Age gate flag for adult levels
    is_system: bool = Field(default=True)  # System vs coach-created
    isu_anchor: Optional[str] = Field(default=None)  # DEVELOPMENTAL, NOVICE_ADV, JUNIOR, SENIOR
    created_by_coach_id: Optional[uuid.UUID] = Field(foreign_key="profiles.id", default=None)  # If custom level
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Unique constraint on stream + level_name
    __table_args__: Tuple = (
        UniqueConstraint("stream_id", "level_name", name="uq_stream_level"),
    )


class LevelRead(BaseModel):
    """Schema for reading level data."""
    id: uuid.UUID
    stream_id: uuid.UUID
    level_name: str
    display_name: str
    level_order: int
    is_adult: bool
    is_system: bool
    isu_anchor: Optional[str] = None


class LevelWithStreamRead(BaseModel):
    """Schema for reading level data with stream and federation info."""
    id: uuid.UUID
    stream_id: uuid.UUID
    stream_code: str
    stream_display: str
    federation_code: str
    discipline: str
    level_name: str
    display_name: str
    level_order: int
    is_adult: bool
    is_system: bool
    isu_anchor: Optional[str] = None
    source: str = "federation"  # "federation" or "fallback"


class LevelCreate(BaseModel):
    """Schema for creating a custom level."""
    stream_id: uuid.UUID
    level_name: str
    level_order: int


class CustomLevelCreate(BaseModel):
    """Schema for creating a custom level by a coach."""
    stream_id: uuid.UUID
    level_name: str
