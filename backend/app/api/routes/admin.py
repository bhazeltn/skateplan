from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.api.deps import get_session, get_current_user
from app.models.user_models import Profile
from app.core.seeds import seed_federations, seed_elements

router = APIRouter()

@router.post("/seed/federations")
def run_seed_federations(
    session: Session = Depends(get_session),
    current_user: Profile = Depends(get_current_user),
):
    # In real app, check if current_user.role == 'admin'
    return seed_federations(session)

@router.post("/seed/elements")
def run_seed_elements(
    session: Session = Depends(get_session),
    current_user: Profile = Depends(get_current_user),
):
    return seed_elements(session)
