"""Coach-owned benchmark-set schemas (Sprint 7).

A benchmark set is a reusable, coach-curated collection of benchmark items.
Applying a set copies its items into a skater's custom benchmarks as
``NOT_STARTED``, skipping case-insensitive (category, title) duplicates.
"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class BenchmarkSetItemIn(BaseModel):
    category: str
    title: str
    notes: Optional[str] = None


class BenchmarkSetItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category: str
    title: str
    notes: Optional[str] = None
    sort_order: int


class BenchmarkSetCreate(BaseModel):
    name: str
    description: Optional[str] = None
    items: list[BenchmarkSetItemIn] = []


class BenchmarkSetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    # When provided, REPLACES the full item list (delete existing, add new).
    items: Optional[list[BenchmarkSetItemIn]] = None


class BenchmarkSetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    coach_id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    items: list[BenchmarkSetItemOut] = []


class AppliedBenchmark(BaseModel):
    """Lightweight representation of a benchmark created by an apply."""

    category: str
    title: str


class ApplySetResult(BaseModel):
    created_count: int
    skipped_count: int
    created_items: list[AppliedBenchmark] = []
