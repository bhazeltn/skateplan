"""Test suite for Equipment Maintenance API.

Tests follow TDD methodology: written before implementation, expected to fail.

Equipment Module API Contracts:
1. POST /skaters/{skater_id}/equipment - Create equipment (boots/boots)
2. GET /skaters/{skater_id}/equipment - Retrieve skater's equipment
3. POST /equipment/{equipment_id}/maintenance - Log maintenance
4. GET /equipment/{equipment_id}/maintenance - Retrieve maintenance history
5. Validation: 404 for non-existent skater/equipment
"""
import uuid
from datetime import datetime, date
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models.user_models import Profile


def test_create_equipment_boot(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test creating a boot equipment record."""
    # Create a test skater profile
    skater = Profile(
        role="skater",
        full_name="Test Skater",
        email="skater@example.com",
        dob=date(2010, 1, 1),
        level="Junior",
        is_active=True,
        home_club="Test Club"
    )
    session.add(skater)
    session.commit()

    # Create a boot equipment record
    response = client.post(
        f"{settings.API_V1_STR}/skaters/{skater.id}/equipment",
        headers=normal_user_token_headers,
        json={
            "name": "Dance Boots",
            "type": "boot",
            "brand": "Jackson",
            "model": "Debut",
            "size": "7.0",
            "purchase_date": "2024-01-15",
            "is_active": True
        }
    )

    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    data = response.json()
    assert "id" in data, "Equipment ID should be returned"
    assert data["name"] == "Dance Boots"
    assert data["type"] == "boot"
    assert data["brand"] == "Jackson"
    assert data["model"] == "Debut"
    assert data["size"] == "7.0"
    assert "2024-01-15" in data["purchase_date"], f"Expected date in purchase_date, got {data['purchase_date']}"
    assert data["is_active"] is True


def test_create_equipment_blade(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test creating a blade equipment record."""
    skater = Profile(
        role="skater",
        full_name="Test Skater",
        email="skater@example.com",
        dob=date(2010, 1, 1),
        level="Junior",
        is_active=True
    )
    session.add(skater)
    session.commit()

    # Create a blade equipment record
    response = client.post(
        f"{settings.API_V1_STR}/skaters/{skater.id}/equipment",
        headers=normal_user_token_headers,
        json={
            "name": "Freeskate Blades",
            "type": "blade",
            "brand": "John Wilson",
            "model": "Coronation Ace",
            "size": "9.75",
            "purchase_date": "2024-02-01",
            "is_active": True
        }
    )

    assert response.status_code == 201, f"Expected 201, got {response.status_code}"
    data = response.json()
    assert "id" in data
    assert data["name"] == "Freeskate Blades"
    assert data["type"] == "blade"
    assert data["brand"] == "John Wilson"
    assert data["model"] == "Coronation Ace"


def test_create_equipment_for_nonexistent_skater_fails(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test that creating equipment for a non-existent skater fails (404)."""
    fake_skater_id = uuid.uuid4()

    response = client.post(
        f"{settings.API_V1_STR}/skaters/{fake_skater_id}/equipment",
        headers=normal_user_token_headers,
        json={
            "name": "Test Boots",
            "type": "boot",
            "brand": "Jackson",
            "model": "Debut",
            "size": "7.0",
            "purchase_date": "2024-01-15",
            "is_active": True
        }
    )

    assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
    data = response.json()
    assert "not found" in str(data.get("detail", "")).lower()


def test_retrieve_skater_equipment(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test retrieving all equipment for a specific skater."""
    skater = Profile(
        role="skater",
        full_name="Test Skater",
        email="skater@example.com",
        dob=date(2010, 1, 1),
        level="Junior",
        is_active=True
    )
    session.add(skater)
    session.flush()

    response = client.get(
        f"{settings.API_V1_STR}/skaters/{skater.id}/equipment",
        headers=normal_user_token_headers
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert isinstance(data, list), "Response should be a list of equipment"


def test_create_maintenance_log_sharpening(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test logging a maintenance event (sharpening)."""
    skater = Profile(
        role="skater",
        full_name="Test Skater",
        email="skater@example.com",
        dob=date(2010, 1, 1),
        level="Junior",
        is_active=True
    )
    session.add(skater)
    session.flush()

    from app.models.equipment_models import Equipment
    equipment = Equipment(
        skater_id=skater.id,
        name="Test Blades",
        type="blade",
        brand="John Wilson",
        model="Coronation Ace",
        size="9.75",
        is_active=True
    )
    session.add(equipment)
    session.commit()

    response = client.post(
        f"{settings.API_V1_STR}/equipment/{equipment.id}/maintenance",
        headers=normal_user_token_headers,
        json={
            "date": "2024-03-01",
            "maintenance_type": "sharpening",
            "location": "Pro Shop Arena",
            "technician": "Mike Smith",
            "specifications": "Hollow: 7/16, Profile: Flat",
            "notes": "Regular maintenance"
        }
    )

    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    data = response.json()
    assert "id" in data, "Maintenance log ID should be returned"
    assert "2024-03-01" in data["date"]
    assert data["maintenance_type"] == "sharpening"
    assert data["location"] == "Pro Shop Arena"
    assert data["technician"] == "Mike Smith"
    assert data["specifications"] == "Hollow: 7/16, Profile: Flat"
    assert data["notes"] == "Regular maintenance"


def test_create_maintenance_log_mounting(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test logging a blade mounting maintenance event."""
    skater = Profile(
        role="skater",
        full_name="Test Skater",
        email="skater@example.com",
        dob=date(2010, 1, 1),
        level="Junior",
        is_active=True
    )
    session.add(skater)
    session.flush()

    from app.models.equipment_models import Equipment
    equipment = Equipment(
        skater_id=skater.id,
        name="Test Boots",
        type="boot",
        brand="Jackson",
        model="Debut",
        size="7.0",
        is_active=True
    )
    session.add(equipment)
    session.commit()

    response = client.post(
        f"{settings.API_V1_STR}/equipment/{equipment.id}/maintenance",
        headers=normal_user_token_headers,
        json={
            "date": "2024-02-15",
            "maintenance_type": "mounting",
            "location": "Boot Lab",
            "technician": "Sarah Jones",
            "specifications": "Mount position: Forward, Size: 9.75",
            "notes": "Blade mounted to new boots"
        }
    )

    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    data = response.json()
    assert data["maintenance_type"] == "mounting"
    assert data["location"] == "Boot Lab"
    assert data["technician"] == "Sarah Jones"
    assert data["specifications"] == "Mount position: Forward, Size: 9.75"
    assert data["notes"] == "Blade mounted to new boots"


def test_create_maintenance_log_waterproofing(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test logging a boot waterproofing maintenance event."""
    skater = Profile(
        role="skater",
        full_name="Test Skater",
        email="skater@example.com",
        dob=date(2010, 1, 1),
        level="Junior",
        is_active=True
    )
    session.add(skater)
    session.flush()

    from app.models.equipment_models import Equipment
    equipment = Equipment(
        skater_id=skater.id,
        name="Test Boots",
        type="boot",
        brand="Jackson",
        model="Debut",
        size="7.0",
        is_active=True
    )
    session.add(equipment)
    session.commit()

    response = client.post(
        f"{settings.API_V1_STR}/equipment/{equipment.id}/maintenance",
        headers=normal_user_token_headers,
        json={
            "date": "2024-01-20",
            "maintenance_type": "waterproofing",
            "location": "Rink Pro Shop",
            "specifications": "Waterproofing treatment applied to leather",
            "notes": "Annual waterproofing"
        }
    )

    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    data = response.json()
    assert data["maintenance_type"] == "waterproofing"
    assert data["specifications"] == "Waterproofing treatment applied to leather"


def test_create_maintenance_log_for_nonexistent_equipment_fails(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test that logging maintenance for non-existent equipment fails (404)."""
    fake_equipment_id = uuid.uuid4()

    response = client.post(
        f"{settings.API_V1_STR}/equipment/{fake_equipment_id}/maintenance",
        headers=normal_user_token_headers,
        json={
            "date": "2024-03-01",
            "maintenance_type": "sharpening",
            "location": "Pro Shop",
            "specifications": "Hollow: 7/16"
        }
    )

    assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
    data = response.json()
    assert "not found" in str(data.get("detail", "")).lower()


def test_retrieve_maintenance_history(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test retrieving maintenance history for a specific equipment."""
    skater = Profile(
        role="skater",
        full_name="Test Skater",
        email="skater@example.com",
        dob=date(2010, 1, 1),
        level="Junior",
        is_active=True
    )
    session.add(skater)
    session.flush()

    from app.models.equipment_models import Equipment
    equipment = Equipment(
        skater_id=skater.id,
        name="Test Equipment",
        type="blade",
        brand="John Wilson",
        model="Coronation Ace",
        size="9.75",
        is_active=True
    )
    session.add(equipment)
    session.commit()

    response = client.get(
        f"{settings.API_V1_STR}/equipment/{equipment.id}/maintenance",
        headers=normal_user_token_headers
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert isinstance(data, list), "Response should be a list of maintenance logs"


def test_maintenance_history_chronological_order(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test that maintenance history is returned in chronological order."""
    skater = Profile(
        role="skater",
        full_name="Test Skater",
        email="skater@example.com",
        dob=date(2010, 1, 1),
        level="Junior",
        is_active=True
    )
    session.add(skater)
    session.flush()

    from app.models.equipment_models import Equipment, MaintenanceLog
    equipment = Equipment(
        skater_id=skater.id,
        name="Test Equipment",
        type="blade",
        brand="John Wilson",
        model="Coronation Ace",
        size="9.75",
        is_active=True
    )
    session.add(equipment)
    session.flush()

    # Create multiple maintenance logs
    log1 = MaintenanceLog(
        equipment_id=equipment.id,
        date=datetime(2024, 1, 15),
        maintenance_type="sharpening",
        location="Pro Shop A",
        specifications="First sharpening"
    )
    log2 = MaintenanceLog(
        equipment_id=equipment.id,
        date=datetime(2024, 2, 20),
        maintenance_type="sharpening",
        location="Pro Shop B",
        specifications="Second sharpening"
    )
    log3 = MaintenanceLog(
        equipment_id=equipment.id,
        date=datetime(2024, 3, 10),
        maintenance_type="sharpening",
        location="Pro Shop C",
        specifications="Third sharpening"
    )

    session.add_all([log1, log2, log3])
    session.commit()

    response = client.get(
        f"{settings.API_V1_STR}/equipment/{equipment.id}/maintenance",
        headers=normal_user_token_headers
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 3
    dates = [log["date"] for log in data]
    assert dates == sorted(dates, reverse=True)


def test_create_equipment_without_auth_fails(
    client_no_auth: TestClient,
    session: Session
):
    """Test that creating equipment without authentication fails (401)."""
    fake_skater_id = uuid.uuid4()

    response = client_no_auth.post(
        f"{settings.API_V1_STR}/skaters/{fake_skater_id}/equipment",
        json={
            "name": "Test Boots",
            "type": "boot",
            "brand": "Jackson",
            "model": "Debut",
            "size": "7.0",
            "purchase_date": "2024-01-15",
            "is_active": True
        }
    )
    assert response.status_code == 401


def test_create_maintenance_without_auth_fails(
    client_no_auth: TestClient,
    session: Session
):
    """Test that creating maintenance logs without authentication fails (401)."""
    fake_equipment_id = uuid.uuid4()

    response = client_no_auth.post(
        f"{settings.API_V1_STR}/equipment/{fake_equipment_id}/maintenance",
        json={
            "date": "2024-03-01",
            "maintenance_type": "sharpening",
            "location": "Pro Shop",
            "specifications": "Hollow: 7/16"
        }
    )
    assert response.status_code == 401


def test_create_equipment_invalid_type_fails(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test that creating equipment with invalid type fails validation (422)."""
    skater = Profile(
        role="skater",
        full_name="Test Skater",
        email="skater@example.com",
        dob=date(2010, 1, 1),
        level="Junior",
        is_active=True
    )
    session.add(skater)
    session.commit()

    response = client.post(
        f"{settings.API_V1_STR}/skaters/{skater.id}/equipment",
        headers=normal_user_token_headers,
        json={
            "name": "Test Boots",
            "type": "invalid_type",
            "brand": "Jackson",
            "model": "Debut",
            "size": "7.0",
            "purchase_date": "2024-01-15",
            "is_active": True
        }
    )
    assert response.status_code == 422


def test_create_maintenance_invalid_type_fails(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test that creating maintenance with invalid type fails validation (422)."""
    skater = Profile(
        role="skater",
        full_name="Test Skater",
        email="skater@example.com",
        dob=date(2010, 1, 1),
        level="Junior",
        is_active=True
    )
    session.add(skater)
    session.commit()

    equipment_id = uuid.uuid4()

    response = client.post(
        f"{settings.API_V1_STR}/equipment/{equipment_id}/maintenance",
        headers=normal_user_token_headers,
        json={
            "date": "2024-03-01",
            "maintenance_type": "invalid_type",
            "location": "Pro Shop",
            "specifications": "Test"
        }
    )
    assert response.status_code == 422


# ==================== Skate Setup Tests ====================

def test_create_skate_setup_boot_and_blade(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test creating a Skate Setup by first creating a boot, then a blade, then linking them."""
    skater = Profile(
        role="skater",
        full_name="Test Skater",
        email="skater@example.com",
        dob=date(2010, 1, 1),
        level="Junior",
        is_active=True
    )
    session.add(skater)
    session.commit()

    boot_response = client.post(
        f"{settings.API_V1_STR}/skaters/{skater.id}/equipment",
        headers=normal_user_token_headers,
        json={
            "type": "boot",
            "brand": "Jackson",
            "model": "Debut",
            "size": "7.0",
            "purchase_date": "2024-01-15",
            "is_active": True
        }
    )
    assert boot_response.status_code == 201
    boot_id = boot_response.json()["id"]

    blade_response = client.post(
        f"{settings.API_V1_STR}/skaters/{skater.id}/equipment",
        headers=normal_user_token_headers,
        json={
            "type": "blade",
            "brand": "John Wilson",
            "model": "Coronation Ace",
            "size": "9.75",
            "purchase_date": "2024-02-01",
            "is_active": True
        }
    )
    assert blade_response.status_code == 201
    blade_id = blade_response.json()["id"]

    skate_setup_response = client.post(
        f"{settings.API_V1_STR}/skaters/{skater.id}/skates",
        headers=normal_user_token_headers,
        json={
            "name": "Freeskate Skates",
            "boot_id": str(boot_id),
            "blade_id": str(blade_id),
            "is_active": True
        }
    )

    assert skate_setup_response.status_code == 201, f"Expected 201, got {skate_setup_response.status_code}: {skate_setup_response.text}"
    data = skate_setup_response.json()
    assert "id" in data
    assert data["name"] == "Freeskate Skates"
    assert data["boot_id"] == str(boot_id)
    assert data["blade_id"] == str(blade_id)
    assert data["is_active"] is True


def test_retrieve_skate_setups(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test retrieving all skate setups for a skater."""
    skater = Profile(
        role="skater",
        full_name="Test Skater",
        email="skater@example.com",
        dob=date(2010, 1, 1),
        level="Junior",
        is_active=True
    )
    session.add(skater)
    session.commit()

    boot_response = client.post(
        f"{settings.API_V1_STR}/skaters/{skater.id}/equipment",
        headers=normal_user_token_headers,
        json={"type": "boot", "brand": "Jackson", "model": "Debut", "size": "7.0", "is_active": True}
    )
    boot_id = boot_response.json()["id"]

    blade_response = client.post(
        f"{settings.API_V1_STR}/skaters/{skater.id}/equipment",
        headers=normal_user_token_headers,
        json={"type": "blade", "brand": "John Wilson", "model": "Coronation Ace", "size": "9.75", "is_active": True}
    )
    blade_id = blade_response.json()["id"]

    skate_setup_response = client.post(
        f"{settings.API_V1_STR}/skaters/{skater.id}/skates",
        headers=normal_user_token_headers,
        json={"name": "Freeskate Skates", "boot_id": str(boot_id), "blade_id": str(blade_id), "is_active": True}
    )

    response = client.get(
        f"{settings.API_V1_STR}/skaters/{skater.id}/skates",
        headers=normal_user_token_headers
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1

    setup = data[0]
    assert "id" in setup
    assert "boot_id" in setup or "boot" in setup
    assert "blade_id" in setup or "blade" in setup


def test_update_skate_setup_swap_blade(
    client: TestClient,
    session: Session,
    normal_user_token_headers
):
    """Test updating a Skate Setup by swapping blade."""
    skater = Profile(
        role="skater",
        full_name="Test Skater",
        email="skater@example.com",
        dob=date(2010, 1, 1),
        level="Junior",
        is_active=True
    )
    session.add(skater)
    session.commit()

    boot_response = client.post(
        f"{settings.API_V1_STR}/skaters/{skater.id}/equipment",
        headers=normal_user_token_headers,
        json={"type": "boot", "brand": "Jackson", "model": "Debut", "size": "7.0", "is_active": True}
    )
    boot_id = boot_response.json()["id"]

    blade1_response = client.post(
        f"{settings.API_V1_STR}/skaters/{skater.id}/equipment",
        headers=normal_user_token_headers,
        json={"type": "blade", "brand": "John Wilson", "model": "Coronation Ace", "size": "9.75", "is_active": True}
    )
    blade_id_1 = blade1_response.json()["id"]

    skate_setup_response = client.post(
        f"{settings.API_V1_STR}/skaters/{skater.id}/skates",
        headers=normal_user_token_headers,
        json={"name": "Freeskate Skates", "boot_id": str(boot_id), "blade_id": str(blade_id_1), "is_active": True}
    )
    skate_setup_id = skate_setup_response.json()["id"]

    blade2_response = client.post(
        f"{settings.API_V1_STR}/skaters/{skater.id}/equipment",
        headers=normal_user_token_headers,
        json={"type": "blade", "brand": "John Wilson", "model": "Pattern 99", "size": "9.75", "is_active": True}
    )
    blade_id_2 = blade2_response.json()["id"]

    update_response = client.put(
        f"{settings.API_V1_STR}/skaters/{skater.id}/skates/{skate_setup_id}",
        headers=normal_user_token_headers,
        json={"boot_id": str(boot_id), "blade_id": str(blade_id_2), "is_active": True}
    )

    assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
    data = update_response.json()
    assert data["blade_id"] == str(blade_id_2)