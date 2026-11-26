"""Multi-role access control, invites & permission enforcement tests.

Personas are built on the ORM: a primary coach (CoachAssignment
``permission_level="primary"``) on a unit rostering a placeholder skater;
invites/links then drive viewer/collaborator/skater personas via the APIs.
"""
from datetime import datetime, timedelta, timezone

from app.models.enums import DisciplineType, RoleInUnit, SystemRole
from app.models.skater_invite import SkaterInvite
from app.models.training import CoachAssignment, TrainingUnit, TrainingUnitRoster
from app.models.user import SkaterProfile, User

PW = "Secret123!"


def _login(client, email, password=PW):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def _placeholder_skater(db, sfx, dob=None):
    skater = User(
        email=f"ph-{sfx}@placeholder.skateplan.local", password_hash="",
        system_role=SystemRole.athlete, first_name="Sky", last_name="Ater",
        is_account_active=False,
    )
    db.add(skater)
    db.commit()
    db.refresh(skater)
    db.add(SkaterProfile(skater_id=skater.id, date_of_birth=dob))
    db.commit()
    return skater


def _setup(db, make_user, sfx, dob=None):
    """Primary coach + placeholder skater + unit/roster/assignment."""
    coach = make_user(f"pc{sfx}@ex.com", role=SystemRole.coach)
    skater = _placeholder_skater(db, sfx, dob)
    unit = TrainingUnit(
        discipline_type=DisciplineType.singles, unit_name=f"U{sfx}", is_active=True
    )
    db.add(unit)
    db.commit()
    db.refresh(unit)
    db.add(TrainingUnitRoster(training_unit_id=unit.training_unit_id, skater_id=skater.id))
    db.add(
        CoachAssignment(
            coach_user_id=coach.id,
            training_unit_id=unit.training_unit_id,
            role_in_unit=RoleInUnit.primary,
            permission_level="primary",
        )
    )
    db.commit()
    return coach, skater


def _plan_payload(**over):
    base = {
        "season_label": "2026-27", "title": "Season", "start_date": "2026-05-01",
        "end_date": "2027-04-30", "primary_goal": "Nationals", "notes": "n",
    }
    base.update(over)
    return base


def _program_payload(skater_id):
    return {
        "skater_id": skater_id, "program_type": "FS", "title": "FS 2026",
        "season": "2025-26", "music_duration_seconds": 240, "segment_bonus": 0.5,
        "program_elements": [],
    }


def _session_payload(skater_id):
    return {
        "skater_id": skater_id, "session_date": "2026-01-15",
        "session_type": "on_ice", "duration_minutes": 60, "rpe": 7,
    }


def test_skater_invite_accept_and_capabilities(client, make_user, db):
    coach, skater = _setup(db, make_user, "1")
    ct = _login(client, "pc1@ex.com")
    sid = skater.id
    plan = client.post(f"/api/skaters/{sid}/ytp", headers=_hdr(ct), json=_plan_payload())
    assert plan.status_code == 201, plan.text

    inv = client.post(
        f"/api/skaters/{sid}/access/invites", headers=_hdr(ct),
        json={"email": "newskater@ex.com", "role": "skater"},
    )
    assert inv.status_code == 201, inv.text
    assert inv.json()["status"] == "invited"
    token = inv.json()["token"]

    pub = client.get(f"/api/auth/invites/{token}")
    assert pub.status_code == 200
    assert pub.json()["target_role"] == "skater"

    acc = client.post(
        "/api/auth/accept-invite",
        json={"token": token, "full_name": "New Skater", "password": "NewPass123"},
    )
    assert acc.status_code == 200, acc.text
    st = acc.json()["access_token"]

    assert client.get(f"/api/skaters/{sid}/ytp", headers=_hdr(st)).status_code == 200
    assert client.get(f"/api/skaters/{sid}/benchmarks", headers=_hdr(st)).status_code == 200
    g = client.post(f"/api/skaters/{sid}/goals", headers=_hdr(st), json={"title": "Land 3A"})
    assert g.status_code == 201, g.text
    pg = client.patch(
        f"/api/skaters/{sid}/goals/{g.json()['id']}", headers=_hdr(st),
        json={"status": "achieved"},
    )
    assert pg.status_code == 200
    assert client.post("/api/sessions", headers=_hdr(st), json=_session_payload(sid)).status_code == 201
    assert client.post(f"/api/skaters/{sid}/ytp", headers=_hdr(st), json=_plan_payload()).status_code == 403
    assert client.post(
        f"/api/skaters/{sid}/benchmarks", headers=_hdr(st), json={"category": "Jumps", "name": "3Lz"}
    ).status_code == 201
    assert client.post("/api/programs", headers=_hdr(st), json=_program_payload(sid)).status_code == 403
    assert client.get(f"/api/skaters/{sid}/access", headers=_hdr(st)).status_code == 403


