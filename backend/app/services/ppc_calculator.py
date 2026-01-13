"""
PPC (Planned Program Content) Base Value Calculator.

Calculates the total base value of a skating program based on planned
technical elements from the ISU library.

Features:
- Sums base values from ISU element codes
- Applies 1.1x multiplier for second-half jumps
- Provides detailed breakdown by element
- Validates technical requirements (e.g., max jumps, spins, etc.)
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class PPCBreakdownItem(BaseModel):
    """Single element in PPC breakdown."""
    sequence: int
    code: str
    base_value: float
    multiplier: float = 1.0
    final_value: float
    second_half: bool = False


class PPCResult(BaseModel):
    """Result of PPC base value calculation."""
    total_base_value: float
    element_count: int
    second_half_bonus_applied: bool
    breakdown: List[PPCBreakdownItem]


def calculate_base_value(elements: List[Dict[str, Any]]) -> PPCResult:
    """
    Calculate total base value for a program based on planned elements.

    Args:
        elements: List of element dicts with keys:
            - code: Element code (e.g., "3Lz", "CCoSp4")
            - base_value: Base value from ISU library
            - sequence: (optional) Order in program
            - second_half: (optional) Whether element is in second half (gets 1.1x)

    Returns:
        PPCResult with total value and detailed breakdown
    """
    if not elements:
        return PPCResult(
            total_base_value=0.0,
            element_count=0,
            second_half_bonus_applied=False,
            breakdown=[]
        )

    total_value = 0.0
    breakdown = []
    second_half_bonus_applied = False

    for idx, element in enumerate(elements):
        code = element.get("code", f"Element{idx+1}")
        base_value = float(element.get("base_value", 0.0))
        second_half = element.get("second_half", False)
        sequence = element.get("sequence", idx + 1)

        # Apply second-half multiplier (1.1x for jumps)
        multiplier = 1.0
        if second_half and _is_jump_element(code):
            multiplier = 1.1
            second_half_bonus_applied = True

        final_value = base_value * multiplier
        total_value += final_value

        breakdown.append(PPCBreakdownItem(
            sequence=sequence,
            code=code,
            base_value=base_value,
            multiplier=multiplier,
            final_value=round(final_value, 2),
            second_half=second_half
        ))

    return PPCResult(
        total_base_value=round(total_value, 2),
        element_count=len(elements),
        second_half_bonus_applied=second_half_bonus_applied,
        breakdown=breakdown
    )


def _is_jump_element(code: str) -> bool:
    """
    Check if an element code represents a jump (eligible for second-half bonus).

    Jump elements typically start with a number (1A, 2A, 3Lz, 4T, etc.)
    """
    if not code:
        return False

    # Check if first character is a digit (indicating jump)
    return code[0].isdigit()


def validate_program_requirements(
    elements: List[Dict[str, Any]],
    level: str = "Senior"
) -> Dict[str, Any]:
    """
    Validate that a program meets technical requirements for the level.

    Args:
        elements: List of planned elements
        level: Competition level (Novice, Junior, Senior)

    Returns:
        Dict with validation results:
            - is_valid: bool
            - errors: List[str]
            - warnings: List[str]
    """
    errors = []
    warnings = []

    # Count element types
    jump_count = sum(1 for e in elements if _is_jump_element(e.get("code", "")))
    spin_count = sum(1 for e in elements if _is_spin_element(e.get("code", "")))
    step_count = sum(1 for e in elements if _is_step_sequence(e.get("code", "")))

    # Senior Short Program requirements (ISU rules)
    if level == "Senior":
        if jump_count < 3:
            errors.append(f"Short program requires 3 jump elements (found {jump_count})")
        if spin_count < 3:
            errors.append(f"Short program requires 3 spin elements (found {spin_count})")
        if step_count < 1:
            errors.append(f"Short program requires 1 step sequence (found {step_count})")

    is_valid = len(errors) == 0

    return {
        "is_valid": is_valid,
        "errors": errors,
        "warnings": warnings,
        "element_counts": {
            "jumps": jump_count,
            "spins": spin_count,
            "steps": step_count,
        }
    }


def _is_spin_element(code: str) -> bool:
    """Check if element is a spin (contains 'Sp' in code)."""
    return "Sp" in code if code else False


def _is_step_sequence(code: str) -> bool:
    """Check if element is a step sequence (contains 'Sq' in code)."""
    return "Sq" in code if code else False
