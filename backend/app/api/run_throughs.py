"""Program run-through tracking + consistency analytics routes (Sprint 5).

Every endpoint authorizes the caller against the target skater via
``authorize_skater_access`` (coach or the skater themselves). Analytics are pure
deterministic math delegated to run_through_service.
"""
import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import authorize_skater_access, get_current_user
from app.core.database import get_db
from app.models.program import Program
from app.models.run_through import ProgramRunThrough, RunThroughElementResult
from app.models.training_log import TrainingSessionLog
from app.models.user import User
from app.schemas.run_through import (
    ProgramConsistencyOut,
    RunThroughCreate,
    RunThroughElementOut,
    RunThroughOut,
    RunThroughUpdate,
)
from app.services.run_through_service import aggregate_program_stats

session_router = APIRouter(prefix="/sessions", tags=["run-throughs"])
skater_router = APIRouter(prefix="/skaters", tags=["run-throughs"])


def _get_session(session_id: uuid.UUID, db: Session) -> TrainingSessionLog:
    session = db.get(TrainingSessionLog, session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


def _load_program_for_session(program_id, session, db) -> Program:
    program = db.get(Program, program_id)
    if program is None or program.skater_id != session.skater_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Program not found for this skater",
        )
    return program


def _get_owned_run(session_id, run_id, db) -> ProgramRunThrough:
    run = db.get(ProgramRunThrough, run_id)
    if run is None or run.session_id != session_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run-through not found")
    return run


def _serialize_run(run: ProgramRunThrough, program: Program) -> RunThroughOut:
    return RunThroughOut(
        id=run.id,
        session_id=run.session_id,
        program_id=run.program_id,
        program_name=program.title,
        program_segment=program.program_type,
        run_type=run.run_type,
        with_music=run.with_music,
        notes=run.notes,
        created_at=run.created_at,
        element_results=[RunThroughElementOut.model_validate(e) for e in run.element_results],
    )


@session_router.post(
    "/{session_id}/run-throughs",
    response_model=RunThroughOut,
    status_code=status.HTTP_201_CREATED,
)
def create_run_through(
    session_id: uuid.UUID,
    payload: RunThroughCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RunThroughOut:
    session = _get_session(session_id, db)
    authorize_skater_access(current_user, session.skater_id, db)
    program = _load_program_for_session(payload.program_id, session, db)
    run = ProgramRunThrough(
        session_id=session_id,
        program_id=payload.program_id,
        run_type=payload.run_type,
        with_music=payload.with_music,
        notes=payload.notes,
        element_results=[
            RunThroughElementResult(**e.model_dump()) for e in payload.element_results
        ],
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return _serialize_run(run, program)


@session_router.get("/{session_id}/run-throughs", response_model=list[RunThroughOut])
def list_run_throughs(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[RunThroughOut]:
    session = _get_session(session_id, db)
    authorize_skater_access(current_user, session.skater_id, db)
    stmt = (
        select(ProgramRunThrough)
        .where(ProgramRunThrough.session_id == session_id)
        .order_by(ProgramRunThrough.created_at)
    )
    runs = db.execute(stmt).scalars().all()
    return [_serialize_run(r, db.get(Program, r.program_id)) for r in runs]


@session_router.patch(
    "/{session_id}/run-throughs/{run_id}", response_model=RunThroughOut
)
def update_run_through(
    session_id: uuid.UUID,
    run_id: uuid.UUID,
    payload: RunThroughUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RunThroughOut:
    run = _get_owned_run(session_id, run_id, db)
    session = _get_session(session_id, db)
    authorize_skater_access(current_user, session.skater_id, db)
    data = payload.model_dump(exclude_unset=True)
    elements = data.pop("element_results", None)
    for field, value in data.items():
        setattr(run, field, value)
    if elements is not None:
        run.element_results = [RunThroughElementResult(**e) for e in elements]
    db.commit()
    db.refresh(run)
    return _serialize_run(run, db.get(Program, run.program_id))


@session_router.delete(
    "/{session_id}/run-throughs/{run_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_run_through(
    session_id: uuid.UUID,
    run_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    run = _get_owned_run(session_id, run_id, db)
    session = _get_session(session_id, db)
    authorize_skater_access(current_user, session.skater_id, db)
    db.delete(run)  # cascades element_results via relationship/FK ON DELETE CASCADE
    db.commit()


def _load_runs_with_programs(skater_id, start_date, end_date, program_id, db):
    stmt = (
        select(ProgramRunThrough, Program)
        .join(TrainingSessionLog, ProgramRunThrough.session_id == TrainingSessionLog.id)
        .join(Program, ProgramRunThrough.program_id == Program.id)
        .where(TrainingSessionLog.skater_id == skater_id)
    )
    if start_date is not None:
        stmt = stmt.where(TrainingSessionLog.session_date >= start_date)
    if end_date is not None:
        stmt = stmt.where(TrainingSessionLog.session_date <= end_date)
    if program_id is not None:
        stmt = stmt.where(ProgramRunThrough.program_id == program_id)
    return db.execute(stmt).all()


@skater_router.get(
    "/{skater_id}/training/program-stats",
    response_model=list[ProgramConsistencyOut],
)
def program_stats(
    skater_id: int,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    program_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ProgramConsistencyOut]:
    authorize_skater_access(current_user, skater_id, db)
    rows = _load_runs_with_programs(skater_id, start_date, end_date, program_id, db)
    return aggregate_program_stats(rows)
