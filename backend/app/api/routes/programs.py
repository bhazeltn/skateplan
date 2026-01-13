"""
API routes for program management.

Handles CRUD operations for skating programs and their assets.
"""
import uuid
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import get_session, get_current_user
from app.models.user_models import Profile
from app.models.program_models import (
    Program,
    ProgramCreate,
    ProgramRead,
    ProgramUpdate,
    ProgramAssetLink,
    ProgramAssetLinkCreate,
    ProgramAssetLinkRead,
)

router = APIRouter()


@router.post("/", response_model=ProgramRead, status_code=status.HTTP_201_CREATED)
def create_program(
    *,
    session: Session = Depends(get_session),
    program_in: ProgramCreate,
    current_user: Profile = Depends(get_current_user),
) -> Program:
    """Create a new program for the current user's skater."""
    program = Program(
        **program_in.model_dump(),
        skater_id=current_user.id
    )
    session.add(program)
    session.commit()
    session.refresh(program)
    return program


@router.get("/", response_model=List[ProgramRead])
def list_programs(
    *,
    session: Session = Depends(get_session),
    current_user: Profile = Depends(get_current_user),
    active_only: bool = True,
) -> List[Program]:
    """List all programs for the current user."""
    query = select(Program).where(Program.skater_id == current_user.id)

    if active_only:
        query = query.where(Program.is_active == True)

    programs = session.exec(query).all()
    return list(programs)


@router.get("/{program_id}", response_model=ProgramRead)
def get_program(
    *,
    session: Session = Depends(get_session),
    program_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
) -> Program:
    """Get a specific program by ID."""
    program = session.get(Program, program_id)

    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    # Check ownership
    if program.skater_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return program


@router.patch("/{program_id}", response_model=ProgramRead)
def update_program(
    *,
    session: Session = Depends(get_session),
    program_id: uuid.UUID,
    program_in: ProgramUpdate,
    current_user: Profile = Depends(get_current_user),
) -> Program:
    """Update a program."""
    program = session.get(Program, program_id)

    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    if program.skater_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Update fields
    update_data = program_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(program, key, value)

    program.updated_at = datetime.utcnow()

    session.add(program)
    session.commit()
    session.refresh(program)
    return program


@router.delete("/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_program(
    *,
    session: Session = Depends(get_session),
    program_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
):
    """Delete (archive) a program."""
    program = session.get(Program, program_id)

    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    if program.skater_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Soft delete by setting is_active to False
    program.is_active = False
    session.add(program)
    session.commit()


# Asset linking endpoints

@router.post("/assets/", response_model=ProgramAssetLinkRead, status_code=status.HTTP_201_CREATED)
def link_asset_to_program(
    *,
    session: Session = Depends(get_session),
    link_in: ProgramAssetLinkCreate,
    current_user: Profile = Depends(get_current_user),
) -> ProgramAssetLink:
    """Link an asset (music, costume, etc.) to a program."""
    # Verify program ownership
    program = session.get(Program, link_in.program_id)
    if not program or program.skater_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    link = ProgramAssetLink(**link_in.model_dump())
    session.add(link)
    session.commit()
    session.refresh(link)
    return link


@router.get("/{program_id}/assets", response_model=List[ProgramAssetLinkRead])
def list_program_assets(
    *,
    session: Session = Depends(get_session),
    program_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
) -> List[ProgramAssetLink]:
    """List all assets linked to a program."""
    program = session.get(Program, program_id)
    if not program or program.skater_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    links = session.exec(
        select(ProgramAssetLink).where(ProgramAssetLink.program_id == program_id)
    ).all()

    return list(links)
