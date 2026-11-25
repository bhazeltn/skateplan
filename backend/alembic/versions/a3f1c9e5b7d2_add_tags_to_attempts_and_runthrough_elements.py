"""add tags json column to jump attempts and run-through element results

Revision ID: a3f1c9e5b7d2
Revises: 130b667da3fe
Create Date: 2026-11-25 00:00:00.000000

Additive only: adds a non-null JSON ``tags`` column (default ``[]``) to two
existing tables. No existing data is dropped, truncated or reset.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a3f1c9e5b7d2"
down_revision: Union[str, Sequence[str], None] = "130b667da3fe"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema (additive)."""
    op.add_column(
        "jump_attempt_logs",
        sa.Column("tags", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
    )
    op.add_column(
        "run_through_element_results",
        sa.Column("tags", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("run_through_element_results", "tags")
    op.drop_column("jump_attempt_logs", "tags")
