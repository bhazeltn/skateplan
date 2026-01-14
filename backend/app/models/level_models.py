"""
Models for skating levels system.

Supports federation-specific levels (ISU, USA, CAN, etc.) with the ability
for coaches to add custom levels.
"""
import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel
from pydantic import BaseModel


class Level(SQLModel, table=True):
    """
    Skating level for a specific federation.

    Levels are federation-specific:
    - ISU: Basic Novice, Advanced Novice, Junior, Senior
    - USA: Preliminary, Pre-Juvenile, Juvenile, Intermediate, Novice, Junior, Senior
    - CAN: STAR 1-10, Pre-Novice, Novice, Junior, Senior

    Coaches can also create custom levels for any federation.
    """
    __tablename__ = "levels"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    federation_code: str = Field(index=True)  # e.g., "ISU", "USA", "CAN"
    level_name: str  # e.g., "Junior", "STAR 5", "Intermediate"
    level_order: int  # For sorting in dropdown (1, 2, 3, ...)
    is_system: bool = Field(default=True)  # System vs coach-created
    created_by_coach_id: Optional[uuid.UUID] = None  # If custom level
    created_at: datetime = Field(default_factory=datetime.utcnow)


class LevelRead(BaseModel):
    """Schema for reading level data."""
    id: uuid.UUID
    federation_code: str
    level_name: str
    level_order: int
    is_system: bool


class LevelCreate(BaseModel):
    """Schema for creating a custom level."""
    federation_code: str
    level_name: str
    level_order: int
