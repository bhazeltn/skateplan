import uuid
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session
from app.core.config import settings

# TODO: Implement benchmark session recording endpoints (POST /benchmarks/sessions)
# The following tests are skipped because the functionality is not yet implemented.

@pytest.mark.skip(reason="Benchmark session recording endpoints not implemented yet")
def test_create_custom_template(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    data = {
        "name": "My Custom Test",
        "metrics": [
            {"label": "Speed", "unit": "km/h", "data_type": "NUMERIC"},
            {"label": "Notes", "unit": "text", "data_type": "TEXT"},
            {"label": "Effort", "unit": "1-10", "data_type": "SCALE_1_10"}
        ]
    }
    response = client.post(
        f"{settings.API_V1_STR}/benchmarks/templates",
        headers=normal_user_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == "My Custom Test"
    assert len(content["metrics"]) == 3
    assert content["created_by_id"] is not None


@pytest.mark.skip(reason="Benchmark session recording endpoints not implemented yet")
def test_record_benchmark_session(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    # 1. Create Template
    data = {
        "name": "Weekly Check",
        "metrics": [
            {"label": "Jump Height", "unit": "cm", "data_type": "NUMERIC"}
        ]
    }
    tmpl_res = client.post(
        f"{settings.API_V1_STR}/benchmarks/templates",
        headers=normal_user_token_headers,
        json=data,
    )
    template_id = tmpl_res.json()["id"]
    metric_id = tmpl_res.json()["metrics"][0]["id"]

    # 2. Create Skater
    skater_res = client.post(
        f"{settings.API_V1_STR}/skaters/",
        headers=normal_user_token_headers,
        json={"full_name": "Test Skater", "dob": "2010-01-01", "level": "Senior"}
    )
    skater_id = skater_res.json()["id"]

    # 3. Record Result
    result_data = {
        "template_id": template_id,
        "skater_id": skater_id,
        "date": "2023-10-27",
        "results": [
            {"metric_id": metric_id, "value": "50"}
        ]
    }
    res = client.post(
        f"{settings.API_V1_STR}/benchmarks/results",
        headers=normal_user_token_headers,
        json=result_data
    )
    assert res.status_code == 200
    assert res.json()["skater_id"] == skater_id
    assert len(res.json()["results"]) == 1
