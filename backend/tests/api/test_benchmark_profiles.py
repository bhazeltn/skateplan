from datetime import date
import uuid
from fastapi.testclient import TestClient
from sqlmodel import Session
from app.core.config import settings
from app.models.user_models import Profile
from app.models.benchmark_models import (
    BenchmarkProfile,
    MetricDefinition,
    MetricCategory,
    MetricDataType,
    ProfileMetric
)


def test_create_blank_profile(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test creating a blank benchmark profile"""
    response = client.post(
        f"{settings.API_V1_STR}/benchmark-profiles/",
        headers=normal_user_token_headers,
        json={
            "name": "Skate Canada Novice Entry",
            "description": "Entry standards for Novice level"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Skate Canada Novice Entry"
    assert data["description"] == "Entry standards for Novice level"
    assert "id" in data
    assert data["is_active"] is True


def test_list_profiles(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test listing coach's profiles"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create a test profile
    profile = BenchmarkProfile(
        coach_id=current_user_id,
        name="Test Profile for List"
    )
    session.add(profile)
    session.commit()

    response = client.get(
        f"{settings.API_V1_STR}/benchmark-profiles/",
        headers=normal_user_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert any(p["name"] == "Test Profile for List" for p in data)


def test_get_profile_with_metrics(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test getting profile includes metrics with targets"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create metric
    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Vertical Jump for Profile",
        category=MetricCategory.PHYSICAL,
        data_type=MetricDataType.NUMERIC,
        unit="inches"
    )
    session.add(metric)
    session.flush()

    # Create profile
    profile = BenchmarkProfile(
        coach_id=current_user_id,
        name="Profile With Metrics"
    )
    session.add(profile)
    session.flush()

    # Add metric to profile
    pm = ProfileMetric(
        profile_id=profile.id,
        metric_id=metric.id,
        target_value="12",
        display_order=1
    )
    session.add(pm)
    session.commit()

    response = client.get(
        f"{settings.API_V1_STR}/benchmark-profiles/{profile.id}",
        headers=normal_user_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert len(data["metrics"]) > 0
    # Check metric includes target value
    metric_data = data["metrics"][0]
    assert "metric_id" in metric_data
    assert "target_value" in metric_data
    assert metric_data["target_value"] == "12"
    assert "metric_name" in metric_data


def test_clone_profile(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test cloning an existing profile with all metrics"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create metric
    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Clone Test Metric",
        category=MetricCategory.PHYSICAL,
        data_type=MetricDataType.NUMERIC,
        unit="cm"
    )
    session.add(metric)
    session.flush()

    # Create source profile with metric
    source = BenchmarkProfile(
        coach_id=current_user_id,
        name="Source Profile",
        description="Original profile"
    )
    session.add(source)
    session.flush()

    pm = ProfileMetric(
        profile_id=source.id,
        metric_id=metric.id,
        target_value="15",
        display_order=1
    )
    session.add(pm)
    session.commit()

    # Clone profile
    response = client.post(
        f"{settings.API_V1_STR}/benchmark-profiles/{source.id}/clone",
        headers=normal_user_token_headers,
        json={"name": "Cloned Profile"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Cloned Profile"
    assert data["id"] != str(source.id)
    # Should have same metrics
    assert len(data["metrics"]) == 1
    assert data["metrics"][0]["target_value"] == "15"


def test_add_metric_to_profile(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test adding a metric with target value to profile"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create metric
    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Add Test Metric",
        category=MetricCategory.MENTAL,
        data_type=MetricDataType.SCALE,
        scale_min=1,
        scale_max=10
    )
    session.add(metric)
    session.flush()

    # Create profile
    profile = BenchmarkProfile(
        coach_id=current_user_id,
        name="Add Metric Profile"
    )
    session.add(profile)
    session.commit()

    # Add metric to profile
    response = client.post(
        f"{settings.API_V1_STR}/benchmark-profiles/{profile.id}/metrics",
        headers=normal_user_token_headers,
        json={
            "metric_id": str(metric.id),
            "target_value": "8",
            "display_order": 1
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["metric_id"] == str(metric.id)
    assert data["target_value"] == "8"


def test_update_metric_target(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test updating target value for metric in profile"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create metric
    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Update Target Metric",
        category=MetricCategory.PHYSICAL,
        data_type=MetricDataType.NUMERIC,
        unit="kg"
    )
    session.add(metric)
    session.flush()

    # Create profile with metric
    profile = BenchmarkProfile(
        coach_id=current_user_id,
        name="Update Target Profile"
    )
    session.add(profile)
    session.flush()

    pm = ProfileMetric(
        profile_id=profile.id,
        metric_id=metric.id,
        target_value="50",
        display_order=1
    )
    session.add(pm)
    session.commit()

    # Update target
    response = client.patch(
        f"{settings.API_V1_STR}/benchmark-profiles/{profile.id}/metrics/{metric.id}",
        headers=normal_user_token_headers,
        json={"target_value": "60"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["target_value"] == "60"


def test_remove_metric_from_profile(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test removing a metric from profile"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create metric
    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Remove Test Metric",
        category=MetricCategory.TACTICAL,
        data_type=MetricDataType.BOOLEAN
    )
    session.add(metric)
    session.flush()

    # Create profile with metric
    profile = BenchmarkProfile(
        coach_id=current_user_id,
        name="Remove Metric Profile"
    )
    session.add(profile)
    session.flush()

    pm = ProfileMetric(
        profile_id=profile.id,
        metric_id=metric.id,
        target_value="true",
        display_order=1
    )
    session.add(pm)
    session.commit()

    # Remove metric
    response = client.delete(
        f"{settings.API_V1_STR}/benchmark-profiles/{profile.id}/metrics/{metric.id}",
        headers=normal_user_token_headers
    )
    assert response.status_code == 204

    # Verify it's gone
    response = client.get(
        f"{settings.API_V1_STR}/benchmark-profiles/{profile.id}",
        headers=normal_user_token_headers
    )
    data = response.json()
    assert len(data["metrics"]) == 0


def test_update_profile_details(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test updating profile name and description"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    profile = BenchmarkProfile(
        coach_id=current_user_id,
        name="Original Name",
        description="Original description"
    )
    session.add(profile)
    session.commit()

    response = client.patch(
        f"{settings.API_V1_STR}/benchmark-profiles/{profile.id}",
        headers=normal_user_token_headers,
        json={
            "name": "Updated Profile Name",
            "description": "Updated description"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Profile Name"
    assert data["description"] == "Updated description"


def test_soft_delete_profile(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test soft deleting profile (sets is_active=false)"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    profile = BenchmarkProfile(
        coach_id=current_user_id,
        name="Profile to Delete"
    )
    session.add(profile)
    session.commit()
    session.refresh(profile)
    profile_id = profile.id

    # Delete profile
    response = client.delete(
        f"{settings.API_V1_STR}/benchmark-profiles/{profile_id}",
        headers=normal_user_token_headers
    )
    assert response.status_code == 204

    # Profile should still exist but is_active=false
    response = client.get(
        f"{settings.API_V1_STR}/benchmark-profiles/{profile_id}",
        headers=normal_user_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_active"] is False

    # Should not appear in list by default
    response = client.get(
        f"{settings.API_V1_STR}/benchmark-profiles/",
        headers=normal_user_token_headers
    )
    data = response.json()
    assert not any(p["id"] == str(profile_id) for p in data)


def test_duplicate_profile_name_fails(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test that duplicate profile names are rejected"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    profile = BenchmarkProfile(
        coach_id=current_user_id,
        name="Duplicate Test Profile"
    )
    session.add(profile)
    session.commit()

    # Try to create profile with same name
    response = client.post(
        f"{settings.API_V1_STR}/benchmark-profiles/",
        headers=normal_user_token_headers,
        json={
            "name": "Duplicate Test Profile",
            "description": "Different description"
        }
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()


def test_cannot_add_same_metric_twice(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test that same metric can't be added to profile twice"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create metric
    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Duplicate Metric Test",
        category=MetricCategory.PHYSICAL,
        data_type=MetricDataType.NUMERIC,
        unit="m"
    )
    session.add(metric)
    session.flush()

    # Create profile with metric
    profile = BenchmarkProfile(
        coach_id=current_user_id,
        name="Duplicate Metric Profile"
    )
    session.add(profile)
    session.flush()

    pm = ProfileMetric(
        profile_id=profile.id,
        metric_id=metric.id,
        target_value="10",
        display_order=1
    )
    session.add(pm)
    session.commit()

    # Try to add same metric again
    response = client.post(
        f"{settings.API_V1_STR}/benchmark-profiles/{profile.id}/metrics",
        headers=normal_user_token_headers,
        json={
            "metric_id": str(metric.id),
            "target_value": "20"
        }
    )
    assert response.status_code == 400
    assert "already in the profile" in response.json()["detail"].lower()


def test_coach_cannot_access_other_coach_profile(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test that coaches can only see their own profiles"""
    # Create another coach
    other_coach = Profile(
        role="coach",
        full_name="Other Coach",
        email="other.coach.profiles@test.com",
        id=uuid.uuid4()
    )
    session.add(other_coach)
    session.flush()

    # Create profile for other coach
    profile = BenchmarkProfile(
        coach_id=other_coach.id,
        name="Other Coach Profile"
    )
    session.add(profile)
    session.commit()
    session.refresh(profile)

    # Try to access with current coach's token
    response = client.get(
        f"{settings.API_V1_STR}/benchmark-profiles/{profile.id}",
        headers=normal_user_token_headers
    )
    assert response.status_code == 404
