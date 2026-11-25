"""Competition editing (PATCH) tests.

TDD: written RED before CompetitionUpdate / PATCH /competitions/{id} existed.
A coach can partially edit a competition's name/dates/city/country; the
roster-schedule read then reflects the new values and the recomputed location
(", ".join of city/country). Date ordering is validated (end >= start -> 422).
"""
from datetime import date

from app.models.competition import Competition, CompetitionEntry
from app.models.enums import RoleInUnit, SystemRole
from app.models.training import CoachAssignment, TrainingUnit, TrainingUnitRoster
from app.models.user import SkaterProfile

SCHEDULE_URL = "/api/competitions/roster-schedule"


def _login(client, email, password="pw-secret-123"):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    return r.json()["access_token"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def _roster_skater(db, make_user, coach, email, first, last):
    skater = make_user(email, role=SystemRole.athlete, first=first, last=last)
    db.add(SkaterProfile(skater_id=skater.id, date_of_birth=date(2005, 1, 1)))
    unit = TrainingUnit(unit_name=f"Unit-{email}", is_active=True)
    db.add(unit)
    db.flush()
    db.add(TrainingUnitRoster(training_unit_id=unit.training_unit_id, skater_id=skater.id))
    db.add(CoachAssignment(coach_user_id=coach.id, training_unit_id=unit.training_unit_id,
                           role_in_unit=RoleInUnit.primary))
    db.commit()
    return skater


def _scenario(db, make_user):
    coach = make_user("coach@ex.com", password="pw-secret-123", role=SystemRole.coach)
    skater = _roster_skater(db, make_user, coach, "sk@ex.com", "Ava", "Adams")
    comp = Competition(name="Old Name", start_date=date(2025, 1, 10),
                       end_date=date(2025, 1, 12), city="Toronto", country="Canada")
    db.add(comp)
    db.flush()
    db.add(CompetitionEntry(competition_id=comp.id, skater_id=skater.id, status="registered"))
    db.commit()
    return comp


def test_coach_patch_updates_fields_and_reflects_in_schedule(client, make_user, db):
    comp = _scenario(db, make_user)
    token = _login(client, "coach@ex.com")
    payload = {
        "name": "New Name",
        "start_date": "2025-02-01",
        "end_date": "2025-02-03",
        "city": "Ottawa",
        "country": "Canada",
    }
    resp = client.patch(f"/api/competitions/{comp.id}", json=payload, headers=_hdr(token))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["name"] == "New Name"
    assert body["city"] == "Ottawa"
    sched = client.get(SCHEDULE_URL, headers=_hdr(token)).json()
    row = next(c for c in sched if c["id"] == str(comp.id))
    assert row["name"] == "New Name"
    assert row["start_date"] == "2025-02-01"
    assert row["end_date"] == "2025-02-03"
    assert row["city"] == "Ottawa"
    assert row["country"] == "Canada"
    assert row["location"] == "Ottawa, Canada"


def test_partial_patch_recomputes_location(client, make_user, db):
    comp = _scenario(db, make_user)
    token = _login(client, "coach@ex.com")
    resp = client.patch(f"/api/competitions/{comp.id}", json={"city": "Montreal"},
                        headers=_hdr(token))
    assert resp.status_code == 200, resp.text
    sched = client.get(SCHEDULE_URL, headers=_hdr(token)).json()
    row = next(c for c in sched if c["id"] == str(comp.id))
    assert row["location"] == "Montreal, Canada"


def test_end_before_start_returns_422(client, make_user, db):
    comp = _scenario(db, make_user)
    token = _login(client, "coach@ex.com")
    resp = client.patch(f"/api/competitions/{comp.id}",
                        json={"end_date": "2025-01-05"}, headers=_hdr(token))
    assert resp.status_code == 422, resp.text


def test_patch_missing_competition_returns_404(client, make_user, db):
    _scenario(db, make_user)
    token = _login(client, "coach@ex.com")
    missing = "00000000-0000-0000-0000-000000000000"
    resp = client.patch(f"/api/competitions/{missing}", json={"name": "X"},
                        headers=_hdr(token))
    assert resp.status_code == 404, resp.text


def test_non_coach_forbidden(client, make_user, db):
    comp = _scenario(db, make_user)
    make_user("athlete@ex.com", password="pw-secret-123", role=SystemRole.athlete)
    token = _login(client, "athlete@ex.com")
    resp = client.patch(f"/api/competitions/{comp.id}", json={"name": "X"},
                        headers=_hdr(token))
    assert resp.status_code == 403, resp.text


def test_unauthenticated_rejected(client, make_user, db):
    comp = _scenario(db, make_user)
    resp = client.patch(f"/api/competitions/{comp.id}", json={"name": "X"})
    assert resp.status_code == 401, resp.text
