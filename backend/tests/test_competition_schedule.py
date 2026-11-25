"""Roster-schedule read endpoint tests (consolidated competition roster view).

TDD: these were written RED before the schema/route existed. The endpoint
returns, per competition, the authorized skaters entered in it. Scoping mirrors
the coach-roster join used elsewhere; unauthorized skaters are never leaked.
"""
from datetime import date

from app.models.competition import Competition, CompetitionEntry
from app.models.enums import RoleInUnit, SystemRole
from app.models.training import CoachAssignment, TrainingUnit, TrainingUnitRoster
from app.models.user import SkaterProfile

URL = "/api/competitions/roster-schedule"


def _login(client, email, password="Coach123!"):
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


def _comp(db, name, start):
    comp = Competition(name=name, start_date=start, city="Toronto", country="Canada")
    db.add(comp)
    db.flush()
    return comp


def _entry(db, comp, skater, status="registered"):
    db.add(CompetitionEntry(competition_id=comp.id, skater_id=skater.id, status=status))


def _scenario(db, make_user):
    """Coach A with two skaters, Coach B with one, across shared/separate comps."""
    coach_a = make_user("ca@ex.com", password="Coach123!", role=SystemRole.coach)
    coach_b = make_user("cb@ex.com", password="Coach123!", role=SystemRole.coach)
    s1 = _roster_skater(db, make_user, coach_a, "s1@ex.com", "Ava", "Adams")
    s2 = _roster_skater(db, make_user, coach_a, "s2@ex.com", "Bea", "Brown")
    s3 = _roster_skater(db, make_user, coach_b, "s3@ex.com", "Cara", "Clark")
    alpha = _comp(db, "Alpha Open", date(2025, 1, 1))
    shared = _comp(db, "Shared Cup", date(2025, 2, 1))
    zeta = _comp(db, "Zeta Final", date(2025, 3, 1))
    _comp(db, "Beta Meet", date(2025, 1, 15))  # catalog comp, no entries
    _entry(db, alpha, s1)
    _entry(db, shared, s1)
    _entry(db, shared, s2)
    _entry(db, shared, s3)  # different coach's skater -> must never leak
    _entry(db, zeta, s2)
    db.commit()
    return {"s1": s1, "s2": s2, "s3": s3}


def test_coach_sees_consolidated_roster_ordered(client, make_user, db):
    ids = _scenario(db, make_user)
    token = _login(client, "ca@ex.com")
    resp = client.get(URL, headers=_hdr(token))
    assert resp.status_code == 200, resp.text
    comps = resp.json()
    # Ordered by start_date asc; Beta Meet (no authorized entries) excluded.
    assert [c["name"] for c in comps] == ["Alpha Open", "Shared Cup", "Zeta Final"]
    shared = next(c for c in comps if c["name"] == "Shared Cup")
    # Both of coach A's skaters appear, ordered by skater_name asc.
    assert [e["skater_name"] for e in shared["entries"]] == ["Ava Adams", "Bea Brown"]
    # Coach B's skater (s3) is never present.
    assert ids["s3"].id not in {e["skater_id"] for e in shared["entries"]}


def test_other_coachs_skater_not_leaked(client, make_user, db):
    ids = _scenario(db, make_user)
    token = _login(client, "ca@ex.com")
    # include_empty=false: only competitions with >=1 authorized entry.
    body = client.get(URL, headers=_hdr(token)).json()
    assert "Beta Meet" not in [c["name"] for c in body]
    # include_empty=true: catalog comp appears with empty entries; s3 still hidden.
    body = client.get(URL, params={"include_empty": True}, headers=_hdr(token)).json()
    names = [c["name"] for c in body]
    assert "Beta Meet" in names
    beta = next(c for c in body if c["name"] == "Beta Meet")
    assert beta["entries"] == []
    all_skater_ids = {e["skater_id"] for c in body for e in c["entries"]}
    assert ids["s3"].id not in all_skater_ids


def test_skater_id_filter_narrows(client, make_user, db):
    ids = _scenario(db, make_user)
    token = _login(client, "ca@ex.com")
    resp = client.get(URL, params={"skater_id": ids["s1"].id}, headers=_hdr(token))
    assert resp.status_code == 200, resp.text
    comps = resp.json()
    assert [c["name"] for c in comps] == ["Alpha Open", "Shared Cup"]
    shared = next(c for c in comps if c["name"] == "Shared Cup")
    assert [e["skater_id"] for e in shared["entries"]] == [ids["s1"].id]


def test_unauthorized_skater_id_forbidden(client, make_user, db):
    ids = _scenario(db, make_user)
    token = _login(client, "ca@ex.com")
    resp = client.get(URL, params={"skater_id": ids["s3"].id}, headers=_hdr(token))
    assert resp.status_code == 403, resp.text


def test_requires_authentication(client):
    assert client.get(URL).status_code == 401
