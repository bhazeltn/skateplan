import uuid
from typing import Optional
from datetime import datetime
from sqlmodel import Field, SQLModel

class Element(SQLModel, table=True):
    __tablename__ = "elements"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    code: str = Field(index=True)
    name: str
    category: str
    base_value: float
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None
