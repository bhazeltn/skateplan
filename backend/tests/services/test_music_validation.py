"""
Tests for music duration validation service.

Following TDD: Tests written FIRST, then implementation.

Music duration rules (per ISU regulations):
- Junior Men Singles Short Program: 2:30 ± 10s (140-160s)
- Junior Men Singles Free Skate: 3:30 ± 10s (200-220s)
- Senior Men Singles Short Program: 2:40 ± 10s (150-170s)
- Senior Men Singles Free Skate: 4:00 ± 10s (230-250s)
"""
import pytest
from app.services.music_validation import (
    validate_music_duration,
    get_duration_limits,
    MusicDurationResult,
)


def test_validate_junior_short_program_valid():
    """Test valid music duration for Junior Short Program"""
    result = validate_music_duration(
        duration_seconds=150,
        level="Junior",
        discipline="singles",
        program_type="short"
    )

    assert result.is_valid is True
    assert result.warning is None
    assert result.min_seconds == 140
    assert result.max_seconds == 160


def test_validate_junior_short_program_too_short():
    """Test music too short for Junior Short Program"""
    result = validate_music_duration(
        duration_seconds=135,  # Below 140s
        level="Junior",
        discipline="singles",
        program_type="short"
    )

    assert result.is_valid is False
    assert "too short" in result.warning.lower()
    assert result.min_seconds == 140


def test_validate_junior_short_program_too_long():
    """Test music too long for Junior Short Program"""
    result = validate_music_duration(
        duration_seconds=165,  # Above 160s
        level="Junior",
        discipline="singles",
        program_type="short"
    )

    assert result.is_valid is False
    assert "too long" in result.warning.lower()
    assert result.max_seconds == 160


def test_validate_senior_free_skate_valid():
    """Test valid music duration for Senior Free Skate"""
    result = validate_music_duration(
        duration_seconds=240,  # 4:00 exactly
        level="Senior",
        discipline="singles",
        program_type="free"
    )

    assert result.is_valid is True
    assert result.warning is None


def test_validate_senior_free_skate_at_boundary():
    """Test music at upper boundary for Senior Free Skate"""
    result = validate_music_duration(
        duration_seconds=250,  # Exactly at max
        level="Senior",
        discipline="singles",
        program_type="free"
    )

    assert result.is_valid is True


def test_get_duration_limits_junior_short():
    """Test getting duration limits for Junior Short Program"""
    limits = get_duration_limits(
        level="Junior",
        discipline="singles",
        program_type="short"
    )

    assert limits["min_seconds"] == 140
    assert limits["max_seconds"] == 160
    assert limits["target_seconds"] == 150


def test_get_duration_limits_senior_free():
    """Test getting duration limits for Senior Free Skate"""
    limits = get_duration_limits(
        level="Senior",
        discipline="singles",
        program_type="free"
    )

    assert limits["min_seconds"] == 230
    assert limits["max_seconds"] == 250
    assert limits["target_seconds"] == 240


def test_validate_novice_level():
    """Test validation for Novice level (different duration rules)"""
    result = validate_music_duration(
        duration_seconds=120,  # 2:00
        level="Novice",
        discipline="singles",
        program_type="free"
    )

    # Novice free skate is 2:00 ± 10s
    assert result.is_valid is True
    assert result.min_seconds == 110
    assert result.max_seconds == 130


def test_validate_pairs_discipline():
    """Test validation for pairs (different duration from singles)"""
    result = validate_music_duration(
        duration_seconds=150,
        level="Senior",
        discipline="pairs",
        program_type="short"
    )

    # Pairs short program is 2:40 ± 10s (same as men's singles)
    assert result.is_valid is True


def test_validate_unknown_level_returns_permissive():
    """Test that unknown levels return permissive validation"""
    result = validate_music_duration(
        duration_seconds=200,
        level="UnknownLevel",
        discipline="singles",
        program_type="free"
    )

    # Should not reject, but may warn
    assert result.is_valid is True or result.warning is not None