def test_cocoach_viewer_then_collaborator(client, make_user, db):
    coach, skater = _setup(db, make_user, "2")
    ct = _login(client, "pc2@ex.com")
    sid = skater.id
    make_user("cocoach2@ex.com", role=SystemRole.coach)

    linked = client.post(
        f"/api/skaters/{sid}/access/invites", headers=_hdr(ct),
        json={"email": "cocoach2@ex.com", "role": "viewer"},
    )
    assert linked.status_code == 201, linked.text
    assert linked.json()["status"] == "linked"
    vt = _login(client, "cocoach2@ex.com")

    assert client.get(f"/api/skaters/{sid}/benchmarks", headers=_hdr(vt)).status_code == 200
    assert client.post("/api/sessions", headers=_hdr(vt), json=_session_payload(sid)).status_code == 201
    assert client.post(f"/api/skaters/{sid}/ytp", headers=_hdr(vt), json=_plan_payload()).status_code == 403
    assert client.post(
        f"/api/skaters/{sid}/benchmarks", headers=_hdr(vt), json={"category": "J", "name": "3Lz"}
    ).status_code == 403
    assert client.post(f"/api/skaters/{sid}/goals", headers=_hdr(vt), json={"title": "x"}).status_code == 403

    cocoach_id = linked.json()["coach_user_id"]
    patch = client.patch(
        f"/api/skaters/{sid}/access/coaches/{cocoach_id}", headers=_hdr(ct),
        json={"role": "collaborator"},
    )
    assert patch.status_code == 200, patch.text

    assert client.post(f"/api/skaters/{sid}/ytp", headers=_hdr(vt), json=_plan_payload()).status_code == 201
    assert client.post(
        f"/api/skaters/{sid}/benchmarks", headers=_hdr(vt), json={"category": "J", "name": "3F"}
    ).status_code == 201
    assert client.post(f"/api/skaters/{sid}/goals", headers=_hdr(vt), json={"title": "y"}).status_code == 201
    assert client.get(f"/api/skaters/{sid}/access", headers=_hdr(vt)).status_code == 403


def test_invite_lifecycle_errors(client, make_user, db):
    coach, skater = _setup(db, make_user, "4")
    ct = _login(client, "pc4@ex.com")
    sid = skater.id

    now = datetime.now(timezone.utc)
    db.add_all([
        SkaterInvite(token="expired-tok", email="a@ex.com", skater_id=sid,
                     target_role="viewer", expires_at=now - timedelta(days=1)),
        SkaterInvite(token="accepted-tok", email="b@ex.com", skater_id=sid,
                     target_role="viewer", expires_at=now + timedelta(days=1), accepted_at=now),
    ])
    db.commit()

    assert client.get("/api/auth/invites/expired-tok").status_code == 410
    assert client.get("/api/auth/invites/accepted-tok").status_code == 410
    assert client.post(
        "/api/auth/accept-invite",
        json={"token": "expired-tok", "full_name": "A B", "password": "GoodPass1"},
    ).status_code == 410

    created = client.post(
        f"/api/skaters/{sid}/access/invites", headers=_hdr(ct),
        json={"email": "c@ex.com", "role": "skater"},
    ).json()
    assert client.delete(
        f"/api/skaters/{sid}/access/invites/{created['invite_id']}", headers=_hdr(ct)
    ).status_code == 204
    assert client.post(
        "/api/auth/accept-invite",
        json={"token": created["token"], "full_name": "C D", "password": "GoodPass1"},
    ).status_code == 404


def test_access_me_per_persona(client, make_user, db):
    coach, skater = _setup(db, make_user, "5")
    ct = _login(client, "pc5@ex.com")
    sid = skater.id

    me = client.get(f"/api/skaters/{sid}/access/me", headers=_hdr(ct)).json()
    assert me["role"] == "primary_coach"
    assert me["can_edit_plan"] and me["can_manage_access"]

    make_user("cocoach5@ex.com", role=SystemRole.coach)
    client.post(
        f"/api/skaters/{sid}/access/invites", headers=_hdr(ct),
        json={"email": "cocoach5@ex.com", "role": "viewer"},
    )
    vt = _login(client, "cocoach5@ex.com")
    vme = client.get(f"/api/skaters/{sid}/access/me", headers=_hdr(vt)).json()
    assert vme["role"] == "viewer"
    assert vme["can_log_training"] and not vme["can_edit_goals"] and not vme["can_edit_plan"]

    make_user("stranger5@ex.com", role=SystemRole.coach)
    stt = _login(client, "stranger5@ex.com")
    assert client.get(f"/api/skaters/{sid}/access/me", headers=_hdr(stt)).status_code == 403


def test_change_password(client, make_user, db):
    make_user("cp@ex.com", role=SystemRole.coach)
    token = _login(client, "cp@ex.com")

    bad = client.post(
        "/api/auth/change-password", headers=_hdr(token),
        json={"current_password": "wrongpass", "new_password": "BrandNew123"},
    )
    assert bad.status_code == 400

    short = client.post(
        "/api/auth/change-password", headers=_hdr(token),
        json={"current_password": PW, "new_password": "short"},
    )
    assert short.status_code == 422

    ok = client.post(
        "/api/auth/change-password", headers=_hdr(token),
        json={"current_password": PW, "new_password": "BrandNew123"},
    )
    assert ok.status_code == 200
    assert client.post("/api/auth/login", json={"email": "cp@ex.com", "password": "BrandNew123"}).status_code == 200
    assert client.post("/api/auth/login", json={"email": "cp@ex.com", "password": PW}).status_code == 401
