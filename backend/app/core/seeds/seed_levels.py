"""
Seed comprehensive levels data from competitive_hierarchies.json and adult_class_logic.json.

Populates all federation-specific levels with streams, disciplines, adult flags, and ISU anchors.
"""
import json
import uuid
from pathlib import Path
from sqlmodel import Session, create_engine, select

from app.core.config import settings
from app.models.level_models import Level


def load_json_data():
    """Load reference JSON files."""
    seeds_dir = Path(__file__).parent

    with open(seeds_dir / "competitive_hierarchies.json", "r") as f:
        hierarchies = json.load(f)

    with open(seeds_dir / "adult_class_logic.json", "r") as f:
        adult_logic = json.load(f)

    return hierarchies, adult_logic


def apply_smart_display_names(levels: list) -> None:
    """
    Apply smart display_name logic based on stream count.
    - Single stream (or no streams): Just level name (e.g., "Junior")
    - Multiple streams: Include stream (e.g., "Podium Pathway: Junior")
    """
    # Group by federation_code
    by_federation = {}
    for level in levels:
        if level.federation_code not in by_federation:
            by_federation[level.federation_code] = []
        by_federation[level.federation_code].append(level)

    # Apply display names per federation
    for federation_code, fed_levels in by_federation.items():
        # Count unique streams (excluding None)
        streams = set(lvl.stream for lvl in fed_levels if lvl.stream)

        if len(streams) <= 1:
            # Single stream or no streams - simplify
            for level in fed_levels:
                level.display_name = level.level_name
        else:
            # Multiple streams - include stream name
            for level in fed_levels:
                if level.stream:
                    stream_display = level.stream.replace("_", " ")
                    level.display_name = f"{stream_display}: {level.level_name}"
                else:
                    level.display_name = level.level_name


