import uuid
from datetime import datetime, date as dt_date
from typing import List, Optional
from enum import Enum
from sqlmodel import Field, SQLModel, Relationship

class MetricDataType(str, Enum):
    NUMERIC = "NUMERIC"
    TEXT = "TEXT"
    SCALE_1_10 = "SCALE_1_10"

# --- Template Definitions ---

class BenchmarkTemplate(SQLModel, table=True):
    __tablename__ = "benchmark_templates"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    created_by_id: Optional[uuid.UUID] = Field(default=None, foreign_key="profiles.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    metrics: List["MetricDefinition"] = Relationship(back_populates="template")

class MetricDefinition(SQLModel, table=True):
    __tablename__ = "metric_definitions"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    template_id: uuid.UUID = Field(foreign_key="benchmark_templates.id")
    label: str
    unit: Optional[str] = None
    data_type: MetricDataType

    template: BenchmarkTemplate = Relationship(back_populates="metrics")

# --- Results ---

class BenchmarkSession(SQLModel, table=True):
    """
    A benchmark recording session for either an individual skater or a partnership.
    """
    __tablename__ = "benchmark_sessions"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    template_id: uuid.UUID = Field(foreign_key="benchmark_templates.id")

    # Can be for individual skater OR partnership (one must be set)
    skater_id: Optional[uuid.UUID] = Field(default=None, foreign_key="profiles.id")
    partnership_id: Optional[uuid.UUID] = Field(default=None, foreign_key="partnerships.id")

    recorded_by_id: uuid.UUID = Field(foreign_key="profiles.id")
    date: dt_date = Field(default_factory=dt_date.today)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    results: List["BenchmarkResult"] = Relationship(back_populates="session")

class BenchmarkResult(SQLModel, table=True):
    __tablename__ = "benchmark_results"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    session_id: uuid.UUID = Field(foreign_key="benchmark_sessions.id")
    metric_definition_id: uuid.UUID = Field(foreign_key="metric_definitions.id")
    value: str

    session: BenchmarkSession = Relationship(back_populates="results")