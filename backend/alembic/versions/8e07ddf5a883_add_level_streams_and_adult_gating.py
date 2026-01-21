"""add_level_streams_and_adult_gating

Revision ID: 8e07ddf5a883
Revises: 5a3d12e68c42
Create Date: 2026-01-14 21:08:42.295136

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '8e07ddf5a883'
down_revision: Union[str, Sequence[str], None] = '5a3d12e68c42'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add streams, adult gating, and display fields to levels."""
    # Add new columns
    op.add_column('levels', sa.Column('stream', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('levels', sa.Column('discipline', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('levels', sa.Column('display_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default=''))
    op.add_column('levels', sa.Column('is_adult', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('levels', sa.Column('isu_anchor', sqlmodel.sql.sqltypes.AutoString(), nullable=True))

    # Create indexes for frequently queried columns
    op.create_index(op.f('ix_levels_stream'), 'levels', ['stream'], unique=False)
    op.create_index(op.f('ix_levels_is_adult'), 'levels', ['is_adult'], unique=False)

    # Update existing records to have display_name same as level_name
    op.execute("UPDATE levels SET display_name = level_name WHERE display_name = ''")


def downgrade() -> None:
    """Downgrade schema - remove new columns."""
    # Drop indexes
    op.drop_index(op.f('ix_levels_is_adult'), table_name='levels')
    op.drop_index(op.f('ix_levels_stream'), table_name='levels')

    # Drop columns
    op.drop_column('levels', 'isu_anchor')
    op.drop_column('levels', 'is_adult')
    op.drop_column('levels', 'display_name')
    op.drop_column('levels', 'discipline')
    op.drop_column('levels', 'stream')
