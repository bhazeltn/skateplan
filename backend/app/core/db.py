from sqlmodel import SQLModel, create_engine, Session
from app.core.config import settings

engine = create_engine(str(settings.DATABASE_URL), echo=True)

def init_db():
    """
    Initialize database schema.

    NOTE: This function is DEPRECATED. Use Alembic migrations instead:
        alembic upgrade head

    Keeping this for backwards compatibility during development,
    but it should NOT be used in production.
    """
    # DEPRECATED: Use Alembic migrations instead
    # SQLModel.metadata.create_all(engine)
    pass

def get_session():
    with Session(engine) as session:
        yield session
