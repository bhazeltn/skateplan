from fastapi import APIRouter
from app.api.routes import skaters, admin, library, auth, assets, programs, guardians, federations, levels, partnerships, sessions, teams, metrics

api_router = APIRouter()
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(skaters.router, prefix="/skaters", tags=["skaters"])
api_router.include_router(teams.router, prefix="/teams", tags=["teams"])
api_router.include_router(assets.router, prefix="/assets", tags=["assets"])
api_router.include_router(programs.router, prefix="/programs", tags=["programs"])
api_router.include_router(guardians.router, prefix="/guardians", tags=["guardians"])
api_router.include_router(federations.router, prefix="/federations", tags=["federations"])
api_router.include_router(levels.router, prefix="/levels", tags=["levels"])
api_router.include_router(partnerships.router, prefix="/partnerships", tags=["partnerships"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(library.router, prefix="", tags=["library"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["metrics"])
