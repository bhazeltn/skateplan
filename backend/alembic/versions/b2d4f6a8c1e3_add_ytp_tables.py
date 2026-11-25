"""add yearly_plans, ytp_phases and ytp_phase_benchmarks tables

Revision ID: b2d4f6a8c1e3
Revises: a1c2e3f4b5d6
Create Date: 2026-11-25 12:00:00.000000

Additive only: creates three new tables for the Yearly Training Plan feature.
No existing table/column is altered or dropped.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2d4f6a8c1e3'
down_revision: Union[str, Sequence[str], None] = 'a1c2e3f4b5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'yearly_plans',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('skater_id', sa.Integer(), nullable=False),
        sa.Column('season_label', sa.String(length=20), nullable=False),
        sa.Column('title', sa.String(length=150), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('primary_goal', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column(
            'created_at', sa.DateTime(timezone=True),
            server_default=sa.text('now()'), nullable=False,
        ),
        sa.Column(
            'updated_at', sa.DateTime(timezone=True),
            server_default=sa.text('now()'), nullable=False,
        ),
        sa.ForeignKeyConstraint(['skater_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_yearly_plans_skater_id'), 'yearly_plans', ['skater_id'], unique=False
    )
    op.create_table(
        'ytp_phases',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('plan_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('phase_type', sa.String(length=30), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('target_on_ice_hours_per_week', sa.Float(), nullable=True),
        sa.Column('target_off_ice_hours_per_week', sa.Float(), nullable=True),
        sa.Column('target_rpe', sa.Integer(), nullable=True),
        sa.Column('intensity_level', sa.String(length=20), nullable=True),
        sa.Column('primary_focus', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['plan_id'], ['yearly_plans.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_ytp_phases_plan_id'), 'ytp_phases', ['plan_id'], unique=False
    )
    op.create_table(
        'ytp_phase_benchmarks',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('phase_id', sa.Uuid(), nullable=False),
        sa.Column('benchmark_id', sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(['phase_id'], ['ytp_phases.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(
            ['benchmark_id'], ['skater_benchmarks.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('phase_id', 'benchmark_id'),
    )
    op.create_index(
        op.f('ix_ytp_phase_benchmarks_phase_id'),
        'ytp_phase_benchmarks', ['phase_id'], unique=False,
    )
    op.create_index(
        op.f('ix_ytp_phase_benchmarks_benchmark_id'),
        'ytp_phase_benchmarks', ['benchmark_id'], unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f('ix_ytp_phase_benchmarks_benchmark_id'),
        table_name='ytp_phase_benchmarks',
    )
    op.drop_index(
        op.f('ix_ytp_phase_benchmarks_phase_id'), table_name='ytp_phase_benchmarks'
    )
    op.drop_table('ytp_phase_benchmarks')
    op.drop_index(op.f('ix_ytp_phases_plan_id'), table_name='ytp_phases')
    op.drop_table('ytp_phases')
    op.drop_index(op.f('ix_yearly_plans_skater_id'), table_name='yearly_plans')
    op.drop_table('yearly_plans')
