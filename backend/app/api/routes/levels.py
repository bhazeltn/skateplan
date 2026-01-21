import uuid
from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, or_, and_

from app.api.deps import get_session, get_current_user
from app.models.level_models import Level, LevelRead, LevelCreate, CustomLevelCreate
from app.models.user_models import Profile
from app.core.age_calculator import calculate_skating_age

router = APIRouter()


@router.get("/", response_model=List[LevelRead])
def list_levels(
    *,
    session: Session = Depends(get_session),
    federation_code: str,
    discipline: Optional[str] = None,  # Optional for fetching available disciplines
    skater_dob: Optional[date] = None,
    include_isi: bool = False
) -> List[LevelRead]:
    """
    Get levels filtered by federation and discipline.

    Discipline filtering:
    - Singles: Singles, Showcase, Freestyle levels
    - Solo_Dance: Ice_Dance levels (used solo)
    - Ice_Dance: Ice_Dance levels (pairs)
    - Pairs, Artistic, Synchro: Respective discipline levels

    Logic:
    1. If federation has levels → use those
    2. Otherwise → fallback to ISU + UNIVERSAL adult levels
    3. Filter by discipline mapping (if provided)
    4. Age-gate adult levels if DOB provided
    5. Add ISI levels if requested (with prefix)
    6. Always include "Other" option
    """
    query = select(Level)

    # Check if federation has specific levels
    federation_has_levels = session.exec(
        select(Level).where(Level.federation_code == federation_code).limit(1)
    ).first()

    if federation_has_levels:
        # Use federation-specific levels
        query = query.where(Level.federation_code == federation_code)
    else:
        # Fallback to ISU + UNIVERSAL adult levels
        query = query.where(
            or_(
                Level.federation_code == "ISU",
                and_(
                    Level.federation_code == "UNIVERSAL",
                    Level.is_adult == True
                )
            )
        )

    # Discipline filtering (if provided)
    if discipline:
        if discipline == "Singles":
            # Singles: Show Singles, Showcase, and generic levels
            query = query.where(
                or_(
                    Level.discipline == "Singles",
                    Level.discipline == "Showcase",
                    Level.discipline == None
                )
            )
        elif discipline == "Solo_Dance":
            # Solo Dance: Show Ice_Dance levels (same levels, solo context)
            query = query.where(
                or_(
                    Level.discipline == "Ice_Dance",
                    Level.discipline == "Solo_Dance",
                    Level.discipline == None
                )
            )
        elif discipline == "Showcase":
            # Showcase: Show Showcase and Singles levels
            query = query.where(
                or_(
                    Level.discipline == "Showcase",
                    Level.discipline == "Singles",
                    Level.discipline == None
                )
            )
        elif discipline in ["Ice_Dance", "Pairs", "Artistic", "Synchro"]:
            # Specific disciplines
            query = query.where(
                or_(
                    Level.discipline == discipline,
                    Level.discipline == None
                )
            )
    # If no discipline provided, return all levels for the federation

    # Age-gate adult levels if DOB provided
    if skater_dob:
        today = datetime.now().date()
        # Calculate skating age using today as reference date
        skating_age = calculate_skating_age(skater_dob, today)

        if skating_age < 18:
            # Only show non-adult levels for skaters under 18
            query = query.where(Level.is_adult == False)

    # Order by level_order and execute
    query = query.order_by(Level.level_order)
    levels = list(session.exec(query).all())

    # Add ISI levels if requested
    if include_isi:
        # Fetch ISI levels
        isi_query = (
            select(Level)
            .where(Level.federation_code == "ISI")
            .order_by(Level.level_order)
        )
        isi_levels = list(session.exec(isi_query).all())

        # Prefix existing levels with ISU/federation name
        for level in levels:
            if not level.display_name.startswith("ISU:"):
                # Prefix with ISU for ISU federation
                if level.federation_code == "ISU":
                    level.display_name = f"ISU: {level.display_name}"
                else:
                    # Use federation code for others
                    level.display_name = f"{level.federation_code}: {level.display_name}"

        # Prefix ISI levels
        for level in isi_levels:
            level.display_name = f"ISI: {level.level_name}"

        # Add ISI levels to the list
        levels.extend(isi_levels)

    # Convert to LevelRead list
    levels_list = [
        LevelRead(
            id=level.id,
            federation_code=level.federation_code,
            stream=level.stream,
            discipline=level.discipline,
            level_name=level.level_name,
            display_name=level.display_name,
            level_order=level.level_order,
            is_adult=level.is_adult,
            is_system=level.is_system,
            isu_anchor=level.isu_anchor
        )
        for level in levels
    ]

    # Always add "Other" option at the end for custom levels
    levels_list.append(
        LevelRead(
            id=uuid.uuid4(),
            federation_code="CUSTOM",
            stream=None,
            discipline=None,
            level_name="Other",
            display_name="Other (Custom Level)",
            level_order=9999,
            is_adult=False,
            is_system=False,
            isu_anchor=None
        )
    )

    return levels_list


@router.post("/", response_model=LevelRead)
def create_custom_level(
    *,
    session: Session = Depends(get_session),
    level_in: LevelCreate,
    current_user: Profile = Depends(get_current_user)
) -> LevelRead:
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
        display_name=level_in.level_name,
        level_order=level_in.level_order,
        is_system=False,
        created_by_coach_id=current_user.id
    )

    session.add(level)
    session.commit()
    session.refresh(level)

    return LevelRead(
        id=level.id,
        federation_code=level.federation_code,
        stream=level.stream,
        discipline=level.discipline,
        level_name=level.level_name,
        display_name=level.display_name,
        level_order=level.level_order,
        is_adult=level.is_adult,
        is_system=level.is_system,
        isu_anchor=level.isu_anchor
    )


@router.post("/custom", response_model=LevelRead)
def create_quick_custom_level(
    *,
    session: Session = Depends(get_session),
    level_in: CustomLevelCreate,
    current_user: Profile = Depends(get_current_user)
) -> LevelRead:
    """
    Quick create a custom level when user selects "Other".

    This is a simplified endpoint that doesn't require level_order.
    Custom levels are automatically placed at the end.
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
        display_name=level_in.level_name,
        level_order=9999,  # Custom levels go at the end
        is_system=False,
        is_adult=False,
        created_by_coach_id=current_user.id
    )

    session.add(level)
    session.commit()
    session.refresh(level)

    return LevelRead(
        id=level.id,
        federation_code=level.federation_code,
        stream=level.stream,
        discipline=level.discipline,
        level_name=level.level_name,
        display_name=level.display_name,
        level_order=level.level_order,
        is_adult=level.is_adult,
        is_system=level.is_system,
        isu_anchor=level.isu_anchor
    )
