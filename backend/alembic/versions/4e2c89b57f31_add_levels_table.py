"""add levels table

Revision ID: 4e2c89b57f31
Revises: 3d1b22a46704
Create Date: 2026-01-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '4e2c89b57f31'
down_revision: Union[str, Sequence[str], None] = '3d1b22a46704'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add levels table."""
    op.create_table('levels',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('federation_code', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('level_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('level_order', sa.Integer(), nullable=False),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_by_coach_id', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['created_by_coach_id'], ['profiles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_levels_federation_code'), 'levels', ['federation_code'], unique=False)


def downgrade() -> None:
    """Downgrade schema - remove levels table."""
    op.drop_index(op.f('ix_levels_federation_code'), table_name='levels')
    op.drop_table('levels')
