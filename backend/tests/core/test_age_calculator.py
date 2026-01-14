"""
Tests for age calculation utilities.

Tests the July 1st rule and adult age class assignment logic.
Reference: docs/16_DOMAIN_LOGIC_AND_RULES.md Section 4
"""
import pytest
from datetime import date
from app.core.age_calculator import (
    calculate_skating_age,
    get_adult_age_class,
    calculate_age_info
)


class TestSkatingAgeCalculation:
    """Test the July 1st rule for skating age calculation."""

    def test_age_on_july_1st_same_year(self):
        """Test skating age when reference date is after July 1st in the same year."""
        dob = date(2010, 3, 15)
        reference_date = date(2024, 9, 1)  # September 1, 2024
        # July 1, 2024: person turns 14 (2024 - 2010 = 14)
        assert calculate_skating_age(dob, reference_date) == 14

    def test_age_before_july_1st(self):
        """Test skating age when reference date is before July 1st."""
        dob = date(2010, 3, 15)
        reference_date = date(2024, 5, 1)  # May 1, 2024
        # July 1, 2023: person turns 13 (2023 - 2010 = 13)
        assert calculate_skating_age(dob, reference_date) == 13

    def test_birthday_after_july_1st(self):
        """Test skating age when birthday is after July 1st."""
        dob = date(2010, 8, 20)  # Birthday in August
        reference_date = date(2024, 9, 1)
        # On July 1, 2024: person is still 13 (turns 14 on Aug 20)
        assert calculate_skating_age(dob, reference_date) == 13

    def test_birthday_on_july_1st(self):
        """Test skating age when birthday is exactly July 1st."""
        dob = date(2010, 7, 1)
        reference_date = date(2024, 9, 1)
        # On July 1, 2024: person turns 14
        assert calculate_skating_age(dob, reference_date) == 14

    def test_birthday_before_july_1st(self):
        """Test skating age when birthday is before July 1st."""
        dob = date(2010, 3, 15)  # Birthday in March
        reference_date = date(2024, 9, 1)
        # On July 1, 2024: person is already 14
        assert calculate_skating_age(dob, reference_date) == 14

    def test_edge_case_june_30th_reference(self):
        """Test skating age on June 30th (day before July 1st)."""
        dob = date(2010, 3, 15)
        reference_date = date(2024, 6, 30)
        # Uses July 1, 2023 (previous year)
        assert calculate_skating_age(dob, reference_date) == 13

    def test_edge_case_july_1st_reference(self):
        """Test skating age on July 1st itself."""
        dob = date(2010, 3, 15)
        reference_date = date(2024, 7, 1)
        # Uses July 1, 2024 (current date)
        assert calculate_skating_age(dob, reference_date) == 14

    def test_young_skater(self):
        """Test skating age for a young skater."""
        dob = date(2020, 1, 15)
        reference_date = date(2024, 10, 1)
        # On July 1, 2024: person is 4
        assert calculate_skating_age(dob, reference_date) == 4

    def test_adult_skater(self):
        """Test skating age for an adult skater."""
        dob = date(1990, 5, 10)
        reference_date = date(2024, 10, 1)
        # On July 1, 2024: person is 34
        assert calculate_skating_age(dob, reference_date) == 34


