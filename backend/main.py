import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import text

load_dotenv()

from backend.db import engine, Base, SessionLocal, IS_SQLITE
from backend.models import Profile, Job  # noqa: F401 - imported for metadata
from backend.routes import profile, jobs, applications, practice, log, today

# Create tables before serving; the app must not crash if the DB is down.
db_status = {"connected": False, "engine": "sqlite" if IS_SQLITE else "postgres", "error": None}
try:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.query(Job).count() == 0:
            from backend.data.seed import seed_database
            seed_database(db)
    db_status["connected"] = True
except Exception as exc:  # DB unreachable: keep serving, report via /api/health
    db_status["error"] = str(exc)
    print(f"[startup] database unavailable: {exc}")

app = FastAPI(title="CareerPilot API", version="1.0.0")

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(practice.router)
app.include_router(log.router)
app.include_router(today.router)


@app.get("/api/health")
def health_check():
    """Reports app and database status; never raises."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status["connected"] = True
        db_status["error"] = None
    except Exception as exc:
        db_status["connected"] = False
        db_status["error"] = str(exc)

    return {
        "status": "ok" if db_status["connected"] else "degraded",
        "app": "CareerPilot",
        "database": db_status,
    }


@app.get("/api/files/{filename}")
def serve_file(filename: str):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    outputs_dir = os.path.join(base_dir, "outputs")
    data_dir = os.path.join(base_dir, "data")

    file_path = os.path.join(outputs_dir, filename)
    if not os.path.exists(file_path):
        file_path = os.path.join(data_dir, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path)
