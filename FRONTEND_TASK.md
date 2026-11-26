# Frontend Task: Multi-Role Access, Invite Onboarding, Goals & Skater Portal View

Repo: /home/ubuntu/skateplan — SkatePlan figure-skating coaching app. React + TypeScript + Vite frontend at `frontend/`; FastAPI backend at `backend/`. USER-BROUGHT repo with its own git remote → use PLAIN GIT ONLY. NEVER use project_checkpoint.

## Standing constraints (hard)
- Every file ≤250 lines. Every function ≤30 logic lines.
- Strict TDD: write failing tests (RED), implement (GREEN), verify.
- Frontend-only this turn. NO backend / model / migration / DB changes.

## Git state
Clean tree at commit 9ca5f7c (backend multi-role access delivered & committed last turn). Baseline frontend tests: 210 passing across 24 files. Do NOT commit — leave the working tree ready for the parent to commit.

## Backend endpoints to wire up (already live)
- `GET /api/skaters/{id}/access/me` → current user's capabilities for that skater
- `GET /api/skaters/{id}/access` → full access summary (primary coach only)
- invite / coach-role-update / coach-removal / invite-revoke under `/api/skaters/{id}/access`
- `GET /api/auth/invites/{token}` (public; 404 invalid, 410 expired/used)
- `POST /api/auth/accept-invite` (public)
- `POST /api/auth/change-password`
- `/api/skaters/{id}/goals*` (list / create / update / delete)

## Critical backend facts
- `User.id` is INTEGER (not UUID). Competition/program ids ARE UUID strings.
- Capability field names (exact): `can_edit_plan`, `can_edit_goals`, `can_log_training`, `can_manage_access`.
- SMART goal fields include `action_plan`, `success_criteria`. Goal statuses: `NOT_STARTED`, `DEVELOPING`, `SOLIDIFYING`, `MET`.
- Fine-grained viewer/collaborator enforcement is backend-side ONLY on YTP, Benchmarks, Goals; Programs & Competitions kept baseline `require_coach` — known accepted deviation; do NOT act on it.

## RE-READ these backend files FIRST (match exact shapes/field names/status codes)
- `backend/app/schemas/access.py`
- `backend/app/schemas/goal.py`
- `backend/app/api/skater_access.py`
- `backend/app/api/auth_invites.py`
- `backend/app/api/goals.py`

## Frontend nav map (re-read fresh for current patterns)
- `frontend/src/App.tsx` — routing; public vs protected routes.
- `frontend/src/context/AuthContext.tsx` — auth token/user storage; role is coach/athlete/admin.
- `frontend/src/components/layout/navItems.ts` — sidebar nav.
- `frontend/src/pages/SkaterProfilePage.tsx` — REAL tab wiring is a function `buildTabs` here (NOT ProfileTabs.tsx).
- `frontend/src/components/skaters/ProfileTabs.tsx` — renders a `{label, content}[]` array; label-driven; needs NO change to add tabs.
- API module patterns (auth header): `lib/trainingApi.ts`, `lib/runThroughsApi.ts`, `lib/competitionScheduleApi.ts`.
- Hook patterns: `components/training/useTrainingLogs.ts`, `components/ytp/useYtp.ts`, `components/competitions/useRosterSchedule.ts`.
- Modal patterns: `components/ytp/PlanModal.tsx`, `components/training/SessionModal.tsx`. UI primitives Button, Input, Alert exist; NO select/textarea primitive (use raw `<select>`/`<textarea>` + tap pills).
- Test setup: `frontend/src/test/setup.ts` (wire new handler reset into afterEach).

## MSW facts
- `onUnhandledRequest: "error"` — every API call exercised in tests MUST have a mock handler.
- `frontend/src/mocks/handlers.ts` is ~555 lines — a PRE-EXISTING oversize test-only aggregator. Do NOT shrink it; only add the minimal import + spread line for new handler modules (accepted exception).
- `dist` is gitignored; never stage it.

---

## PHASE 0 — Inspect
Re-read the 5 backend files and the frontend nav-map files to match exact shapes/field names/status codes and current auth/role storage. Do not guess shapes.

