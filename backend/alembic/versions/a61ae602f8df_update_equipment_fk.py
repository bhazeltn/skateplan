"""update_equipment_fk

Revision ID: a61ae602f8df
Revises: 810ea18afff9
Create Date: 2026-03-05 16:33:52.377654

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a61ae602f8df'
down_revision: Union[str, Sequence[str], None] = '810ea18afff9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the old constraint pointing to the 'skaters' table
    op.drop_constraint('equipment_skater_id_fkey', 'equipment', type_='foreignkey')
    
    # Create the new constraint pointing to the 'profiles' table
    op.create_foreign_key(
        'equipment_skater_id_fkey', 
        'equipment', 'profiles', 
        ['skater_id'], ['id']
    )


def downgrade() -> None:
    # Revert back to skaters if we ever need to undo
    op.drop_constraint('equipment_skater_id_fkey', 'equipment', type_='foreignkey')
    op.create_foreign_key(
        'equipment_skater_id_fkey', 
        'equipment', 'skaters', 
        ['skater_id'], ['id']
    )