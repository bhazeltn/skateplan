"""PATCH /api/skaters/{skater_id} — profile editing permission + persistence.

A plan-editor (primary coach) may edit identity + profile fields; skaters and
viewer co-coaches are blocked (403); an unknown federation_id is rejected.
Personas mirror ``test_goal_write_permission.py``.
"""
from sqlalchemy import select

from app.models.enums import DisciplineType, RoleInUnit, SystemRole
from app.models.federation import Federation
from app.models.training import CoachAssignment, TrainingUnit, TrainingUnitRoster
from app.models.user import SkaterProfile, User

PW = "Secret123!"


def _login(client, email, password=PW):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def _federation(db) -> Federation:
    name = "Skater Edit Federation"
    existing = db.execute(
        select(Federation).where(Federation.name == name)
    ).scalar_one_or_none()
    if existing is not None:
        return existing
    fed = Federation(name=name, code="SEF-T", iso_code="ca")
    db.add(fed)
    db.commit()
    db.refresh(fed)
    return fed


def _primary_coach(db, make_user, sfx):
    """Primary coach + placeholder skater + unit/roster/assignment."""
    coach = make_user(f"pce{sfx}@ex.com", role=SystemRole.coach)
    skater = User(
        email=f"phe-{sfx}@placeholder.skateplan.local", password_hash="",
        system_role=SystemRole.athlete, first_name="Sky", last_name="Ater",
        is_account_active=False,
    )
    db.add(skater)
    db.commit()
    db.refresh(skater)
    db.add(SkaterProfile(skater_id=skater.id, competitive_level="Novice"))
    unit = TrainingUnit(
        discipline_type=DisciplineType.singles, unit_name=f"Ue{sfx}", is_active=True
    )
    db.add(unit)
    db.commit()
    db.refresh(unit)
    db.add(TrainingUnitRoster(training_unit_id=unit.training_unit_id, skater_id=skater.id))
    db.add(CoachAssignment(
        coach_user_id=coach.id, training_unit_id=unit.training_unit_id,
        role_in_unit=RoleInUnit.primary, permission_level="primary",
    ))
    db.commit()
    return coach, skater, unit


def _viewer_coach(db, make_user, unit, sfx):
    """Second coach assigned to the same unit with viewer permission."""
    coach = make_user(f"vce{sfx}@ex.com", role=SystemRole.coach)
    db.add(CoachAssignment(
        coach_user_id=coach.id, training_unit_id=unit.training_unit_id,
        role_in_unit=RoleInUnit.choreographer, permission_level="viewer",
    ))
    db.commit()
    return coach


def test_primary_coach_updates_level_federation_and_name(client, make_user, db):
    coach, skater, _unit = _primary_coach(db, make_user, "1")
    fed = _federation(db)
    ct = _login(client, "pce1@ex.com")

    r = client.patch(
        f"/api/skaters/{skater.id}", headers=_hdr(ct),
        json={
            "full_name": "Maya Petrova",
            "competitive_level": "Senior",
            "federation_id": fed.id,
            "contact_email": "maya@ex.com",
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["first_name"] == "Maya"
    assert body["last_name"] == "Petrova"
    assert body["competitive_level"] == "Senior"
    assert body["federation_name"] == fed.name

    db.expire_all()
    profile = db.get(SkaterProfile, skater.id)
    assert profile.competitive_level == "Senior"
    assert profile.federation_id == fed.id
    assert profile.contact_email == "maya@ex.com"
    assert db.get(User, skater.id).first_name == "Maya"


def test_viewer_cocoach_forbidden(client, make_user, db):
    _coach, skater, unit = _primary_coach(db, make_user, "2")
    _viewer_coach(db, make_user, unit, "2")
    vt = _login(client, "vce2@ex.com")
    r = client.patch(
        f"/api/skaters/{skater.id}", headers=_hdr(vt),
        json={"competitive_level": "Junior"},
    )
    assert r.status_code == 403, r.text


def test_invalid_federation_id_rejected(client, make_user, db):
    _coach, skater, _unit = _primary_coach(db, make_user, "3")
    ct = _login(client, "pce3@ex.com")
    r = client.patch(
        f"/api/skaters/{skater.id}", headers=_hdr(ct),
        json={"federation_id": 999999},
    )
    assert r.status_code in (404, 422), r.text