## PHASE 1 — Domain APIs, mocks, capability hook
- `frontend/src/lib/accessApi.ts` (≤150): types matching schemas/access.py (SkaterCapabilities, SkaterAccessMeOut, SkaterAccessSummaryOut, InviteCreate, InviteResponse, PublicInviteOut, AcceptInvitePayload) + functions getMySkaterAccess, getSkaterAccess, inviteToSkater, updateCoachRole, removeCoachAccess, revokeInvite, getPublicInvite, acceptInvite, changePassword.
- `frontend/src/lib/goalsApi.ts` (≤90): types matching schemas/goal.py + functions listSkaterGoals, createSkaterGoal, updateSkaterGoal, deleteSkaterGoal.
- `frontend/src/mocks/accessHandlers.ts` (≤180): stateful MSW handlers for /api/skaters/:id/access/me, /api/skaters/:id/access, invites, coach role update/removal, /api/auth/invites/:token, /api/auth/accept-invite, /api/auth/change-password, /api/skaters/:id/goals*. Spread into handlers.ts via one import+spread line. Export a reset function wired into test/setup.ts afterEach.
- `frontend/src/components/skaters/useSkaterCapabilities.ts` (≤60): calls getMySkaterAccess(skaterId, token); exposes { role, capabilities, loading } with safe read-only defaults while loading.

## PHASE 2 — Public onboarding + change password
- `frontend/src/pages/AcceptInvitePage.tsx` (≤170): public route /accept-invite in App.tsx, reads `?token=`, calls getPublicInvite(token) on mount. Clear messages for 404 (invalid) and 410 (expired/used). On success show skater name/role + form (full_name + password min 8 chars), submit via acceptInvite, save auth (same storage AuthContext uses), redirect into the app.
- `frontend/src/components/layout/ChangePasswordModal.tsx` (≤130): current / new / confirm password fields; calls changePassword; success + error states.

## PHASE 3 — Access + Goals tabs
- `frontend/src/components/skaters/SkaterAccessTab.tsx` (≤220; split an InviteAccessForm.tsx sub-component if it would exceed 220). Visible only when capabilities.can_manage_access. Shows: skater login status; co-coaches list with role switcher (collaborator↔viewer) + remove; invite form; pending invites list with a copy-link button that copies `${window.location.origin}${invite_path}` and shows a "Copied!" confirmation, plus a revoke button. Surface the copyable link right after creating an invite, OR show a "Linked existing coach" banner when the invite response status === "linked".
- `frontend/src/components/skaters/GoalsTab.tsx` (≤200): lists goals with status/progress badges. Add Goal + Edit controls shown when capabilities.can_edit_goals. Delete control shown ONLY when capabilities.can_edit_plan.

## PHASE 4 — Role-aware gating + skater landing
- Wire useSkaterCapabilities into SkaterProfilePage.tsx `buildTabs`. Add a "goals" (Goals) tab; conditionally add "access" (Access) tab ONLY when capabilities.can_manage_access.
- Pass `canEdit={capabilities.can_edit_plan}` into YTP, Gap Analysis/Benchmarks, Programs, Skater Competitions tabs — hide create/edit/delete when canEdit === false. DEFAULT canEdit to true so existing coach tests stay green. Keep Training tab fully interactive when capabilities.can_log_training.
- Skater portal: when logged-in user is skater/athlete (not coach/admin), hide coach-only sidebar items (roster list / benchmark library) and show My Profile (→ /skaters/${user.id}) + Competitions. Landing on / or /skaters redirects to /skaters/${user.id} with default active tab "training".

## PHASE 5 — Tests
- `frontend/src/__tests__/AcceptInvite.test.tsx`: valid token displays skater name/role, submits password, logs in; expired/used token (410) shows the clear expired-link state.
- `frontend/src/__tests__/SkaterAccess.test.tsx`:
  - (a) primary coach sees Access tab, creates a skater invite, sees the copyable invite URL, toggles a co-coach viewer→collaborator, revokes a pending invite;
  - (b) skater persona {can_edit_plan:false, can_edit_goals:true, can_log_training:true, can_manage_access:false} does NOT see Access tab, can create/edit a goal but sees NO Delete button, sees read-only YTP/Programs/Benchmarks, can still log training;
  - (c) viewer co-coach {can_edit_plan:false, can_edit_goals:false} sees read-only Goals/YTP/Programs/Benchmarks.

## PHASE 6 — Verify (do NOT commit)
- Build: `cd frontend && npm run build 2>&1 | grep -E "built in|error TS"` → 0 TS errors.
- Tests: `cd frontend && npx vitest run 2>&1 | grep -E "Test Files|Tests "` → all 210 existing + new passing.
- Verify every new/modified file ≤250 lines (wc -l) and every function ≤30 logic lines.
- Rebuild dist (npm run build) and reload nginx: `sudo nginx -t && sudo systemctl reload nginx`. SPA smoke: `curl -sS -o /dev/null -w '%{http_code}' -H 'Host: ab12b61bf.vm.internal' http://127.0.0.1/` (expect 200).
- Do NOT commit. Leave working tree ready; report created/modified files with line counts, exact vitest pass count, build result.

Report honestly: what was newly added vs already present, exact final test count, and any deviation (a render component exceeding 30 physical lines where no single logic block exceeds 30 is acceptable — flag it).
