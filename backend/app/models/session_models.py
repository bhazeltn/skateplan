"""
Models for training session planning and tracking.

Supports individual and team sessions with element tracking and progress monitoring.
"""
import uuid
from datetime import date, datetime
from typing import Optional
from sqlmodel import Field, SQLModel, Relationship


class Session(SQLModel, table=True):
    """
    Training session for individual skater or partnership.

    A session represents a planned or completed training session where coaches
    track which elements are worked on and progress made.

    Sessions can be for:
    - Individual skater (skater_id set, partnership_id null)
    - Partnership/team (partnership_id set, skater_id null)
    """
    __tablename__ = "sessions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    # Either skater_id OR partnership_id must be set (not both)
    skater_id: Optional[uuid.UUID] = Field(default=None, foreign_key="profiles.id", index=True)
    partnership_id: Optional[uuid.UUID] = Field(default=None, foreign_key="partnerships.id", index=True)

    coach_id: uuid.UUID = Field(foreign_key="profiles.id", index=True)
    session_date: date = Field(index=True)
    session_type: str  # PRACTICE, LESSON, COMPETITION, TEST
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    location: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SessionElement(SQLModel, table=True):
    """
    Element tracked during a training session.

    Tracks:
    - How many times the element was planned to be attempted (target_attempts)
    - How many times it was actually attempted (actual_attempts)
    - How many times it was successfully landed (successful_attempts)
    - Coach's quality rating (1-5)
    - Notes on the attempts

    Success rate = successful_attempts / actual_attempts
    """
    __tablename__ = "session_elements"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    session_id: uuid.UUID = Field(foreign_key="sessions.id", index=True)
    element_id: uuid.UUID = Field(foreign_key="elements.id", index=True)

    target_attempts: int = Field(default=1, ge=0)  # Planned attempts
    actual_attempts: int = Field(default=0, ge=0)  # Actually attempted
    successful_attempts: int = Field(default=0, ge=0)  # Successfully landed

    notes: Optional[str] = None
    quality_rating: Optional[int] = Field(default=None, ge=1, le=5)  # 1-5 scale

    created_at: datetime = Field(default_factory=datetime.utcnow)
