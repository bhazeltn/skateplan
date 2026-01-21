import pytest
import uuid
from typing import Generator
from fastapi import Depends, HTTPException
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool
from jose import jwt

from app.main import app
from app.core.db import get_session
from app.core.config import settings
from app.api.deps import get_current_user
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

def get_current_user_override_factory(session: Session):
    """Factory to create get_current_user override with access to test session."""
    def get_current_user_override():
        """Override get_current_user for testing - bypass Supabase auth."""
        coach_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
        user = session.get(Profile, coach_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    return get_current_user_override


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    app.dependency_overrides[get_current_user] = get_current_user_override_factory(session)
    client = TestClient(app, raise_server_exceptions=False)
    yield client
    app.dependency_overrides.clear()

@pytest.fixture(name="normal_user_token_headers")
def normal_user_token_headers_fixture(client: TestClient, session: Session):
    # Create a dummy coach user in the DB
    coach_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
    coach = Profile(
        role="coach",
        full_name="Test Coach",
        email="coach@example.com",
        id=coach_id,
        hashed_password="dummy_hash_for_test"
    )
    session.add(coach)
    session.commit()

    # Generate a real signed token (Supabase uses HS256 by default)
    token_data = {"sub": str(coach_id), "role": "authenticated"}
    access_token = jwt.encode(token_data, settings.JWT_SECRET, algorithm="HS256")

    return {"Authorization": f"Bearer {access_token}"}
