"""
Federation and levels API endpoints with dual fallback system.

Fallback Logic:
- Youth/Competitive levels: If federation doesn't have discipline → use ISU
- Adult levels: If federation doesn't have adult levels → use UNIVERSAL
"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import date, datetime
from pydantic import BaseModel
import pycountry

from app.api.deps import get_session
from app.models.federation_models import Federation, FederationRead
from app.models.stream_models import Stream
from app.models.level_models import Level, LevelWithStreamRead
from app.core.age_calculator import calculate_skating_age

router = APIRouter()


@router.get("/", response_model=List[FederationRead])
def list_federations(
    *,
    session: Session = Depends(get_session)
) -> List[FederationRead]:
    """
    List all ISU-based federations (excludes ISI and UNIVERSAL).

    PERMANENT RULES - DO NOT CHANGE:
    1. Ordering: ALWAYS order by .country_name (country name alphabetically)
       Example: "Canada" before "Philippines" before "United States"
    2. Exclude ISI and UNIVERSAL (handled specially):
       - ISI: Shown via toggle in UI (fundamentally different system)
       - UNIVERSAL: Used as fallback for adult levels only
    """
    federations = session.exec(
        select(Federation)
        .where(Federation.code.not_in(['ISI', 'UNIVERSAL']))
        .where(Federation.is_active == True)
        .order_by(Federation.country_name)  # CRITICAL: Always order by COUNTRY_NAME (alphabetical)
    ).all()

    return [
        FederationRead(
            id=f.id,
            name=f.name,
            code=f.code,
            iso_code=f.iso_code,
            country_name=f.country_name
        )
        for f in federations
    ]


@router.get("/{federation_code}/levels", response_model=List[LevelWithStreamRead])
def get_federation_levels(
    *,
    session: Session = Depends(get_session),
    federation_code: str,
    discipline: str,
    skater_dob: Optional[date] = None,
    include_isi: bool = False
) -> List[LevelWithStreamRead]:
    """
    Get levels for a federation and discipline with dual fallback.

    Fallback Logic:
    1. If federation has levels for discipline → return them
    2. If adult levels requested (skater 18+) and federation doesn't have them → use UNIVERSAL
    3. If youth levels requested (skater <18) and federation doesn't have them → use ISU
    4. If include_isi=True, add ISI levels with "ISI:" prefix

    Args:
        federation_code: Federation code (ISU, CAN, USA, PHI)
        discipline: Singles, Pairs, Ice_Dance, Solo_Dance, Artistic, Synchro
        skater_dob: Skater date of birth for age-gating adult levels
        include_isi: Whether to include ISI levels (with prefix)
    """
    # Validate federation exists
    federation = session.exec(
        select(Federation).where(Federation.code == federation_code)
    ).first()

    if not federation:
        raise HTTPException(status_code=404, detail="Federation not found")

    # Determine if skater is adult
    is_adult = False
    if skater_dob:
        today = datetime.now().date()
        skating_age = calculate_skating_age(skater_dob, today)
        is_adult = skating_age >= 18

    # Try to get federation's own levels
    streams = session.exec(
        select(Stream)
        .where(Stream.federation_code == federation_code)
        .where(Stream.discipline == discipline)
    ).all()

    levels = []
    for stream in streams:
        stream_levels = session.exec(
            select(Level)
            .where(Level.stream_id == stream.id)
            .where(Level.is_adult == is_adult)
            .order_by(Level.level_order)
        ).all()

        for level in stream_levels:
            levels.append(
                LevelWithStreamRead(
                    id=level.id,
                    stream_id=stream.id,
                    stream_code=stream.stream_code,
                    stream_display=stream.stream_display,
                    federation_code=federation_code,
                    discipline=discipline,
                    level_name=level.level_name,
                    display_name=level.display_name,
                    level_order=level.level_order,
                    is_adult=level.is_adult,
                    is_system=level.is_system,
                    isu_anchor=level.isu_anchor,
                    source="federation"
                )
            )

    # FALLBACK if no levels found
    if not levels:
        if is_adult:
            # Adult fallback → UNIVERSAL
            fallback_code = 'UNIVERSAL'
            fallback_label = "Universal Adult"
        else:
            # Youth fallback → ISU
            fallback_code = 'ISU'
            fallback_label = "ISU Standard"

        fallback_streams = session.exec(
            select(Stream)
            .where(Stream.federation_code == fallback_code)
            .where(Stream.discipline == discipline)
        ).all()

        for stream in fallback_streams:
            fallback_levels = session.exec(
                select(Level)
                .where(Level.stream_id == stream.id)
                .where(Level.is_adult == is_adult)
                .order_by(Level.level_order)
            ).all()

            for level in fallback_levels:
                levels.append(
                    LevelWithStreamRead(
                        id=level.id,
                        stream_id=stream.id,
                        stream_code=stream.stream_code,
                        stream_display=fallback_label,
                        federation_code=fallback_code,
                        discipline=discipline,
                        level_name=level.level_name,
                        display_name=f"{fallback_label}: {level.level_name}",
                        level_order=level.level_order,
                        is_adult=level.is_adult,
                        is_system=level.is_system,
                        isu_anchor=level.isu_anchor,
                        source="fallback"
                    )
                )

    # Add ISI levels if requested
    if include_isi:
        isi_streams = session.exec(
            select(Stream)
            .where(Stream.federation_code == 'ISI')
            .where(Stream.discipline == discipline)
        ).all()

        # Prefix existing federation levels
        for level in levels:
            if not level.display_name.startswith("ISU:") and not level.display_name.startswith("ISI:"):
                if level.source == "fallback":
                    # Already has fallback prefix, keep it
                    pass
                else:
                    # Add federation prefix
                    level.display_name = f"{federation_code}: {level.level_name}"

        # Add ISI levels with prefix
        for stream in isi_streams:
            isi_levels = session.exec(
                select(Level)
                .where(Level.stream_id == stream.id)
                .order_by(Level.level_order)
            ).all()

            for level in isi_levels:
                levels.append(
                    LevelWithStreamRead(
                        id=level.id,
                        stream_id=stream.id,
                        stream_code=stream.stream_code,
                        stream_display="ISI",
                        federation_code='ISI',
                        discipline=discipline,
                        level_name=level.level_name,
                        display_name=f"ISI: {level.level_name}",
                        level_order=level.level_order + 10000,  # Put ISI at end
                        is_adult=level.is_adult,
                        is_system=level.is_system,
                        isu_anchor=level.isu_anchor,
                        source="isi"
                    )
                )

    # Sort by level_order and return
    levels.sort(key=lambda x: x.level_order)

    # Always add "Other" option at the end for custom levels
    levels.append(
        LevelWithStreamRead(
            id=uuid.uuid4(),  # Temporary ID
            stream_id=uuid.uuid4(),  # Temporary
            stream_code="CUSTOM",
            stream_display="Custom",
            federation_code="CUSTOM",
            discipline=discipline,
            level_name="Other",
            display_name="Other (Custom Level)",
            level_order=99999,
            is_adult=False,
            is_system=False,
            isu_anchor=None,
            source="custom"
        )
    )

    return levels


@router.get("/{federation_code}/disciplines", response_model=List[str])
def get_available_disciplines(
    *,
    session: Session = Depends(get_session),
    federation_code: str,
    skater_dob: Optional[date] = None
) -> List[str]:
    """
    Get unique disciplines available for a federation.

    PERMANENT RULES - DO NOT CHANGE:
    - Solo skater disciplines: Singles, Solo_Dance, Artistic
    - NEVER return: Pairs, Ice_Dance, Synchro (these require partners/teams)

    Returns list of disciplines that have levels in this federation.
    Used by frontend to determine if Artistic should be shown.
    """
    # Validate federation exists
    federation = session.exec(
        select(Federation).where(Federation.code == federation_code)
    ).first()

    if not federation:
        raise HTTPException(status_code=404, detail="Federation not found")

    # Get disciplines from federation's streams
    streams = session.exec(
        select(Stream.discipline)
        .where(Stream.federation_code == federation_code)
        .distinct()
    ).all()

    # Extract discipline strings from tuples
    disciplines = set([d[0] if isinstance(d, tuple) else d for d in streams])

    # Return as sorted list
    return sorted(list(disciplines))


class CountryOption(BaseModel):
    """Country option for ISI country dropdown."""
    code: str
    name: str
    is_separator: bool = False


@router.get("/countries", response_model=List[CountryOption])
def get_countries() -> List[CountryOption]:
    """
    Get comprehensive country list for ISI system.

    Returns priority skating countries first, then separator, then all countries alphabetically.
    Used for ISI country dropdown since ISI is used globally.
    """
    # Priority countries (common skating countries)
    priority_codes = [
        'US',   # United States
        'CA',   # Canada
        'MX',   # Mexico
        'GB',   # United Kingdom
        'AU',   # Australia
        'NZ',   # New Zealand
        'PH',   # Philippines
        'JP',   # Japan
        'KR',   # South Korea
        'CN',   # China
        'RU',   # Russia
        'FR',   # France
        'DE',   # Germany
        'IT',   # Italy
        'ES',   # Spain
    ]

    countries = []

    # Add priority countries
    for code in priority_codes:
        try:
            country = pycountry.countries.get(alpha_2=code)
            if country:
                countries.append(CountryOption(
                    code=code,
                    name=country.name,
                    is_separator=False
                ))
        except:
            pass

    # Add separator
    countries.append(CountryOption(
        code="---",
        name="─────────────────────",
        is_separator=True
    ))

    # Add all other countries alphabetically
    all_countries = []
    for country in pycountry.countries:
        if country.alpha_2 not in priority_codes:
            all_countries.append(CountryOption(
                code=country.alpha_2,
                name=country.name,
                is_separator=False
            ))

    # Sort alphabetically by name
    all_countries.sort(key=lambda x: x.name)
    countries.extend(all_countries)

    return countries


class TeamLevelRead(BaseModel):
    """Level for team selection with stream grouping info."""
    id: str
    stream_id: str
    stream_code: str
    stream_display: str
    federation_code: str
    discipline: str
    level_name: str
    display_name: str
    level_order: int
    is_adult: bool


@router.get("/{federation_code}/team-levels", response_model=List[TeamLevelRead])
def get_team_levels(
    *,
    session: Session = Depends(get_session),
    federation_code: str,
    discipline: str,
) -> List[TeamLevelRead]:
    """
    Get ALL levels for a federation and discipline for team selection with smart fallback.

    Fallback Logic:
    1. Try to get federation's own levels first
    2. If none found, fall back to ISU (international standard)
    3. For adult streams, also include UNIVERSAL if ISU doesn't have adult levels

    Returns ALL streams and ALL levels. Frontend filters based on athletes' ages.

    Args:
        federation_code: Federation code (ISU, CAN, USA, GRE, etc.)
        discipline: Pairs or Ice_Dance

    Returns:
        All levels from all streams for this federation+discipline (with fallback)
    """
    # Validate federation exists
    federation = session.exec(
        select(Federation).where(Federation.code == federation_code)
    ).first()

    if not federation:
        raise HTTPException(status_code=404, detail="Federation not found")

    # Helper function to get levels for a federation+discipline
    def get_levels_for_federation(fed_code: str) -> List[TeamLevelRead]:
        streams = session.exec(
            select(Stream)
            .where(Stream.federation_code == fed_code)
            .where(Stream.discipline == discipline)
        ).all()

        levels = []
        for stream in streams:
            stream_levels = session.exec(
                select(Level)
                .where(Level.stream_id == stream.id)
                .order_by(Level.level_order)
            ).all()

            for level in stream_levels:
                # Clean up display name - remove redundant prefixes
                clean_display = level.display_name

                # Remove "Universal Adult" prefix if present
                if clean_display.startswith("Universal Adult "):
                    clean_display = clean_display.replace("Universal Adult ", "Adult ")
                # Remove "ISU Standard: " prefix if present
                if clean_display.startswith("ISU Standard: "):
                    clean_display = clean_display.replace("ISU Standard: ", "")
                # Remove standalone "Universal Adult"
                if clean_display == "Universal Adult":
                    clean_display = "Adult"

                levels.append(
                    TeamLevelRead(
                        id=str(level.id),
                        stream_id=str(stream.id),
                        stream_code=stream.stream_code,
                        stream_display=stream.stream_display,
                        federation_code=federation_code,  # Keep original federation code
                        discipline=discipline,
                        level_name=level.level_name,
                        display_name=clean_display,
                        level_order=level.level_order,
                        is_adult=level.is_adult
                    )
                )
        return levels

    # Step 1: Try to get federation's own levels
    levels = get_levels_for_federation(federation_code)

    # Step 2: If no levels found, fall back to ISU
    if not levels:
        levels = get_levels_for_federation('ISU')

        # Step 3: Check if we have adult levels, if not add UNIVERSAL adult levels
        has_adult_levels = any(level.is_adult for level in levels)

        if not has_adult_levels:
            # Add UNIVERSAL adult levels
            universal_levels = get_levels_for_federation('UNIVERSAL')
            # Only add adult levels from UNIVERSAL
            adult_only = [l for l in universal_levels if l.is_adult]
            levels.extend(adult_only)

    # Sort by stream and level order
    levels.sort(key=lambda x: (x.stream_display, x.level_order))

    return levels
