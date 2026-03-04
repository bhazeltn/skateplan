"""Equipment Maintenance API Routes.

Endpoints for managing skating equipment (boots, blades) and maintenance logs.
"""
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel, Field

from app.api.deps import get_session, get_current_user
from app.models.user_models import Profile
from app.models.equipment_models import (
    Equipment,
    EquipmentType,
    MaintenanceLog,
    MaintenanceType
)

router = APIRouter()


# ==================== Pydantic Schemas ====================

class EquipmentCreate(BaseModel):
    """Schema for creating equipment."""
    name: Optional[str] = Field(None, max_length=100)
    type: EquipmentType
    brand: str = Field(max_length=100)
    model: str = Field(max_length=100)
    size: str = Field(max_length=50)
    purchase_date: Optional[str] = None
    is_active: bool = True


class EquipmentRead(BaseModel):
    """Schema for reading equipment."""
    id: str
    skater_id: str
    name: Optional[str]
    type: EquipmentType
    brand: str
    model: str
    size: str
    purchase_date: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime


class MaintenanceCreate(BaseModel):
    """Schema for creating a maintenance log."""
    date: str
    maintenance_type: MaintenanceType
    location: str = Field(max_length=200)
    technician: Optional[str] = Field(None, max_length=100)
    specifications: Optional[str] = None
    notes: Optional[str] = None


class MaintenanceRead(BaseModel):
    """Schema for reading a maintenance log."""
    id: str
    equipment_id: str
    date: str
    maintenance_type: MaintenanceType
    location: str
    technician: Optional[str]
    specifications: Optional[str]
    notes: Optional[str]
    created_at: datetime


# ==================== Helper Functions ====================

def _get_skater_or_404(
    skater_id: uuid.UUID,
    session: Session
) -> Profile:
    """Get skater or raise 404 if not found."""
    stmt = select(Profile).where(Profile.id == skater_id, Profile.role == 'skater')
    skater = session.exec(stmt).first()
    if not skater:
        raise HTTPException(status_code=404, detail="Skater not found")
    return skater


def _get_equipment_or_404(
    equipment_id: uuid.UUID,
    session: Session
) -> Equipment:
    """Get equipment or raise 404 if not found."""
    stmt = select(Equipment).where(Equipment.id == equipment_id)
    equipment = session.exec(stmt).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return equipment


def _equipment_to_read(equipment: Equipment) -> EquipmentRead:
    """Convert Equipment model to read schema."""
    return EquipmentRead(
        id=str(equipment.id),
        skater_id=str(equipment.skater_id),
        name=equipment.name,
        type=equipment.type,
        brand=equipment.brand,
        model=equipment.model,
        size=equipment.size,
        purchase_date=equipment.purchase_date.isoformat() if equipment.purchase_date else None,
        is_active=equipment.is_active,
        created_at=equipment.created_at,
        updated_at=equipment.updated_at
    )


def _maintenance_to_read(log: MaintenanceLog) -> MaintenanceRead:
    """Convert MaintenanceLog model to read schema."""
    return MaintenanceRead(
        id=str(log.id),
        equipment_id=str(log.equipment_id),
        date=log.date.isoformat(),
        maintenance_type=log.maintenance_type,
        location=log.location,
        technician=log.technician,
        specifications=log.specifications,
        notes=log.notes,
        created_at=log.created_at
    )


# ==================== Endpoints ====================

