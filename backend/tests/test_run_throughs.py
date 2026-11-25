"""Program run-through tracking + consistency analytics (Sprint 5).

Covers: create run-through with nested ordered element_results; list with
program_name/program_segment; cross-skater program -> 400; PATCH partial (keeps
elements) + explicit element replace; mismatched session/run -> 404; DELETE 204
+ element cascade; program-stats aggregation honoring date/program filters;
403 on every route for an unrelated athlete.
"""
import uuid

from sqlalchemy import select

from app.models.enums import SystemRole
from app.models.program import Program
from app.models.run_through import RunThroughElementResult


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


def _run_payload(program_id, **over):
    body = {
        "program_id": str(program_id),
        "run_type": "full",
        "with_music": True,
        "element_results": [
            {"element_order": 2, "element_code": "3F", "outcome": "clean"},
            {"element_order": 1, "element_code": "3Lz", "outcome": "clean"},
        ],
    }
    body.update(over)
    return body


def _create_run(client, token, session_id, program_id, **over):
    resp = client.post(f"/api/sessions/{session_id}/run-throughs",
                       headers=_hdr(token), json=_run_payload(program_id, **over))
    return resp


def test_create_and_list_run_through(client, make_user, db):
    skater = _skater(make_user, "cl")
    token = _coach(client, make_user, "cl")
    prog = _program(db, skater.id)
    sess = _make_session(client, token, skater.id)

    created = _create_run(client, token, sess["id"], prog.id)
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["program_name"] == "Short Program"
    assert body["program_segment"] == "SP"
    assert [e["element_code"] for e in body["element_results"]] == ["3Lz", "3F"]
    assert [e["element_order"] for e in body["element_results"]] == [1, 2]

    listed = client.get(f"/api/sessions/{sess['id']}/run-throughs", headers=_hdr(token))
    assert listed.status_code == 200
    rows = listed.json()
    assert len(rows) == 1
    assert rows[0]["program_name"] == "Short Program"
    assert [e["element_code"] for e in rows[0]["element_results"]] == ["3Lz", "3F"]


def test_program_belonging_to_other_skater_returns_400(client, make_user, db):
    skater = _skater(make_user, "x1")
    other = _skater(make_user, "x2")
    token = _coach(client, make_user, "x")
    other_prog = _program(db, other.id)
    sess = _make_session(client, token, skater.id)
    resp = _create_run(client, token, sess["id"], other_prog.id)
    assert resp.status_code == 400, resp.text


def test_create_on_missing_session_returns_404(client, make_user, db):
    skater = _skater(make_user, "ms")
    token = _coach(client, make_user, "ms")
    prog = _program(db, skater.id)
    resp = _create_run(client, token, uuid.uuid4(), prog.id)
    assert resp.status_code == 404, resp.text


