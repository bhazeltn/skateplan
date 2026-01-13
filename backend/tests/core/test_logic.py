from datetime import date
from app.core.logic import calculate_skating_age, assign_adult_class

def test_skating_age_calculation():
    # Born Jan 1, 2010.
    # Current Date: Oct 1, 2023 (Season 23/24)
    # Preceding July 1st: July 1, 2023.
    # Age on July 1, 2023: 13.
    dob = date(2010, 1, 1)
    current = date(2023, 10, 1)
    assert calculate_skating_age(dob, current) == 13

    # Born Aug 1, 2010.
    # Preceding July 1st: July 1, 2023.
    # Age on July 1, 2023: 12 (Not yet 13).
    dob_late = date(2010, 8, 1)
    assert calculate_skating_age(dob_late, current) == 12

def test_adult_age_class_assignment():
    assert assign_adult_class(17) == "Standard"
    assert assign_adult_class(18) == "Young Adult"
    assert assign_adult_class(27) == "Young Adult"
    assert assign_adult_class(28) == "Class I"
    assert assign_adult_class(38) == "Class II"
    assert assign_adult_class(48) == "Class III"
    assert assign_adult_class(58) == "Class IV"
    assert assign_adult_class(68) == "Class V"
    assert assign_adult_class(80) == "Class V"
