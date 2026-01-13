"""
Tests for programs API endpoints.

Following TDD: Tests written FIRST, then implementation.
"""
import pytest
from datetime import date
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.program_models import Program, ProgramAssetLink


def test_create_program(client: TestClient, session: Session, auth_headers: dict):
    """Test creating a new program"""
    program_data = {
        "name": "Free Skate 2024-25",
        "discipline": "singles",
        "season": "2024-25",
        "level": "Junior",
        "music_duration_seconds": 165,  # 2:45 for Junior
    }

    response = client.post("/programs/", json=program_data, headers=auth_headers)

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Free Skate 2024-25"
    assert data["discipline"] == "singles"
    assert data["season"] == "2024-25"
    assert data["level"] == "Junior"
    assert data["music_duration_seconds"] == 165
    assert "id" in data
    assert "skater_id" in data


def test_get_program(client: TestClient, session: Session, auth_headers: dict):
    """Test retrieving a specific program"""
    # First create a program
    program_data = {
        "name": "Short Program 2024-25",
        "discipline": "singles",
        "season": "2024-25",
        "level": "Senior",
        "music_duration_seconds": 150,
    }
    create_response = client.post("/programs/", json=program_data, headers=auth_headers)
    program_id = create_response.json()["id"]

    # Now get it
    response = client.get(f"/programs/{program_id}", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == program_id
    assert data["name"] == "Short Program 2024-25"


def test_link_music_asset(client: TestClient, session: Session, auth_headers: dict):
    """Test linking a music asset to a program"""
    # Create a program first
    program_data = {
        "name": "Test Program",
        "discipline": "singles",
        "season": "2024-25",
    }
    program_response = client.post("/programs/", json=program_data, headers=auth_headers)
    program_id = program_response.json()["id"]

    # Create an asset (simplified - assuming we have asset creation working)
    asset_id = str(uuid4())  # Mock asset ID

    # Link asset to program
    link_data = {
        "program_id": program_id,
        "asset_id": asset_id,
        "asset_type": "music",
    }
    response = client.post("/programs/assets/", json=link_data, headers=auth_headers)

    assert response.status_code == 201
    data = response.json()
    assert data["program_id"] == program_id
    assert data["asset_id"] == asset_id
    assert data["asset_type"] == "music"


def test_list_skater_programs(client: TestClient, session: Session, auth_headers: dict):
    """Test listing all programs for a skater"""
    # Create multiple programs
    for i in range(3):
        program_data = {
            "name": f"Program {i+1}",
            "discipline": "singles",
            "season": "2024-25",
        }
        client.post("/programs/", json=program_data, headers=auth_headers)

    # List all programs
    response = client.get("/programs/", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3  # At least the 3 we just created


def test_update_program(client: TestClient, session: Session, auth_headers: dict):
    """Test updating a program"""
    # Create a program
    program_data = {
        "name": "Original Name",
        "discipline": "singles",
        "season": "2024-25",
    }
    create_response = client.post("/programs/", json=program_data, headers=auth_headers)
    program_id = create_response.json()["id"]

    # Update it
    update_data = {
        "name": "Updated Name",
        "music_duration_seconds": 180,
    }
    response = client.patch(f"/programs/{program_id}", json=update_data, headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["music_duration_seconds"] == 180


def test_delete_program(client: TestClient, session: Session, auth_headers: dict):
    """Test deleting (archiving) a program"""
    # Create a program
    program_data = {
        "name": "To Delete",
        "discipline": "singles",
        "season": "2024-25",
    }
    create_response = client.post("/programs/", json=program_data, headers=auth_headers)
    program_id = create_response.json()["id"]

    # Delete it
    response = client.delete(f"/programs/{program_id}", headers=auth_headers)

    assert response.status_code == 204

    # Verify it's gone (or archived)
    get_response = client.get(f"/programs/{program_id}", headers=auth_headers)
    assert get_response.status_code == 404 or get_response.json()["is_active"] == False
