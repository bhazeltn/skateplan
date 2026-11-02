"""Competition segment-result edit/delete routes (same /competitions prefix).

Split out of competitions.py to keep every module under the 250-line limit.
Deterministic arithmetic only: tss is recomputed from tes/pcs/deductions/bonus.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.competitions import require_coach
from app.core.database import get_db
from app.models.competition import CompetitionSegmentResult
from app.models.user import User
from app.schemas.competition import ResultUpdate, SegmentResultOut
from app.services.competition_service import compute_segment_tss

router = APIRouter(prefix="/competitions", tags=["competitions"])


def _get_result(result_id: uuid.UUID, db: Session) -> CompetitionSegmentResult:
    result = db.get(CompetitionSegmentResult, result_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Result not found"
        )
    return result


@router.patch("/results/{result_id}", response_model=SegmentResultOut)
def update_result(
    result_id: uuid.UUID,
    payload: ResultUpdate,
    _coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> SegmentResultOut:
    result = _get_result(result_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(result, field, value)
    # Keep tss consistent with the (possibly updated) component scores.
    result.tss = compute_segment_tss(
        result.tes, result.pcs, result.deductions, result.segment_bonus
    )
    db.commit()
    db.refresh(result)
    return SegmentResultOut.model_validate(result)


@router.delete("/results/{result_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_result(
    result_id: uuid.UUID,
    _coach: User = Depends(require_coach),
    db: Session = Depends(get_db),
) -> None:
    result = _get_result(result_id, db)
    # executed_elements are removed via the ORM cascade on the relationship.
    db.delete(result)
    db.commit()
