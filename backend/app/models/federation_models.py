import uuid
from typing import Optional
from sqlmodel import Field, SQLModel
from pydantic import BaseModel

class Federation(SQLModel, table=True):
    __tablename__ = "federations"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str  # Full name: "Skate Canada"
    code: str = Field(index=True)  # 3-letter: "CAN"
    iso_code: str  # 2-letter lowercase for flag API: "ca"
    country_name: Optional[str] = None  # Country name for sorting: "Canada"
    is_active: bool = Field(default=True)

class FederationRead(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    iso_code: str
    country_name: Optional[str] = None
