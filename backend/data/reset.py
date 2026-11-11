"""Reset script: drops all tables, recreates the schema, and reseeds demo data.

Works on both SQLite and Postgres. Usage: python -m backend.data.reset
"""

from backend.db import engine, SessionLocal, Base
from backend.data.seed import seed_database


def reset_database():
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Recreating schema...")
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        seed_database(session)


if __name__ == "__main__":
    reset_database()
