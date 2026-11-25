"""Consolidated roster-schedule read schemas.

A flattened, coach-facing view: each competition lists the authorized skaters
entered in it. `location` is derived from the competition's city/country (the
model has no single location column) and `overall_score` is the sum of the
entry's segment total-segment-scores (the entry itself stores no aggregate).
"""
import uuid
from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class RosterEntrySummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    entry_id: uuid.UUID
    skater_id: int
    skater_name: str
    level: Optional[str] = None
    status: Optional[str] = None
    overall_score: Optional[float] = None


class RosterCompetitionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    location: Optional[str] = None
    entries: list[RosterEntrySummaryOut] = []
