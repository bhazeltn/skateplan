"""add SMART fields (action_plan, success_criteria) to skater_benchmarks

Revision ID: e2a7c9f4b310
Revises: b7a2c4d9e011
Create Date: 2026-10-21 13:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2a7c9f4b310'
down_revision: Union[str, Sequence[str], None] = 'b7a2c4d9e011'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'skater_benchmarks',
        sa.Column('action_plan', sa.Text(), nullable=True),
    )
    op.add_column(
        'skater_benchmarks',
        sa.Column('success_criteria', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('skater_benchmarks', 'success_criteria')
    op.drop_column('skater_benchmarks', 'action_plan')