class TestAdultAgeClass:
    """Test adult age class assignment."""

    def test_young_adult_minimum(self):
        """Test Young Adult at minimum age (18)."""
        skating_age = 18
        assert get_adult_age_class(skating_age) == "YA"

    def test_young_adult_maximum(self):
        """Test Young Adult at maximum age (27)."""
        skating_age = 27
        assert get_adult_age_class(skating_age) == "YA"

    def test_young_adult_mid_range(self):
        """Test Young Adult in middle of range."""
        skating_age = 22
        assert get_adult_age_class(skating_age) == "YA"

    def test_class_i_minimum(self):
        """Test Class I at minimum age (28)."""
        skating_age = 28
        assert get_adult_age_class(skating_age) == "Class I"

    def test_class_i_maximum(self):
        """Test Class I at maximum age (37)."""
        skating_age = 37
        assert get_adult_age_class(skating_age) == "Class I"

    def test_class_ii_minimum(self):
        """Test Class II at minimum age (38)."""
        skating_age = 38
        assert get_adult_age_class(skating_age) == "Class II"

    def test_class_ii_maximum(self):
        """Test Class II at maximum age (47)."""
        skating_age = 47
        assert get_adult_age_class(skating_age) == "Class II"

    def test_class_iii_minimum(self):
        """Test Class III at minimum age (48)."""
        skating_age = 48
        assert get_adult_age_class(skating_age) == "Class III"

    def test_class_iii_maximum(self):
        """Test Class III at maximum age (57)."""
        skating_age = 57
        assert get_adult_age_class(skating_age) == "Class III"

    def test_class_iv_minimum(self):
        """Test Class IV at minimum age (58)."""
        skating_age = 58
        assert get_adult_age_class(skating_age) == "Class IV"

    def test_class_iv_maximum(self):
        """Test Class IV at maximum age (67)."""
        skating_age = 67
        assert get_adult_age_class(skating_age) == "Class IV"

    def test_class_v_minimum(self):
        """Test Class V at minimum age (68)."""
        skating_age = 68
        assert get_adult_age_class(skating_age) == "Class V"

    def test_class_v_very_old(self):
        """Test Class V for very old skater."""
        skating_age = 85
        assert get_adult_age_class(skating_age) == "Class V"

    def test_under_adult_age(self):
        """Test that under 18 returns None."""
        skating_age = 17
        assert get_adult_age_class(skating_age) is None

    def test_child_age(self):
        """Test that child age returns None."""
        skating_age = 10
        assert get_adult_age_class(skating_age) is None


class TestCalculateAgeInfo:
    """Test the comprehensive age info calculation."""

    def test_young_skater_age_info(self):
        """Test age info for a young skater (not adult)."""
        dob = date(2015, 3, 15)
        reference_date = date(2024, 10, 1)

        result = calculate_age_info(dob, reference_date)

        assert result["skating_age"] == 9
        assert result["chronological_age"] == 9
        assert result["adult_age_class"] is None
        assert result["is_adult"] is False

    def test_young_adult_age_info(self):
        """Test age info for a Young Adult."""
        dob = date(2002, 5, 10)
        reference_date = date(2024, 10, 1)

        result = calculate_age_info(dob, reference_date)

        assert result["skating_age"] == 22
        assert result["chronological_age"] == 22
        assert result["adult_age_class"] == "YA"
        assert result["is_adult"] is True

    def test_class_i_age_info(self):
        """Test age info for Class I adult."""
        dob = date(1992, 8, 20)
        reference_date = date(2024, 10, 1)

        result = calculate_age_info(dob, reference_date)

        assert result["skating_age"] == 31
        assert result["chronological_age"] == 32
        assert result["adult_age_class"] == "Class I"
        assert result["is_adult"] is True

    def test_class_v_age_info(self):
        """Test age info for Class V adult."""
        dob = date(1950, 1, 15)
        reference_date = date(2024, 10, 1)

        result = calculate_age_info(dob, reference_date)

        assert result["skating_age"] == 74
        assert result["chronological_age"] == 74
        assert result["adult_age_class"] == "Class V"
        assert result["is_adult"] is True

    def test_age_info_with_default_reference_date(self):
        """Test age info calculation with default reference date (today)."""
        dob = date(2010, 1, 1)

        # Should not raise an error
        result = calculate_age_info(dob)

        assert "skating_age" in result
        assert "chronological_age" in result
        assert "adult_age_class" in result
        assert "is_adult" in result

    def test_skating_age_different_from_chronological(self):
        """Test case where skating age differs from chronological age."""
        dob = date(2010, 8, 15)  # Birthday after July 1st
        reference_date = date(2024, 9, 1)  # After their 14th birthday

        result = calculate_age_info(dob, reference_date)

        # Chronological age: 14 (turned 14 on Aug 15, 2024)
        # Skating age: 13 (age on July 1, 2024, still 13)
        assert result["chronological_age"] == 14
        assert result["skating_age"] == 13
        assert result["is_adult"] is False
