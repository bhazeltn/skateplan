"""Edit/delete + logged_by_user_id tracking for training logs (Sprint 4 polish).

Covers: create stamps logged_by_user_id; session PATCH (partial, 422, 403);
session DELETE (204 + attempt cascade); attempt PATCH/DELETE (404 cross-session,
403 unauthorized).
"""
from app.models.enums import SystemRole


def _login(client, email, password="Secret123!"):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    return r.json()["access_token"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def _session_payload(skater_id, **over):
    base = {"skater_id": skater_id, "session_date": "2026-01-15",
            "session_type": "on_ice", "duration_minutes": 60, "rpe": 7}
    base.update(over)
    return base


def _make_session(client, token, skater_id, **over):
    resp = client.post("/api/sessions", headers=_hdr(token),
                       json=_session_payload(skater_id, **over))
    assert resp.status_code in (200, 201), resp.text
    return resp.json()


def _add_attempt(client, token, session_id, **over):
    body = {"element_code": "3Lz", "outcome": "clean", "attempts_count": 1}
    body.update(over)
    resp = client.post(f"/api/sessions/{session_id}/attempts", headers=_hdr(token),
                       json=body)
    assert resp.status_code in (200, 201), resp.text
    return resp.json()[0]


def test_create_session_stamps_logged_by_user_id(client, make_user, db):
    skater = make_user("logskater@ex.com", role=SystemRole.athlete)
    admin = make_user("logadmin@ex.com", role=SystemRole.admin)
    token = _login(client, "logadmin@ex.com")
    body = _make_session(client, token, skater.id)
    assert body["logged_by_user_id"] == admin.id


def test_patch_session_updates_only_supplied_fields(client, make_user, db):
    skater = make_user("patchskater@ex.com", role=SystemRole.athlete)
    make_user("patchadmin@ex.com", role=SystemRole.admin)
    token = _login(client, "patchadmin@ex.com")
    created = _make_session(client, token, skater.id, location="Rink A", rpe=7)

    resp = client.patch(f"/api/sessions/{created['id']}", headers=_hdr(token),
                        json={"rpe": 4})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["rpe"] == 4
    # Untouched fields preserved.
    assert body["location"] == "Rink A"
    assert body["session_type"] == "on_ice"
    assert body["duration_minutes"] == 60


def test_patch_session_invalid_rpe_returns_422(client, make_user, db):
    skater = make_user("rpepatch@ex.com", role=SystemRole.athlete)
    make_user("rpepatchadmin@ex.com", role=SystemRole.admin)
    token = _login(client, "rpepatchadmin@ex.com")
    created = _make_session(client, token, skater.id)
    resp = client.patch(f"/api/sessions/{created['id']}", headers=_hdr(token),
                        json={"rpe": 11})
    assert resp.status_code == 422, resp.text


def test_patch_session_unauthorized_returns_403(client, make_user, db):
    skater = make_user("ownsess@ex.com", role=SystemRole.athlete)
    make_user("intrudersess@ex.com", role=SystemRole.athlete)
    owner_token = _login(client, "ownsess@ex.com")
    created = _make_session(client, owner_token, skater.id)
    intruder = _login(client, "intrudersess@ex.com")
    resp = client.patch(f"/api/sessions/{created['id']}", headers=_hdr(intruder),
                        json={"rpe": 3})
    assert resp.status_code == 403, resp.text


def test_patch_missing_session_returns_404(client, make_user, db):
    make_user("missadmin@ex.com", role=SystemRole.admin)
    token = _login(client, "missadmin@ex.com")
    import uuid
    resp = client.patch(f"/api/sessions/{uuid.uuid4()}", headers=_hdr(token),
                        json={"rpe": 3})
    assert resp.status_code == 404, resp.text


def test_delete_session_cascades_attempts(client, make_user, db):
    skater = make_user("delskater@ex.com", role=SystemRole.athlete)
    make_user("deladmin@ex.com", role=SystemRole.admin)
    token = _login(client, "deladmin@ex.com")
    created = _make_session(client, token, skater.id)
    _add_attempt(client, token, created["id"], element_code="3F")

    resp = client.delete(f"/api/sessions/{created['id']}", headers=_hdr(token))
    assert resp.status_code == 204, resp.text
    # Session gone.
    assert client.get(f"/api/sessions/{created['id']}", headers=_hdr(token)).status_code == 404
    # Attempts cascaded (listing under a missing session 404s).
    assert client.get(
        f"/api/sessions/{created['id']}/attempts", headers=_hdr(token)
    ).status_code == 404


def test_patch_attempt_updates_fields(client, make_user, db):
    skater = make_user("attpatch@ex.com", role=SystemRole.athlete)
    make_user("attpatchadmin@ex.com", role=SystemRole.admin)
    token = _login(client, "attpatchadmin@ex.com")
    created = _make_session(client, token, skater.id)
    attempt = _add_attempt(client, token, created["id"], outcome="clean")

    resp = client.patch(
        f"/api/sessions/{created['id']}/attempts/{attempt['id']}",
        headers=_hdr(token), json={"outcome": "fall", "attempts_count": 3})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["outcome"] == "fall"
    assert body["attempts_count"] == 3
    assert body["element_code"] == "3Lz"  # untouched


def test_delete_attempt_removes_it(client, make_user, db):
    skater = make_user("attdel@ex.com", role=SystemRole.athlete)
    make_user("attdeladmin@ex.com", role=SystemRole.admin)
    token = _login(client, "attdeladmin@ex.com")
    created = _make_session(client, token, skater.id)
    attempt = _add_attempt(client, token, created["id"])

    resp = client.delete(
        f"/api/sessions/{created['id']}/attempts/{attempt['id']}", headers=_hdr(token))
    assert resp.status_code == 204, resp.text
    listed = client.get(f"/api/sessions/{created['id']}/attempts", headers=_hdr(token))
    assert listed.status_code == 200
    assert listed.json() == []


def test_attempt_in_wrong_session_returns_404(client, make_user, db):
    skater = make_user("wrongsess@ex.com", role=SystemRole.athlete)
    make_user("wrongadmin@ex.com", role=SystemRole.admin)
    token = _login(client, "wrongadmin@ex.com")
    s1 = _make_session(client, token, skater.id)
    s2 = _make_session(client, token, skater.id, session_date="2026-02-01")
    attempt = _add_attempt(client, token, s1["id"])

    # attempt belongs to s1, referenced under s2 -> 404
    patch = client.patch(
        f"/api/sessions/{s2['id']}/attempts/{attempt['id']}",
        headers=_hdr(token), json={"outcome": "fall"})
    assert patch.status_code == 404, patch.text
    delete = client.delete(
        f"/api/sessions/{s2['id']}/attempts/{attempt['id']}", headers=_hdr(token))
    assert delete.status_code == 404, delete.text


def test_attempt_mutation_unauthorized_returns_403(client, make_user, db):
    skater = make_user("attown@ex.com", role=SystemRole.athlete)
    make_user("attintruder@ex.com", role=SystemRole.athlete)
    owner_token = _login(client, "attown@ex.com")
    created = _make_session(client, owner_token, skater.id)
    attempt = _add_attempt(client, owner_token, created["id"])

    intruder = _login(client, "attintruder@ex.com")
    patch = client.patch(
        f"/api/sessions/{created['id']}/attempts/{attempt['id']}",
        headers=_hdr(intruder), json={"outcome": "fall"})
    assert patch.status_code == 403, patch.text
    delete = client.delete(
        f"/api/sessions/{created['id']}/attempts/{attempt['id']}", headers=_hdr(intruder))
    assert delete.status_code == 403, delete.text
