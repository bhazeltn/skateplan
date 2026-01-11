import uuid
from typing import Optional, List
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship

class BenchmarkProfile(SQLModel, table=True):
    __tablename__ = "benchmark_profiles"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    skater_id: uuid.UUID = Field(index=True) # Foreign key to profiles, but loose coupling for now or explicit FK
    name: str
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None
    status: str = "draft" # draft, active, archived

    metrics: List["BenchmarkMetric"] = Relationship(back_populates="profile")

class BenchmarkMetric(SQLModel, table=True):
    __tablename__ = "benchmark_metrics"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    profile_id: uuid.UUID = Field(foreign_key="benchmark_profiles.id")
    category: str # Technical, Physical, Mental
    name: str
    target_value: str # Store as string to handle "14 inches" or "Level 4"

    profile: Optional[BenchmarkProfile] = Relationship(back_populates="metrics")
