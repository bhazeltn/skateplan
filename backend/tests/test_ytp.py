"""Yearly Training Plan (YTP) API tests (backend-only).

Plan+phase CRUD, newest-season-first listing, phases ordered by start_date asc,
cascade deletes, date/RPE validation, benchmark linking with cross-skater
ownership checks, and SafeSport authorization. Coaches use the admin role so
``authorize_skater_access`` grants; an unassigned ``coach`` user and an unrelated
athlete drive the 403 cases.
"""
import uuid

from app.models.enums import SystemRole

PW = "ytppw1234"


def _login(client, email, password=PW):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    return r.json()["access_token"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def _coach(client, make_user, suffix):
    make_user(f"ytpco{suffix}@ex.com", password=PW, role=SystemRole.admin)
    return _login(client, f"ytpco{suffix}@ex.com")


def _skater(make_user, suffix):
    return make_user(f"ytpsk{suffix}@ex.com", password=PW, role=SystemRole.athlete)


def _plan_payload(**overrides):
    payload = {
        "season_label": "2026-27", "title": "Senior Competitive Season",
        "start_date": "2026-05-01", "end_date": "2027-04-30",
        "primary_goal": "Qualify for nationals", "notes": "Macrocycle overview",
    }
    payload.update(overrides)
    return payload


def _phase_payload(**overrides):
    payload = {
        "name": "General Prep", "phase_type": "general_prep",
        "start_date": "2026-05-01", "end_date": "2026-07-31",
        "target_on_ice_hours_per_week": 8.5, "target_off_ice_hours_per_week": 4.0,
        "target_rpe": 6, "intensity_level": "moderate", "primary_focus": "Aerobic base",
    }
    payload.update(overrides)
    return payload


def _create_plan(client, token, skater_id, **overrides):
    resp = client.post(f"/api/skaters/{skater_id}/ytp", headers=_hdr(token),
                       json=_plan_payload(**overrides))
    assert resp.status_code == 201, resp.text
    return resp.json()


def _create_phase(client, token, plan_id, **overrides):
    resp = client.post(f"/api/ytp/plans/{plan_id}/phases", headers=_hdr(token),
                       json=_phase_payload(**overrides))
    assert resp.status_code == 201, resp.text
    return resp.json()


def _make_benchmark(client, token, skater_id, name="3Lz"):
    resp = client.post(f"/api/skaters/{skater_id}/benchmarks", headers=_hdr(token),
                       json={"category": "Jumps", "name": name})
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


# --- Plan CRUD ------------------------------------------------------------
def test_create_plan_returns_201(client, make_user):
    token = _coach(client, make_user, "1")
    body = _create_plan(client, token, _skater(make_user, "1").id)
    assert body["id"] and body["season_label"] == "2026-27" and body["phases"] == []


def test_list_plans_newest_season_first(client, make_user):
    token = _coach(client, make_user, "2")
    sk = _skater(make_user, "2")
    _create_plan(client, token, sk.id, season_label="2025-26",
                 start_date="2025-05-01", end_date="2026-04-30")
    _create_plan(client, token, sk.id, season_label="2026-27",
                 start_date="2026-05-01", end_date="2027-04-30")
    resp = client.get(f"/api/skaters/{sk.id}/ytp", headers=_hdr(token))
    assert resp.status_code == 200, resp.text
    assert [p["season_label"] for p in resp.json()] == ["2026-27", "2025-26"]


def test_update_plan_metadata(client, make_user):
    token = _coach(client, make_user, "3")
    plan = _create_plan(client, token, _skater(make_user, "3").id)
    resp = client.patch(f"/api/ytp/plans/{plan['id']}", headers=_hdr(token),
                        json={"title": "Revised Title"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["title"] == "Revised Title"
    assert resp.json()["season_label"] == "2026-27"


def test_patch_missing_plan_returns_404(client, make_user):
    token = _coach(client, make_user, "4")
    resp = client.patch(f"/api/ytp/plans/{uuid.uuid4()}", headers=_hdr(token),
                        json={"title": "x"})
    assert resp.status_code == 404


def test_delete_plan_cascades_phases(client, make_user):
    token = _coach(client, make_user, "5")
    sk = _skater(make_user, "5")
    plan = _create_plan(client, token, sk.id)
    phase = _create_phase(client, token, plan["id"])
    assert client.delete(f"/api/ytp/plans/{plan['id']}",
                         headers=_hdr(token)).status_code == 204
    assert client.patch(f"/api/ytp/phases/{phase['id']}", headers=_hdr(token),
                        json={"name": "x"}).status_code == 404
    assert client.get(f"/api/skaters/{sk.id}/ytp", headers=_hdr(token)).json() == []


# --- Phase CRUD -----------------------------------------------------------
def test_create_phase_with_targets(client, make_user):
    token = _coach(client, make_user, "6")
    plan = _create_plan(client, token, _skater(make_user, "6").id)
    phase = _create_phase(client, token, plan["id"])
    assert phase["target_on_ice_hours_per_week"] == 8.5
    assert phase["target_rpe"] == 6 and phase["benchmark_ids"] == []


def test_phases_nested_ordered_by_start_date(client, make_user):
    token = _coach(client, make_user, "7")
    sk = _skater(make_user, "7")
    plan = _create_plan(client, token, sk.id)
    _create_phase(client, token, plan["id"], name="Later",
                  start_date="2026-09-01", end_date="2026-10-31")
    _create_phase(client, token, plan["id"], name="Earlier",
                  start_date="2026-05-01", end_date="2026-06-30")
    plans = client.get(f"/api/skaters/{sk.id}/ytp", headers=_hdr(token)).json()
    assert [ph["name"] for ph in plans[0]["phases"]] == ["Earlier", "Later"]


def test_update_and_delete_phase(client, make_user):
    token = _coach(client, make_user, "8")
    plan = _create_plan(client, token, _skater(make_user, "8").id)
    phase = _create_phase(client, token, plan["id"])
    upd = client.patch(f"/api/ytp/phases/{phase['id']}", headers=_hdr(token),
                       json={"target_rpe": 9})
    assert upd.status_code == 200, upd.text
    assert upd.json()["target_rpe"] == 9
    assert client.delete(f"/api/ytp/phases/{phase['id']}",
                         headers=_hdr(token)).status_code == 204


# --- Validation -----------------------------------------------------------
def test_plan_end_before_start_422(client, make_user):
    token = _coach(client, make_user, "9")
    resp = client.post(
        f"/api/skaters/{_skater(make_user, '9').id}/ytp", headers=_hdr(token),
        json=_plan_payload(start_date="2026-05-01", end_date="2026-04-01"))
    assert resp.status_code == 422


def test_phase_end_before_start_422(client, make_user):
    token = _coach(client, make_user, "10")
    plan = _create_plan(client, token, _skater(make_user, "10").id)
    resp = client.post(
        f"/api/ytp/plans/{plan['id']}/phases", headers=_hdr(token),
        json=_phase_payload(start_date="2026-07-01", end_date="2026-06-01"))
    assert resp.status_code == 422


def test_phase_rpe_out_of_range_422(client, make_user):
    token = _coach(client, make_user, "11")
    plan = _create_plan(client, token, _skater(make_user, "11").id)
    resp = client.post(f"/api/ytp/plans/{plan['id']}/phases", headers=_hdr(token),
                       json=_phase_payload(target_rpe=11))
    assert resp.status_code == 422


# --- Benchmark linking ----------------------------------------------------
def test_phase_links_benchmarks(client, make_user):
    token = _coach(client, make_user, "12")
    sk = _skater(make_user, "12")
    plan = _create_plan(client, token, sk.id)
    bid = _make_benchmark(client, token, sk.id)
    phase = _create_phase(client, token, plan["id"], benchmark_ids=[bid])
    assert phase["benchmark_ids"] == [bid]
    plans = client.get(f"/api/skaters/{sk.id}/ytp", headers=_hdr(token)).json()
    assert plans[0]["phases"][0]["benchmark_ids"] == [bid]


def test_patch_phase_replaces_benchmarks(client, make_user):
    token = _coach(client, make_user, "13")
    sk = _skater(make_user, "13")
    plan = _create_plan(client, token, sk.id)
    bid1 = _make_benchmark(client, token, sk.id, name="3Lz")
    bid2 = _make_benchmark(client, token, sk.id, name="3F")
    phase = _create_phase(client, token, plan["id"], benchmark_ids=[bid1])
    upd = client.patch(f"/api/ytp/phases/{phase['id']}", headers=_hdr(token),
                       json={"benchmark_ids": [bid2]})
    assert upd.status_code == 200, upd.text
    assert upd.json()["benchmark_ids"] == [bid2]


def test_phase_rejects_benchmark_of_other_skater_400(client, make_user):
    token = _coach(client, make_user, "14")
    plan = _create_plan(client, token, _skater(make_user, "14").id)
    foreign_bid = _make_benchmark(client, token, _skater(make_user, "14b").id)
    resp = client.post(f"/api/ytp/plans/{plan['id']}/phases", headers=_hdr(token),
                       json=_phase_payload(benchmark_ids=[foreign_bid]))
    assert resp.status_code == 400


def test_deleting_benchmark_cascades_link(client, make_user):
    token = _coach(client, make_user, "15")
    sk = _skater(make_user, "15")
    plan = _create_plan(client, token, sk.id)
    bid = _make_benchmark(client, token, sk.id)
    _create_phase(client, token, plan["id"], benchmark_ids=[bid])
    assert client.delete(f"/api/skaters/{sk.id}/benchmarks/{bid}",
                         headers=_hdr(token)).status_code == 204
    resp = client.get(f"/api/skaters/{sk.id}/ytp", headers=_hdr(token))
    assert resp.status_code == 200
    assert resp.json()[0]["phases"][0]["benchmark_ids"] == []


# --- Authorization --------------------------------------------------------
def test_unrelated_user_forbidden_on_get(client, make_user):
    token = _coach(client, make_user, "16")
    sk = _skater(make_user, "16")
    _create_plan(client, token, sk.id)
    make_user("ytpintrude@ex.com", password=PW, role=SystemRole.athlete)
    itoken = _login(client, "ytpintrude@ex.com")
    assert client.get(f"/api/skaters/{sk.id}/ytp",
                      headers=_hdr(itoken)).status_code == 403


def test_unassigned_coach_forbidden_on_write(client, make_user):
    token = _coach(client, make_user, "17")
    plan = _create_plan(client, token, _skater(make_user, "17").id)
    make_user("ytpcoach2@ex.com", password=PW, role=SystemRole.coach)
    ctoken = _login(client, "ytpcoach2@ex.com")
    assert client.patch(f"/api/ytp/plans/{plan['id']}", headers=_hdr(ctoken),
                        json={"title": "x"}).status_code == 403
    assert client.post(f"/api/ytp/plans/{plan['id']}/phases", headers=_hdr(ctoken),
                       json=_phase_payload()).status_code == 403
