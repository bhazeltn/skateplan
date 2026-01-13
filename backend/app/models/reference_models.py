import uuid
from typing import Optional, Dict, Any, List
from sqlmodel import Field, SQLModel
from sqlalchemy.types import JSON

class AdultAgeClass(SQLModel, table=True):
    __tablename__ = "adult_age_classes"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    code: str = Field(index=True) # YA, CLASS_I
    name: str
    min_age: int
    max_age: Optional[int] = None

class CompetitiveLevel(SQLModel, table=True):
    __tablename__ = "competitive_levels"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    federation: str # Skate Canada, USFS
    discipline: str # Singles, Dance, Pairs
    name: str # Pre-Novice
    isu_anchor: Optional[str] = None # NOVICE_ADV

class TestLevel(SQLModel, table=True):
    __tablename__ = "test_levels"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    federation: str
    discipline: str
    level_name: str # STAR 5
    sub_tests: List[str] = Field(default=[], sa_type=JSON) # [5a Willow, 5b Elements]
    completion_rule: Optional[str] = None # 2_of_3
