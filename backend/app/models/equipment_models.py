"""Equipment Maintenance Models."""
import uuid
from datetime import datetime
from typing import List, Optional
from enum import Enum
from sqlmodel import Field, SQLModel, Relationship

# Use Unified Profile instead of Skater
from app.models.user_models import Profile


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
    __tablename__ = "equipment"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    skater_id: uuid.UUID = Field(foreign_key="profiles.id", index=True)
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
    skater: Optional[Profile] = Relationship()
    maintenance_logs: List["MaintenanceLog"] = Relationship(back_populates="equipment", cascade_delete=True)


class MaintenanceLog(SQLModel, table=True):
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
    equipment: Optional[Equipment] = Relationship(back_populates="maintenance_logs")


class SkateSetup(SQLModel, table=True):
    """
    A complete skate setup linking a specific boot and blade to a skater.
    """
    __tablename__ = "skate_setups"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    skater_id: uuid.UUID = Field(foreign_key="profiles.id", index=True)
    name: str = Field(max_length=100)
    boot_id: uuid.UUID = Field(foreign_key="equipment.id")
    blade_id: uuid.UUID = Field(foreign_key="equipment.id")
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Safe, one-way relationship that doesn't require back_populates
    skater: Optional[Profile] = Relationship()