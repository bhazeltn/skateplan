"""
API routes for federation management.

Provides endpoints for listing skating federations with flag display support.
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.api.deps import get_session
from app.models.federation_models import Federation, FederationRead

router = APIRouter()


@router.get("/", response_model=List[FederationRead])
def list_federations(
    *,
    session: Session = Depends(get_session),
    active_only: bool = True
) -> List[Federation]:
    """
    List all skating federations, ordered by name.

    Returns federations with their iso_code for flag display via flagcdn.com API.

    Args:
        active_only: Filter to only active federations (default: True)

    Returns:
        List of federations with id, name, code, and iso_code
    """
    query = select(Federation)

    if active_only:
        query = query.where(Federation.is_active == True)

    query = query.order_by(Federation.name)

    federations = session.exec(query).all()
    return list(federations)
