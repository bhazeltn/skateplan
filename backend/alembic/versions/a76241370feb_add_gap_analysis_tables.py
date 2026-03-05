"""add gap analysis tables

Revision ID: a76241370feb
Revises: 2b79c31f5159
Create Date: 2026-01-22 14:31:19.537051

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a76241370feb'
down_revision: Union[str, Sequence[str], None] = '2b79c31f5159'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create gap_analyses table
    op.execute("""
        CREATE TABLE gap_analyses (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            skater_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
            team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
            last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT check_skater_or_team CHECK (
                (skater_id IS NOT NULL AND team_id IS NULL) OR
                (skater_id IS NULL AND team_id IS NOT NULL)
            )
        )
    """)

    # Create indexes on gap_analyses
    op.execute("CREATE INDEX idx_gap_skater ON gap_analyses(skater_id)")
    op.execute("CREATE INDEX idx_gap_team ON gap_analyses(team_id)")
    op.execute("CREATE INDEX idx_gap_updated ON gap_analyses(last_updated)")

    # Create gap_analysis_entries table
    op.execute("""
        CREATE TABLE gap_analysis_entries (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            gap_analysis_id UUID NOT NULL REFERENCES gap_analyses(id) ON DELETE CASCADE,
            metric_id UUID NOT NULL REFERENCES metric_definitions(id),
            current_value VARCHAR NOT NULL,
            target_value VARCHAR NOT NULL,
            notes TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            UNIQUE(gap_analysis_id, metric_id)
        )
    """)

    # Create indexes on gap_analysis_entries
    op.execute("CREATE INDEX idx_entry_gap ON gap_analysis_entries(gap_analysis_id)")
    op.execute("CREATE INDEX idx_entry_metric ON gap_analysis_entries(metric_id)")
    op.execute("CREATE INDEX idx_entry_active ON gap_analysis_entries(is_active)")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TABLE IF EXISTS gap_analysis_entries CASCADE")
    op.execute("DROP TABLE IF EXISTS gap_analyses CASCADE")
