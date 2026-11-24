"""add benchmark_sets and benchmark_set_items tables

Revision ID: a1c2e3f4b5d6
Revises: f3b8c1d47a92
Create Date: 2026-11-24 12:00:00.000000

Additive only: creates two new tables for coach-owned reusable benchmark sets.
No existing table/column is altered or dropped.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1c2e3f4b5d6'
down_revision: Union[str, Sequence[str], None] = 'f3b8c1d47a92'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'benchmark_sets',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('coach_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['coach_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_benchmark_sets_coach_id'),
        'benchmark_sets',
        ['coach_id'],
        unique=False,
    )
    op.create_table(
        'benchmark_set_items',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('set_id', sa.Uuid(), nullable=False),
        sa.Column('category', sa.String(length=80), nullable=False),
        sa.Column('title', sa.String(length=150), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ['set_id'], ['benchmark_sets.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_benchmark_set_items_set_id'),
        'benchmark_set_items',
        ['set_id'],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f('ix_benchmark_set_items_set_id'), table_name='benchmark_set_items'
    )
    op.drop_table('benchmark_set_items')
    op.drop_index(
        op.f('ix_benchmark_sets_coach_id'), table_name='benchmark_sets'
    )
    op.drop_table('benchmark_sets')
