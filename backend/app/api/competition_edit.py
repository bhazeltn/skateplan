"""Competition edit route (same /competitions prefix).

Split out of competitions.py to keep every module under the 250-line limit.
Coach/admin only partial update of a competition's name/dates/city/country.
If both the resulting start_date and end_date are set, end must be on or after
start (422 otherwise). city/country feed the derived roster-schedule location.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.competitions import _get_competition, require_coach
from app.core.database import get_db
from app.models.user import User
from app.schemas.competition import CompetitionOut, CompetitionUpdate

router = APIRouter(prefix="/competitions", tags=["competitions"])


def _validate_date_order(comp, data: dict) -> None:
    start = data["start_date"] if "start_date" in data else comp.start_date
    end = data["end_date"] if "end_date" in data else comp.end_date
    if start is not None and end is not None and end < start:
        raise HTTPException(
            status_code=422,
            detail="end_date must be on or after start_date",
        )


@router.patch("/{competition_id}", response_model=CompetitionOut)
def update_competition(
    competition_id: uuid.UUID,
    payload: CompetitionUpdate,
    _coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> CompetitionOut:
    comp = _get_competition(competition_id, db)
    data = payload.model_dump(exclude_unset=True)
    _validate_date_order(comp, data)
    for field, value in data.items():
        setattr(comp, field, value)
    db.commit()
    db.refresh(comp)
    return CompetitionOut.model_validate(comp)
