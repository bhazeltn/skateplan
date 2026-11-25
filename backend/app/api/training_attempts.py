"""Edit/delete routes for individual logged jump/element attempts (Sprint 4).

Split out of ``training.py`` to keep each module well under the 250-line limit.
Every route authorizes the caller against the owning session's skater via
``authorize_skater_access`` (coach or athlete — not coach-only).
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import authorize_skater_access, get_current_user
from app.core.database import get_db
from app.models.training_log import JumpAttemptLog, TrainingSessionLog
from app.models.user import User
from app.schemas.training import AttemptOut, AttemptUpdate

attempt_router = APIRouter(prefix="/sessions", tags=["training"])


def _get_attempt_in_session(
    session_id: uuid.UUID, attempt_id: uuid.UUID, db: Session
) -> JumpAttemptLog:
    """Fetch an attempt, 404 unless it exists AND belongs to ``session_id``."""
    attempt = db.get(JumpAttemptLog, attempt_id)
    if attempt is None or attempt.session_id != session_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found"
        )
    return attempt


def _skater_id_for(session_id: uuid.UUID, db: Session) -> int:
    session = db.get(TrainingSessionLog, session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        )
    return session.skater_id


@attempt_router.patch(
    "/{session_id}/attempts/{attempt_id}", response_model=AttemptOut
)
def update_attempt(
    session_id: uuid.UUID,
    attempt_id: uuid.UUID,
    payload: AttemptUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AttemptOut:
    attempt = _get_attempt_in_session(session_id, attempt_id, db)
    authorize_skater_access(current_user, _skater_id_for(session_id, db), db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(attempt, field, value)
    db.commit()
    db.refresh(attempt)
    return AttemptOut.model_validate(attempt)


@attempt_router.delete(
    "/{session_id}/attempts/{attempt_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_attempt(
    session_id: uuid.UUID,
    attempt_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    attempt = _get_attempt_in_session(session_id, attempt_id, db)
    authorize_skater_access(current_user, _skater_id_for(session_id, db), db)
    db.delete(attempt)
    db.commit()
