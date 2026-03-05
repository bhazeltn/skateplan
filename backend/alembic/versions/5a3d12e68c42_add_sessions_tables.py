"""add sessions tables

Revision ID: 5a3d12e68c42
Revises: 4e2c89b57f31
Create Date: 2026-01-14 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '5a3d12e68c42'
down_revision: Union[str, Sequence[str], None] = '4e2c89b57f31'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add sessions and session_elements tables."""
    # Create sessions table
    op.create_table('sessions',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('skater_id', sa.Uuid(), nullable=True),
        sa.Column('partnership_id', sa.Uuid(), nullable=True),
        sa.Column('coach_id', sa.Uuid(), nullable=False),
        sa.Column('session_date', sa.Date(), nullable=False),
        sa.Column('session_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.Column('notes', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('location', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['coach_id'], ['profiles.id'], ),
        sa.ForeignKeyConstraint(['partnership_id'], ['partnerships.id'], ),
        sa.ForeignKeyConstraint(['skater_id'], ['profiles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sessions_coach_id'), 'sessions', ['coach_id'], unique=False)
    op.create_index(op.f('ix_sessions_partnership_id'), 'sessions', ['partnership_id'], unique=False)
    op.create_index(op.f('ix_sessions_session_date'), 'sessions', ['session_date'], unique=False)
    op.create_index(op.f('ix_sessions_skater_id'), 'sessions', ['skater_id'], unique=False)

    # Create session_elements table
    op.create_table('session_elements',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('session_id', sa.Uuid(), nullable=False),
        sa.Column('element_id', sa.Uuid(), nullable=False),
        sa.Column('target_attempts', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('actual_attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('successful_attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('notes', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('quality_rating', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['element_id'], ['elements.id'], ),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('quality_rating >= 1 AND quality_rating <= 5', name='check_quality_rating_range'),
        sa.CheckConstraint('successful_attempts <= actual_attempts', name='check_successes_not_exceed_attempts')
    )
    op.create_index(op.f('ix_session_elements_element_id'), 'session_elements', ['element_id'], unique=False)
    op.create_index(op.f('ix_session_elements_session_id'), 'session_elements', ['session_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema - remove sessions tables."""
    op.drop_index(op.f('ix_session_elements_session_id'), table_name='session_elements')
    op.drop_index(op.f('ix_session_elements_element_id'), table_name='session_elements')
    op.drop_table('session_elements')

    op.drop_index(op.f('ix_sessions_skater_id'), table_name='sessions')
    op.drop_index(op.f('ix_sessions_session_date'), table_name='sessions')
    op.drop_index(op.f('ix_sessions_partnership_id'), table_name='sessions')
    op.drop_index(op.f('ix_sessions_coach_id'), table_name='sessions')
    op.drop_table('sessions')
