"""Coach-owned reusable benchmark sets (Sprint 7).

A coach curates named sets of benchmark items (category / title / notes) and can
apply a whole set to any athlete they are authorized for. Applying copies each
item into ``skater_benchmarks`` as a ``NOT_STARTED`` custom benchmark, skipping
case-insensitive (category, title) duplicates the skater already has.

``coach_id`` FKs ``users.id`` (mirrors ``GapAssessment`` / ``SkaterBenchmark``).
Every route is strictly scoped to the owning coach.
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class BenchmarkSet(Base):
    __tablename__ = "benchmark_sets"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    coach_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    items: Mapped[list["BenchmarkSetItem"]] = relationship(
        back_populates="benchmark_set",
        cascade="all, delete-orphan",
        order_by="BenchmarkSetItem.sort_order",
    )


class BenchmarkSetItem(Base):
    __tablename__ = "benchmark_set_items"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    set_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("benchmark_sets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    benchmark_set: Mapped["BenchmarkSet"] = relationship(back_populates="items")
