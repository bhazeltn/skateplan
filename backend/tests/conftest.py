import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.core.db import get_session
from app.models.user_models import Profile
from app.models.skater_models import Skater

# Use in-memory SQLite for testing
# Connect args check_same_thread=False is needed for SQLite
engine = create_engine(
    "sqlite://", 
    connect_args={"check_same_thread": False}, 
    poolclass=StaticPool
)

@pytest.fixture(name="session")
def session_fixture():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)

@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session
    
    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()

from jose import jwt
from app.core.config import settings

@pytest.fixture(name="normal_user_token_headers")
def normal_user_token_headers_fixture(client: TestClient, session: Session):
    # Create a dummy coach user in the DB
    coach_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
    coach = Profile(
        role="coach",
        full_name="Test Coach",
        email="coach@example.com",
        id=coach_id
    )
    session.add(coach)
    session.commit()
    
    # Generate a real signed token
    token_data = {"sub": str(coach_id), "role": "authenticated"}
    access_token = jwt.encode(token_data, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    
    return {"Authorization": f"Bearer {access_token}"}


import uuid
