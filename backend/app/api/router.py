"""Top-level API router mounted under /api."""
from fastapi import APIRouter

from app.api import (
    admin,
    auth,
    auth_invites,
    benchmark_sets,
    benchmarks,
    competition_edit,
    competition_results,
    competition_schedule,
    competitions,
    dashboard,
    external,
    federations,
    goals,
    injuries,
    levels,
    meetings,
    programs,
    run_throughs,
    schedule,
    scoring,
    skater_access,
    skater_records,
    skaters,
    sov,
    standards,
    training,
    training_attempts,
    ytp,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(auth_invites.router)
api_router.include_router(dashboard.router)
api_router.include_router(skaters.router)
api_router.include_router(skater_records.router)
api_router.include_router(sov.router)
api_router.include_router(schedule.router)
api_router.include_router(admin.router)
api_router.include_router(federations.router)
api_router.include_router(levels.router)
api_router.include_router(external.router)
api_router.include_router(programs.router)
api_router.include_router(scoring.router)
# Static /competitions/roster-schedule must be registered BEFORE competitions.router,
# whose /competitions/{competition_id} would otherwise capture "roster-schedule".
api_router.include_router(competition_schedule.router)
api_router.include_router(competitions.router)
api_router.include_router(competition_edit.router)
api_router.include_router(competition_results.router)
api_router.include_router(competitions.skater_router)
api_router.include_router(training.session_router)
api_router.include_router(training_attempts.attempt_router)
api_router.include_router(training.skater_router)
api_router.include_router(run_throughs.session_router)
api_router.include_router(run_throughs.skater_router)
api_router.include_router(injuries.router)
api_router.include_router(injuries.skater_router)
api_router.include_router(meetings.router)
api_router.include_router(meetings.skater_router)
api_router.include_router(standards.router)
api_router.include_router(standards.skater_router)
api_router.include_router(benchmarks.router)
api_router.include_router(benchmark_sets.router)
api_router.include_router(ytp.router)
api_router.include_router(ytp.skater_router)
api_router.include_router(goals.skater_router)
api_router.include_router(skater_access.router)


@api_router.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}
