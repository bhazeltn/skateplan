import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum
from sqlmodel import Field, SQLModel
from sqlalchemy.types import JSON

class AssetType(str, Enum):
    MUSIC = "music"
    VISUAL = "visual"
    TECHNICAL = "technical"

class ProgramAsset(SQLModel, table=True):
    __tablename__ = "program_assets"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    skater_id: uuid.UUID = Field(foreign_key="skaters.id", index=True) # Linking to Skater, not Profile directly (as logic implies skater assets)
    filename: str
    stored_filename: str # The UUID based filename on disk
    file_type: AssetType
    version: int = Field(default=1)
    meta_data: Dict[str, Any] = Field(default={}, sa_type=JSON) # 'metadata' is reserved in SQLModel
    created_at: datetime = Field(default_factory=datetime.utcnow)