def seed_levels():
    """Seed all levels from JSON files."""
    engine = create_engine(str(settings.DATABASE_URL))

    with Session(engine) as session:
        # Check if levels already exist
        existing = session.exec(select(Level)).first()
        if existing:
            print("Levels already seeded. Skipping.")
            return

        hierarchies, adult_logic = load_json_data()
        levels_to_add = []
        order_counter = 0

        # ===================================================================
        # SKATE CANADA (CAN)
        # ===================================================================
        print("Seeding Skate Canada levels...")

        # Podium Pathway (competitive singles)
        for idx, item in enumerate(hierarchies["Skate_Canada_Domestic"]["Podium_Pathway"], start=1):
            level_name = item["level"]
            order_counter += 1
            levels_to_add.append(Level(
                federation_code="CAN",
                stream="Podium_Pathway",
                discipline="Singles",
                level_name=level_name,
                display_name=level_name,  # Will be set by apply_smart_display_names()
                level_order=order_counter,
                is_adult=False,
                is_system=True,
                isu_anchor=item.get("isu_anchor")
            ))

        # STARSkate Singles
        for idx, level_name in enumerate(hierarchies["Skate_Canada_Domestic"]["STARSkate_Singles"], start=1):
            order_counter += 1
            levels_to_add.append(Level(
                federation_code="CAN",
                stream="STARSkate_Singles",
                discipline="Singles",
                level_name=level_name,
                display_name=level_name,  # Will be set by apply_smart_display_names()
                level_order=order_counter,
                is_adult=False,
                is_system=True
            ))

        # STARSkate Artistic
        for idx, level_name in enumerate(hierarchies["Skate_Canada_Domestic"]["STARSkate_Artistic"], start=1):
            order_counter += 1
            levels_to_add.append(Level(
                federation_code="CAN",
                stream="STARSkate_Artistic",
                discipline="Artistic",
                level_name=level_name,
                display_name=level_name,  # Will be set by apply_smart_display_names()
                level_order=order_counter,
                is_adult=False,
                is_system=True
            ))

        # STARSkate Dance
        for idx, level_name in enumerate(hierarchies["Skate_Canada_Domestic"]["STARSkate_Dance"], start=1):
            order_counter += 1
            levels_to_add.append(Level(
                federation_code="CAN",
                stream="STARSkate_Dance",
                discipline="Dance",
                level_name=level_name,
                display_name=level_name,  # Will be set by apply_smart_display_names()
                level_order=order_counter,
                is_adult=False,
                is_system=True
            ))

        # Adult Singles
        for idx, level_name in enumerate(hierarchies["Skate_Canada_Domestic"]["Adult_Singles"], start=1):
            order_counter += 1
            levels_to_add.append(Level(
                federation_code="CAN",
                stream="Adult_Singles",
                discipline="Singles",
                level_name=level_name,
                display_name=level_name,  # Will be set by apply_smart_display_names()
                level_order=order_counter,
                is_adult=True,
                is_system=True
            ))

        # Adult Pairs/Dance
        for idx, level_name in enumerate(hierarchies["Skate_Canada_Domestic"]["Adult_Pairs_Dance"], start=1):
            order_counter += 1
            # Determine discipline from level name
            if "Pair" in level_name:
                discipline = "Pairs"
            elif "Dance" in level_name:
                discipline = "Dance"
            else:
                discipline = None

            levels_to_add.append(Level(
                federation_code="CAN",
                stream="Adult_Pairs_Dance",
                discipline=discipline,
                level_name=level_name,
                display_name=level_name,  # Will be set by apply_smart_display_names()
                level_order=order_counter,
                is_adult=True,
                is_system=True
            ))

        # ===================================================================
        # US FIGURE SKATING (USA)
        # ===================================================================
        print("Seeding US Figure Skating levels...")

        # Well Balanced
        for idx, level_name in enumerate(hierarchies["USFS_Domestic"]["Well_Balanced"], start=1):
            order_counter += 1
            levels_to_add.append(Level(
                federation_code="USA",
                stream="Well_Balanced",
                discipline="Singles",
                level_name=level_name,
                display_name=level_name,  # Will be set by apply_smart_display_names()
                level_order=order_counter,
                is_adult=False,
                is_system=True
            ))

        # Excel Series
        for idx, level_name in enumerate(hierarchies["USFS_Domestic"]["Excel_Series"], start=1):
            order_counter += 1
            levels_to_add.append(Level(
                federation_code="USA",
                stream="Excel_Series",
                discipline="Singles",
                level_name=level_name,
                display_name=level_name,  # Will be set by apply_smart_display_names()
                level_order=order_counter,
                is_adult=False,
                is_system=True
            ))

        # Solo Dance
        for idx, level_name in enumerate(hierarchies["USFS_Domestic"]["Solo_Dance"], start=1):
            order_counter += 1
            levels_to_add.append(Level(
                federation_code="USA",
                stream="Solo_Dance",
                discipline="Dance",
                level_name=level_name,
                display_name=level_name,  # Will be set by apply_smart_display_names()
                level_order=order_counter,
                is_adult=False,
                is_system=True
            ))

        # Showcase
        for idx, level_name in enumerate(hierarchies["USFS_Domestic"]["Showcase"], start=1):
            order_counter += 1
            levels_to_add.append(Level(
                federation_code="USA",
                stream="Showcase",
                discipline="Singles",
                level_name=level_name,
                display_name=level_name,  # Will be set by apply_smart_display_names()
                level_order=order_counter,
                is_adult=False,
                is_system=True
            ))

        # Adult Championship
        for idx, level_name in enumerate(hierarchies["USFS_Domestic"]["Adult_Championship"], start=1):
            order_counter += 1
            levels_to_add.append(Level(
                federation_code="USA",
                stream="Adult_Championship",
                discipline="Singles",
                level_name=level_name,
                display_name=level_name,  # Will be set by apply_smart_display_names()
                level_order=order_counter,
                is_adult=True,
                is_system=True
            ))

        # ===================================================================
        # ISU INTERNATIONAL
        # ===================================================================
        print("Seeding ISU levels...")

        # Singles/Pairs
        for idx, level_name in enumerate(hierarchies["ISU_International"]["Singles_Pairs"], start=1):
            order_counter += 1
            levels_to_add.append(Level(
                federation_code="ISU",
                stream="Singles_Pairs",
                discipline="Singles",
                level_name=level_name,
                display_name=level_name,  # Will be set by apply_smart_display_names()
                level_order=order_counter,
                is_adult=False,
                is_system=True
            ))

        # Ice Dance
        for idx, level_name in enumerate(hierarchies["ISU_International"]["Ice_Dance"], start=1):
            order_counter += 1
            levels_to_add.append(Level(
                federation_code="ISU",
                stream="Ice_Dance",
                discipline="Dance",
                level_name=level_name,
                display_name=level_name,  # Will be set by apply_smart_display_names()
                level_order=order_counter,
                is_adult=False,
                is_system=True
            ))

        # ===================================================================
        # PHILIPPINE SKATING UNION (PHI)
        # ===================================================================
        print("Seeding Philippine Skating Union levels...")

        for idx, level_name in enumerate(hierarchies["PHSU_Pilot"]["Levels"], start=1):
            order_counter += 1
            levels_to_add.append(Level(
                federation_code="PHI",
                stream="Levels",
                discipline="Singles",
                level_name=level_name,
                display_name=level_name,  # Will be set by apply_smart_display_names()
                level_order=order_counter,
                is_adult=False,
                is_system=True
            ))

        # ===================================================================
        # ISI MAPPING
        # ===================================================================
        print("Seeding ISI levels...")

        for idx, level_name in enumerate(hierarchies["Other_Federations"]["ISI_Mapping"], start=1):
            order_counter += 1
            levels_to_add.append(Level(
                federation_code="ISI",
                stream="ISI_Mapping",
                discipline="Singles",
                level_name=level_name,
                display_name=level_name,  # Will be set by apply_smart_display_names()
                level_order=order_counter,
                is_adult=False,
                is_system=True
            ))

        # ===================================================================
        # UNIVERSAL ADULT LEVELS (for ALL federations)
        # ===================================================================
        print("Seeding Universal Adult levels...")

        # Adult Singles from adult_class_logic.json
        adult_singles = adult_logic["disciplines"]["Singles_Freeskate"]["standard"] + \
                       adult_logic["disciplines"]["Singles_Freeskate"]["masters"]

        for idx, level_name in enumerate(adult_singles, start=1):
            order_counter += 1
            levels_to_add.append(Level(
                federation_code="UNIVERSAL",
                stream=None,  # No stream for universal levels
                discipline="Singles",
                level_name=level_name,
                display_name=level_name,  # No stream prefix
                level_order=order_counter,
                is_adult=True,
                is_system=True
            ))

        # Apply smart display names based on stream count per federation
        print("Applying smart display names...")
        apply_smart_display_names(levels_to_add)

        # Add all levels to database
        print(f"Adding {len(levels_to_add)} levels to database...")
        for level in levels_to_add:
            session.add(level)

        session.commit()
        print("✓ All levels seeded successfully!")

        # Print summary
        print("\n=== SEEDING SUMMARY ===")
        can_count = len([l for l in levels_to_add if l.federation_code == "CAN"])
        usa_count = len([l for l in levels_to_add if l.federation_code == "USA"])
        isu_count = len([l for l in levels_to_add if l.federation_code == "ISU"])
        phi_count = len([l for l in levels_to_add if l.federation_code == "PHI"])
        isi_count = len([l for l in levels_to_add if l.federation_code == "ISI"])
        universal_count = len([l for l in levels_to_add if l.federation_code == "UNIVERSAL"])
        adult_count = len([l for l in levels_to_add if l.is_adult])

        print(f"CAN (Skate Canada): {can_count} levels")
        print(f"USA (US Figure Skating): {usa_count} levels")
        print(f"ISU (International): {isu_count} levels")
        print(f"PHI (Philippine): {phi_count} levels")
        print(f"ISI: {isi_count} levels")
        print(f"UNIVERSAL (Adult): {universal_count} levels")
        print(f"Total adult levels (across all federations): {adult_count}")
        print(f"TOTAL: {len(levels_to_add)} levels")


if __name__ == "__main__":
    seed_levels()
