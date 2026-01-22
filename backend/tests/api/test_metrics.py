from datetime import date
import uuid
from fastapi.testclient import TestClient
from sqlmodel import Session
from app.core.config import settings
from app.models.user_models import Profile
from app.models.benchmark_models import MetricDefinition, MetricCategory, MetricDataType, ProfileMetric, BenchmarkProfile


def test_create_metric_numeric(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test creating a numeric metric with unit"""
    response = client.post(
        f"{settings.API_V1_STR}/metrics/",
        headers=normal_user_token_headers,
        json={
            "name": "Vertical Jump",
            "description": "Standing vertical jump height",
            "category": "Physical",
            "data_type": "numeric",
            "unit": "inches"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Vertical Jump"
    assert data["unit"] == "inches"
    assert data["category"] == "Physical"
    assert data["data_type"] == "numeric"
    assert "id" in data


def test_create_metric_scale(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test creating a scale metric with min/max"""
    response = client.post(
        f"{settings.API_V1_STR}/metrics/",
        headers=normal_user_token_headers,
        json={
            "name": "Mental Toughness",
            "description": "Self-rated mental toughness",
            "category": "Mental",
            "data_type": "scale",
            "scale_min": 1,
            "scale_max": 10
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["scale_min"] == 1
    assert data["scale_max"] == 10
    assert data["data_type"] == "scale"


def test_create_metric_boolean(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test creating a boolean metric"""
    response = client.post(
        f"{settings.API_V1_STR}/metrics/",
        headers=normal_user_token_headers,
        json={
            "name": "Passed STAR 10",
            "description": "Has skater passed STAR 10 test",
            "category": "Technical",
            "data_type": "boolean"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["data_type"] == "boolean"
    assert data["category"] == "Technical"


def test_list_coach_metrics(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test listing coach's metrics"""
    # Create a test metric first
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Test Metric",
        category=MetricCategory.PHYSICAL,
        data_type=MetricDataType.NUMERIC,
        unit="cm"
    )
    session.add(metric)
    session.commit()

    response = client.get(
        f"{settings.API_V1_STR}/metrics/",
        headers=normal_user_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert any(m["name"] == "Test Metric" for m in data)


def test_list_metrics_with_category_filter(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test filtering metrics by category"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create metrics in different categories
    metric1 = MetricDefinition(
        coach_id=current_user_id,
        name="Physical Metric",
        category=MetricCategory.PHYSICAL,
        data_type=MetricDataType.NUMERIC,
        unit="kg"
    )
    metric2 = MetricDefinition(
        coach_id=current_user_id,
        name="Mental Metric",
        category=MetricCategory.MENTAL,
        data_type=MetricDataType.SCALE,
        scale_min=1,
        scale_max=5
    )
    session.add(metric1)
    session.add(metric2)
    session.commit()

    # Filter by Physical
    response = client.get(
        f"{settings.API_V1_STR}/metrics/?category=Physical",
        headers=normal_user_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert all(m["category"] == "Physical" for m in data)


def test_get_metric_detail(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test getting single metric details"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Detail Test Metric",
        description="Test description",
        category=MetricCategory.TACTICAL,
        data_type=MetricDataType.BOOLEAN
    )
    session.add(metric)
    session.commit()
    session.refresh(metric)

    response = client.get(
        f"{settings.API_V1_STR}/metrics/{metric.id}",
        headers=normal_user_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(metric.id)
    assert data["name"] == "Detail Test Metric"
    assert data["description"] == "Test description"


def test_update_metric(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test updating metric details"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Update Test Metric",
        category=MetricCategory.ENVIRONMENTAL,
        data_type=MetricDataType.NUMERIC,
        unit="meters"
    )
    session.add(metric)
    session.commit()
    session.refresh(metric)

    response = client.patch(
        f"{settings.API_V1_STR}/metrics/{metric.id}",
        headers=normal_user_token_headers,
        json={"description": "Updated description", "unit": "feet"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["description"] == "Updated description"
    assert data["unit"] == "feet"


def test_delete_unused_metric(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test deleting a metric that's not in use"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Delete Test Metric",
        category=MetricCategory.PHYSICAL,
        data_type=MetricDataType.NUMERIC,
        unit="lbs"
    )
    session.add(metric)
    session.commit()
    session.refresh(metric)

    response = client.delete(
        f"{settings.API_V1_STR}/metrics/{metric.id}",
        headers=normal_user_token_headers
    )
    assert response.status_code == 204


def test_cannot_delete_metric_in_use(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test that metrics in use cannot be deleted"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create metric
    metric = MetricDefinition(
        coach_id=current_user_id,
        name="In Use Metric",
        category=MetricCategory.PHYSICAL,
        data_type=MetricDataType.NUMERIC,
        unit="inches"
    )
    session.add(metric)
    session.flush()

    # Create profile that uses this metric
    profile = BenchmarkProfile(
        coach_id=current_user_id,
        name="Test Profile"
    )
    session.add(profile)
    session.flush()

    # Link metric to profile
    profile_metric = ProfileMetric(
        profile_id=profile.id,
        metric_id=metric.id,
        target_value="15"
    )
    session.add(profile_metric)
    session.commit()

    # Try to delete metric
    response = client.delete(
        f"{settings.API_V1_STR}/metrics/{metric.id}",
        headers=normal_user_token_headers
    )
    assert response.status_code == 400
    assert "in use" in response.json()["detail"].lower()


def test_duplicate_metric_name_fails(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test that duplicate metric names are rejected"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create first metric
    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Duplicate Test",
        category=MetricCategory.PHYSICAL,
        data_type=MetricDataType.NUMERIC,
        unit="cm"
    )
    session.add(metric)
    session.commit()

    # Try to create metric with same name
    response = client.post(
        f"{settings.API_V1_STR}/metrics/",
        headers=normal_user_token_headers,
        json={
            "name": "Duplicate Test",  # Same name
            "category": "Physical",
            "data_type": "numeric",
            "unit": "inches"
        }
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()


def test_unauthorized_access_fails(client: TestClient):
    """Test that endpoints require authentication"""
    response = client.get(f"{settings.API_V1_STR}/metrics/")
    # Accept either 401 (unauthorized) or 404 (not found without auth)
    assert response.status_code in [401, 404]


def test_coach_cannot_access_other_coach_metrics(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test that coaches can only see their own metrics"""
    # Create another coach
    other_coach = Profile(
        role="coach",
        full_name="Other Coach",
        email="other.coach@test.com",
        id=uuid.uuid4()
    )
    session.add(other_coach)
    session.flush()

    # Create metric for other coach
    metric = MetricDefinition(
        coach_id=other_coach.id,
        name="Other Coach Metric",
        category=MetricCategory.PHYSICAL,
        data_type=MetricDataType.NUMERIC,
        unit="km"
    )
    session.add(metric)
    session.commit()
    session.refresh(metric)

    # Try to access with current coach's token
    response = client.get(
        f"{settings.API_V1_STR}/metrics/{metric.id}",
        headers=normal_user_token_headers
    )
    assert response.status_code == 404
