"""SMART-goal (benchmark) write-permission tests.

A skater (``can_edit_goals`` true, ``can_edit_plan`` false) may create and
update their own SMART goals on the benchmarks endpoint, but must still be
blocked from deleting one (plan-editor only) and from editing the gap analysis
(coach only). Viewers (``can_edit_goals`` false) cannot write goals at all.
Personas mirror ``test_skater_access.py`` (invite + accept-invite flow).
"""
from app.models.enums import DisciplineType, RoleInUnit, SystemRole
from app.models.training import CoachAssignment, TrainingUnit, TrainingUnitRoster
from app.models.user import SkaterProfile, User

PW = "Secret123!"


def _login(client, email, password=PW):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def _primary_coach(db, make_user, sfx):
    """Primary coach + placeholder skater + unit/roster/assignment."""
    coach = make_user(f"pcg{sfx}@ex.com", role=SystemRole.coach)
    skater = User(
        email=f"phg-{sfx}@placeholder.skateplan.local", password_hash="",
        system_role=SystemRole.athlete, first_name="Sky", last_name="Ater",
        is_account_active=False,
    )
    db.add(skater)
    db.commit()
    db.refresh(skater)
    db.add(SkaterProfile(skater_id=skater.id, date_of_birth=None))
    unit = TrainingUnit(
        discipline_type=DisciplineType.singles, unit_name=f"Ug{sfx}", is_active=True
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
    return coach, skater


def _persona_token(client, ct, sid, email, role):
    """Invite a persona for the skater and return its access token."""
    inv = client.post(
        f"/api/skaters/{sid}/access/invites", headers=_hdr(ct),
        json={"email": email, "role": role},
    )
    assert inv.status_code == 201, inv.text
    if inv.json()["status"] == "linked":
        return _login(client, email)
    acc = client.post(
        "/api/auth/accept-invite",
        json={"token": inv.json()["token"], "full_name": "P Q", "password": "NewPass123"},
    )
    assert acc.status_code == 200, acc.text
    return acc.json()["access_token"]


def test_skater_can_create_and_update_smart_goal(client, make_user, db):
    coach, skater = _primary_coach(db, make_user, "s1")
    ct = _login(client, "pcgs1@ex.com")
    sid = skater.id
    st = _persona_token(client, ct, sid, "goalskater1@ex.com", "skater")

    created = client.post(
        f"/api/skaters/{sid}/benchmarks", headers=_hdr(st),
        json={"category": "Jumps", "name": "Land 3A", "action_plan": "reps",
              "success_criteria": "3 of 5 clean"},
    )
    assert created.status_code == 201, created.text
    bid = created.json()["id"]

    updated = client.patch(
        f"/api/skaters/{sid}/benchmarks/{bid}", headers=_hdr(st),
        json={"status": "DEVELOPING"},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["status"] == "DEVELOPING"


def test_skater_blocked_from_delete_and_gap_analysis(client, make_user, db):
    coach, skater = _primary_coach(db, make_user, "s2")
    ct = _login(client, "pcgs2@ex.com")
    sid = skater.id
    st = _persona_token(client, ct, sid, "goalskater2@ex.com", "skater")

    created = client.post(
        f"/api/skaters/{sid}/benchmarks", headers=_hdr(st),
        json={"category": "Jumps", "name": "Land 3A"},
    )
    assert created.status_code == 201, created.text
    bid = created.json()["id"]

    # DELETE stays plan-editor only (require_skater_editor) -> 403 for the skater.
    assert client.delete(
        f"/api/skaters/{sid}/benchmarks/{bid}", headers=_hdr(st)
    ).status_code == 403
    # Gap-analysis writes are coach-only -> 403 for the skater.
    assert client.post(
        f"/api/skaters/{sid}/gap-analysis", headers=_hdr(st),
        json={"benchmark_framework": "F", "pillar_scores": {"technical": "Acquiring"}},
    ).status_code == 403


def test_viewer_blocked_from_goal_write(client, make_user, db):
    coach, skater = _primary_coach(db, make_user, "s3")
    ct = _login(client, "pcgs3@ex.com")
    sid = skater.id
    vt = _persona_token(client, ct, sid, "goalviewer3@ex.com", "viewer")

    assert client.post(
        f"/api/skaters/{sid}/benchmarks", headers=_hdr(vt),
        json={"category": "Jumps", "name": "3Lz"},
    ).status_code == 403
