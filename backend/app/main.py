from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.main import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

origins = [
        "https://skateplan.bradnet.net",
        "http://skateplan.bradnet.net",
        "http://localhost:3000",
        "http://192.168.1.3:3000",  
]

# --- CORS CONFIGURATION ---
# We allow ALL origins ("*") so your frontend can connect via
# localhost, 192.168.1.3, or any other IP on your network.
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/assets", StaticFiles(directory="app/data/assets"), name="assets")

app.include_router(api_router, prefix=settings.API_V1_STR)
