"""add_location_fields_to_events

Revision ID: 450961ec4965
Revises: 3cced125cf5f
Create Date: 2026-03-06 14:43:10.715219

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '450961ec4965'
down_revision: Union[str, Sequence[str], None] = '3cced125cf5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add country, state_province, city to competitions table
    op.add_column('competitions', sa.Column('country', sa.String(), nullable=True))
    op.add_column('competitions', sa.Column('state_province', sa.String(), nullable=True))
    op.add_column('competitions', sa.Column('city', sa.String(), nullable=True))

    # Add country, state_province, city to skater_events table
    op.add_column('skater_events', sa.Column('country', sa.String(), nullable=True))
    op.add_column('skater_events', sa.Column('state_province', sa.String(), nullable=True))
    op.add_column('skater_events', sa.Column('city', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove country, state_province, city from competitions table
    op.drop_column('competitions', 'city')
    op.drop_column('competitions', 'state_province')
    op.drop_column('competitions', 'country')

    # Remove country, state_province, city from skater_events table
    op.drop_column('skater_events', 'city')
    op.drop_column('skater_events', 'state_province')
    op.drop_column('skater_events', 'country')
