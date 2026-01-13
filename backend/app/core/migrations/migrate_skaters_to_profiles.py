"""
Data migration script: Migrate existing skaters table data to unified profiles model.

This script:
1. Reads existing records from `skaters` table
2. Creates corresponding Profile records with role='skater'
3. Creates SkaterCoachLink records to maintain coach-skater relationships
4. Preserves all original data (names, DOB, level, active status)

Run with: docker exec -it skateplan-backend python -m app.core.migrations.migrate_skaters_to_profiles
"""

import sys
import uuid
from sqlmodel import Session, select
from app.core.db import engine
from app.models.user_models import Profile, SkaterCoachLink
from app.models.skater_models import Skater


def migrate_skaters_to_profiles() -> None:
    """Migrate skaters table to unified profiles + skater_coach_links."""

    with Session(engine) as session:
        # Fetch all existing skaters
        skaters = session.exec(select(Skater)).all()

        if not skaters:
            print("No skaters found to migrate.")
            return

        print(f"Found {len(skaters)} skaters to migrate...")

        migrated_count = 0
        skipped_count = 0

        for old_skater in skaters:
            # Check if profile already exists (in case of re-run)
            existing_profile = session.get(Profile, old_skater.id)

            if existing_profile:
                print(f"  ⚠️  Skipping {old_skater.full_name} - profile already exists")
                skipped_count += 1
                continue

            try:
                # Generate temporary email (will be updated when skater gets real auth)
                temp_email = f"skater.{old_skater.id.hex[:8]}@temp.skateplan.local"

                # Create new profile from skater data
                new_profile = Profile(
                    id=old_skater.id,  # Preserve UUID
                    role="skater",
                    full_name=old_skater.full_name,
                    email=temp_email,
                    dob=old_skater.dob,
                    level=old_skater.level,
                    is_active=old_skater.is_active,
                )
                session.add(new_profile)

                # Create coach-skater link
                coach_link = SkaterCoachLink(
                    skater_id=old_skater.id,
                    coach_id=old_skater.coach_id,
                    is_primary=True,
                    permission_level="edit",
                    status="active"
                )
                session.add(coach_link)

                session.commit()

                print(f"  ✅ Migrated: {old_skater.full_name}")
                migrated_count += 1

            except Exception as e:
                session.rollback()
                print(f"  ❌ Error migrating {old_skater.full_name}: {e}")

        print(f"\n✨ Migration complete!")
        print(f"   Migrated: {migrated_count}")
        print(f"   Skipped: {skipped_count}")
        print(f"\nNext steps:")
        print("   1. Verify data with: SELECT * FROM profiles WHERE role='skater';")
        print("   2. Verify links with: SELECT * FROM skater_coach_links;")
        print("   3. Once verified, drop old table with: DROP TABLE skaters;")


if __name__ == "__main__":
    try:
        migrate_skaters_to_profiles()
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)
