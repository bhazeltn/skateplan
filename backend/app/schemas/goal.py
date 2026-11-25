"""Skater-goal pydantic schemas."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GoalCreate(BaseModel):
    title: str
    detail: str | None = None
    status: str = "open"


class GoalUpdate(BaseModel):
    title: str | None = None
    detail: str | None = None
    status: str | None = None


class GoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    skater_id: int
    title: str
    detail: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime
