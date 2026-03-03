"""Equipment Maintenance Models.

Models for tracking skating equipment (boots, blades) and maintenance logs.
"""
import uuid
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from enum import Enum
from sqlmodel import Field, SQLModel, Relationship

if TYPE_CHECKING:
    from app.models.skater_models import Skater


class EquipmentType(str, Enum):
    BOOT = "boot"
    BLADE = "blade"


class MaintenanceType(str, Enum):
    """Types of maintenance that can be performed on equipment."""
    SHARPENING = "sharpening"
    MOUNTING = "mounting"
    WATERPROOFING = "waterproofing"
    REPAIR = "repair"
    REPLACEMENT = "replacement"
    OTHER = "other"


# ==================== Equipment Models ====================

class Equipment(SQLModel, table=True):
    """
    Represents a piece of skating equipment (boot or blade).
    Skaters can have multiple equipment items (e.g., dance boots, freeskate boots).
    """
    __tablename__ = "equipment"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    skater_id: uuid.UUID = Field(foreign_key="skaters.id", index=True)
    name: Optional[str] = Field(default=None, max_length=100)
    type: EquipmentType = Field(index=True)
    brand: str = Field(max_length=100)
    model: str = Field(max_length=100)
    size: str = Field(max_length=50)
    purchase_date: Optional[datetime] = None
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    skater: Optional["Skater"] = Relationship(back_populates="equipment")
    maintenance_logs: List["MaintenanceLog"] = Relationship(back_populates="equipment", cascade_delete=True)


class MaintenanceLog(SQLModel, table=True):
    """
    A maintenance event for a piece of equipment.
    Tracks when equipment was serviced, what was done, and by whom.
    """
    __tablename__ = "maintenance_logs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    equipment_id: uuid.UUID = Field(foreign_key="equipment.id", index=True)
    date: datetime = Field(index=True)
    maintenance_type: MaintenanceType = Field(index=True)
    location: str = Field(max_length=200)
    technician: Optional[str] = Field(default=None, max_length=100)
    specifications: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    equipment: Optional["Equipment"] = Relationship(back_populates="maintenance_logs")
