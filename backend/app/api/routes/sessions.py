"""
API routes for training session planning and tracking.

Supports creating, listing, updating, and tracking element progress during sessions.
"""
import uuid
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel

from app.api.deps import get_session, get_current_user
from app.models.user_models import Profile, SkaterCoachLink, Partnership
from app.models.library_models import Element
from app.models.session_models import Session as TrainingSession, SessionElement


router = APIRouter()


# Pydantic Schemas
class SessionElementCreate(BaseModel):
    """Schema for creating a session element."""
    element_id: uuid.UUID
    target_attempts: int = 1


class SessionElementRead(BaseModel):
    """Schema for reading session element data."""
    id: uuid.UUID
    element_id: uuid.UUID
    target_attempts: int
    actual_attempts: int
    successful_attempts: int
    notes: Optional[str]
    quality_rating: Optional[int]


class SessionElementDetailRead(SessionElementRead):
    """Schema for session element with full element details."""
    element_code: str
    element_name: str
    base_value: float


class SessionElementUpdate(BaseModel):
    """Schema for updating session element progress."""
    actual_attempts: Optional[int] = None
    successful_attempts: Optional[int] = None
    quality_rating: Optional[int] = None
    notes: Optional[str] = None


class SessionCreate(BaseModel):
    """Schema for creating a session."""
    skater_id: Optional[uuid.UUID] = None
    partnership_id: Optional[uuid.UUID] = None
    session_date: date
    session_type: str  # PRACTICE, LESSON, COMPETITION, TEST
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    location: Optional[str] = None
    elements: List[SessionElementCreate] = []


class SessionRead(BaseModel):
    """Schema for reading session data."""
    id: uuid.UUID
    skater_id: Optional[uuid.UUID]
    partnership_id: Optional[uuid.UUID]
    coach_id: uuid.UUID
    session_date: date
    session_type: str
    duration_minutes: Optional[int]
    notes: Optional[str]
    location: Optional[str]
    created_at: str


class SessionDetailRead(SessionRead):
    """Schema for session with full element details."""
    elements: List[SessionElementDetailRead]


# Helper Functions
def verify_coach_access(db: Session, coach_id: uuid.UUID, skater_id: uuid.UUID) -> None:
    """
    Verify coach has access to skater.

    Raises HTTPException if coach doesn't have access.
    """
    link = db.exec(
        select(SkaterCoachLink)
        .where(SkaterCoachLink.skater_id == skater_id)
        .where(SkaterCoachLink.coach_id == coach_id)
        .where(SkaterCoachLink.status == "active")
    ).first()

    if not link:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this skater"
        )


def verify_coach_partnership_access(db: Session, coach_id: uuid.UUID, partnership_id: uuid.UUID) -> None:
    """
    Verify coach has access to at least one skater in partnership.

    Raises HTTPException if coach doesn't have access.
    """
    partnership = db.get(Partnership, partnership_id)
    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership not found"
        )

    # Check if coach has access to either skater
    link_a = db.exec(
        select(SkaterCoachLink)
        .where(SkaterCoachLink.skater_id == partnership.skater_a_id)
        .where(SkaterCoachLink.coach_id == coach_id)
        .where(SkaterCoachLink.status == "active")
    ).first()

    link_b = db.exec(
        select(SkaterCoachLink)
        .where(SkaterCoachLink.skater_id == partnership.skater_b_id)
        .where(SkaterCoachLink.coach_id == coach_id)
        .where(SkaterCoachLink.status == "active")
    ).first()

    if not link_a and not link_b:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this partnership"
        )


# API Endpoints
@router.post("/", response_model=SessionDetailRead, status_code=status.HTTP_201_CREATED)
def create_session(
    *,
    db: Session = Depends(get_session),
    session_in: SessionCreate,
    current_user: Profile = Depends(get_current_user)
) -> SessionDetailRead:
    """
    Create a new training session.

    Can be for individual skater or partnership.
    Includes planned elements to work on.
    """
    # Must specify either skater_id or partnership_id (not both, not neither)
    if not session_in.skater_id and not session_in.partnership_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must specify either skater_id or partnership_id"
        )

    if session_in.skater_id and session_in.partnership_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot specify both skater_id and partnership_id"
        )

    # Verify coach has access
    if session_in.skater_id:
        verify_coach_access(db, current_user.id, session_in.skater_id)
    elif session_in.partnership_id:
        verify_coach_partnership_access(db, current_user.id, session_in.partnership_id)

    # Create session
    training_session = TrainingSession(
        skater_id=session_in.skater_id,
        partnership_id=session_in.partnership_id,
        coach_id=current_user.id,
        session_date=session_in.session_date,
        session_type=session_in.session_type,
        duration_minutes=session_in.duration_minutes,
        notes=session_in.notes,
        location=session_in.location
    )
    db.add(training_session)
    db.flush()

    # Create session elements
    elements_detail = []
    for elem_data in session_in.elements:
        session_elem = SessionElement(
            session_id=training_session.id,
            element_id=elem_data.element_id,
            target_attempts=elem_data.target_attempts
        )
        db.add(session_elem)
        db.flush()

        # Get element details
        element = db.get(Element, elem_data.element_id)
        if element:
            elements_detail.append(
                SessionElementDetailRead(
                    id=session_elem.id,
                    element_id=session_elem.element_id,
                    target_attempts=session_elem.target_attempts,
                    actual_attempts=session_elem.actual_attempts,
                    successful_attempts=session_elem.successful_attempts,
                    notes=session_elem.notes,
                    quality_rating=session_elem.quality_rating,
                    element_code=element.code,
                    element_name=element.name,
                    base_value=element.base_value
                )
            )

    db.commit()
    db.refresh(training_session)

    return SessionDetailRead(
        id=training_session.id,
        skater_id=training_session.skater_id,
        partnership_id=training_session.partnership_id,
        coach_id=training_session.coach_id,
        session_date=training_session.session_date,
        session_type=training_session.session_type,
        duration_minutes=training_session.duration_minutes,
        notes=training_session.notes,
        location=training_session.location,
        created_at=training_session.created_at.isoformat(),
        elements=elements_detail
    )


