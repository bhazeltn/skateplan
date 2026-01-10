from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.api.deps import get_session
from app.core.seeds import seed_federations, seed_elements

router = APIRouter()

@router.post("/seed/federations")
def run_seed_federations(
    session: Session = Depends(get_session),
):
    """
    Triggers the federation seed from JSON.
    AUTH DISABLED FOR INITIAL SETUP.
    """
    return seed_federations(session)

@router.post("/seed/elements")
def run_seed_elements(
    session: Session = Depends(get_session),
):
    """
    Triggers the element seed from CSVs.
    AUTH DISABLED FOR INITIAL SETUP.
    """
    return seed_elements(session)
