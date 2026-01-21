"""Seed scripts for populating initial database data."""
# Import from parent seeds.py module (not this package) for backwards compatibility
import sys
from pathlib import Path

# Import seed functions from seeds.py in parent directory
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

try:
    from seeds import seed_federations, seed_elements
except ImportError:
    # Fallback - define stub functions
    def seed_federations(session):
        return {"message": "Federation seeding not available"}

    def seed_elements(session):
        return {"message": "Element seeding not available"}

__all__ = ["seed_federations", "seed_elements"]
