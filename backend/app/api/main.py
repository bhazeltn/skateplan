from fastapi import APIRouter
from app.api.routes import skaters, admin, library, benchmarks, login

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(skaters.router, prefix="/skaters", tags=["skaters"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(library.router, prefix="", tags=["library"])
api_router.include_router(benchmarks.router, prefix="/benchmarks", tags=["benchmarks"])
