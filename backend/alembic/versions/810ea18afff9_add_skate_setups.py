"""add_skate_setups

Revision ID: 810ea18afff9
Revises: ae8d4b297495
Create Date: 2026-03-04 09:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel  # We must add this manually!

# revision identifiers, used by Alembic.
revision: str = '810ea18afff9'
down_revision: Union[str, Sequence[str], None] = 'ae8d4b297495'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create Skate Setups table ONLY
    op.create_table('skate_setups',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('skater_id', sa.Uuid(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('boot_id', sa.Uuid(), nullable=False),
        sa.Column('blade_id', sa.Uuid(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['blade_id'], ['equipment.id'], ),
        sa.ForeignKeyConstraint(['boot_id'], ['equipment.id'], ),
        sa.ForeignKeyConstraint(['skater_id'], ['profiles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_skate_setups_is_active'), 'skate_setups', ['is_active'], unique=False)
    op.create_index(op.f('ix_skate_setups_skater_id'), 'skate_setups', ['skater_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_skate_setups_skater_id'), table_name='skate_setups')
    op.drop_index(op.f('ix_skate_setups_is_active'), table_name='skate_setups')
    op.drop_table('skate_setups')