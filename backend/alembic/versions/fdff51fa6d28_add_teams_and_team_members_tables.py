"""add teams and team_members tables

Revision ID: fdff51fa6d28
Revises: c16dea82b43d
Create Date: 2026-01-16 03:35:21.566716

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'fdff51fa6d28'
down_revision: Union[str, Sequence[str], None] = 'c16dea82b43d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create teams table
    op.create_table(
        'teams',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('coach_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('team_name', sa.String(255), nullable=True),
        sa.Column('federation', sa.String(50), nullable=False),
        sa.Column('discipline', sa.String(50), nullable=False),
        sa.Column('current_level', sa.String(100), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['coach_id'], ['profiles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_teams_coach_id', 'teams', ['coach_id'])

    # Create team_members table
    op.create_table(
        'team_members',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('team_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('skater_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(50), nullable=False, server_default='partner'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['skater_id'], ['profiles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_team_members_team_id', 'team_members', ['team_id'])
    op.create_index('ix_team_members_skater_id', 'team_members', ['skater_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_team_members_skater_id', table_name='team_members')
    op.drop_index('ix_team_members_team_id', table_name='team_members')
    op.drop_table('team_members')
    op.drop_index('ix_teams_coach_id', table_name='teams')
    op.drop_table('teams')
