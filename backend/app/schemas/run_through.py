"""Program run-through + consistency analytics pydantic schemas (Sprint 5)."""
import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

RunType = Literal["full", "half", "section", "walkthrough"]


class RunThroughElementIn(BaseModel):
    element_order: int = 0
    element_code: str
    outcome: str
    tags: list[str] = Field(default_factory=list)
    notes: Optional[str] = None


class RunThroughElementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    element_order: int
    element_code: str
    outcome: str
    tags: list[str] = Field(default_factory=list)
    notes: Optional[str] = None


class RunThroughCreate(BaseModel):
    program_id: uuid.UUID
    run_type: RunType = "full"
    with_music: bool = True
    notes: Optional[str] = None
    element_results: list[RunThroughElementIn] = []


class RunThroughUpdate(BaseModel):
    run_type: Optional[RunType] = None
    with_music: Optional[bool] = None
    notes: Optional[str] = None
    element_results: Optional[list[RunThroughElementIn]] = None


class RunThroughOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    program_id: uuid.UUID
    program_name: str
    program_segment: str
    run_type: str
    with_music: bool
    notes: Optional[str] = None
    created_at: datetime
    element_results: list[RunThroughElementOut] = []


class ProgramElementStatOut(BaseModel):
    element_code: str
    total_attempts: int
    clean_count: int
    clean_percentage: float
    with_calls_count: int = 0
    completed_percentage: float = 0.0
    tag_counts: dict[str, int] = Field(default_factory=dict)


class ProgramConsistencyOut(BaseModel):
    program_id: uuid.UUID
    program_name: str
    segment: str
    total_runs: int
    full_runs: int
    clean_runs: int
    overall_clean_percentage: float
    overall_completed_percentage: float = 0.0
    element_stats: list[ProgramElementStatOut] = []
