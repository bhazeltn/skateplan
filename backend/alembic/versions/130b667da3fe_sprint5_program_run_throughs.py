"""sprint5 program run-throughs and element results

Revision ID: 130b667da3fe
Revises: c3e5a7b9d1f2
Create Date: 2026-11-25 00:00:00.000000

Additive only: creates two new tables; touches no existing table/column.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '130b667da3fe'
down_revision: Union[str, Sequence[str], None] = 'c3e5a7b9d1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'program_run_throughs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('session_id', sa.Uuid(), nullable=False),
        sa.Column('program_id', sa.Uuid(), nullable=False),
        sa.Column('run_type', sa.String(length=30), nullable=False),
        sa.Column('with_music', sa.Boolean(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['training_session_logs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['program_id'], ['programs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_program_run_throughs_session_id'), 'program_run_throughs', ['session_id'], unique=False)
    op.create_index(op.f('ix_program_run_throughs_program_id'), 'program_run_throughs', ['program_id'], unique=False)
    op.create_table(
        'run_through_element_results',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('run_through_id', sa.Uuid(), nullable=False),
        sa.Column('element_order', sa.Integer(), nullable=False),
        sa.Column('element_code', sa.String(length=50), nullable=False),
        sa.Column('outcome', sa.String(length=30), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['run_through_id'], ['program_run_throughs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_run_through_element_results_run_through_id'), 'run_through_element_results', ['run_through_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_run_through_element_results_run_through_id'), table_name='run_through_element_results')
    op.drop_table('run_through_element_results')
    op.drop_index(op.f('ix_program_run_throughs_program_id'), table_name='program_run_throughs')
    op.drop_index(op.f('ix_program_run_throughs_session_id'), table_name='program_run_throughs')
    op.drop_table('program_run_throughs')
