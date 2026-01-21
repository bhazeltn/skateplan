import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.api.deps import get_session, get_current_user
from app.models.user_models import Profile, SkaterCoachLink
from app.models.federation_models import Federation
from app.models.team_models import Team, TeamMember, TeamCreate, TeamRead

router = APIRouter()


@router.post("/", response_model=TeamRead)
def create_team(
    *,
    session: Session = Depends(get_session),
    team_in: TeamCreate,
    current_user: Profile = Depends(get_current_user),
) -> TeamRead:
    """
    Create a new Ice Dance or Pairs team.

    Validates that both skaters exist and belong to the current coach,
    then creates a team with the specified federation, discipline, and level.
    """
    # Validate discipline
    if team_in.discipline not in ['Pairs', 'Ice_Dance']:
        raise HTTPException(
            status_code=400,
            detail="Discipline must be 'Pairs' or 'Ice_Dance'"
        )

    # Convert skater IDs from string to UUID
    try:
        skater1_uuid = uuid.UUID(team_in.skater1_id)
        skater2_uuid = uuid.UUID(team_in.skater2_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid skater ID format")

    # Verify both skaters exist and belong to coach
    skater1_link = session.exec(
        select(SkaterCoachLink)
        .where(SkaterCoachLink.skater_id == skater1_uuid)
        .where(SkaterCoachLink.coach_id == current_user.id)
        .where(SkaterCoachLink.status == "active")
    ).first()

    skater2_link = session.exec(
        select(SkaterCoachLink)
        .where(SkaterCoachLink.skater_id == skater2_uuid)
        .where(SkaterCoachLink.coach_id == current_user.id)
        .where(SkaterCoachLink.status == "active")
    ).first()

    if not skater1_link or not skater2_link:
        raise HTTPException(
            status_code=404,
            detail="One or both skaters not found or not linked to this coach"
        )

    # Get skater profiles
    skater1 = session.get(Profile, skater1_uuid)
    skater2 = session.get(Profile, skater2_uuid)

    if not skater1 or not skater2:
        raise HTTPException(status_code=404, detail="Skater profiles not found")

    # Verify federation exists
    federation = session.exec(
        select(Federation).where(Federation.code == team_in.federation_code)
    ).first()

    if not federation:
        raise HTTPException(status_code=404, detail="Federation not found")

    # Create team
    team = Team(
        coach_id=current_user.id,
        team_name=team_in.team_name,
        federation=team_in.federation_code,
        discipline=team_in.discipline,
        current_level=team_in.current_level,
        is_active=True
    )
    session.add(team)
    session.flush()

    # Add team members
    member1 = TeamMember(
        team_id=team.id,
        skater_id=skater1_uuid,
        role="partner"
    )
    member2 = TeamMember(
        team_id=team.id,
        skater_id=skater2_uuid,
        role="partner"
    )
    session.add(member1)
    session.add(member2)

    session.commit()
    session.refresh(team)

    return TeamRead(
        id=str(team.id),
        team_name=team.team_name,
        partner1_name=skater1.full_name,
        partner2_name=skater2.full_name,
        federation_code=federation.code,
        federation_name=federation.name,
        federation_iso_code=federation.iso_code,
        country_name=federation.country_name,
        discipline=team.discipline,
        current_level=team.current_level,
        is_active=team.is_active
    )


@router.get("/", response_model=List[TeamRead])
def list_teams(
    *,
    session: Session = Depends(get_session),
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    current_user: Profile = Depends(get_current_user),
) -> List[TeamRead]:
    """
    List all teams for the current coach.

    Returns team information including partner names and federation details.
    """
    # Query teams for this coach
    query = select(Team).where(Team.coach_id == current_user.id)

    if active_only:
        query = query.where(Team.is_active == True)

    statement = query.offset(skip).limit(limit)
    teams = session.exec(statement).all()

    result = []
    for team in teams:
        # Get team members
        members = session.exec(
            select(TeamMember).where(TeamMember.team_id == team.id)
        ).all()

        if len(members) != 2:
            continue  # Skip teams without exactly 2 members

        # Get skater profiles
        skater1 = session.get(Profile, members[0].skater_id)
        skater2 = session.get(Profile, members[1].skater_id)

        if not skater1 or not skater2:
            continue  # Skip if skaters not found

        # Get federation details
        federation = session.exec(
            select(Federation).where(Federation.code == team.federation)
        ).first()

        result.append(
            TeamRead(
                id=str(team.id),
                team_name=team.team_name,
                partner1_name=skater1.full_name,
                partner2_name=skater2.full_name,
                federation_code=team.federation,
                federation_name=federation.name if federation else None,
                federation_iso_code=federation.iso_code if federation else None,
                country_name=federation.country_name if federation else None,
                discipline=team.discipline,
                current_level=team.current_level,
                is_active=team.is_active
            )
        )

    return result


@router.patch("/{team_id}/archive", response_model=TeamRead)
def archive_team(
    *,
    session: Session = Depends(get_session),
    team_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
) -> TeamRead:
    """Archive a team (set is_active=False)."""
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Verify coach owns this team
    if team.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    team.is_active = False
    session.add(team)
    session.commit()
    session.refresh(team)

    # Get team members for response
    members = session.exec(
        select(TeamMember).where(TeamMember.team_id == team.id)
    ).all()

    skater1 = session.get(Profile, members[0].skater_id) if len(members) > 0 else None
    skater2 = session.get(Profile, members[1].skater_id) if len(members) > 1 else None

    # Get federation details
    federation = session.exec(
        select(Federation).where(Federation.code == team.federation)
    ).first()

    return TeamRead(
        id=str(team.id),
        team_name=team.team_name,
        partner1_name=skater1.full_name if skater1 else "",
        partner2_name=skater2.full_name if skater2 else "",
        federation_code=team.federation,
        federation_name=federation.name if federation else None,
        federation_iso_code=federation.iso_code if federation else None,
        country_name=federation.country_name if federation else None,
        discipline=team.discipline,
        current_level=team.current_level,
        is_active=team.is_active
    )


@router.patch("/{team_id}/restore", response_model=TeamRead)
def restore_team(
    *,
    session: Session = Depends(get_session),
    team_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
) -> TeamRead:
    """Restore an archived team (set is_active=True)."""
    team = session.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Verify coach owns this team
    if team.coach_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    team.is_active = True
    session.add(team)
    session.commit()
    session.refresh(team)

    # Get team members for response
    members = session.exec(
        select(TeamMember).where(TeamMember.team_id == team.id)
    ).all()

    skater1 = session.get(Profile, members[0].skater_id) if len(members) > 0 else None
    skater2 = session.get(Profile, members[1].skater_id) if len(members) > 1 else None

    # Get federation details
    federation = session.exec(
        select(Federation).where(Federation.code == team.federation)
    ).first()

    return TeamRead(
        id=str(team.id),
        team_name=team.team_name,
        partner1_name=skater1.full_name if skater1 else "",
        partner2_name=skater2.full_name if skater2 else "",
        federation_code=team.federation,
        federation_name=federation.name if federation else None,
        federation_iso_code=federation.iso_code if federation else None,
        country_name=federation.country_name if federation else None,
        discipline=team.discipline,
        current_level=team.current_level,
        is_active=team.is_active
    )
