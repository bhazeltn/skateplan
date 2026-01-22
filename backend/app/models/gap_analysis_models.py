import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship

if TYPE_CHECKING:
    from app.models.user_models import Profile
    from app.models.team_models import Team
    from app.models.benchmark_models import MetricDefinition


class GapAnalysis(SQLModel, table=True):
    """
    Gap Analysis: A living document tracking current performance vs targets.

    One gap analysis per skater or team (singleton pattern).
    Updated informally as coaches observe progress.
    """
    __tablename__ = "gap_analyses"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    skater_id: Optional[uuid.UUID] = Field(default=None, foreign_key="profiles.id", index=True)
    team_id: Optional[uuid.UUID] = Field(default=None, foreign_key="teams.id", index=True)
    last_updated: datetime = Field(default_factory=datetime.utcnow, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    skater: Optional["Profile"] = Relationship()
    team: Optional["Team"] = Relationship()
    entries: List["GapAnalysisEntry"] = Relationship(
        back_populates="gap_analysis",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class GapAnalysisEntry(SQLModel, table=True):
    """
    Individual metric entry in a gap analysis.

    Tracks current vs target value for a specific metric.
    Can be archived (is_active=false) when no longer relevant.
    """
    __tablename__ = "gap_analysis_entries"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    gap_analysis_id: uuid.UUID = Field(foreign_key="gap_analyses.id", index=True)
    metric_id: uuid.UUID = Field(foreign_key="metric_definitions.id", index=True)
    current_value: str  # Actual current performance
    target_value: str   # Goal/standard to achieve
    notes: Optional[str] = None
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    gap_analysis: Optional["GapAnalysis"] = Relationship(back_populates="entries")
    metric: Optional["MetricDefinition"] = Relationship()