@router.get("/", response_model=List[SessionRead])
def list_sessions(
    *,
    db: Session = Depends(get_session),
    skater_id: Optional[uuid.UUID] = None,
    partnership_id: Optional[uuid.UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: Profile = Depends(get_current_user)
) -> List[SessionRead]:
    """
    List sessions with filters.

    Can filter by skater, partnership, date range.
    Returns sessions in descending date order (most recent first).
    """
    query = select(TrainingSession).where(TrainingSession.coach_id == current_user.id)

    if skater_id:
        query = query.where(TrainingSession.skater_id == skater_id)
    if partnership_id:
        query = query.where(TrainingSession.partnership_id == partnership_id)
    if start_date:
        query = query.where(TrainingSession.session_date >= start_date)
    if end_date:
        query = query.where(TrainingSession.session_date <= end_date)

    query = query.order_by(TrainingSession.session_date.desc())
    sessions = db.exec(query).all()

    return [
        SessionRead(
            id=s.id,
            skater_id=s.skater_id,
            partnership_id=s.partnership_id,
            coach_id=s.coach_id,
            session_date=s.session_date,
            session_type=s.session_type,
            duration_minutes=s.duration_minutes,
            notes=s.notes,
            location=s.location,
            created_at=s.created_at.isoformat()
        )
        for s in sessions
    ]


@router.get("/{session_id}", response_model=SessionDetailRead)
def get_session(
    *,
    db: Session = Depends(get_session),
    session_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user)
) -> SessionDetailRead:
    """Get session with all elements and their details."""
    training_session = db.get(TrainingSession, session_id)
    if not training_session or training_session.coach_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Load elements with ISU element details
    elements = db.exec(
        select(SessionElement, Element)
        .join(Element, SessionElement.element_id == Element.id)
        .where(SessionElement.session_id == session_id)
    ).all()

    elements_detail = [
        SessionElementDetailRead(
            id=elem.id,
            element_id=elem.element_id,
            target_attempts=elem.target_attempts,
            actual_attempts=elem.actual_attempts,
            successful_attempts=elem.successful_attempts,
            notes=elem.notes,
            quality_rating=elem.quality_rating,
            element_code=isu_elem.code,
            element_name=isu_elem.name,
            base_value=isu_elem.base_value
        )
        for elem, isu_elem in elements
    ]

    return SessionDetailRead(
        id=training_session.id,
        skater_id=training_session.skater_id,
        partnership_id=training_session.partnership_id,
        coach_id=training_session.coach_id,
        session_date=training_session.session_date,
        session_type=training_session.session_type,
        duration_minutes=training_session.duration_minutes,
        notes=training_session.notes,
        location=training_session.location,
        created_at=training_session.created_at.isoformat(),
        elements=elements_detail
    )


@router.patch("/{session_id}/elements/{element_id}", response_model=SessionElementRead)
def update_element_progress(
    *,
    db: Session = Depends(get_session),
    session_id: uuid.UUID,
    element_id: uuid.UUID,
    update: SessionElementUpdate,
    current_user: Profile = Depends(get_current_user)
) -> SessionElementRead:
    """
    Update element progress during session.

    Coach can update:
    - actual_attempts
    - successful_attempts
    - quality_rating
    - notes
    """
    training_session = db.get(TrainingSession, session_id)
    if not training_session or training_session.coach_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    element = db.get(SessionElement, element_id)
    if not element or element.session_id != session_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Element not found"
        )

    # Update fields
    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(element, key, value)

    db.add(element)
    db.commit()
    db.refresh(element)

    return SessionElementRead(
        id=element.id,
        element_id=element.element_id,
        target_attempts=element.target_attempts,
        actual_attempts=element.actual_attempts,
        successful_attempts=element.successful_attempts,
        notes=element.notes,
        quality_rating=element.quality_rating
    )


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    *,
    db: Session = Depends(get_session),
    session_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user)
) -> None:
    """
    Delete a session.

    Cascade deletes all session_elements.
    """
    training_session = db.get(TrainingSession, session_id)
    if not training_session or training_session.coach_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    db.delete(training_session)
    db.commit()
