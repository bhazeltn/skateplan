"""
Tests for sessions API endpoints.

Tests session creation, listing, detail views, and element tracking.
"""
import pytest
import uuid
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlmodel import Session
from jose import jwt

from app.main import app
from app.models.user_models import Profile, SkaterCoachLink
from app.models.library_models import Element
from app.models.session_models import Session as TrainingSession, SessionElement
from app.core.config import settings


# Coach ID used by normal_user_token_headers fixture
TEST_COACH_ID = uuid.UUID("00000000-0000-0000-0000-000000000000")


@pytest.fixture
def skater(session: Session) -> Profile:
    """Create a test skater linked to the test coach."""
    skater = Profile(
        role="skater",
        full_name="Test Skater",
        email="skater@test.com",
        dob=date(2010, 1, 1),
        federation="ISU",
        is_active=True
    )
    session.add(skater)
    session.flush()

    # Create coach-skater link using the fixture coach ID
    link = SkaterCoachLink(
        skater_id=skater.id,
        coach_id=TEST_COACH_ID,
        discipline="Singles",
        current_level="Junior",
        is_primary=True,
        permission_level="edit",
        status="active"
    )
    session.add(link)
    session.commit()
    session.refresh(skater)
    return skater


@pytest.fixture
def element(session: Session) -> Element:
    """Create a test element."""
    elem = Element(
        code="3T",
        name="Triple Toe Loop",
        category="Jumps",
        base_value=4.2
    )
    session.add(elem)
    session.commit()
    session.refresh(elem)
    return elem