@router.post(
    "/skaters/{skater_id}/equipment",
    response_model=EquipmentRead,
    status_code=status.HTTP_201_CREATED
)
def create_equipment(
    *,
    session: Session = Depends(get_session),
    skater_id: uuid.UUID,
    equipment_in: EquipmentCreate,
    current_user: Profile = Depends(get_current_user)
) -> EquipmentRead:
    """
    Create a new equipment record for a skater.

    - **skater_id**: The skater's UUID
    - **type**: Equipment type ('boot' or 'blade')
    - **name**: Optional label (e.g., "Dance Boots", "Freeskate Blades")
    - **brand**: Manufacturer name
    - **model**: Equipment model
    - **size**: Equipment size
    - **purchase_date**: When equipment was purchased (ISO date format)
    - **is_active**: Whether this equipment is currently in use
    """
    # Verify skater exists
    _get_skater_or_404(skater_id, session)

    # Parse purchase date if provided
    purchase_date = None
    if equipment_in.purchase_date:
        try:
            purchase_date = datetime.fromisoformat(equipment_in.purchase_date)
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail="Invalid date format. Use ISO format (e.g., 2024-01-15)"
            )

    # Create equipment
    equipment = Equipment(
        skater_id=skater_id,
        name=equipment_in.name,
        type=equipment_in.type,
        brand=equipment_in.brand,
        model=equipment_in.model,
        size=equipment_in.size,
        purchase_date=purchase_date,
        is_active=equipment_in.is_active
    )

    session.add(equipment)
    session.commit()
    session.refresh(equipment)

    return _equipment_to_read(equipment)


@router.get("/skaters/{skater_id}/equipment", response_model=List[EquipmentRead])
def get_skater_equipment(
    *,
    session: Session = Depends(get_session),
    skater_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user)
) -> List[EquipmentRead]:
    """
    Get all equipment for a specific skater.

    Returns a list of all equipment (boots and blades) associated with the skater,
    including both active and inactive equipment.
    """
    # Verify skater exists (or fail with 404)
    _get_skater_or_404(skater_id, session)

    # Query equipment
    stmt = (
        select(Equipment)
        .where(Equipment.skater_id == skater_id)
        .order_by(Equipment.created_at.desc())
    )
    equipment_list = session.exec(stmt).all()

    return [_equipment_to_read(eq) for eq in equipment_list]


@router.post(
    "/equipment/{equipment_id}/maintenance",
    response_model=MaintenanceRead,
    status_code=status.HTTP_201_CREATED
)
def create_maintenance_log(
    *,
    session: Session = Depends(get_session),
    equipment_id: uuid.UUID,
    maintenance_in: MaintenanceCreate,
    current_user: Profile = Depends(get_current_user)
) -> MaintenanceRead:
    """
    Log a maintenance event for a piece of equipment.

    - **equipment_id**: The equipment's UUID
    - **date**: When maintenance was performed (ISO date format)
    - **maintenance_type**: Type of maintenance ('sharpening', 'mounting', 'waterproofing', etc.)
    - **location**: Where service was performed
    - **technician**: Optional - who performed the service
    - **specifications**: Optional details (e.g., hollow, profile for sharpening)
    - **notes**: Optional notes about the service
    """
    # Verify equipment exists
    _get_equipment_or_404(equipment_id, session)

    # Parse date
    try:
        maintenance_date = datetime.fromisoformat(maintenance_in.date)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail="Invalid date format. Use ISO format (e.g., 2024-01-15)"
        )

    # Create maintenance log
    log = MaintenanceLog(
        equipment_id=equipment_id,
        date=maintenance_date,
        maintenance_type=maintenance_in.maintenance_type,
        location=maintenance_in.location,
        technician=maintenance_in.technician,
        specifications=maintenance_in.specifications,
        notes=maintenance_in.notes
    )

    session.add(log)
    session.commit()
    session.refresh(log)

    return _maintenance_to_read(log)


@router.get("/equipment/{equipment_id}/maintenance", response_model=List[MaintenanceRead])
def get_maintenance_history(
    *,
    session: Session = Depends(get_session),
    equipment_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user)
) -> List[MaintenanceRead]:
    """
    Get maintenance history for a specific equipment.

    Returns a chronological list of all maintenance logs for the equipment,
    ordered by date (newest first).
    """
    # Verify equipment exists
    _get_equipment_or_404(equipment_id, session)

    # Query maintenance logs
    stmt = (
        select(MaintenanceLog)
        .where(MaintenanceLog.equipment_id == equipment_id)
        .order_by(MaintenanceLog.date.desc())
    )
    logs = session.exec(stmt).all()

    return [_maintenance_to_read(log) for log in logs]
