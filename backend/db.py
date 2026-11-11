import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Postgres (Neon/Supabase) when DATABASE_URL is set, local SQLite otherwise.
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if not DATABASE_URL:
    DB_PATH = os.path.join(BASE_DIR, "careerpilot.db")
    DATABASE_URL = f"sqlite:///{DB_PATH}"

IS_SQLITE = DATABASE_URL.startswith("sqlite")

# Free cloud databases suspend when idle, so pool_pre_ping revalidates dead
# connections and pool_recycle rotates them before the server closes them.
engine_kwargs = {"pool_pre_ping": True, "pool_recycle": 300}
if IS_SQLITE:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # psycopg v3 handles sslmode via the URL (e.g. ?sslmode=require).
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
