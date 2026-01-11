import uuid
from typing import Optional
from sqlmodel import Field, SQLModel

class Federation(SQLModel, table=True):
    __tablename__ = "federations"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    code: str = Field(index=True) # e.g. USA, CAN
    iso_code: Optional[str] = None # e.g. US, CA