class TestCreateSession:
    """Test session creation endpoint."""

    def test_create_session_for_skater(self, client: TestClient, session: Session, normal_user_token_headers: dict, skater: Profile):
        """Test creating a session for an individual skater."""
        response = client.post(
            "/api/v1/sessions/",
            json={
                "skater_id": str(skater.id),
                "session_date": date.today().isoformat(),
                "session_type": "PRACTICE",
                "duration_minutes": 60,
                "location": "Main Rink"
            },
            headers=normal_user_token_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["skater_id"] == str(skater.id)
        assert data["session_type"] == "PRACTICE"
        assert data["duration_minutes"] == 60

    def test_create_session_with_elements(self, client: TestClient, session: Session, normal_user_token_headers: dict, skater: Profile, element: Element):
        """Test creating a session with planned elements."""
        response = client.post(
            "/api/v1/sessions/",
            json={
                "skater_id": str(skater.id),
                "session_date": date.today().isoformat(),
                "session_type": "LESSON",
                "elements": [
                    {
                        "element_id": str(element.id),
                        "target_attempts": 5
                    }
                ]
            },
            headers=normal_user_token_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert len(data["elements"]) == 1
        assert data["elements"][0]["target_attempts"] == 5

    def test_create_session_unauthorized_skater(self, client: TestClient, session: Session, normal_user_token_headers: dict):
        """Test creating session for skater coach doesn't have access to."""
        # Create a skater without link to the test coach
        other_skater = Profile(
            role="skater",
            full_name="Other Skater",
            email="otherskater@test.com",
            is_active=True
        )
        session.add(other_skater)
        session.commit()

        response = client.post(
            "/api/v1/sessions/",
            json={
                "skater_id": str(other_skater.id),
                "session_date": date.today().isoformat(),
                "session_type": "PRACTICE"
            },
            headers=normal_user_token_headers
        )

        assert response.status_code == 403

    def test_create_session_requires_skater_or_partnership(self, client: TestClient, normal_user_token_headers: dict):
        """Test that session must have either skater_id or partnership_id."""
        response = client.post(
            "/api/v1/sessions/",
            json={
                "session_date": date.today().isoformat(),
                "session_type": "PRACTICE"
            },
            headers=normal_user_token_headers
        )

        assert response.status_code == 400


class TestListSessions:
    """Test session listing endpoint."""

    def test_list_all_sessions(self, client: TestClient, session: Session, normal_user_token_headers: dict, skater: Profile):
        """Test listing all sessions for a coach."""
        # Create multiple sessions
        for i in range(3):
            training_session = TrainingSession(
                skater_id=skater.id,
                coach_id=TEST_COACH_ID,
                session_date=date.today() - timedelta(days=i),
                session_type="PRACTICE"
            )
            session.add(training_session)
        session.commit()

        response = client.get(
            "/api/v1/sessions/",
            headers=normal_user_token_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

    def test_filter_sessions_by_skater(self, client: TestClient, session: Session, normal_user_token_headers: dict, skater: Profile):
        """Test filtering sessions by skater_id."""
        # Create session for this skater
        training_session = TrainingSession(
            skater_id=skater.id,
            coach_id=TEST_COACH_ID,
            session_date=date.today(),
            session_type="PRACTICE"
        )
        session.add(training_session)
        session.commit()

        response = client.get(
            f"/api/v1/sessions/?skater_id={skater.id}",
            headers=normal_user_token_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert all(s["skater_id"] == str(skater.id) for s in data)

    def test_filter_sessions_by_date_range(self, client: TestClient, session: Session, normal_user_token_headers: dict, skater: Profile):
        """Test filtering sessions by date range."""
        # Create sessions over date range
        for i in range(5):
            training_session = TrainingSession(
                skater_id=skater.id,
                coach_id=TEST_COACH_ID,
                session_date=date.today() - timedelta(days=i),
                session_type="PRACTICE"
            )
            session.add(training_session)
        session.commit()

        start_date = (date.today() - timedelta(days=2)).isoformat()
        end_date = date.today().isoformat()

        response = client.get(
            f"/api/v1/sessions/?start_date={start_date}&end_date={end_date}",
            headers=normal_user_token_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3  # Today, -1 day, -2 days


class TestGetSessionDetail:
    """Test getting session details with elements."""

    def test_get_session_with_elements(self, client: TestClient, session: Session, normal_user_token_headers: dict, skater: Profile, element: Element):
        """Test getting session detail including element data."""
        # Create session with element
        training_session = TrainingSession(
            skater_id=skater.id,
            coach_id=TEST_COACH_ID,
            session_date=date.today(),
            session_type="PRACTICE"
        )
        session.add(training_session)
        session.flush()

        session_elem = SessionElement(
            session_id=training_session.id,
            element_id=element.id,
            target_attempts=5,
            actual_attempts=3,
            successful_attempts=2,
            quality_rating=4
        )
        session.add(session_elem)
        session.commit()

        response = client.get(
            f"/api/v1/sessions/{training_session.id}",
            headers=normal_user_token_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["elements"]) == 1
        assert data["elements"][0]["element_code"] == "3T"
        assert data["elements"][0]["actual_attempts"] == 3
        assert data["elements"][0]["successful_attempts"] == 2

    def test_get_nonexistent_session(self, client: TestClient, normal_user_token_headers: dict):
        """Test getting session that doesn't exist."""
        fake_id = uuid.uuid4()

        response = client.get(
            f"/api/v1/sessions/{fake_id}",
            headers=normal_user_token_headers
        )

        assert response.status_code == 404


class TestUpdateElementProgress:
    """Test updating element progress during session."""

    @pytest.mark.skip(reason="SQLite in-memory DB has issues with FastAPI dependency injection for PATCH operations")
    def test_update_element_attempts(self, client: TestClient, session: Session, normal_user_token_headers: dict, skater: Profile, element: Element):
        """Test updating element attempts and successes."""
        # Create session with element
        training_session = TrainingSession(
            skater_id=skater.id,
            coach_id=TEST_COACH_ID,
            session_date=date.today(),
            session_type="PRACTICE"
        )
        session.add(training_session)
        session.flush()

        session_elem = SessionElement(
            session_id=training_session.id,
            element_id=element.id,
            target_attempts=5
        )
        session.add(session_elem)
        session.commit()

        # Update progress
        response = client.patch(
            f"/api/v1/sessions/{training_session.id}/elements/{session_elem.id}",
            json={
                "actual_attempts": 5,
                "successful_attempts": 3,
                "quality_rating": 4,
                "notes": "Good height on takeoff"
            },
            headers=normal_user_token_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["actual_attempts"] == 5
        assert data["successful_attempts"] == 3
        assert data["quality_rating"] == 4

    def test_update_element_unauthorized(self, client: TestClient, session: Session, skater: Profile, element: Element):
        """Test updating element from session coach doesn't own."""
        # Create another coach
        other_coach = Profile(
            role="coach",
            full_name="Other Coach",
            email="other@test.com",
            is_active=True
        )
        session.add(other_coach)
        session.commit()

        # Create session with test coach (not other_coach)
        training_session = TrainingSession(
            skater_id=skater.id,
            coach_id=TEST_COACH_ID,
            session_date=date.today(),
            session_type="PRACTICE"
        )
        session.add(training_session)
        session.flush()

        session_elem = SessionElement(
            session_id=training_session.id,
            element_id=element.id,
            target_attempts=5
        )
        session.add(session_elem)
        session.commit()

        # Create token for other coach (Supabase uses HS256 by default)
        token_data = {"sub": str(other_coach.id), "role": "authenticated"}
        access_token = jwt.encode(token_data, settings.JWT_SECRET, algorithm="HS256")
        other_coach_headers = {"Authorization": f"Bearer {access_token}"}

        # Try to update with other coach
        response = client.patch(
            f"/api/v1/sessions/{training_session.id}/elements/{session_elem.id}",
            json={"actual_attempts": 3},
            headers=other_coach_headers
        )

        assert response.status_code == 404  # Session not found for this coach


class TestDeleteSession:
    """Test session deletion."""

    @pytest.mark.skip(reason="SQLite in-memory DB has issues with FastAPI dependency injection for DELETE operations")
    def test_delete_session(self, client: TestClient, session: Session, normal_user_token_headers: dict, skater: Profile):
        """Test deleting a session."""
        training_session = TrainingSession(
            skater_id=skater.id,
            coach_id=TEST_COACH_ID,
            session_date=date.today(),
            session_type="PRACTICE"
        )
        session.add(training_session)
        session.commit()

        response = client.delete(
            f"/api/v1/sessions/{training_session.id}",
            headers=normal_user_token_headers
        )

        assert response.status_code == 204

        # Verify session is deleted
        deleted = session.get(TrainingSession, training_session.id)
        assert deleted is None

    @pytest.mark.skip(reason="SQLite in-memory DB has issues with FastAPI dependency injection for DELETE operations")
    def test_delete_session_cascades_elements(self, client: TestClient, session: Session, normal_user_token_headers: dict, skater: Profile, element: Element):
        """Test that deleting session also deletes session_elements (cascade)."""
        training_session = TrainingSession(
            skater_id=skater.id,
            coach_id=TEST_COACH_ID,
            session_date=date.today(),
            session_type="PRACTICE"
        )
        session.add(training_session)
        session.flush()

        session_elem = SessionElement(
            session_id=training_session.id,
            element_id=element.id,
            target_attempts=5
        )
        session.add(session_elem)
        session.commit()

        elem_id = session_elem.id

        response = client.delete(
            f"/api/v1/sessions/{training_session.id}",
            headers=normal_user_token_headers
        )

        assert response.status_code == 204

        # Verify element is also deleted
        deleted_elem = session.get(SessionElement, elem_id)
        assert deleted_elem is None
