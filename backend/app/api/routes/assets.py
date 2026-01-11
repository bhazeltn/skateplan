import uuid
import shutil
import os
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlmodel import Session, select
from app.api.deps import get_session, get_current_user
from app.models.user_models import Profile
from app.models.skater_models import Skater
from app.models.asset_models import ProgramAsset, AssetType

router = APIRouter()

UPLOAD_DIR = "/app/app/data/assets" # Inside the container
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/{skater_id}", response_model=ProgramAsset)
def upload_asset(
    *,
    session: Session = Depends(get_session),
    skater_id: uuid.UUID,
    file: UploadFile = File(...),
    file_type: AssetType = Form(...),
    current_user: Profile = Depends(get_current_user),
) -> ProgramAsset:
    # Verify skater ownership
    skater = session.get(Skater, skater_id)
    if not skater:
        raise HTTPException(status_code=404, detail="Skater not found")
    if skater.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")

    # Create DB entry
    asset = ProgramAsset(
        skater_id=skater_id,
        filename=file.filename,
        stored_filename=unique_filename,
        file_type=file_type,
        meta_data={"content_type": file.content_type, "size": file.size}
    )
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset

@router.get("/{skater_id}", response_model=List[ProgramAsset])
def list_assets(
    *,
    session: Session = Depends(get_session),
    skater_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
) -> List[ProgramAsset]:
    # Verify skater ownership
    skater = session.get(Skater, skater_id)
    if not skater:
        raise HTTPException(status_code=404, detail="Skater not found")
    if skater.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    statement = select(ProgramAsset).where(ProgramAsset.skater_id == skater_id)
    assets = session.exec(statement).all()
    return assets

@router.get("/download/{asset_id}")
def download_asset(
    *,
    session: Session = Depends(get_session),
    asset_id: uuid.UUID,
    # Token authentication is tricky for audio src tags if passing via header.
    # For MVP, we might use a query param token or cookies.
    # Since we set a cookie in the frontend middleware, it *should* work if browser sends it.
    # But fastapi OAuth2PasswordBearer expects header.
    # We will use a dependency that checks cookie OR header.
    # For now, let's keep strict header/cookie check if possible or allow public if we rely on obfuscated UUID (not secure).
    # Let's rely on standard current_user dependency which reads headers.
    # The frontend player will need to fetch the blob and play it, or we allow cookie auth.
    current_user: Profile = Depends(get_current_user), 
):
    asset = session.get(ProgramAsset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Ownership check via Skater
    skater = session.get(Skater, asset.skater_id)
    if skater.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    file_path = os.path.join(UPLOAD_DIR, asset.stored_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File on disk not found")
        
    return FileResponse(file_path, filename=asset.filename, media_type=asset.meta_data.get("content_type"))
