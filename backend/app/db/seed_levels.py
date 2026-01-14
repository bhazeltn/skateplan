"""
Seed data for levels table.

Populates system-defined levels for ISU, USA, and CAN federations.
"""
from sqlmodel import Session, select
from app.models.level_models import Level

# System levels for each federation
SEED_LEVELS = [
    # ISU Levels
    {"federation_code": "ISU", "level_name": "Basic Novice", "level_order": 1},
    {"federation_code": "ISU", "level_name": "Advanced Novice", "level_order": 2},
    {"federation_code": "ISU", "level_name": "Junior", "level_order": 3},
    {"federation_code": "ISU", "level_name": "Senior", "level_order": 4},

    # USA Skating Levels
    {"federation_code": "USA", "level_name": "Preliminary", "level_order": 1},
    {"federation_code": "USA", "level_name": "Pre-Juvenile", "level_order": 2},
    {"federation_code": "USA", "level_name": "Juvenile", "level_order": 3},
    {"federation_code": "USA", "level_name": "Intermediate", "level_order": 4},
    {"federation_code": "USA", "level_name": "Novice", "level_order": 5},
    {"federation_code": "USA", "level_name": "Junior", "level_order": 6},
    {"federation_code": "USA", "level_name": "Senior", "level_order": 7},

    # Skate Canada Levels
    {"federation_code": "CAN", "level_name": "STAR 1", "level_order": 1},
    {"federation_code": "CAN", "level_name": "STAR 2", "level_order": 2},
    {"federation_code": "CAN", "level_name": "STAR 3", "level_order": 3},
    {"federation_code": "CAN", "level_name": "STAR 4", "level_order": 4},
    {"federation_code": "CAN", "level_name": "STAR 5", "level_order": 5},
    {"federation_code": "CAN", "level_name": "STAR 6", "level_order": 6},
    {"federation_code": "CAN", "level_name": "STAR 7", "level_order": 7},
    {"federation_code": "CAN", "level_name": "STAR 8", "level_order": 8},
    {"federation_code": "CAN", "level_name": "STAR 9", "level_order": 9},
    {"federation_code": "CAN", "level_name": "STAR 10", "level_order": 10},
    {"federation_code": "CAN", "level_name": "Pre-Novice", "level_order": 11},
    {"federation_code": "CAN", "level_name": "Novice", "level_order": 12},
    {"federation_code": "CAN", "level_name": "Junior", "level_order": 13},
    {"federation_code": "CAN", "level_name": "Senior", "level_order": 14},
]


def seed_levels(session: Session) -> None:
    """
    Seed the levels table with system-defined levels for ISU, USA, and CAN.

    Checks if levels already exist before inserting to avoid duplicates.
    """
    # Check if levels already exist
    existing_count = len(session.exec(select(Level)).all())
    if existing_count > 0:
        print(f"Levels table already contains {existing_count} levels. Skipping seed.")
        return

    # Insert all seed levels
    for level_data in SEED_LEVELS:
        level = Level(
            federation_code=level_data["federation_code"],
            level_name=level_data["level_name"],
            level_order=level_data["level_order"],
            is_system=True,
            created_by_coach_id=None
        )
        session.add(level)

    session.commit()
    print(f"Successfully seeded {len(SEED_LEVELS)} levels for ISU, USA, and CAN federations.")


if __name__ == "__main__":
    # Allow running this script directly for manual seeding
    from app.db.session import engine
    from sqlmodel import Session

    with Session(engine) as session:
        seed_levels(session)
