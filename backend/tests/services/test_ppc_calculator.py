"""
Tests for PPC (Planned Program Content) Base Value Calculator.

Following TDD: Tests written FIRST, then implementation.

The PPC calculator computes the total base value of a program based on
planned technical elements from the ISU library.
"""
import pytest
from uuid import uuid4
from app.services.ppc_calculator import calculate_base_value, PPCResult


def test_calculate_base_value_simple():
    """Test calculating base value for a simple program"""
    # Mock elements from ISU library
    # 3Lz = 5.90, 3F = 5.30, 2A = 3.30
    elements = [
        {"id": str(uuid4()), "code": "3Lz", "base_value": 5.90},
        {"id": str(uuid4()), "code": "3F", "base_value": 5.30},
        {"id": str(uuid4()), "code": "2A", "base_value": 3.30},
    ]

    result = calculate_base_value(elements)

    assert result.total_base_value == 14.50  # 5.90 + 5.30 + 3.30
    assert result.element_count == 3
    assert len(result.breakdown) == 3


def test_calculate_base_value_with_combos():
    """Test calculating with combination jumps (gets 1.1x multiplier in second half)"""
    elements = [
        {"id": str(uuid4()), "code": "3Lz+3T", "base_value": 5.90, "is_combo": True},
        {"id": str(uuid4()), "code": "3F", "base_value": 5.30, "second_half": True},
    ]

    result = calculate_base_value(elements)

    # 3Lz+3T = 5.90 (combo doesn't add here, just notation)
    # 3F in second half = 5.30 * 1.1 = 5.83
    assert result.total_base_value == 11.73  # 5.90 + 5.83
    assert result.second_half_bonus_applied


def test_calculate_base_value_empty_program():
    """Test calculating for program with no elements"""
    result = calculate_base_value([])

    assert result.total_base_value == 0.0
    assert result.element_count == 0
    assert len(result.breakdown) == 0


def test_calculate_base_value_spins():
    """Test calculating with spins"""
    elements = [
        {"id": str(uuid4()), "code": "CCoSp4", "base_value": 3.50},
        {"id": str(uuid4()), "code": "FCSSp4", "base_value": 3.00},
    ]

    result = calculate_base_value(elements)

    assert result.total_base_value == 6.50
    assert result.element_count == 2


def test_calculate_base_value_step_sequences():
    """Test calculating with step sequences"""
    elements = [
        {"id": str(uuid4()), "code": "StSq3", "base_value": 3.30},
        {"id": str(uuid4()), "code": "ChSq1", "base_value": 3.00},
    ]

    result = calculate_base_value(elements)

    assert result.total_base_value == 6.30


def test_ppc_breakdown_includes_sequence():
    """Test that breakdown includes sequence numbers"""
    elements = [
        {"id": str(uuid4()), "code": "3Lz", "base_value": 5.90, "sequence": 1},
        {"id": str(uuid4()), "code": "3F", "base_value": 5.30, "sequence": 2},
    ]

    result = calculate_base_value(elements)

    assert result.breakdown[0].sequence == 1
    assert result.breakdown[1].sequence == 2
    assert result.breakdown[0].code == "3Lz"


def test_ppc_validates_required_fields():
    """Test that PPC validates required element fields"""
    # Element missing base_value should be handled
    elements = [
        {"id": str(uuid4()), "code": "3Lz"},  # Missing base_value
    ]

    result = calculate_base_value(elements)

    # Should handle gracefully, maybe default to 0 or skip
    assert result.total_base_value >= 0


def test_calculate_with_multiplier_second_half():
    """Test that second half bonus (1.1x) is applied correctly"""
    elements = [
        {"id": str(uuid4()), "code": "3Lz", "base_value": 5.90, "second_half": False},
        {"id": str(uuid4()), "code": "3F", "base_value": 5.00, "second_half": True},
    ]

    result = calculate_base_value(elements)

    # First jump: 5.90, Second jump: 5.00 * 1.1 = 5.50
    assert result.total_base_value == 11.40  # 5.90 + 5.50
    assert result.second_half_bonus_applied is True


def test_ppc_result_formatting():
    """Test that PPCResult provides useful formatting"""
    elements = [
        {"id": str(uuid4()), "code": "3Lz", "base_value": 5.90},
    ]

    result = calculate_base_value(elements)

    assert isinstance(result.total_base_value, float)
    assert isinstance(result.element_count, int)
    assert isinstance(result.breakdown, list)
