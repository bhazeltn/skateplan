import sys
import os
# Add the backend directory to sys.path so imports work
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlmodel import Session, select
from app.core.db import engine, init_db
from app.models.user_models import Profile
from app.core.security import get_password_hash
import uuid

def seed_admin():
    with Session(engine) as session:
        email = "admin@skateplan.bradnet.net"
        user = session.exec(select(Profile).where(Profile.email == email)).first()
        
        if not user:
            print(f"Creating user {email}...")
            user = Profile(
                id=uuid.uuid4(),
                role="coach",
                full_name="Admin Coach",
                email=email,
                hashed_password=get_password_hash("password")
            )
            session.add(user)
        else:
            print(f"Updating user {email} password...")
            user.hashed_password = get_password_hash("password")
            session.add(user)
            
        session.commit()
        print("User seeded successfully.")

if __name__ == "__main__":
    seed_admin()
