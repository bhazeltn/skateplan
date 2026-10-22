"""Flat competition-level lookup for pickers (e.g. competition entry forms)."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.federation import CompetitionLevel, Federation, FederationStream
from app.schemas.federation import LevelListItemOut

router = APIRouter(prefix="/levels", tags=["levels"])


@router.get("", response_model=list[LevelListItemOut])
def list_levels(
    discipline: str = "Singles", db: Session = Depends(get_db)
) -> list[LevelListItemOut]:
    """Flattened, selectable competition levels for one discipline (Singles by
    default), each carrying its PK and owning federation for grouping."""
    rows = db.execute(
        select(CompetitionLevel, FederationStream, Federation)
        .join(FederationStream, CompetitionLevel.stream_id == FederationStream.stream_id)
        .join(Federation, Federation.code == FederationStream.federation_code)
        .where(FederationStream.discipline == discipline)
        .order_by(Federation.name, FederationStream.stream_name, CompetitionLevel.sort_order)
    ).all()
    return [
        LevelListItemOut(
            level_id=lvl.level_id,
            level_name=lvl.level_name,
            federation_code=fed.code,
            federation_name=fed.name,
            discipline=stream.discipline,
        )
        for lvl, stream, fed in rows
    ]
