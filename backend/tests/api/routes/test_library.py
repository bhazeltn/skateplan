from fastapi.testclient import TestClient
from app.core.config import settings

def test_read_elements_no_auth(client: TestClient):
    response = client.get(f"{settings.API_V1_STR}/elements")
    assert response.status_code == 401
