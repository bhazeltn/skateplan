# Task: Add Skater Profile Editing (Backend PATCH + Frontend Edit Modal) — TDD, Low-Scope

Allow primary coaches and collaborators to edit an existing skater's profile details (full name,
contact email, federation, competitive level, and existing profile metadata like DOB / discipline /
home club) from the Skater Profile header. Minimal scope. No DB migrations.

HARD CONSTRAINTS: every file at most 250 lines; every function at most 30 logic lines. Strict TDD
(write failing tests first, then implement, then verify). Plain git only (user-brought repo).

## Phase 0 — Inspect existing model, schemas, routes
1. Read backend/app/models/user.py, the SkaterProfile model (backend/app/models/skater_profile.py or
   wherever it lives), backend/app/schemas/skater.py, backend/app/api/skaters.py. Confirm exact field
   names and whether PATCH /api/skaters/{skater_id} already exists.
2. Read frontend/src/pages/SkaterProfilePage.tsx and the existing Add/Create Skater form so the Edit
   modal reuses the EXACT same Federation dropdown/search and level fields.

## Phase 1 — Backend: PATCH /api/skaters/{skater_id} (RED then GREEN)
1. Add (or verify) PATCH /api/skaters/{skater_id} in backend/app/api/skaters.py:
   - Auth: require_skater_editor(current_user, skater_id, db) — blocks viewers and skaters with 403.
   - Schema SkaterUpdate: ALL fields optional (full_name, contact_email, federation_id,
     competitive_level, plus existing profile fields like date_of_birth, discipline, home_club — use
     whatever actually exists on the model).
   - Apply partial update via model_dump(exclude_unset=True) across User (full_name) and SkaterProfile.
     Validate federation_id exists if provided (404 or 422). Return the updated skater response matching
     GET /api/skaters/{skater_id}.
2. Add 3 focused tests in backend/tests/test_skater_edit.py:
   - Primary coach updates competitive_level, federation_id, and full_name -> persisted and returned.
   - Skater OR viewer co-coach receives 403.
   - Invalid federation_id returns 404 or 422.

## Phase 2 — Frontend: Edit Skater modal + header button (RED then GREEN)
1. Add updateSkater(skaterId, payload, token) calling PATCH /api/skaters/{skaterId} (in
   frontend/src/lib/skaterApi.ts or the existing skaters API file). Add a stateful PATCH
   /api/skaters/:id MSW handler.
2. Create frontend/src/components/skaters/EditSkaterModal.tsx (at most 180 lines, functions at most 30):
   - Pre-filled from the loaded skater profile.
   - Uses the SAME Federation selector/dropdown as the Add Skater form; edits full_name,
     competitive_level, contact_email, and existing profile fields.
   - Wraps submit in try/catch with an inline Alert on error.
3. Wire an Edit button into SkaterProfilePage.tsx header, shown ONLY when capabilities.can_edit_plan is
   true, opening EditSkaterModal and updating the displayed profile state on save.
4. Add 2-3 focused tests in frontend/src/__tests__/EditSkater.test.tsx:
   - Coach clicks Edit, changes level and name, saves -> PATCH called, modal closes, header reflects
     updated values.
   - Skater/viewer persona (can_edit_plan false) does NOT see the Edit button.

## Phase 3 — Verify (do NOT commit; parent commits)
- Backend: cd backend && .venv/bin/python -m pytest -q  (100% passing). Full suite may exceed 120s —
  run detached with nohup + exit-code file if needed.
- Frontend build: cd frontend && npm run build 2>&1 | grep -E "built in|error TS"  (0 TS errors).
- Frontend tests: cd frontend && npx vitest run 2>&1 | grep -E "Test Files|Tests "  (100% passing).
- Confirm every new/modified file at most 250 lines (wc -l) and functions at most 30 logic lines.
- Rebuild dist (npm run build) and reload nginx: sudo nginx -t && sudo systemctl reload nginx.
  SPA smoke: curl -sS -o /dev/null -w the http_code -H 'Host: ab12b61bf.vm.internal' http://127.0.0.1/
  (expect 200).
- Do NOT commit. Report created/modified files with line counts, exact pytest + vitest pass counts,
  build result, and any deviation from this spec.

## Key facts (verified this conversation)
- User.id is INTEGER. Capability fields: can_edit_plan, can_edit_goals, can_log_training,
  can_manage_access. require_skater_editor and require_goal_editor live in app/core/skater_permissions.py.
- Frontend API base: const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "" ; all calls relative /api/...
- MSW onUnhandledRequest is "error": every API call in tests needs a handler.
  frontend/src/mocks/handlers.ts (~558 lines) is a pre-existing oversize aggregator — do NOT shrink it;
  only add the minimal import + spread line for any new handler module.
- Tab wiring for SkaterProfilePage lives in a buildTabs function in that page, not ProfileTabs.tsx.
- dist is gitignored; never stage it.
