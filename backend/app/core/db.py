from sqlmodel import SQLModel, create_engine, Session
from app.core.config import settings

# engine = create_engine(str(settings.DATABASE_URL))
# For now, we will use a fallback for local development if env vars aren't set perfectly yet, 
# or ensure the string conversion happens correctly.
engine = create_engine(str(settings.DATABASE_URL), echo=True)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
