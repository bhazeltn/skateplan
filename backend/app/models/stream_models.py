"""
Models for skating streams.

Streams organize levels within federations (e.g., Podium_Pathway, STARSkate_Singles).
"""
import uuid
from datetime import datetime
from typing import Optional, List, Tuple
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import UniqueConstraint
from pydantic import BaseModel


class Stream(SQLModel, table=True):
    """
    Stream within a federation (e.g., Podium_Pathway, STARSkate_Singles).

    Streams organize levels by competitive path or discipline within a federation.
    Examples:
    - CAN: Podium_Pathway, STARSkate_Singles, STARSkate_Dance, Adult_Singles
    - USA: Well_Balanced, Excel_Series, Solo_Dance, Showcase
    - ISU: Singles_Pairs, Ice_Dance
    """
    __tablename__ = "streams"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    federation_code: str = Field(foreign_key="federations.code", ondelete="CASCADE", index=True)
    stream_code: str  # e.g., "Podium_Pathway", "STARSkate_Singles"
    stream_display: str  # e.g., "Podium Pathway", "STARSkate Singles"
    discipline: str = Field(index=True)  # "Singles", "Pairs", "Ice_Dance", "Solo_Dance", "Artistic", "Synchro"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Unique constraint on federation + stream
    __table_args__: Tuple = (
        UniqueConstraint("federation_code", "stream_code", name="uq_federation_stream"),
    )


class StreamRead(BaseModel):
    """Schema for reading stream data."""
    id: uuid.UUID
    federation_code: str
    stream_code: str
    stream_display: str
    discipline: str


class StreamCreate(BaseModel):
    """Schema for creating a stream."""
    federation_code: str
    stream_code: str
    stream_display: str
    discipline: str
