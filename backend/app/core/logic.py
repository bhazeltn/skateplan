from datetime import date, datetime

def calculate_skating_age(dob: date, current_date: date = None) -> int:
    """
    Calculates the 'Skating Age' for the current season.
    Rule: Age as of the preceding July 1st.
    """
    if current_date is None:
        current_date = date.today()
    
    # Determine the 'preceding July 1st'
    if current_date.month >= 7:
        cutoff_date = date(current_date.year, 7, 1)
    else:
        cutoff_date = date(current_date.year - 1, 7, 1)
        
    age = cutoff_date.year - dob.year - ((cutoff_date.month, cutoff_date.day) < (dob.month, dob.day))
    return age

def assign_adult_class(skating_age: int) -> str:
    """
    Maps skating age to Adult Age Class.
    """
    if skating_age < 18:
        return "Standard" # Not adult
    if 18 <= skating_age <= 27:
        return "Young Adult"
    if 28 <= skating_age <= 37:
        return "Class I"
    if 38 <= skating_age <= 47:
        return "Class II"
    if 48 <= skating_age <= 57:
        return "Class III"
    if 58 <= skating_age <= 67:
        return "Class IV"
    if skating_age >= 68:
        return "Class V"
    return "Unknown"
