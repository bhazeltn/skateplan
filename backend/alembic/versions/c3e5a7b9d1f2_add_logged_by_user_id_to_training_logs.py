"""add logged_by_user_id to training_session_logs

Revision ID: c3e5a7b9d1f2
Revises: b2d4f6a8c1e3
Create Date: 2026-11-26 00:00:00.000000

Additive only: adds a nullable logged_by_user_id FK (ON DELETE SET NULL) plus
an index to training_session_logs. No data is dropped or reset.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3e5a7b9d1f2"
down_revision: Union[str, Sequence[str], None] = "b2d4f6a8c1e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema (additive)."""
    op.add_column(
        "training_session_logs",
        sa.Column("logged_by_user_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_training_session_logs_logged_by_user_id",
        "training_session_logs",
        ["logged_by_user_id"],
    )
    op.create_foreign_key(
        "fk_training_session_logs_logged_by_user_id_users",
        "training_session_logs",
        "users",
        ["logged_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "fk_training_session_logs_logged_by_user_id_users",
        "training_session_logs",
        type_="foreignkey",
    )
    op.drop_index(
        "ix_training_session_logs_logged_by_user_id",
        table_name="training_session_logs",
    )
    op.drop_column("training_session_logs", "logged_by_user_id")
