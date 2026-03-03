import uuid
from datetime import date
from typing import List, Optional
from sqlmodel import Field, SQLModel, Relationship

if True:  # TYPE_CHECKING
    from app.models.equipment_models import Equipment

class SkaterBase(SQLModel):
    full_name: str
    dob: date
    level: str
    is_active: bool = Field(default=True)

class Skater(SkaterBase, table=True):
    __tablename__ = "skaters"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    coach_id: uuid.UUID = Field(foreign_key="profiles.id", index=True)

    # Relationships
    equipment: List["Equipment"] = Relationship(back_populates="skater")

class SkaterCreate(SkaterBase):
    pass

class SkaterRead(SkaterBase):
    id: uuid.UUID
    coach_id: uuid.UUID

class SkaterUpdate(SQLModel):
    full_name: Optional[str] = None
    dob: Optional[date] = None
    level: Optional[str] = None
    is_active: Optional[bool] = None
