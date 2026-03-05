"""add_benchmark_system_tables

Revision ID: 2b79c31f5159
Revises: fdff51fa6d28
Create Date: 2026-01-22 02:46:09.052675

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '2b79c31f5159'
down_revision: Union[str, Sequence[str], None] = 'fdff51fa6d28'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop old benchmark tables if they exist
    op.execute("DROP TABLE IF EXISTS benchmark_results CASCADE")
    op.execute("DROP TABLE IF EXISTS benchmark_sessions CASCADE")
    op.execute("DROP TABLE IF EXISTS metric_definitions CASCADE")
    op.execute("DROP TABLE IF EXISTS benchmark_templates CASCADE")

    # 1. metric_definitions table (new schema)
    op.create_table(
        'metric_definitions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('coach_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(), nullable=False),  # Technical, Physical, Mental, Tactical, Environmental
        sa.Column('data_type', sa.String(), nullable=False),  # numeric, scale, boolean
        sa.Column('unit', sa.String(), nullable=True),  # inches, cm, %, reps, seconds
        sa.Column('scale_min', sa.Integer(), nullable=True),
        sa.Column('scale_max', sa.Integer(), nullable=True),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.UniqueConstraint('coach_id', 'name', name='uq_coach_metric_name')
    )
    op.create_index('idx_metric_coach', 'metric_definitions', ['coach_id'])
    op.create_index('idx_metric_category', 'metric_definitions', ['category'])

    # 2. benchmark_profiles table
    op.create_table(
        'benchmark_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('coach_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.UniqueConstraint('coach_id', 'name', name='uq_coach_profile_name')
    )
    op.create_index('idx_profile_coach', 'benchmark_profiles', ['coach_id'])
    op.create_index('idx_profile_active', 'benchmark_profiles', ['is_active'])

    # 3. profile_metrics junction table
    op.create_table(
        'profile_metrics',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('benchmark_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('metric_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('metric_definitions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('target_value', sa.String(), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.UniqueConstraint('profile_id', 'metric_id', name='uq_profile_metric')
    )
    op.create_index('idx_pm_profile', 'profile_metrics', ['profile_id'])
    op.create_index('idx_pm_metric', 'profile_metrics', ['metric_id'])

    # 4. benchmark_sessions table
    op.create_table(
        'benchmark_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('skater_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('profile_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('benchmark_profiles.id'), nullable=False),
        sa.Column('coach_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('profiles.id'), nullable=False),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()'))
    )
    op.create_index('idx_session_skater', 'benchmark_sessions', ['skater_id'])
    op.create_index('idx_session_profile', 'benchmark_sessions', ['profile_id'])
    op.create_index('idx_session_date', 'benchmark_sessions', ['recorded_at'])

    # 5. session_results table
    op.create_table(
        'session_results',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('benchmark_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('metric_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('metric_definitions.id'), nullable=False),
        sa.Column('actual_value', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.UniqueConstraint('session_id', 'metric_id', name='uq_session_metric')
    )
    op.create_index('idx_result_session', 'session_results', ['session_id'])
    op.create_index('idx_result_metric', 'session_results', ['metric_id'])


def downgrade() -> None:
    """Downgrade schema."""
    # Drop tables in reverse order (respect foreign keys)
    op.drop_table('session_results')
    op.drop_table('benchmark_sessions')
    op.drop_table('profile_metrics')
    op.drop_table('benchmark_profiles')
    op.drop_table('metric_definitions')
