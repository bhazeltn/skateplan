"""add_equipment_tables

Revision ID: ae8d4b297495
Revises: a76241370feb
Create Date: 2026-03-03 02:23:28.646961

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = 'ae8d4b297495'
down_revision: Union[str, Sequence[str], None] = 'a76241370feb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the Enum types manually first to avoid Postgres undefined object errors
    equipment_type = postgresql.ENUM('BOOT', 'BLADE', name='equipmenttype')
    equipment_type.create(op.get_bind())
    
    maintenance_type = postgresql.ENUM('SHARPENING', 'MOUNTING', 'WATERPROOFING', 'REPAIR', 'REPLACEMENT', 'OTHER', name='maintenancetype')
    maintenance_type.create(op.get_bind())

    # Create Equipment table
    op.create_table('equipment',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('skater_id', sa.Uuid(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('type', sa.Enum('BOOT', 'BLADE', name='equipmenttype'), nullable=False),
        sa.Column('brand', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('model', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('size', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('purchase_date', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['skater_id'], ['profiles.id'], ), # Linking to profiles table
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_equipment_is_active'), 'equipment', ['is_active'], unique=False)
    op.create_index(op.f('ix_equipment_skater_id'), 'equipment', ['skater_id'], unique=False)
    op.create_index(op.f('ix_equipment_type'), 'equipment', ['type'], unique=False)

    # Create Maintenance Logs table
    op.create_table('maintenance_logs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('equipment_id', sa.Uuid(), nullable=False),
        sa.Column('date', sa.DateTime(), nullable=False),
        sa.Column('maintenance_type', sa.Enum('SHARPENING', 'MOUNTING', 'WATERPROOFING', 'REPAIR', 'REPLACEMENT', 'OTHER', name='maintenancetype'), nullable=False),
        sa.Column('location', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=False),
        sa.Column('technician', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('specifications', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('notes', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['equipment_id'], ['equipment.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_maintenance_logs_date'), 'maintenance_logs', ['date'], unique=False)
    op.create_index(op.f('ix_maintenance_logs_equipment_id'), 'maintenance_logs', ['equipment_id'], unique=False)
    op.create_index(op.f('ix_maintenance_logs_maintenance_type'), 'maintenance_logs', ['maintenance_type'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_maintenance_logs_maintenance_type'), table_name='maintenance_logs')
    op.drop_index(op.f('ix_maintenance_logs_equipment_id'), table_name='maintenance_logs')
    op.drop_index(op.f('ix_maintenance_logs_date'), table_name='maintenance_logs')
    op.drop_table('maintenance_logs')
    
    op.drop_index(op.f('ix_equipment_type'), table_name='equipment')
    op.drop_index(op.f('ix_equipment_skater_id'), table_name='equipment')
    op.drop_index(op.f('ix_equipment_is_active'), table_name='equipment')
    op.drop_table('equipment')
    
    # Drop Enums
    op.execute("DROP TYPE IF EXISTS equipmenttype;")
    op.execute("DROP TYPE IF EXISTS maintenancetype;")
