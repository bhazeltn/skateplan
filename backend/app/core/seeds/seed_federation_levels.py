"""
Seed federation levels system from JSON files.

Loads all federations (ISU, CAN, USA, PHI, ISI, UNIVERSAL) with their
streams and levels from individual JSON files.

This replaces the old seed_levels.py which used competitive_hierarchies.json.
"""
import json
import uuid
from pathlib import Path
from sqlmodel import Session, create_engine, select

from app.core.config import settings
# Import all models to ensure proper foreign key resolution
from app.models.user_models import Profile  # Import first to establish profiles table
from app.models.federation_models import Federation
from app.models.stream_models import Stream
from app.models.level_models import Level


SEEDS_DIR = Path(__file__).parent
FEDERATIONS = ['ISU', 'CAN', 'USA', 'PHI', 'ISI', 'UNIVERSAL']


def load_federation_json(federation_code: str) -> dict:
    """Load federation data from JSON file."""
    # Handle special case for ISI (file is ISI_Levels.json with capital L)
    if federation_code == 'ISI':
        filepath = SEEDS_DIR / "ISI_Levels.json"
    else:
        filepath = SEEDS_DIR / f"{federation_code}_levels.json"

    if not filepath.exists():
        raise FileNotFoundError(f"Federation JSON not found: {filepath}")

    with open(filepath, 'r') as f:
        return json.load(f)


def seed_federation(session: Session, federation_code: str) -> tuple:
    """
    Seed a single federation with its streams and levels.

    Returns: (federation_name, stream_count, level_count)
    """
    data = load_federation_json(federation_code)

    # Create or get federation
    federation = session.exec(
        select(Federation).where(Federation.code == data['federation_code'])
    ).first()

    if not federation:
        # Determine ISO code based on federation
        iso_code_map = {
            'ISU': 'int',  # International
            'CAN': 'ca',
            'USA': 'us',
            'PHI': 'ph',
            'ISI': 'us',  # ISI is US-based
            'UNIVERSAL': 'int'  # Universal/International
        }

        federation = Federation(
            code=data['federation_code'],
            name=data['federation_name'],
            iso_code=iso_code_map.get(data['federation_code'], 'int'),
            is_active=True
        )
        session.add(federation)
        session.flush()

    stream_count = 0
    level_count = 0

    # Create streams and levels
    for stream_data in data['streams']:
        # Check if stream already exists
        existing_stream = session.exec(
            select(Stream).where(
                Stream.federation_code == federation.code,
                Stream.stream_code == stream_data['stream_name']
            )
        ).first()

        if existing_stream:
            stream = existing_stream
        else:
            stream = Stream(
                federation_code=federation.code,
                stream_code=stream_data['stream_name'],
                stream_display=stream_data['stream_display'],
                discipline=stream_data['discipline']
            )
            session.add(stream)
            session.flush()
            stream_count += 1

        # Create levels for this stream
        for level_data in stream_data['levels']:
            # Check if level already exists
            existing_level = session.exec(
                select(Level).where(
                    Level.stream_id == stream.id,
                    Level.level_name == level_data['name']
                )
            ).first()

            if not existing_level:
                level = Level(
                    stream_id=stream.id,
                    level_name=level_data['name'],
                    display_name=level_data['name'],  # Will be formatted by frontend
                    level_order=level_data['order'],
                    is_adult=level_data['is_adult'],
                    is_system=True,
                    isu_anchor=level_data.get('isu_anchor')
                )
                session.add(level)
                level_count += 1

    session.commit()

    return (data['federation_name'], stream_count, level_count)


def seed_all_federations():
    """Seed all federations from JSON files."""
    engine = create_engine(str(settings.DATABASE_URL))

    with Session(engine) as session:
        print("\n" + "=" * 60)
        print("SEEDING FEDERATION LEVELS SYSTEM")
        print("=" * 60)
        print()

        total_streams = 0
        total_levels = 0

        for fed_code in FEDERATIONS:
            try:
                name, streams, levels = seed_federation(session, fed_code)
                print(f"✓ {fed_code:4s} | {name:30s} | {streams:2d} streams | {levels:3d} levels")
                total_streams += streams
                total_levels += levels
            except FileNotFoundError as e:
                print(f"✗ {fed_code:4s} | ERROR: {e}")
            except Exception as e:
                print(f"✗ {fed_code:4s} | ERROR: {str(e)}")
                raise

        print()
        print("=" * 60)
        print(f"TOTAL: {len(FEDERATIONS)} federations | {total_streams} streams | {total_levels} levels")
        print("=" * 60)
        print()

        # Verification query
        print("VERIFICATION:")
        print("-" * 60)

        from sqlalchemy import text
        result = session.exec(text("""
            SELECT
                f.code,
                f.name,
                COUNT(DISTINCT s.id) as streams,
                COUNT(l.id) as levels
            FROM federations f
            LEFT JOIN streams s ON s.federation_code = f.code
            LEFT JOIN levels l ON l.stream_id = s.id
            GROUP BY f.id, f.code, f.name
            ORDER BY f.code
        """))

        print(f"{'CODE':<4s} | {'NAME':<30s} | {'STREAMS':>7s} | {'LEVELS':>6s}")
        print("-" * 60)
        for row in result:
            print(f"{row[0]:<4s} | {row[1]:<30s} | {row[2]:>7d} | {row[3]:>6d}")

        print("-" * 60)
        print()


if __name__ == "__main__":
    seed_all_federations()
