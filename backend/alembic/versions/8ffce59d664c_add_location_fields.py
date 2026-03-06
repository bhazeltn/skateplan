"""add_location_fields

Revision ID: 8ffce59d664c
Revises: 3cced125cf5f
Create Date: 2026-03-06 15:08:02.503691

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '8ffce59d664c'
down_revision: Union[str, Sequence[str], None] = '3cced125cf5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Fix the missing columns in the competitions table from earlier
    op.add_column('competitions', sa.Column('end_date', sa.Date(), nullable=True))
    op.add_column('competitions', sa.Column('is_verified', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    
    # 2. Add location fields to competitions
    op.add_column('competitions', sa.Column('country', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('competitions', sa.Column('state_province', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('competitions', sa.Column('city', sqlmodel.sql.sqltypes.AutoString(), nullable=True))

    # 3. Add location fields to skater_events
    op.add_column('skater_events', sa.Column('country', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('skater_events', sa.Column('state_province', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('skater_events', sa.Column('city', sqlmodel.sql.sqltypes.AutoString(), nullable=True))


def downgrade() -> None:
    op.drop_column('competitions', 'end_date')
    op.drop_column('competitions', 'is_verified')
    op.drop_column('competitions', 'country')
    op.drop_column('competitions', 'state_province')
    op.drop_column('competitions', 'city')

    op.drop_column('skater_events', 'country')
    op.drop_column('skater_events', 'state_province')
    op.drop_column('skater_events', 'city')