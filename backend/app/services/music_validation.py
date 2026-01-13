"""
Music duration validation service.

Validates music duration against ISU (and other federation) regulations.
Each competition level and program type has specific duration requirements.
"""
from typing import Dict, Optional
from pydantic import BaseModel


class MusicDurationResult(BaseModel):
    """Result of music duration validation."""
    is_valid: bool
    warning: Optional[str] = None
    min_seconds: int
    max_seconds: int
    target_seconds: int


# ISU Duration Rules (in seconds)
# Format: {level: {program_type: (target, tolerance)}}
DURATION_RULES = {
    "Novice": {
        "short": (120, 10),  # 2:00 ± 10s
        "free": (120, 10),   # 2:00 ± 10s
    },
    "Junior": {
        "short": (150, 10),  # 2:30 ± 10s
        "free": (210, 10),   # 3:30 ± 10s
    },
    "Senior": {
        "short": (160, 10),  # 2:40 ± 10s
        "free": (240, 10),   # 4:00 ± 10s
    },
    # Pairs has same durations as singles
    "pairs_novice": {
        "short": (120, 10),
        "free": (120, 10),
    },
    "pairs_junior": {
        "short": (150, 10),
        "free": (210, 10),
    },
    "pairs_senior": {
        "short": (160, 10),
        "free": (240, 10),
    },
}


def get_duration_limits(
    level: str,
    discipline: str,
    program_type: str
) -> Dict[str, int]:
    """
    Get the min/max/target duration for a given level and program type.

    Args:
        level: Competition level (Novice, Junior, Senior)
        discipline: Discipline (singles, pairs, ice_dance)
        program_type: Program type (short, free)

    Returns:
        Dict with min_seconds, max_seconds, target_seconds
    """
    # Normalize level
    level_key = level
    if discipline == "pairs":
        level_key = f"pairs_{level.lower()}"

    # Get rules or use default
    if level_key in DURATION_RULES and program_type in DURATION_RULES[level_key]:
        target, tolerance = DURATION_RULES[level_key][program_type]
    else:
        # Default permissive rules for unknown levels
        target, tolerance = (180, 60)  # 3:00 ± 1:00

    return {
        "min_seconds": target - tolerance,
        "max_seconds": target + tolerance,
        "target_seconds": target,
    }


def validate_music_duration(
    duration_seconds: int,
    level: str,
    discipline: str,
    program_type: str
) -> MusicDurationResult:
    """
    Validate music duration against regulations.

    Args:
        duration_seconds: Actual music duration in seconds
        level: Competition level (Novice, Junior, Senior)
        discipline: Discipline (singles, pairs, ice_dance)
        program_type: Program type (short, free)

    Returns:
        MusicDurationResult with validation status and limits
    """
    limits = get_duration_limits(level, discipline, program_type)

    min_sec = limits["min_seconds"]
    max_sec = limits["max_seconds"]
    target_sec = limits["target_seconds"]

    is_valid = min_sec <= duration_seconds <= max_sec
    warning = None

    if duration_seconds < min_sec:
        warning = f"Music duration ({duration_seconds}s) is too short. Minimum: {min_sec}s ({min_sec//60}:{min_sec%60:02d})"
    elif duration_seconds > max_sec:
        warning = f"Music duration ({duration_seconds}s) is too long. Maximum: {max_sec}s ({max_sec//60}:{max_sec%60:02d})"

    return MusicDurationResult(
        is_valid=is_valid,
        warning=warning,
        min_seconds=min_sec,
        max_seconds=max_sec,
        target_seconds=target_sec,
    )


def format_duration(seconds: int) -> str:
    """Format seconds as MM:SS."""
    minutes = seconds // 60
    secs = seconds % 60
    return f"{minutes}:{secs:02d}"


def validate_program_music(
    program: Dict,
    music_duration_seconds: int
) -> MusicDurationResult:
    """
    Convenience wrapper to validate music for a program dict.

    Args:
        program: Program dict with level, discipline keys
        music_duration_seconds: Music duration in seconds

    Returns:
        MusicDurationResult
    """
    # Infer program type from program name
    program_name = program.get("name", "").lower()
    program_type = "short" if "short" in program_name else "free"

    return validate_music_duration(
        duration_seconds=music_duration_seconds,
        level=program.get("level", "Senior"),
        discipline=program.get("discipline", "singles"),
        program_type=program_type,
    )
