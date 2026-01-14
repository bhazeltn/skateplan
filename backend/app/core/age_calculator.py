"""
Age calculation utilities for figure skating.

Implements the "July 1st Rule" and adult age class assignment.
Reference: docs/16_DOMAIN_LOGIC_AND_RULES.md Section 4
"""
from datetime import date
from typing import Optional, Dict, Any


def calculate_skating_age(dob: date, reference_date: date) -> int:
    """
    Calculate skating age using the July 1st rule.

    The skating age is the athlete's age on July 1st preceding the current season.
    If the reference date is before July 1st, use July 1st of the previous year.

    Args:
        dob: Date of birth
        reference_date: The reference date for age calculation (typically today)

    Returns:
        int: The skating age

    Examples:
        >>> dob = date(2010, 3, 15)
        >>> ref = date(2024, 9, 1)
        >>> calculate_skating_age(dob, ref)
        14  # Age on July 1, 2024
    """
    # Determine which July 1st to use
    if reference_date.month < 7 or (reference_date.month == 7 and reference_date.day < 1):
        # Before July 1st this year, use July 1st of previous year
        july_first = date(reference_date.year - 1, 7, 1)
    else:
        # On or after July 1st this year, use July 1st of current year
        july_first = date(reference_date.year, 7, 1)

    # Calculate age on that July 1st
    age = july_first.year - dob.year

    # Adjust if birthday hasn't occurred yet by July 1st
    if (july_first.month, july_first.day) < (dob.month, dob.day):
        age -= 1

    return age


def get_adult_age_class(skating_age: int) -> Optional[str]:
    """
    Determine adult age class based on skating age.

    Adult age classes:
    - Young Adult (YA): 18-27
    - Class I: 28-37
    - Class II: 38-47
    - Class III: 48-57
    - Class IV: 58-67
    - Class V: 68+

    Args:
        skating_age: The skating age (from July 1st rule)

    Returns:
        str: Age class string, or None if under 18

    Examples:
        >>> get_adult_age_class(22)
        'YA'
        >>> get_adult_age_class(35)
        'Class I'
        >>> get_adult_age_class(15)
        None
    """
    if skating_age < 18:
        return None
    elif 18 <= skating_age <= 27:
        return "YA"
    elif 28 <= skating_age <= 37:
        return "Class I"
    elif 38 <= skating_age <= 47:
        return "Class II"
    elif 48 <= skating_age <= 57:
        return "Class III"
    elif 58 <= skating_age <= 67:
        return "Class IV"
    else:  # 68+
        return "Class V"


def calculate_age_info(dob: date, reference_date: Optional[date] = None) -> Dict[str, Any]:
    """
    Calculate comprehensive age information for a skater.

    Includes both skating age (July 1st rule) and chronological age.

    Args:
        dob: Date of birth
        reference_date: Reference date for calculations (defaults to today)

    Returns:
        dict: Age information containing:
            - skating_age: Age on July 1st (competition age)
            - chronological_age: Actual age on reference date
            - adult_age_class: Adult division (YA, Class I-V) or None
            - is_adult: Boolean indicating if skater is adult (18+)

    Examples:
        >>> dob = date(2010, 8, 15)
        >>> ref = date(2024, 9, 1)
        >>> info = calculate_age_info(dob, ref)
        >>> info['skating_age']
        13
        >>> info['chronological_age']
        14
    """
    if reference_date is None:
        reference_date = date.today()

    # Calculate skating age (July 1st rule)
    skating_age = calculate_skating_age(dob, reference_date)

    # Calculate chronological age on reference date
    chronological_age = reference_date.year - dob.year
    if (reference_date.month, reference_date.day) < (dob.month, dob.day):
        chronological_age -= 1

    # Determine adult age class
    adult_age_class = get_adult_age_class(skating_age)

    return {
        "skating_age": skating_age,
        "chronological_age": chronological_age,
        "adult_age_class": adult_age_class,
        "is_adult": skating_age >= 18
    }
