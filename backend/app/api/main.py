from fastapi import APIRouter
from app.api.routes import skaters

api_router = APIRouter()
api_router.include_router(skaters.router, prefix="/skaters", tags=["skaters"])
