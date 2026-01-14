from fastapi import APIRouter
from app.api.routes import skaters, admin, library, benchmarks, auth, assets, programs, guardians, federations

api_router = APIRouter()
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(skaters.router, prefix="/skaters", tags=["skaters"])
api_router.include_router(assets.router, prefix="/assets", tags=["assets"])
api_router.include_router(programs.router, prefix="/programs", tags=["programs"])
api_router.include_router(guardians.router, prefix="/guardians", tags=["guardians"])
api_router.include_router(federations.router, prefix="/federations", tags=["federations"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(library.router, prefix="", tags=["library"])
api_router.include_router(benchmarks.router, prefix="/benchmarks", tags=["benchmarks"])
