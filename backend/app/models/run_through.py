"""Program run-through tracking models (Sprint 5).

A run-through is one timed run of a program within a training session, with an
ordered list of per-element outcomes. Links to a session (``training_session_logs``)
and a ``programs`` row. UUID PKs match the Sprint 2/4 column style.
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
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


class ProgramRunThrough(Base):
    __tablename__ = "program_run_throughs"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("training_session_logs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    program_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("programs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    run_type: Mapped[str] = mapped_column(String(30), nullable=False, default="full")
    with_music: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    element_results: Mapped[list["RunThroughElementResult"]] = relationship(
        back_populates="run_through",
        cascade="all, delete-orphan",
        order_by="RunThroughElementResult.element_order",
    )


class RunThroughElementResult(Base):
    __tablename__ = "run_through_element_results"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    run_through_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("program_run_throughs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    element_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    element_code: Mapped[str] = mapped_column(String(50), nullable=False)
    outcome: Mapped[str] = mapped_column(String(30), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)

    run_through: Mapped["ProgramRunThrough"] = relationship(
        back_populates="element_results"
    )
