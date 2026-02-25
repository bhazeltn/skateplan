import uuid
from datetime import datetime
from typing import List, Optional
from enum import Enum
from sqlmodel import Field, SQLModel, Relationship

class MetricCategory(str, Enum):
    TECHNICAL = "Technical"
    PHYSICAL = "Physical"
    MENTAL = "Mental"
    TACTICAL = "Tactical"
    ENVIRONMENTAL = "Environmental"

class MetricDataType(str, Enum):
    NUMERIC = "numeric"
    SCALE = "scale"
    BOOLEAN = "boolean"

# --- Metric Library ---

class MetricDefinition(SQLModel, table=True):
    """
    Reusable metric definitions in coach's library.
    Can be numeric (with unit), scale (with min/max), or boolean.
    """
    __tablename__ = "metric_definitions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    coach_id: uuid.UUID = Field(foreign_key="profiles.id", index=True)
    name: str
    description: Optional[str] = None
    category: MetricCategory
    data_type: MetricDataType
    unit: Optional[str] = None  # For numeric: inches, cm, %, reps, seconds
    scale_min: Optional[int] = None  # For scale: minimum value
    scale_max: Optional[int] = None  # For scale: maximum value
    is_system: bool = Field(default=False)  # Future: system-provided metrics
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    profile_metrics: List["ProfileMetric"] = Relationship(back_populates="metric")

# --- Benchmark Profiles ---

class BenchmarkProfile(SQLModel, table=True):
    """
    A collection of metrics with target values.
    Example: "Skate Canada Novice Entry Requirements"
    """
    __tablename__ = "benchmark_profiles"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    coach_id: uuid.UUID = Field(foreign_key="profiles.id", index=True)
    name: str
    description: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    profile_metrics: List["ProfileMetric"] = Relationship(back_populates="profile", cascade_delete=True)
    sessions: List["BenchmarkSession"] = Relationship(back_populates="profile")

class ProfileMetric(SQLModel, table=True):
    """
    Junction table: Links metrics to profiles with target values.
    Each profile can have multiple metrics, each with its own target.
    """
    __tablename__ = "profile_metrics"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    profile_id: uuid.UUID = Field(foreign_key="benchmark_profiles.id", index=True)
    metric_id: uuid.UUID = Field(foreign_key="metric_definitions.id", index=True)
    target_value: str  # Stored as string, parsed based on metric.data_type
    display_order: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    profile: Optional["BenchmarkProfile"] = Relationship(back_populates="profile_metrics")
    metric: Optional["MetricDefinition"] = Relationship(back_populates="profile_metrics")

# --- Benchmark Sessions ---

class BenchmarkSession(SQLModel, table=True):
    """
    A recorded benchmark testing session for a skater or team.
    Uses a specific profile and records actual values.
    Can be linked to either skater_id (individual) OR team_id (Ice Dance/Pairs).
    """
    __tablename__ = "benchmark_sessions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    skater_id: Optional[uuid.UUID] = Field(default=None, foreign_key="profiles.id", index=True)
    team_id: Optional[uuid.UUID] = Field(default=None, index=True)
    profile_id: uuid.UUID = Field(foreign_key="benchmark_profiles.id", index=True)
    coach_id: uuid.UUID = Field(foreign_key="profiles.id")
    recorded_at: datetime
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    profile: Optional["BenchmarkProfile"] = Relationship(back_populates="sessions")
    results: List["SessionResult"] = Relationship(back_populates="session", cascade_delete=True)

class SessionResult(SQLModel, table=True):
    """
    Individual metric results within a benchmark session.
    Stores actual values achieved by the skater.
    """
    __tablename__ = "session_results"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    session_id: uuid.UUID = Field(foreign_key="benchmark_sessions.id", index=True)
    metric_id: uuid.UUID = Field(foreign_key="metric_definitions.id", index=True)
    actual_value: str  # Stored as string, parsed based on metric.data_type
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    session: Optional["BenchmarkSession"] = Relationship(back_populates="results")
