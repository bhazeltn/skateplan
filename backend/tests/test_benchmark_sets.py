"""Coach-owned reusable benchmark sets (Sprint 7).

Covers full CRUD, strict coach-ownership isolation, and applying a set to a
skater (copies items as NOT_STARTED, skips case-insensitive duplicates).
Coaches are created with the admin role so ``authorize_skater_access`` grants the
apply step; set isolation is enforced purely by ``coach_id`` ownership scoping.
"""
from app.models.enums import SystemRole

PW = "benchpw123"


def _login(client, email, password=PW):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    return r.json()["access_token"]


def _hdr(token):
    return {"Authorization": f"Bearer {token}"}


def _coach(client, make_user, suffix):
    coach = make_user(f"bsco{suffix}@ex.com", password=PW, role=SystemRole.admin)
    return coach, _login(client, f"bsco{suffix}@ex.com")


def _set_payload(**overrides):
    payload = {
        "name": "Junior Season Targets",
        "description": "Baseline set for junior athletes",
        "items": [
            {"category": "Jumps", "title": "3Lz", "notes": "Clean edge"},
            {"category": "Jumps", "title": "2A"},
            {"category": "Spins", "title": "Layback Level 4"},
        ],
    }
    payload.update(overrides)
    return payload


def _create_set(client, token, **overrides):
    resp = client.post(
        "/api/benchmark-sets", headers=_hdr(token), json=_set_payload(**overrides)
    )
    assert resp.status_code in (200, 201), resp.text
    return resp.json()


# --- CRUD -----------------------------------------------------------------
def test_create_set_returns_record_with_items(client, make_user):
    _, token = _coach(client, make_user, "1")
    body = _create_set(client, token)
    assert body["id"]
    assert body["name"] == "Junior Season Targets"
    assert len(body["items"]) == 3
    # sort_order preserved by list order.
    assert [i["title"] for i in body["items"]] == ["3Lz", "2A", "Layback Level 4"]
    assert [i["sort_order"] for i in body["items"]] == [0, 1, 2]


def test_list_shows_created_set_with_items(client, make_user):
    _, token = _coach(client, make_user, "2")
    _create_set(client, token)
    resp = client.get("/api/benchmark-sets", headers=_hdr(token))
    assert resp.status_code == 200, resp.text
    sets = resp.json()
    assert len(sets) == 1
    assert len(sets[0]["items"]) == 3


def test_patch_replaces_items_and_updates_name(client, make_user):
    _, token = _coach(client, make_user, "3")
    created = _create_set(client, token)
    resp = client.patch(
        f"/api/benchmark-sets/{created['id']}",
        headers=_hdr(token),
        json={
            "name": "Senior Targets",
            "items": [{"category": "Jumps", "title": "3A"}],
        },
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["name"] == "Senior Targets"
    assert [i["title"] for i in body["items"]] == ["3A"]


def test_delete_removes_set(client, make_user):
    _, token = _coach(client, make_user, "4")
    created = _create_set(client, token)
    resp = client.delete(
        f"/api/benchmark-sets/{created['id']}", headers=_hdr(token)
    )
    assert resp.status_code == 204, resp.text
    listing = client.get("/api/benchmark-sets", headers=_hdr(token)).json()
    assert listing == []


# --- Coach-ownership isolation --------------------------------------------
def test_second_coach_cannot_see_or_mutate_first_coachs_set(client, make_user):
    _, token_a = _coach(client, make_user, "a")
    _, token_b = _coach(client, make_user, "b")
    created = _create_set(client, token_a)
    sid = created["id"]

    # Coach B's listing never includes coach A's set.
    assert client.get("/api/benchmark-sets", headers=_hdr(token_b)).json() == []
    # PATCH / DELETE / apply against a non-owned set -> 404.
    assert client.patch(
        f"/api/benchmark-sets/{sid}", headers=_hdr(token_b), json={"name": "x"}
    ).status_code == 404
    assert client.delete(
        f"/api/benchmark-sets/{sid}", headers=_hdr(token_b)
    ).status_code == 404
    skater = make_user("isoskater@ex.com", role=SystemRole.athlete)
    assert client.post(
        f"/api/benchmark-sets/{sid}/apply/{skater.id}", headers=_hdr(token_b)
    ).status_code == 404


# --- Apply ----------------------------------------------------------------
def test_apply_copies_items_as_not_started(client, make_user):
    _, token = _coach(client, make_user, "5")
    created = _create_set(client, token)
    skater = make_user("applyskater@ex.com", role=SystemRole.athlete)

    resp = client.post(
        f"/api/benchmark-sets/{created['id']}/apply/{skater.id}",
        headers=_hdr(token),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["created_count"] == 3
    assert body["skipped_count"] == 0
    assert len(body["created_items"]) == 3

    listed = client.get(
        f"/api/skaters/{skater.id}/benchmarks", headers=_hdr(token)
    ).json()
    assert len(listed) == 3
    assert all(b["status"] == "NOT_STARTED" for b in listed)
    # Items copied: set item.title -> SkaterBenchmark.name.
    assert {b["name"] for b in listed} == {"3Lz", "2A", "Layback Level 4"}


def test_apply_twice_skips_duplicates(client, make_user):
    _, token = _coach(client, make_user, "6")
    created = _create_set(client, token)
    skater = make_user("dupeskater@ex.com", role=SystemRole.athlete)
    apply_url = f"/api/benchmark-sets/{created['id']}/apply/{skater.id}"

    first = client.post(apply_url, headers=_hdr(token)).json()
    assert first["created_count"] == 3 and first["skipped_count"] == 0

    second = client.post(apply_url, headers=_hdr(token)).json()
    assert second["created_count"] == 0
    assert second["skipped_count"] == 3

    # No duplicate rows were created on the skater.
    listed = client.get(
        f"/api/skaters/{skater.id}/benchmarks", headers=_hdr(token)
    ).json()
    assert len(listed) == 3
