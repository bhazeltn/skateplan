"""Read schemas for the coach-facing skater roster list and profile hub."""
from pydantic import BaseModel, ConfigDict


class SkaterProgramOut(BaseModel):
    """A saved program layout shown on the Programs tab."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    program_type: str
    title: str
    season: str | None = None
    is_archived: bool = False


class SkaterRestrictionOut(BaseModel):
    """An active load restriction shown on the Health & Load tab."""

    id: str
    title: str
    restrictions: str | None = None
    status: str


class SkaterSummaryOut(BaseModel):
    """Identity summary shared by the roster list and the profile header.

    ``programs`` and ``restrictions`` default to empty lists so the schema stays
    backward compatible; the roster list now populates them to avoid a frontend
    N+1, while callers that build only the identity fields still validate.
    """

    skater_id: int
    first_name: str
    last_name: str
    home_club: str | None = None
    competitive_level: str | None = None
    federation_name: str | None = None
    country_code: str | None = None
    has_active_restriction: bool
    programs: list[SkaterProgramOut] = []
    restrictions: list[SkaterRestrictionOut] = []


class SkaterDetailOut(SkaterSummaryOut):
    """Full skater profile: summary + restrictions + programs."""

    restrictions: list[SkaterRestrictionOut]
    programs: list[SkaterProgramOut]
