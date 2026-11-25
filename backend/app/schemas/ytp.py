"""Yearly Training Plan (YTP) schemas (backend-only).

``benchmark_id`` matches ``SkaterBenchmark`` PK type (``uuid.UUID``). Date-order
and target validation fire only when both bounds are present so partial updates
stay valid. ``YtpPhaseUpdate.benchmark_ids`` defaults to ``None`` to distinguish
"not provided" (leave links) from "provided empty list" (clear links).
"""
import uuid
from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

PhaseType = Literal[
    "general_prep", "specific_prep", "pre_comp", "competition", "taper", "transition"
]
IntensityLevel = Literal["low", "moderate", "high", "peak"]
BenchmarkIdType = uuid.UUID


def _check_dates(start: Optional[date], end: Optional[date]) -> None:
    if start is not None and end is not None and end < start:
        raise ValueError("end_date must be on or after start_date")


# --- Plans ----------------------------------------------------------------
class YearlyPlanCreate(BaseModel):
    season_label: str
    title: str
    start_date: date
    end_date: date
    primary_goal: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def _validate(self) -> "YearlyPlanCreate":
        _check_dates(self.start_date, self.end_date)
        return self


class YearlyPlanUpdate(BaseModel):
    season_label: Optional[str] = None
    title: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    primary_goal: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def _validate(self) -> "YearlyPlanUpdate":
        _check_dates(self.start_date, self.end_date)
        return self


# --- Phases ---------------------------------------------------------------
class YtpPhaseCreate(BaseModel):
    name: str
    phase_type: PhaseType
    start_date: date
    end_date: date
    target_on_ice_hours_per_week: Optional[float] = Field(default=None, ge=0)
    target_off_ice_hours_per_week: Optional[float] = Field(default=None, ge=0)
    target_rpe: Optional[int] = Field(default=None, ge=1, le=10)
    intensity_level: Optional[IntensityLevel] = None
    primary_focus: Optional[str] = None
    notes: Optional[str] = None
    benchmark_ids: list[BenchmarkIdType] = []

    @model_validator(mode="after")
    def _validate(self) -> "YtpPhaseCreate":
        _check_dates(self.start_date, self.end_date)
        return self


class YtpPhaseUpdate(BaseModel):
    name: Optional[str] = None
    phase_type: Optional[PhaseType] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    target_on_ice_hours_per_week: Optional[float] = Field(default=None, ge=0)
    target_off_ice_hours_per_week: Optional[float] = Field(default=None, ge=0)
    target_rpe: Optional[int] = Field(default=None, ge=1, le=10)
    intensity_level: Optional[IntensityLevel] = None
    primary_focus: Optional[str] = None
    notes: Optional[str] = None
    benchmark_ids: Optional[list[BenchmarkIdType]] = None

    @model_validator(mode="after")
    def _validate(self) -> "YtpPhaseUpdate":
        _check_dates(self.start_date, self.end_date)
        return self


class YtpPhaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    plan_id: uuid.UUID
    name: str
    phase_type: str
    start_date: date
    end_date: date
    target_on_ice_hours_per_week: Optional[float] = None
    target_off_ice_hours_per_week: Optional[float] = None
    target_rpe: Optional[int] = None
    intensity_level: Optional[str] = None
    primary_focus: Optional[str] = None
    notes: Optional[str] = None
    benchmark_ids: list[BenchmarkIdType] = []


class YearlyPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    skater_id: int
    season_label: str
    title: str
    start_date: date
    end_date: date
    primary_goal: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    phases: list[YtpPhaseOut] = []
