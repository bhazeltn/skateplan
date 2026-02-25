"""Test suite for Benchmark Sessions API - Recording benchmark testing sessions.

Tests follow TDD methodology: written before implementation, expected to fail.
"""
import uuid
from datetime import datetime
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models.user_models import Profile
from app.models.skater_models import Skater
from app.models.benchmark_models import (
    MetricDefinition,
    MetricCategory,
    MetricDataType,
    BenchmarkProfile,
    ProfileMetric,
    BenchmarkSession,
    SessionResult
)


def test_create_session_individual_skater(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test creating a benchmark session for an individual skater.

    POST to /benchmarks/sessions with:
    - profile_id: the benchmark profile to use
    - skater_id: the skater being tested
    - date: when the session occurred
    - notes: optional session notes
    - results: array of {metric_id, value} pairs

    Expected: 201 status, returns created session ID.
    """
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create a test skater
    skater = Skater(
        coach_id=current_user_id,
        full_name="Test Skater",
        email="skater@example.com",
        dob=datetime(2010, 1, 1),
        discipline="Ladies",
        level="Junior",
        is_active=True,
        home_club="Test Club",
        federation_code="PH",
        federation_iso_code="PH",
        country_name="Philippines"
    )
    session.add(skater)
    session.flush()

    # Create a benchmark profile
    profile = BenchmarkProfile(
        coach_id=current_user_id,
        name="Test Benchmark Profile",
        description="Test profile for sessions"
    )
    session.add(profile)
    session.flush()

    # Create some metrics
    metric1 = MetricDefinition(
        coach_id=current_user_id,
        name="Vertical Jump",
        category=MetricCategory.PHYSICAL,
        data_type=MetricDataType.NUMERIC,
        unit="inches"
    )
    metric2 = MetricDefinition(
        coach_id=current_user_id,
        name="Effort Level",
        category=MetricCategory.MENTAL,
        data_type=MetricDataType.SCALE,
        scale_min=1,
        scale_max=10
    )
    metric3 = MetricDefinition(
        coach_id=current_user_id,
        name="Landed Jump",
        category=MetricCategory.TECHNICAL,
        data_type=MetricDataType.BOOLEAN
    )
    session.add_all([metric1, metric2, metric3])
    session.commit()

    # Link metrics to profile
    profile_metric1 = ProfileMetric(
        profile_id=profile.id,
        metric_id=metric1.id,
        target_value="18"
    )
    profile_metric2 = ProfileMetric(
        profile_id=profile.id,
        metric_id=metric2.id,
        target_value="8"
    )
    profile_metric3 = ProfileMetric(
        profile_id=profile.id,
        metric_id=metric3.id,
        target_value="true"
    )
    session.add_all([profile_metric1, profile_metric2, profile_metric3])
    session.commit()

    # Create a benchmark session
    response = client.post(
        f"{settings.API_V1_STR}/benchmarks/sessions",
        headers=normal_user_token_headers,
        json={
            "profile_id": str(profile.id),
            "skater_id": str(skater.id),
            "date": "2024-01-15",
            "notes": "Great session, skater focused well",
            "results": [
                {"metric_id": str(metric1.id), "value": "19.5"},
                {"metric_id": str(metric2.id), "value": "9"},
                {"metric_id": str(metric3.id), "value": "true"}
            ]
        }
    )

    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    data = response.json()
    assert "id" in data, "Session ID should be returned"
    assert "profile_id" in data
    assert "skater_id" in data
    assert data["notes"] == "Great session, skater focused well"
    assert "results" in data
    assert len(data["results"]) == 3


def test_create_session_for_ice_dance_or_pairs_team(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test creating a benchmark session for a team (Ice Dance / Pairs).

    POST to /benchmarks/sessions with:
    - team_id instead of skater_id

    Expected: 201 status, session linked to team entity.
    """
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create a test team (using Skater model with team_name set)
    # Note: In production, teams should have their own model/table
    # For now, we simulate with skater having team_name populated
    team_skater1 = Skater(
        coach_id=current_user_id,
        full_name="Skater One",
        email="skater1@example.com",
        dob=datetime(2010, 1, 1),
        discipline="Ice Dance",
        level="Novice",
        is_active=True
    )
    team_skater2 = Skater(
        coach_id=current_user_id,
        full_name="Skater Two",
        email="skater2@example.com",
        dob=datetime(2010, 5, 1),
        discipline="Ice Dance",
        level="Novice",
        is_active=True
    )
    session.add_all([team_skater1, team_skater2])
    session.flush()

    # Create a benchmark profile for teams
    profile = BenchmarkProfile(
        coach_id=current_user_id,
        name="Ice Dance Assessment Profile",
        description="Team-specific benchmarks"
    )
    session.add(profile)
    session.flush()

    # Create metrics suitable for team assessment
    metric1 = MetricDefinition(
        coach_id=current_user_id,
        name="Pattern Quality",
        category=MetricCategory.TECHNICAL,
        data_type=MetricDataType.SCALE,
        scale_min=1,
        scale_max=10
    )
    metric2 = MetricDefinition(
        coach_id=current_user_id,
        name="Program Completed",
        category=MetricCategory.TACTICAL,
        data_type=MetricDataType.BOOLEAN
    )
    session.add_all([metric1, metric2])
    session.commit()

    # Link metrics to profile
    profile_metric1 = ProfileMetric(
        profile_id=profile.id,
        metric_id=metric1.id,
        target_value="8"
    )
    profile_metric2 = ProfileMetric(
        profile_id=profile.id,
        metric_id=metric2.id,
        target_value="true"
    )
    session.add_all([profile_metric1, profile_metric2])
    session.commit()

    # Create a benchmark session for the team
    team_id = uuid.uuid4()  # Simulated team ID
    response = client.post(
        f"{settings.API_V1_STR}/benchmarks/sessions",
        headers=normal_user_token_headers,
        json={
            "profile_id": str(profile.id),
            "team_id": str(team_id),
            "date": "2024-01-15",
            "notes": "Ice Dance team assessment",
            "results": [
                {"metric_id": str(metric1.id), "value": "9"},
                {"metric_id": str(metric2.id), "value": "true"}
            ]
        }
    )

    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    data = response.json()
    assert "id" in data
    assert "team_id" in data
    assert data["team_id"] == str(team_id)


def test_create_session_with_nonexistent_metric_fails(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test that recording a session with invalid metric_id returns 404 or 422.

    Validation should reject metric IDs that don't exist in the database.
    """
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create a skater and profile
    skater = Skater(
        coach_id=current_user_id,
        full_name="Test Skater",
        email="skater@example.com",
        dob=datetime(2010, 1, 1),
        discipline="Ladies",
        level="Junior",
        is_active=True
    )
    session.add(skater)
    session.flush()

    profile = BenchmarkProfile(
        coach_id=current_user_id,
        name="Test Profile"
    )
    session.add(profile)
    session.commit()

    # Try to create session with non-existent metric
    fake_metric_id = uuid.uuid4()
    response = client.post(
        f"{settings.API_V1_STR}/benchmarks/sessions",
        headers=normal_user_token_headers,
        json={
            "profile_id": str(profile.id),
            "skater_id": str(skater.id),
            "date": "2024-01-15",
            "results": [
                {"metric_id": str(fake_metric_id), "value": "10"}
            ]
        }
    )

    # Should return 404 (not found) or 422 (validation error)
    assert response.status_code in [404, 422], f"Expected 404 or 422, got {response.status_code}: {response.text}"
    data = response.json()
    assert "metric" in str(data.get("detail", "")).lower() or "not found" in str(data.get("detail", "")).lower()


def test_create_session_without_profile_or_skater_fails(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test that recording a session without profile_id OR skater_id/team_id fails.

    At minimum: need profile_id AND either skater_id OR team_id.
    """
    # Missing both skater_id and team_id
    response = client.post(
        f"{settings.API_V1_STR}/benchmarks/sessions",
        headers=normal_user_token_headers,
        json={
            "profile_id": str(uuid.uuid4()),
            "date": "2024-01-15",
            "results": []
        }
    )

    assert response.status_code == 422, f"Expected 422 validation error, got {response.status_code}: {response.text}"

    # Missing profile_id
    response = client.post(
        f"{settings.API_V1_STR}/benchmarks/sessions",
        headers=normal_user_token_headers,
        json={
            "skater_id": str(uuid.uuid4()),
            "date": "2024-01-15",
            "results": []
        }
    )

    assert response.status_code == 422, f"Expected 422 validation error, got {response.status_code}: {response.text}"


def test_create_session_without_auth_fails(client_no_auth: TestClient):
    """Test that unauthorized users (no token) get a 401.

    Authentication should be required for creating sessions.
    """
    response = client_no_auth.post(
        f"{settings.API_V1_STR}/benchmarks/sessions",
        json={
            "profile_id": str(uuid.uuid4()),
            "skater_id": str(uuid.uuid4()),
            "date": "2024-01-15",
            "results": []
        }
    )

    assert response.status_code == 401, f"Expected 401 unauthorized, got {response.status_code}: {response.text}"


def test_retrieve_sessions_for_skater(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test retrieving all sessions for a specific skater.

    GET to /benchmarks/sessions/{skater_id}

    Expected: 200 status, list of sessions with metric results.
    """
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create skater
    skater = Skater(
        coach_id=current_user_id,
        full_name="Test Skater",
        email="skater@example.com",
        dob=datetime(2010, 1, 1),
        discipline="Ladies",
        level="Junior",
        is_active=True
    )
    session.add(skater)
    session.flush()

    # Create profile and metrics
    profile = BenchmarkProfile(
        coach_id=current_user_id,
        name="Test Profile"
    )
    session.add(profile)
    session.flush()

    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Test Metric",
        category=MetricCategory.PHYSICAL,
        data_type=MetricDataType.NUMERIC,
        unit="cm"
    )
    session.add(metric)
    session.commit()

    profile_metric = ProfileMetric(
        profile_id=profile.id,
        metric_id=metric.id,
        target_value="100"
    )
    session.add(profile_metric)
    session.commit()

    # Create multiple sessions
    # Directly create session records for testing
    session1 = BenchmarkSession(
        skater_id=skater.id,
        profile_id=profile.id,
        coach_id=current_user_id,
        recorded_at=datetime(2024, 1, 15),
        notes="First session"
    )
    session2 = BenchmarkSession(
        skater_id=skater.id,
        profile_id=profile.id,
        coach_id=current_user_id,
        recorded_at=datetime(2024, 2, 20),
        notes="Second session - improved!"
    )
    session.add_all([session1, session2])
    session.commit()

    # Create session results
    result1 = SessionResult(
        session_id=session1.id,
        metric_id=metric.id,
        actual_value="95"
    )
    result2 = SessionResult(
        session_id=session2.id,
        metric_id=metric.id,
        actual_value="105"
    )
    session.add_all([result1, result2])
    session.commit()

    # Retrieve sessions for the skater
    response = client.get(
        f"{settings.API_V1_STR}/benchmarks/sessions/{skater.id}",
        headers=normal_user_token_headers
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert isinstance(data, list), "Response should be a list of sessions"
    assert len(data) >= 2, "Should have at least 2 sessions"

    # Verify sessions have expected structure
    for session_data in data:
        assert "id" in session_data
        assert "recorded_at" in session_data or "date" in session_data
        assert "notes" in session_data


def test_create_session_with_numeric_value(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test creating a session with a numeric metric value.

    Verifies that numeric values (e.g., 19.5 inches) are stored correctly.
    """
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    skater = Skater(
        coach_id=current_user_id,
        full_name="Test Skater",
        email="skater@example.com",
        dob=datetime(2010, 1, 1),
        discipline="Ladies",
        level="Junior",
        is_active=True
    )
    session.add(skater)
    session.flush()

    profile = BenchmarkProfile(
        coach_id=current_user_id,
        name="Test Profile"
    )
    session.add(profile)
    session.flush()

    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Jump Height",
        category=MetricCategory.PHYSICAL,
        data_type=MetricDataType.NUMERIC,
        unit="inches"
    )
    session.add(metric)
    session.commit()

    profile_metric = ProfileMetric(
        profile_id=profile.id,
        metric_id=metric.id,
        target_value="18"
    )
    session.add(profile_metric)
    session.commit()

    response = client.post(
        f"{settings.API_V1_STR}/benchmarks/sessions",
        headers=normal_user_token_headers,
        json={
            "profile_id": str(profile.id),
            "skater_id": str(skater.id),
            "date": "2024-01-15",
            "results": [
                {"metric_id": str(metric.id), "value": "19.5"}
            ]
        }
    )

    assert response.status_code == 201
    data = response.json()
    assert data["results"][0]["value"] == "19.5"


def test_create_session_with_scale_value(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test creating a session with a scale metric value.

    Verifies that scale values (e.g., 8 out of 10) are stored correctly.
    """
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    skater = Skater(
        coach_id=current_user_id,
        full_name="Test Skater",
        email="skater@example.com",
        dob=datetime(2010, 1, 1),
        discipline="Ladies",
        level="Junior",
        is_active=True
    )
    session.add(skater)
    session.flush()

    profile = BenchmarkProfile(
        coach_id=current_user_id,
        name="Test Profile"
    )
    session.add(profile)
    session.flush()

    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Effort Level",
        category=MetricCategory.MENTAL,
        data_type=MetricDataType.SCALE,
        scale_min=1,
        scale_max=10
    )
    session.add(metric)
    session.commit()

    profile_metric = ProfileMetric(
        profile_id=profile.id,
        metric_id=metric.id,
        target_value="8"
    )
    session.add(profile_metric)
    session.commit()

    response = client.post(
        f"{settings.API_V1_STR}/benchmarks/sessions",
        headers=normal_user_token_headers,
        json={
            "profile_id": str(profile.id),
            "skater_id": str(skater.id),
            "date": "2024-01-15",
            "results": [
                {"metric_id": str(metric.id), "value": "9"}
            ]
        }
    )

    assert response.status_code == 201
    data = response.json()
    assert data["results"][0]["value"] == "9"


def test_create_session_with_boolean_value(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test creating a session with a boolean metric value.

    Verifies that boolean values (true/false or yes/no) are stored correctly.
    """
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    skater = Skater(
        coach_id=current_user_id,
        full_name="Test Skater",
        email="skater@example.com",
        dob=datetime(2010, 1, 1),
        discipline="Ladies",
        level="Junior",
        is_active=True
    )
    session.add(skater)
    session.flush()

    profile = BenchmarkProfile(
        coach_id=current_user_id,
        name="Test Profile"
    )
    session.add(profile)
    session.flush()

    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Landed Jump",
        category=MetricCategory.TECHNICAL,
        data_type=MetricDataType.BOOLEAN
    )
    session.add(metric)
    session.commit()

    profile_metric = ProfileMetric(
        profile_id=profile.id,
        metric_id=metric.id,
        target_value="true"
    )
    session.add(profile_metric)
    session.commit()

    response = client.post(
        f"{settings.API_V1_STR}/benchmarks/sessions",
        headers=normal_user_token_headers,
        json={
            "profile_id": str(profile.id),
            "skater_id": str(skater.id),
            "date": "2024-01-15",
            "results": [
                {"metric_id": str(metric.id), "value": "true"}
            ]
        }
    )

    assert response.status_code == 201
    data = response.json()
    assert data["results"][0]["value"] == "true"


def test_create_session_without_notes_succeeds(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test that sessions can be created without optional notes field.

    Notes should be optional, not required.
    """
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    skater = Skater(
        coach_id=current_user_id,
        full_name="Test Skater",
        email="skater@example.com",
        dob=datetime(2010, 1, 1),
        discipline="Ladies",
        level="Junior",
        is_active=True
    )
    session.add(skater)
    session.flush()

    profile = BenchmarkProfile(
        coach_id=current_user_id,
        name="Test Profile"
    )
    session.add(profile)
    session.flush()

    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Test Metric",
        category=MetricCategory.PHYSICAL,
        data_type=MetricDataType.NUMERIC,
        unit="cm"
    )
    session.add(metric)
    session.commit()

    profile_metric = ProfileMetric(
        profile_id=profile.id,
        metric_id=metric.id,
        target_value="100"
    )
    session.add(profile_metric)
    session.commit()

    # Create session without notes field
    response = client.post(
        f"{settings.API_V1_STR}/benchmarks/sessions",
        headers=normal_user_token_headers,
        json={
            "profile_id": str(profile.id),
            "skater_id": str(skater.id),
            "date": "2024-01-15",
            "results": [
                {"metric_id": str(metric.id), "value": "105"}
            ]
        }
    )

    assert response.status_code == 201
    data = response.json()
    assert "notes" not in data or data.get("notes") is None
