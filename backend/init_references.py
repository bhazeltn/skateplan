import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlmodel import SQLModel, Session
from app.core.db import engine
from app.models.reference_models import AdultAgeClass, CompetitiveLevel, TestLevel
from app.core.seeds import seed_reference_data

def init_references():
    print("Creating Reference tables...")
    SQLModel.metadata.create_all(engine)
    print("Tables created.")
    
    with Session(engine) as session:
        print("Seeding reference data...")
        seed_reference_data(session)
        print("Done.")

if __name__ == "__main__":
    init_references()
