"""Yearly Training Plan (YTP) models (backend-only feature).

A coach builds a season macrocycle (``YearlyPlan``) for an athlete, broken into
ordered phases (``YtpPhase``). Each phase can reference existing custom benchmark
targets via ``YtpPhaseBenchmark`` link rows. ``skater_id`` FKs ``users.id``
(mirrors ``SkaterBenchmark`` / ``GapAssessment``); ``benchmark_id`` FKs
``skater_benchmarks.id`` whose PK is a ``Uuid``.
"""
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class YearlyPlan(Base):
    __tablename__ = "yearly_plans"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    skater_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    season_label: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    primary_goal: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    phases: Mapped[list["YtpPhase"]] = relationship(
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="YtpPhase.start_date",
    )


class YtpPhase(Base):
    __tablename__ = "ytp_phases"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("yearly_plans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phase_type: Mapped[str] = mapped_column(String(30), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    target_on_ice_hours_per_week: Mapped[float | None] = mapped_column(Float)
    target_off_ice_hours_per_week: Mapped[float | None] = mapped_column(Float)
    target_rpe: Mapped[int | None] = mapped_column(Integer)
    intensity_level: Mapped[str | None] = mapped_column(String(20))
    primary_focus: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)

    plan: Mapped["YearlyPlan"] = relationship(back_populates="phases")
    benchmark_links: Mapped[list["YtpPhaseBenchmark"]] = relationship(
        back_populates="phase", cascade="all, delete-orphan"
    )


class YtpPhaseBenchmark(Base):
    __tablename__ = "ytp_phase_benchmarks"
    __table_args__ = (UniqueConstraint("phase_id", "benchmark_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    phase_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ytp_phases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    benchmark_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("skater_benchmarks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    phase: Mapped["YtpPhase"] = relationship(back_populates="benchmark_links")
