from typing import Any, List, Union
from pydantic import AnyHttpUrl, PostgresDsn, Field, field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SkatePlan"
    API_V1_STR: str = "/api/v1"

    # Auth - Supabase
    # These values MUST be read from environment variables
    SUPABASE_URL: str = Field(default="http://kong:8000", description="Supabase API URL")
    SUPABASE_KEY: str = Field(description="Supabase Anon Key (for client-side)")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(description="Supabase Service Role Key (for backend admin operations)")
    JWT_SECRET: str = Field(description="Supabase JWT secret for token verification")
    
    # Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "skateplan"
    DATABASE_URL: Union[PostgresDsn, str] = ""

    @field_validator("DATABASE_URL", mode="before")
    def assemble_db_connection(cls, v: Union[str, None], values: Any) -> Any:
        if isinstance(v, str) and v:
            return v
        return PostgresDsn.build(
            scheme="postgresql",
            username=values.data.get("POSTGRES_USER"),
            password=values.data.get("POSTGRES_PASSWORD"),
            host=values.data.get("POSTGRES_SERVER"),
            path=f"{values.data.get('POSTGRES_DB') or ''}",
        )

    # CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    model_config = {
        "case_sensitive": True,
        "env_file": ".env",
    }

settings = Settings()