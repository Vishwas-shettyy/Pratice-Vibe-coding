import os
import sys
import argon2

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import create_app
from app.extensions import db
from app.models import Officer

def seed_db():
    app = create_app()
    with app.app_context():
        db.create_all()
        if not Officer.query.filter_by(email="officer@example.com").first():
            ph = argon2.PasswordHasher()
            pwd = os.getenv("DEMO_PASSWORD", "ResqDemo123!")
            hashed = ph.hash(pwd)
            demo_officer = Officer(
                email="officer@example.com",
                password_hash=hashed,
                full_name="Demo Officer",
                officer_id="RESQ-8821",
                designation="Disaster Management Officer",
                department="District Disaster Management Authority",
                location="Madikeri",
                district="Kodagu",
                state="Karnataka",
                phone="+91 98765 43210"
            )
            db.session.add(demo_officer)
            db.session.commit()
            print("Demo officer created. Email: officer@example.com, Password:", pwd)
        else:
            print("Demo officer already exists.")

if __name__ == '__main__':
    seed_db()
