"""Competition entry registration tests (Sprint 3)."""
from app.models.enums import SystemRole
from app.models.federation import CompetitionLevel, Federation, FederationStream


def _seed_level(db):
    fed = Federation(name="Test Fed", code="TFED")
    db.add(fed)
    db.flush()
    stream = FederationStream(federation_code="TFED", stream_name="Singles")
    db.add(stream)
    db.flush()
    level = CompetitionLevel(stream_id=stream.stream_id, level_name="Senior")
    db.add(level)
    db.commit()
    return level.level_id


def _coach_token(client, make_user):
    make_user("ecoach@ex.com", password="Coach123!", role=SystemRole.coach)
    r = client.post("/api/auth/login", json={"email": "ecoach@ex.com", "password": "Coach123!"})
    return r.json()["access_token"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def _make_program(client, token, skater_id, title="FS Prog"):
    resp = client.post(
        "/api/programs",
        headers=_hdr(token),
        json={
            "skater_id": skater_id,
            "program_type": "FS",
            "title": title,
            "program_elements": [
                {"segment_order": 1, "element_code": "3Lz+3T",
                 "is_second_half_bonus": False, "element_bonus": 0.0},
            ],
        },
    )
    assert resp.status_code in (200, 201), resp.text
    return resp.json()["id"]


def _make_competition(client, token):
    resp = client.post(
        "/api/competitions",
        headers=_hdr(token),
        json={"name": "Entry Cup", "start_date": "2025-11-01",
              "end_date": "2025-11-03", "city": "Toronto", "country": "Canada",
              "season": "2025-26"},
    )
    assert resp.status_code in (200, 201), resp.text
    return resp.json()["id"]


def test_register_entry_with_programs(client, make_user, db):
    token = _coach_token(client, make_user)
    skater = make_user("entryskater@ex.com", role=SystemRole.athlete)
    comp_id = _make_competition(client, token)
    fs_pid = _make_program(client, token, skater.id)

    resp = client.post(
        f"/api/competitions/{comp_id}/entries",
        headers=_hdr(token),
        json={"skater_id": skater.id, "level_id": None,
              "sp_program_id": None, "fs_program_id": fs_pid},
    )
    assert resp.status_code in (200, 201), resp.text
    body = resp.json()
    assert body["skater_id"] == skater.id
    assert body["fs_program_id"] == fs_pid


def test_get_skater_competitions(client, make_user, db):
    token = _coach_token(client, make_user)
    skater = make_user("entryskater2@ex.com", role=SystemRole.athlete)
    comp_id = _make_competition(client, token)
    fs_pid = _make_program(client, token, skater.id)
    client.post(
        f"/api/competitions/{comp_id}/entries",
        headers=_hdr(token),
        json={"skater_id": skater.id, "fs_program_id": fs_pid},
    )

    resp = client.get(f"/api/skaters/{skater.id}/competitions", headers=_hdr(token))
    assert resp.status_code == 200, resp.text
    entries = resp.json()
    assert len(entries) == 1
    assert entries[0]["competition_id"] == comp_id


def _register_entry(client, token, comp_id, skater_id, fs_pid):
    resp = client.post(
        f"/api/competitions/{comp_id}/entries",
        headers=_hdr(token),
        json={"skater_id": skater_id, "fs_program_id": fs_pid},
    )
    assert resp.status_code in (200, 201), resp.text
    return resp.json()["id"]


def test_update_competition_entry(client, make_user, db):
    token = _coach_token(client, make_user)
    skater = make_user("updskater@ex.com", role=SystemRole.athlete)
    comp_id = _make_competition(client, token)
    fs_pid = _make_program(client, token, skater.id)
    entry_id = _register_entry(client, token, comp_id, skater.id, fs_pid)
    level_id = _seed_level(db)

    resp = client.patch(
        f"/api/competitions/entries/{entry_id}",
        headers=_hdr(token),
        json={"status": "completed", "level_id": level_id},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "completed"
    assert body["level_id"] == level_id


def test_delete_competition_entry(client, make_user, db):
    token = _coach_token(client, make_user)
    skater = make_user("delskater@ex.com", role=SystemRole.athlete)
    comp_id = _make_competition(client, token)
    fs_pid = _make_program(client, token, skater.id)
    entry_id = _register_entry(client, token, comp_id, skater.id, fs_pid)

    resp = client.delete(
        f"/api/competitions/entries/{entry_id}", headers=_hdr(token)
    )
    assert resp.status_code == 204, resp.text

    gone = client.get(
        f"/api/competitions/entries/{entry_id}/protocol", headers=_hdr(token)
    )
    assert gone.status_code == 404, gone.text


def test_entry_rejects_program_of_other_skater(client, make_user, db):
    token = _coach_token(client, make_user)
    skater_a = make_user("skA@ex.com", role=SystemRole.athlete)
    skater_b = make_user("skB@ex.com", role=SystemRole.athlete)
    comp_id = _make_competition(client, token)
    # Program belongs to skater_b ...
    other_pid = _make_program(client, token, skater_b.id)

    # ... but we register skater_a with it -> must be rejected.
    resp = client.post(
        f"/api/competitions/{comp_id}/entries",
        headers=_hdr(token),
        json={"skater_id": skater_a.id, "fs_program_id": other_pid},
    )
    assert resp.status_code == 400, resp.text
