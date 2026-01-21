"""reimpl_federation_levels_with_streams

Revision ID: c16dea82b43d
Revises: 9e5129b895bd
Create Date: 2026-01-15 12:00:00.000000

Complete reimplementation of federation/levels system with:
- New streams table to organize levels within federations
- Proper foreign key constraints
- Dual fallback: ISU for youth, UNIVERSAL for adult
- Clean separation of ISU-based vs ISI systems
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c16dea82b43d'
down_revision: Union[str, Sequence[str], None] = '9e5129b895bd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - reimplement federation levels system."""

    # Drop redundant tables from reference_models.py
    op.drop_table('test_levels', if_exists=True)
    op.drop_table('competitive_levels', if_exists=True)
    op.drop_table('adult_age_classes', if_exists=True)

    # Add unique constraint on federations.code to allow foreign key reference
    op.create_unique_constraint('uq_federations_code', 'federations', ['code'])

    # Create new streams table
    op.create_table('streams',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('federation_code', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('stream_code', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('stream_display', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('discipline', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['federation_code'], ['federations.code'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('federation_code', 'stream_code', name='uq_federation_stream')
    )
    op.create_index(op.f('ix_streams_federation_code'), 'streams', ['federation_code'], unique=False)
    op.create_index(op.f('ix_streams_discipline'), 'streams', ['discipline'], unique=False)

    # Modify levels table to reference streams
    # First, drop the old levels table since we need to restructure it
    op.drop_table('levels')

    # Recreate levels table with stream_id FK
    op.create_table('levels',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('stream_id', sa.Uuid(), nullable=False),
        sa.Column('level_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('display_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('level_order', sa.Integer(), nullable=False),
        sa.Column('is_adult', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('isu_anchor', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_by_coach_id', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['stream_id'], ['streams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_coach_id'], ['profiles.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('stream_id', 'level_name', name='uq_stream_level')
    )
    op.create_index(op.f('ix_levels_stream_id'), 'levels', ['stream_id'], unique=False)
    op.create_index(op.f('ix_levels_level_order'), 'levels', ['level_order'], unique=False)
    op.create_index(op.f('ix_levels_is_adult'), 'levels', ['is_adult'], unique=False)


def downgrade() -> None:
    """Downgrade schema - restore old structure."""

    # Drop new structure
    op.drop_index(op.f('ix_levels_is_adult'), table_name='levels')
    op.drop_index(op.f('ix_levels_level_order'), table_name='levels')
    op.drop_index(op.f('ix_levels_stream_id'), table_name='levels')
    op.drop_table('levels')

    op.drop_index(op.f('ix_streams_discipline'), table_name='streams')
    op.drop_index(op.f('ix_streams_federation_code'), table_name='streams')
    op.drop_table('streams')

    # Drop unique constraint on federations.code
    op.drop_constraint('uq_federations_code', 'federations', type_='unique')

    # Recreate old levels table
    op.create_table('levels',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('federation_code', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('stream', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('discipline', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('level_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('display_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('level_order', sa.Integer(), nullable=False),
        sa.Column('is_adult', sa.Boolean(), nullable=False),
        sa.Column('is_system', sa.Boolean(), nullable=False),
        sa.Column('isu_anchor', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_by_coach_id', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['created_by_coach_id'], ['profiles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_levels_federation_code'), 'levels', ['federation_code'], unique=False)

    # Recreate reference tables
    op.create_table('adult_age_classes',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('code', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('min_age', sa.Integer(), nullable=False),
        sa.Column('max_age', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('competitive_levels',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('federation', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('discipline', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('isu_anchor', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('test_levels',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('federation', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('discipline', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('level_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('sub_tests', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('completion_rule', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
