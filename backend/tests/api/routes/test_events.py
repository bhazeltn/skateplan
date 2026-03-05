from datetime import date
import uuid
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models.user_models import Profile, SkaterCoachLink
from app.models.events import Competition, SkaterEvent, EventType


def test_create_competition(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test POST /api/v1/competitions/ creates a new competition."""
    data = {
        "name": "Sunsational",
        "start_date": "2026-04-17",
        "end_date": "2026-04-19",
        "city": "Edmonton",
        "region": "AB"
    }
    response = client.post(
        f"{settings.API_V1_STR}/competitions/",
        headers=normal_user_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == data["name"]
    assert content["start_date"] == data["start_date"]
    assert content["end_date"] == data["end_date"]
    assert content["city"] == data["city"]
    assert content["region"] == data["region"]
    assert "id" in content
    assert "created_at" in content


def test_search_competitions(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test GET /api/v1/competitions/?q=Sunsational returns matching competitions."""
    # First, create a competition
    data = {
        "name": "Sunsational",
        "start_date": "2026-04-17",
        "end_date": "2026-04-19",
        "city": "Edmonton",
        "region": "AB"
    }
    create_response = client.post(
        f"{settings.API_V1_STR}/competitions/",
        headers=normal_user_token_headers,
        json=data,
    )
    assert create_response.status_code == 200
    competition_id = create_response.json()["id"]

    # Also create a non-matching competition
    other_data = {
        "name": "Winter Festival",
        "start_date": "2026-02-15",
        "end_date": "2026-02-17",
        "city": "Calgary",
        "region": "AB"
    }
    client.post(
        f"{settings.API_V1_STR}/competitions/",
        headers=normal_user_token_headers,
        json=other_data,
    )

    # Search for "Sunsational"
    response = client.get(
        f"{settings.API_V1_STR}/competitions/?q=Sunsational",
        headers=normal_user_token_headers,
    )

    assert response.status_code == 200
    content = response.json()

    # Should contain our competition
    ids = [c["id"] for c in content]
    assert competition_id in ids

    # Should only return matching results
    for comp in content:
        assert "Sunsational" in comp["name"]


def test_create_skater_event_competition(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test POST /api/v1/skaters/{skater_id}/events/ with competition."""
    # Setup: Create a competition
    competition_data = {
        "name": "Sectionals",
        "start_date": "2026-03-10",
        "end_date": "2026-03-12",
        "city": "Vancouver",
        "region": "BC"
    }
    comp_response = client.post(
        f"{settings.API_V1_STR}/competitions/",
        headers=normal_user_token_headers,
        json=competition_data,
    )
    assert comp_response.status_code == 200
    competition_id = comp_response.json()["id"]

    # Setup: Create a skater profile
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
    skater_profile = Profile(
        role="skater",
        full_name="Test Skater",
        email="test.skater@test.local",
        dob=date(2010, 1, 1),
        is_active=True
    )
    session.add(skater_profile)
    session.flush()

    # Setup: Create coach-skater link
    link = SkaterCoachLink(
        skater_id=skater_profile.id,
        coach_id=current_user_id,
        discipline="Singles",
        current_level="Junior",
        is_primary=True,
        permission_level="edit",
        status="active"
    )
    session.add(link)
    session.commit()

    # Test: Create skater event with competition
    event_data = {
        "event_type": "COMPETITION",
        "competition_id": competition_id,
        "start_date": "2026-03-10",
        "end_date": "2026-03-12"
    }
    response = client.post(
        f"{settings.API_V1_STR}/skaters/{skater_profile.id}/events/",
        headers=normal_user_token_headers,
        json=event_data,
    )

    assert response.status_code == 200
    content = response.json()
    assert content["event_type"] == "COMPETITION"
    assert content["competition_id"] == competition_id
    assert content["start_date"] == "2026-03-10"
    assert content["end_date"] == "2026-03-12"
    assert content["skater_id"] == str(skater_profile.id)
    assert "id" in content


def test_create_skater_event_custom(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test POST /api/v1/skaters/{skater_id}/events/ with custom event (SIMULATION)."""
    # Setup: Create a skater profile
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
    skater_profile = Profile(
        role="skater",
        full_name="Test Skater",
        email="test.skater2@test.local",
        dob=date(2010, 1, 1),
        is_active=True
    )
    session.add(skater_profile)
    session.flush()

    # Setup: Create coach-skater link
    link = SkaterCoachLink(
        skater_id=skater_profile.id,
        coach_id=current_user_id,
        discipline="Singles",
        current_level="Intermediate",
        is_primary=True,
        permission_level="edit",
        status="active"
    )
    session.add(link)
    session.commit()

    # Test: Create custom skater event (simulation)
    event_data = {
        "event_type": "SIMULATION",
        "name": "Spring Club Sim",
        "start_date": "2026-05-15",
        "end_date": "2026-05-15",
        "is_peak_event": True
    }
    response = client.post(
        f"{settings.API_V1_STR}/skaters/{skater_profile.id}/events/",
        headers=normal_user_token_headers,
        json=event_data,
    )

    assert response.status_code == 200
    content = response.json()
    assert content["event_type"] == "SIMULATION"
    assert content["name"] == "Spring Club Sim"
    assert content["start_date"] == "2026-05-15"
    assert content["end_date"] == "2026-05-15"
    assert content["is_peak_event"] is True
    assert content["skater_id"] == str(skater_profile.id)
    assert content["competition_id"] is None
    assert "id" in content


def test_get_skater_events(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test GET /api/v1/skaters/{skater_id}/events/ returns events ordered by date."""
    # Setup: Create a skater profile
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
    skater_profile = Profile(
        role="skater",
        full_name="Test Skater",
        email="test.skater3@test.local",
        dob=date(2010, 1, 1),
        is_active=True
    )
    session.add(skater_profile)
    session.flush()

    # Setup: Create coach-skater link
    link = SkaterCoachLink(
        skater_id=skater_profile.id,
        coach_id=current_user_id,
        discipline="Singles",
        current_level="Intermediate",
        is_primary=True,
        permission_level="edit",
        status="active"
    )
    session.add(link)
    session.commit()

    # Setup: Add two SkaterEvent records directly to the database
    # First event in May 2026
    event_may = SkaterEvent(
        skater_id=skater_profile.id,
        event_type=EventType.SIMULATION,
        name="Spring Club Sim",
        start_date=date(2026, 5, 15),
        end_date=date(2026, 5, 15),
        is_peak_event=False
    )
    session.add(event_may)

    # Second event in June 2026 (should come after May event due to sort order)
    event_june = SkaterEvent(
        skater_id=skater_profile.id,
        event_type=EventType.TEST_DAY,
        name="June Test Day",
        start_date=date(2026, 6, 20),
        end_date=date(2026, 6, 20),
        is_peak_event=True
    )
    session.add(event_june)
    session.commit()

    # Test: Get skater events
    response = client.get(
        f"{settings.API_V1_STR}/skaters/{skater_profile.id}/events/",
        headers=normal_user_token_headers,
    )

    # Assert status is 200
    assert response.status_code == 200
    content = response.json()

    # Assert we got 2 events
    assert len(content) == 2

    # Assert the first item is the May event (testing sort order by date asc)
    assert content[0]["name"] == "Spring Club Sim"
    assert content[0]["start_date"] == "2026-05-15"

    # Assert the second item is the June event
    assert content[1]["name"] == "June Test Day"
    assert content[1]["start_date"] == "2026-06-20"

