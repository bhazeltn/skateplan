from datetime import date
import uuid
from fastapi.testclient import TestClient
from sqlmodel import Session
from app.core.config import settings
from app.models.skater_models import Skater
from app.models.user_models import Profile, SkaterCoachLink
from app.models.federation_models import Federation

def test_create_skater(
    client: TestClient, 
    session: Session, 
    normal_user_token_headers
):
    data = {
        "full_name": "Test Skater",
        "dob": "2010-01-01",
        "level": "Junior",
        "is_active": True
    }
    response = client.post(
        f"{settings.API_V1_STR}/skaters/",
        headers=normal_user_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["full_name"] == data["full_name"]
    assert content["level"] == data["level"]
    assert "id" in content
    assert "coach_id" in content

def test_list_skaters_ownership(
    client: TestClient, 
    session: Session, 
    normal_user_token_headers
):
    # 1. Create a skater for the current user
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
    
    skater_own = Skater(
        full_name="My Skater",
        dob=date(2012, 1, 1),
        level="Novice",
        coach_id=current_user_id
    )
    session.add(skater_own)
    
    # 2. Create a skater for another user
    other_coach = Profile(
        role="coach",
        full_name="Other Coach",
        email="other@example.com",
        id=uuid.uuid4()
    )
    session.add(other_coach)
    
    skater_other = Skater(
        full_name="Other Skater",
        dob=date(2012, 1, 1),
        level="Novice",
        coach_id=other_coach.id
    )
    session.add(skater_other)
    session.commit()
    
    # 3. List Skaters
    response = client.get(
        f"{settings.API_V1_STR}/skaters/",
        headers=normal_user_token_headers,
    )
    
    assert response.status_code == 200
    content = response.json()
    
    # 4. Assert only "My Skater" is returned
    ids = [s["id"] for s in content]
    assert str(skater_own.id) in ids
    assert str(skater_other.id) not in ids

def test_archive_skater(
    client: TestClient, 
    session: Session, 
    normal_user_token_headers
):
    # 1. Create Skater
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
    skater = Skater(
        full_name="To Archive",
        dob=date(2010, 1, 1),
        level="Senior",
        coach_id=current_user_id
    )
    session.add(skater)
    session.commit()
    
    # 2. Archive (Patch)
    response = client.patch(
        f"{settings.API_V1_STR}/skaters/{skater.id}",
        headers=normal_user_token_headers,
        json={"is_active": False}
    )
    assert response.status_code == 200
    content = response.json()
    assert content["is_active"] == False
    
    # 3. Verify in DB
    session.refresh(skater)
    assert skater.is_active == False

def test_update_skater_security(
    client: TestClient, 
    session: Session, 
    normal_user_token_headers
):
    # 1. Create Skater for OTHER coach
    other_coach = Profile(
        role="coach", full_name="Other", email="other@ex.com", id=uuid.uuid4()
    )
    session.add(other_coach)
    skater = Skater(
        full_name="Stolen Skater", dob=date(2010, 1, 1), level="Senior", coach_id=other_coach.id
    )
    session.add(skater)
    session.commit()
    
    # 2. Attempt to update
    response = client.patch(
        f"{settings.API_V1_STR}/skaters/{skater.id}",
        headers=normal_user_token_headers,
        json={"is_active": False}
    )
    
    # 3. Assert Forbidden or Not Found
    assert response.status_code in [403, 404]


def test_get_skater_with_profile_and_link(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test GET /skaters/{skater_id} returns complete profile with federation and link data."""
    # Setup: Create federation
    federation = Federation(
        code="CAN",
        name="Skate Canada",
        iso_code="ca",
        country_name="Canada"
    )
    session.add(federation)

    # Setup: Create skater profile
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
    skater_profile = Profile(
        role="skater",
        full_name="Jane Doe",
        email="jane.doe@test.local",
        dob=date(2010, 5, 15),
        federation="CAN",
        training_site="Toronto Cricket Club",
        home_club="Granite Club",
        is_active=True
    )
    session.add(skater_profile)
    session.flush()  # Get skater ID

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

    # Test: Get skater detail
    response = client.get(
        f"{settings.API_V1_STR}/skaters/{skater_profile.id}",
        headers=normal_user_token_headers
    )

    # Verify: Response is successful
    assert response.status_code == 200
    content = response.json()

    # Verify: Profile data
    assert content["id"] == str(skater_profile.id)
    assert content["full_name"] == "Jane Doe"
    assert content["email"] == "jane.doe@test.local"
    assert content["dob"] == "2010-05-15"
    assert content["training_site"] == "Toronto Cricket Club"
    assert content["home_club"] == "Granite Club"
    assert content["is_active"] is True

    # Verify: Federation data
    assert content["federation_code"] == "CAN"
    assert content["federation_name"] == "Skate Canada"
    assert content["federation_iso_code"] == "ca"
    assert content["country_name"] == "Canada"

    # Verify: Link data (discipline and level)
    assert content["discipline"] == "Singles"
    assert content["current_level"] == "Junior"


def test_get_skater_not_owned_by_coach(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test GET /skaters/{skater_id} returns 404 for skater not owned by current coach."""
    # Setup: Create another coach
    other_coach = Profile(
        role="coach",
        full_name="Other Coach",
        email="other.coach@example.com",
        id=uuid.uuid4()
    )
    session.add(other_coach)

    # Setup: Create skater profile for other coach
    skater_profile = Profile(
        role="skater",
        full_name="Other Skater",
        email="other.skater@test.local",
        dob=date(2012, 3, 10),
        is_active=True
    )
    session.add(skater_profile)
    session.flush()

    # Setup: Link skater to OTHER coach
    link = SkaterCoachLink(
        skater_id=skater_profile.id,
        coach_id=other_coach.id,
        discipline="Singles",
        current_level="Novice",
        is_primary=True,
        permission_level="edit",
        status="active"
    )
    session.add(link)
    session.commit()

    # Test: Try to get skater detail with current user's token
    response = client.get(
        f"{settings.API_V1_STR}/skaters/{skater_profile.id}",
        headers=normal_user_token_headers
    )

    # Verify: Should return 404 (not found or no permission)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower() or "permission" in response.json()["detail"].lower()
