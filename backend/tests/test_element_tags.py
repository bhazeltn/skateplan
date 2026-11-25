"""Technical tags + two-tier consistency analytics (clean vs. completed).

A "clean" attempt has outcome=="clean" AND no tags. An otherwise-clean attempt
carrying technical call tags (e.g. "q", "<") counts as COMPLETED-with-calls, not
clean. Covers isolated attempt metrics, PATCH recalculation, and program
run-through aggregation. Reuses the auth/skater/program patterns from
test_training_analytics.py / test_run_throughs.py.
"""
from app.models.enums import SystemRole
from app.models.program import Program


def _login(client, email, password="Secret123!"):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    return r.json()["access_token"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def _coach(client, make_user, suffix):
    make_user(f"coach{suffix}@ex.com", role=SystemRole.admin)
    return _login(client, f"coach{suffix}@ex.com")


def _skater(make_user, suffix):
    return make_user(f"skater{suffix}@ex.com", role=SystemRole.athlete)


def _program(db, skater_id, title="Short Program", segment="SP"):
    prog = Program(skater_id=skater_id, program_type=segment, title=title)
    db.add(prog)
    db.commit()
    db.refresh(prog)
    return prog


def _make_session(client, token, skater_id, **over):
    body = {"skater_id": skater_id, "session_date": "2026-01-15",
            "session_type": "on_ice", "duration_minutes": 60, "rpe": 7}
    body.update(over)
    resp = client.post("/api/sessions", headers=_hdr(token), json=body)
    assert resp.status_code in (200, 201), resp.text
    return resp.json()


def _metrics(client, token, skater_id):
    resp = client.get(
        f"/api/skaters/{skater_id}/training/metrics"
        "?start_date=2026-01-01&end_date=2026-01-31",
        headers=_hdr(token))
    assert resp.status_code == 200, resp.text
    return {e["element_code"]: e for e in resp.json()["element_stats"]}


def test_isolated_attempt_tag_metrics(client, make_user, db):
    skater = _skater(make_user, "tg")
    token = _coach(client, make_user, "tg")
    sess = _make_session(client, token, skater.id)
    client.post(f"/api/sessions/{sess['id']}/attempts", headers=_hdr(token), json=[
        {"element_code": "3A", "outcome": "clean", "attempts_count": 3, "tags": ["q"]},
        {"element_code": "3A", "outcome": "clean", "attempts_count": 1, "tags": []},
        {"element_code": "3A", "outcome": "fall", "attempts_count": 1, "tags": ["<"]},
    ])

    stat = _metrics(client, token, skater.id)["3A"]
    assert stat["total_attempts"] == 5
    assert stat["clean_count"] == 1
    assert stat["with_calls_count"] == 3
    assert stat["clean_percentage"] == 20.0
    assert stat["completed_percentage"] == 80.0
    assert stat["tag_counts"] == {"q": 3, "<": 1}


def test_patch_attempt_tags_persists_and_recalculates(client, make_user, db):
    skater = _skater(make_user, "pt")
    token = _coach(client, make_user, "pt")
    sess = _make_session(client, token, skater.id)
    created = client.post(
        f"/api/sessions/{sess['id']}/attempts", headers=_hdr(token),
        json=[{"element_code": "3Lz", "outcome": "clean", "attempts_count": 1,
               "tags": []}]).json()
    attempt_id = created[0]["id"]

    # Initially a true clean -> 100% clean, no calls.
    stat = _metrics(client, token, skater.id)["3Lz"]
    assert stat["clean_count"] == 1 and stat["with_calls_count"] == 0
    assert stat["clean_percentage"] == 100.0 and stat["completed_percentage"] == 100.0

    patched = client.patch(
        f"/api/sessions/{sess['id']}/attempts/{attempt_id}",
        headers=_hdr(token), json={"tags": ["e"]})
    assert patched.status_code == 200, patched.text
    assert patched.json()["tags"] == ["e"]

    # Now clean-with-calls: clean drops to 0, completed stays 100.
    stat = _metrics(client, token, skater.id)["3Lz"]
    assert stat["clean_count"] == 0
    assert stat["with_calls_count"] == 1
    assert stat["clean_percentage"] == 0.0
    assert stat["completed_percentage"] == 100.0
    assert stat["tag_counts"] == {"e": 1}

    # Removing the tag restores the clean metric.
    client.patch(f"/api/sessions/{sess['id']}/attempts/{attempt_id}",
                 headers=_hdr(token), json={"tags": []})
    stat = _metrics(client, token, skater.id)["3Lz"]
    assert stat["clean_count"] == 1 and stat["with_calls_count"] == 0
    assert stat["tag_counts"] == {}


def test_run_through_tags_affect_consistency(client, make_user, db):
    skater = _skater(make_user, "rt")
    token = _coach(client, make_user, "rt")
    prog = _program(db, skater.id)
    sess = _make_session(client, token, skater.id, session_date="2026-01-10")
    resp = client.post(
        f"/api/sessions/{sess['id']}/run-throughs", headers=_hdr(token),
        json={"program_id": str(prog.id), "run_type": "full", "with_music": True,
              "element_results": [
                  {"element_order": 1, "element_code": "3Lz", "outcome": "clean",
                   "tags": ["q"]},
                  {"element_order": 2, "element_code": "3F", "outcome": "clean",
                   "tags": []}]})
    assert resp.status_code == 201, resp.text
    assert [e["tags"] for e in resp.json()["element_results"]] == [["q"], []]

    stats = client.get(f"/api/skaters/{skater.id}/training/program-stats",
                       headers=_hdr(token)).json()
    assert len(stats) == 1
    g = stats[0]
    # One element carries a call -> the run is NOT clean, but it is completed.
    assert g["clean_runs"] == 0
    assert g["overall_clean_percentage"] == 50.0
    assert g["overall_completed_percentage"] == 100.0
    es = {e["element_code"]: e for e in g["element_stats"]}
    assert es["3Lz"]["clean_count"] == 0
    assert es["3Lz"]["with_calls_count"] == 1
    assert es["3Lz"]["completed_percentage"] == 100.0
    assert es["3Lz"]["tag_counts"] == {"q": 1}
    assert es["3F"]["clean_count"] == 1
    assert es["3F"]["with_calls_count"] == 0
