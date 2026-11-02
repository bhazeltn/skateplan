"""add entered_sp/entered_fs to competition_entries

Revision ID: f3b8c1d47a92
Revises: e2a7c9f4b310
Create Date: 2026-11-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3b8c1d47a92'
down_revision: Union[str, Sequence[str], None] = 'e2a7c9f4b310'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "competition_entries",
        sa.Column(
            "entered_sp",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.add_column(
        "competition_entries",
        sa.Column(
            "entered_fs",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("competition_entries", "entered_fs")
    op.drop_column("competition_entries", "entered_sp")
