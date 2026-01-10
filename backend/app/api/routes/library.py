from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from app.api.deps import get_session, get_current_user
from app.models.user_models import Profile
from app.models.library_models import Element

router = APIRouter()

@router.get("/elements", response_model=List[Element])
def read_elements(
    *,
    session: Session = Depends(get_session),
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Profile = Depends(get_current_user),
) -> List[Element]:
    query = select(Element)
    if category:
        query = query.where(Element.category == category)
    if search:
        # Simple case-insensitive search on name or code
        query = query.where((Element.name.ilike(f"%{search}%")) | (Element.code.ilike(f"%{search}%")))
    
    query = query.offset(skip).limit(limit)
    elements = session.exec(query).all()
    return elements