def test_patch_updates_fields_without_wiping_elements(client, make_user, db):
    skater = _skater(make_user, "pa")
    token = _coach(client, make_user, "pa")
    prog = _program(db, skater.id)
    sess = _make_session(client, token, skater.id)
    run = _create_run(client, token, sess["id"], prog.id).json()

    resp = client.patch(f"/api/sessions/{sess['id']}/run-throughs/{run['id']}",
                        headers=_hdr(token), json={"run_type": "half", "notes": "tired"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["run_type"] == "half"
    assert body["notes"] == "tired"
    # elements untouched
    assert [e["element_code"] for e in body["element_results"]] == ["3Lz", "3F"]


def test_patch_replaces_elements_when_provided(client, make_user, db):
    skater = _skater(make_user, "pr")
    token = _coach(client, make_user, "pr")
    prog = _program(db, skater.id)
    sess = _make_session(client, token, skater.id)
    run = _create_run(client, token, sess["id"], prog.id).json()

    resp = client.patch(
        f"/api/sessions/{sess['id']}/run-throughs/{run['id']}", headers=_hdr(token),
        json={"element_results": [
            {"element_order": 1, "element_code": "2A", "outcome": "fall"}]})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert [e["element_code"] for e in body["element_results"]] == ["2A"]
    # cascade: old element rows gone, only the new one persists
    rows = db.execute(select(RunThroughElementResult)).scalars().all()
    assert [r.element_code for r in rows] == ["2A"]


def test_patch_run_in_wrong_session_returns_404(client, make_user, db):
    skater = _skater(make_user, "ws")
    token = _coach(client, make_user, "ws")
    prog = _program(db, skater.id)
    s1 = _make_session(client, token, skater.id)
    s2 = _make_session(client, token, skater.id, session_date="2026-02-01")
    run = _create_run(client, token, s1["id"], prog.id).json()
    resp = client.patch(f"/api/sessions/{s2['id']}/run-throughs/{run['id']}",
                        headers=_hdr(token), json={"run_type": "half"})
    assert resp.status_code == 404, resp.text


def test_delete_cascades_elements(client, make_user, db):
    skater = _skater(make_user, "dl")
    token = _coach(client, make_user, "dl")
    prog = _program(db, skater.id)
    sess = _make_session(client, token, skater.id)
    run = _create_run(client, token, sess["id"], prog.id).json()

    resp = client.delete(f"/api/sessions/{sess['id']}/run-throughs/{run['id']}",
                        headers=_hdr(token))
    assert resp.status_code == 204, resp.text
    assert db.execute(select(RunThroughElementResult)).scalars().all() == []
    listed = client.get(f"/api/sessions/{sess['id']}/run-throughs", headers=_hdr(token))
    assert listed.json() == []


def test_program_stats_aggregation_and_filters(client, make_user, db):
    skater = _skater(make_user, "st")
    token = _coach(client, make_user, "st")
    sp = _program(db, skater.id, title="SP A", segment="SP")
    fs = _program(db, skater.id, title="FS B", segment="FS")
    s1 = _make_session(client, token, skater.id, session_date="2026-01-10")
    s2 = _make_session(client, token, skater.id, session_date="2026-01-20")
    s3 = _make_session(client, token, skater.id, session_date="2026-03-05")
    _create_run(client, token, s1["id"], sp.id)  # full, all clean (3Lz,3F)
    _create_run(client, token, s2["id"], sp.id, run_type="half", element_results=[
        {"element_order": 1, "element_code": "3Lz", "outcome": "fall"}])
    _create_run(client, token, s3["id"], fs.id)  # March - filtered out

    resp = client.get(
        f"/api/skaters/{skater.id}/training/program-stats",
        headers=_hdr(token), params={"start_date": "2026-01-01", "end_date": "2026-01-31"})
    assert resp.status_code == 200, resp.text
    stats = resp.json()
    assert len(stats) == 1
    g = stats[0]
    assert g["program_name"] == "SP A"
    assert g["segment"] == "SP"
    assert g["total_runs"] == 2
    assert g["full_runs"] == 1
    assert g["clean_runs"] == 1
    assert g["overall_clean_percentage"] == 66.7
    es = g["element_stats"]
    assert [e["element_code"] for e in es] == ["3Lz", "3F"]
    assert es[0]["total_attempts"] == 2 and es[0]["clean_count"] == 1
    assert es[0]["clean_percentage"] == 50.0
    assert es[1]["clean_percentage"] == 100.0

    only_fs = client.get(
        f"/api/skaters/{skater.id}/training/program-stats",
        headers=_hdr(token), params={"program_id": str(fs.id)})
    assert only_fs.status_code == 200
    assert [s["program_name"] for s in only_fs.json()] == ["FS B"]


def test_routes_reject_unauthorized(client, make_user, db):
    skater = _skater(make_user, "ua")
    token = _coach(client, make_user, "ua")
    _skater(make_user, "intr")
    intruder = _login(client, "skaterintr@ex.com")
    prog = _program(db, skater.id)
    sess = _make_session(client, token, skater.id)
    run = _create_run(client, token, sess["id"], prog.id).json()

    assert _create_run(client, intruder, sess["id"], prog.id).status_code == 403
    assert client.get(f"/api/sessions/{sess['id']}/run-throughs",
                     headers=_hdr(intruder)).status_code == 403
    assert client.patch(f"/api/sessions/{sess['id']}/run-throughs/{run['id']}",
                       headers=_hdr(intruder), json={"run_type": "half"}).status_code == 403
    assert client.delete(f"/api/sessions/{sess['id']}/run-throughs/{run['id']}",
                        headers=_hdr(intruder)).status_code == 403
    assert client.get(f"/api/skaters/{skater.id}/training/program-stats",
                     headers=_hdr(intruder)).status_code == 403
