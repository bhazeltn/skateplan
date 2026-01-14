from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.deps import get_session, get_current_user
from app.models.level_models import Level, LevelRead, LevelCreate
from app.models.user_models import Profile

router = APIRouter()


@router.get("/", response_model=List[LevelRead])
def list_levels(
    *,
    session: Session = Depends(get_session),
    federation_code: Optional[str] = None
) -> List[Level]:
    """
    List all levels for a specific federation.

    If federation_code is not provided, returns ISU levels by default.
    If no levels exist for the specified federation, falls back to ISU levels.

    Levels are ordered by level_order for proper dropdown display.
    """
    # Default to ISU if no federation specified
    if not federation_code:
        federation_code = "ISU"

    # Query levels for the specified federation
    query = (
        select(Level)
        .where(Level.federation_code == federation_code)
        .order_by(Level.level_order)
    )
    levels = session.exec(query).all()

    # Fall back to ISU if no levels found for the federation
    if not levels and federation_code != "ISU":
        query = (
            select(Level)
            .where(Level.federation_code == "ISU")
            .order_by(Level.level_order)
        )
        levels = session.exec(query).all()

    return list(levels)


@router.post("/", response_model=LevelRead)
def create_custom_level(
    *,
    session: Session = Depends(get_session),
    level_in: LevelCreate,
    current_user: Profile = Depends(get_current_user)
) -> Level:
    """
    Create a custom level for a federation.

    Only coaches can create custom levels. These levels are federation-specific
    and marked as non-system (is_system=False).
    """
    # Verify user is a coach
    if current_user.role != "coach":
        raise HTTPException(
            status_code=403,
            detail="Only coaches can create custom levels"
        )

    # Create the custom level
    level = Level(
        federation_code=level_in.federation_code,
        level_name=level_in.level_name,
        level_order=level_in.level_order,
        is_system=False,
        created_by_coach_id=current_user.id
    )

    session.add(level)
    session.commit()
    session.refresh(level)

    return level
