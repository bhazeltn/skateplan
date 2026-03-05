"""add_discipline_and_level_to_skater_coach_link

Revision ID: 9e5129b895bd
Revises: 8e07ddf5a883
Create Date: 2026-01-15 02:20:28.316946

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9e5129b895bd'
down_revision: Union[str, Sequence[str], None] = '8e07ddf5a883'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add discipline and current_level columns to skater_coach_links table
    # Initially nullable with defaults to handle existing records
    op.add_column('skater_coach_links', sa.Column('discipline', sa.String(), nullable=True))
    op.add_column('skater_coach_links', sa.Column('current_level', sa.String(), nullable=True))

    # Update existing records with default values
    op.execute("UPDATE skater_coach_links SET discipline = 'Singles' WHERE discipline IS NULL")
    op.execute("""
        UPDATE skater_coach_links scl
        SET current_level = p.level
        FROM profiles p
        WHERE scl.skater_id = p.id AND scl.current_level IS NULL
    """)
    op.execute("UPDATE skater_coach_links SET current_level = 'Unknown' WHERE current_level IS NULL")

    # Make columns not nullable now that all records have values
    op.alter_column('skater_coach_links', 'discipline', nullable=False)
    op.alter_column('skater_coach_links', 'current_level', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Remove discipline and current_level columns
    op.drop_column('skater_coach_links', 'current_level')
    op.drop_column('skater_coach_links', 'discipline')
