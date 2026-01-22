from datetime import date, datetime, timedelta
import uuid
from fastapi.testclient import TestClient
from sqlmodel import Session
from app.core.config import settings
from app.models.user_models import Profile
from app.models.benchmark_models import (
    MetricDefinition,
    MetricCategory,
    MetricDataType,
    BenchmarkProfile,
    ProfileMetric
)
from app.models.gap_analysis_models import GapAnalysis, GapAnalysisEntry
from app.models.team_models import Team


def test_get_or_create_gap_analysis_for_skater(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test getting gap analysis (creates if doesn't exist)"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create a skater
    skater = Profile(
        id=uuid.uuid4(),
        role="skater",
        full_name="Test Skater Gap",
        email="skater.gap@test.com",
        date_of_birth=date(2010, 1, 1)
    )
    session.add(skater)
    session.commit()
    session.refresh(skater)

    response = client.get(
        f"{settings.API_V1_STR}/skaters/{skater.id}/gap-analysis",
        headers=normal_user_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["skater_id"] == str(skater.id)
    assert "entries" in data
    assert "last_updated" in data
    assert len(data["entries"]) == 0  # Initially empty


def test_add_gap_entry(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test adding a gap analysis entry"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create skater
    skater = Profile(
        id=uuid.uuid4(),
        role="skater",
        full_name="Test Skater Entry",
        email="skater.entry@test.com",
        date_of_birth=date(2010, 1, 1)
    )
    session.add(skater)
    session.flush()

    # Create metric
    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Vertical Jump Gap",
        category=MetricCategory.PHYSICAL,
        data_type=MetricDataType.NUMERIC,
        unit="inches"
    )
    session.add(metric)
    session.commit()

    response = client.post(
        f"{settings.API_V1_STR}/skaters/{skater.id}/gap-analysis/entries",
        headers=normal_user_token_headers,
        json={
            "metric_id": str(metric.id),
            "current_value": "11",
            "target_value": "14",
            "notes": "Working on jump height"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["current_value"] == "11"
    assert data["target_value"] == "14"
    assert data["notes"] == "Working on jump height"
    assert "gap_value" in data
    assert "gap_percentage" in data
    assert "status" in data


def test_add_entries_from_profile(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test adding multiple entries from a benchmark profile"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create skater
    skater = Profile(
        id=uuid.uuid4(),
        role="skater",
        full_name="Test Skater Profile",
        email="skater.profile@test.com",
        date_of_birth=date(2010, 1, 1)
    )
    session.add(skater)
    session.flush()

    # Create metrics
    metric1 = MetricDefinition(
        coach_id=current_user_id,
        name="Profile Metric 1",
        category=MetricCategory.PHYSICAL,
        data_type=MetricDataType.NUMERIC,
        unit="cm"
    )
    metric2 = MetricDefinition(
        coach_id=current_user_id,
        name="Profile Metric 2",
        category=MetricCategory.MENTAL,
        data_type=MetricDataType.SCALE,
        scale_min=1,
        scale_max=10
    )
    session.add(metric1)
    session.add(metric2)
    session.flush()

    # Create profile with metrics
    profile = BenchmarkProfile(
        coach_id=current_user_id,
        name="Test Profile for Gap"
    )
    session.add(profile)
    session.flush()

    pm1 = ProfileMetric(
        profile_id=profile.id,
        metric_id=metric1.id,
        target_value="150",
        display_order=1
    )
    pm2 = ProfileMetric(
        profile_id=profile.id,
        metric_id=metric2.id,
        target_value="8",
        display_order=2
    )
    session.add(pm1)
    session.add(pm2)
    session.commit()

    response = client.post(
        f"{settings.API_V1_STR}/skaters/{skater.id}/gap-analysis/from-profile",
        headers=normal_user_token_headers,
        json={"profile_id": str(profile.id)}
    )
    assert response.status_code == 201
    data = response.json()
    assert len(data["entries"]) == 2
    # Should copy target values from profile
    targets = [e["target_value"] for e in data["entries"]]
    assert "150" in targets
    assert "8" in targets


def test_update_gap_entry(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test updating current value in gap entry"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create skater
    skater = Profile(
        id=uuid.uuid4(),
        role="skater",
        full_name="Test Skater Update",
        email="skater.update@test.com",
        date_of_birth=date(2010, 1, 1)
    )
    session.add(skater)
    session.flush()

    # Create gap analysis
    gap_analysis = GapAnalysis(
        skater_id=skater.id
    )
    session.add(gap_analysis)
    session.flush()

    # Create metric
    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Update Test Metric",
        category=MetricCategory.PHYSICAL,
        data_type=MetricDataType.NUMERIC,
        unit="kg"
    )
    session.add(metric)
    session.flush()

    # Create entry
    entry = GapAnalysisEntry(
        gap_analysis_id=gap_analysis.id,
        metric_id=metric.id,
        current_value="10",
        target_value="15"
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)

    original_updated = gap_analysis.last_updated

    response = client.patch(
        f"{settings.API_V1_STR}/gap-analysis/entries/{entry.id}",
        headers=normal_user_token_headers,
        json={
            "current_value": "13",
            "notes": "Improved!"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["current_value"] == "13"
    assert data["notes"] == "Improved!"


def test_archive_gap_entry(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test archiving an entry (set is_active=false)"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create skater
    skater = Profile(
        id=uuid.uuid4(),
        role="skater",
        full_name="Test Skater Archive",
        email="skater.archive@test.com",
        date_of_birth=date(2010, 1, 1)
    )
    session.add(skater)
    session.flush()

    # Create gap analysis
    gap_analysis = GapAnalysis(
        skater_id=skater.id
    )
    session.add(gap_analysis)
    session.flush()

    # Create metric
    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Archive Test Metric",
        category=MetricCategory.PHYSICAL,
        data_type=MetricDataType.NUMERIC,
        unit="m"
    )
    session.add(metric)
    session.flush()

    # Create entry
    entry = GapAnalysisEntry(
        gap_analysis_id=gap_analysis.id,
        metric_id=metric.id,
        current_value="5",
        target_value="10"
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)

    response = client.delete(
        f"{settings.API_V1_STR}/gap-analysis/entries/{entry.id}",
        headers=normal_user_token_headers
    )
    assert response.status_code == 204

    # Entry should still exist but not appear in active list
    gap_response = client.get(
        f"{settings.API_V1_STR}/skaters/{skater.id}/gap-analysis",
        headers=normal_user_token_headers
    )
    data = gap_response.json()
    assert not any(e["id"] == str(entry.id) for e in data["entries"])

    # Can get with include_inactive
    gap_response = client.get(
        f"{settings.API_V1_STR}/skaters/{skater.id}/gap-analysis?include_inactive=true",
        headers=normal_user_token_headers
    )
    data = gap_response.json()
    assert any(e["id"] == str(entry.id) for e in data["entries"])


def test_gap_calculation_numeric(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test gap calculation for numeric metrics"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create skater
    skater = Profile(
        id=uuid.uuid4(),
        role="skater",
        full_name="Test Skater Numeric",
        email="skater.numeric@test.com",
        date_of_birth=date(2010, 1, 1)
    )
    session.add(skater)
    session.flush()

    # Create numeric metric
    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Numeric Gap Metric",
        category=MetricCategory.PHYSICAL,
        data_type=MetricDataType.NUMERIC,
        unit="inches"
    )
    session.add(metric)
    session.commit()

    response = client.post(
        f"{settings.API_V1_STR}/skaters/{skater.id}/gap-analysis/entries",
        headers=normal_user_token_headers,
        json={
            "metric_id": str(metric.id),
            "current_value": "12",
            "target_value": "15"
        }
    )
    data = response.json()
    assert float(data["gap_value"]) == 3.0
    assert data["gap_percentage"] == 20.0  # 3/15 = 20%
    assert data["status"] == "needs_work"  # >15% gap


def test_gap_calculation_scale(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test gap calculation for scale metrics (1-10)"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create skater
    skater = Profile(
        id=uuid.uuid4(),
        role="skater",
        full_name="Test Skater Scale",
        email="skater.scale@test.com",
        date_of_birth=date(2010, 1, 1)
    )
    session.add(skater)
    session.flush()

    # Create scale metric
    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Scale Gap Metric",
        category=MetricCategory.MENTAL,
        data_type=MetricDataType.SCALE,
        scale_min=1,
        scale_max=10
    )
    session.add(metric)
    session.commit()

    response = client.post(
        f"{settings.API_V1_STR}/skaters/{skater.id}/gap-analysis/entries",
        headers=normal_user_token_headers,
        json={
            "metric_id": str(metric.id),
            "current_value": "6",
            "target_value": "8"
        }
    )
    data = response.json()
    assert float(data["gap_value"]) == 2.0
    assert data["gap_percentage"] == 25.0  # 2/8
    assert data["status"] == "needs_work"


def test_gap_status_on_target(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test status when within 5% of target"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create skater
    skater = Profile(
        id=uuid.uuid4(),
        role="skater",
        full_name="Test Skater On Target",
        email="skater.ontarget@test.com",
        date_of_birth=date(2010, 1, 1)
    )
    session.add(skater)
    session.flush()

    # Create metric
    metric = MetricDefinition(
        coach_id=current_user_id,
        name="On Target Metric",
        category=MetricCategory.PHYSICAL,
        data_type=MetricDataType.NUMERIC,
        unit="cm"
    )
    session.add(metric)
    session.commit()

    response = client.post(
        f"{settings.API_V1_STR}/skaters/{skater.id}/gap-analysis/entries",
        headers=normal_user_token_headers,
        json={
            "metric_id": str(metric.id),
            "current_value": "13.5",
            "target_value": "14"  # 0.5/14 = 3.6% gap
        }
    )
    data = response.json()
    assert data["status"] == "on_target"


def test_gap_status_close(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test status when 5-15% below target"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create skater
    skater = Profile(
        id=uuid.uuid4(),
        role="skater",
        full_name="Test Skater Close",
        email="skater.close@test.com",
        date_of_birth=date(2010, 1, 1)
    )
    session.add(skater)
    session.flush()

    # Create metric
    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Close Metric",
        category=MetricCategory.PHYSICAL,
        data_type=MetricDataType.NUMERIC,
        unit="cm"
    )
    session.add(metric)
    session.commit()

    response = client.post(
        f"{settings.API_V1_STR}/skaters/{skater.id}/gap-analysis/entries",
        headers=normal_user_token_headers,
        json={
            "metric_id": str(metric.id),
            "current_value": "12",
            "target_value": "14"  # 2/14 = 14.3% gap
        }
    )
    data = response.json()
    assert data["status"] == "close"


def test_cannot_duplicate_metric(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test that same metric can't be added twice to gap analysis"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create skater
    skater = Profile(
        id=uuid.uuid4(),
        role="skater",
        full_name="Test Skater Duplicate",
        email="skater.duplicate@test.com",
        date_of_birth=date(2010, 1, 1)
    )
    session.add(skater)
    session.flush()

    # Create gap analysis
    gap_analysis = GapAnalysis(
        skater_id=skater.id
    )
    session.add(gap_analysis)
    session.flush()

    # Create metric
    metric = MetricDefinition(
        coach_id=current_user_id,
        name="Duplicate Test Metric",
        category=MetricCategory.PHYSICAL,
        data_type=MetricDataType.NUMERIC,
        unit="kg"
    )
    session.add(metric)
    session.flush()

    # Create first entry
    entry = GapAnalysisEntry(
        gap_analysis_id=gap_analysis.id,
        metric_id=metric.id,
        current_value="10",
        target_value="15"
    )
    session.add(entry)
    session.commit()

    # Try to add same metric again
    response = client.post(
        f"{settings.API_V1_STR}/skaters/{skater.id}/gap-analysis/entries",
        headers=normal_user_token_headers,
        json={
            "metric_id": str(metric.id),
            "current_value": "12",
            "target_value": "15"
        }
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()


def test_team_gap_analysis(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test gap analysis for teams (not just skaters)"""
    current_user_id = uuid.UUID("00000000-0000-0000-0000-000000000000")

    # Create team
    team = Team(
        id=uuid.uuid4(),
        coach_id=current_user_id,
        team_name="Test Team Gap",
        federation="CAN",
        discipline="Pairs",
        current_level="Novice"
    )
    session.add(team)
    session.commit()
    session.refresh(team)

    response = client.get(
        f"{settings.API_V1_STR}/teams/{team.id}/gap-analysis",
        headers=normal_user_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["team_id"] == str(team.id)
    assert "entries" in data
    assert len(data["entries"]) == 0  # Initially empty
