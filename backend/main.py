import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from backend.db import engine, Base, SessionLocal
from backend.models import Profile, Job
from backend.data.seed import seed_database
from backend.routes import profile, jobs, applications, practice, log, today

# Create DB tables if not present
Base.metadata.create_all(bind=engine)

# Auto-seed if empty
with SessionLocal() as db:
    if db.query(Job).count() == 0:
        seed_database(db)

app = FastAPI(title="CareerPilot API", version="1.0.0")

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(profile.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(practice.router)
app.include_router(log.router)
app.include_router(today.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "CareerPilot"}


@app.get("/api/files/{filename}")
def serve_file(filename: str):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    outputs_dir = os.path.join(base_dir, "outputs")
    data_dir = os.path.join(base_dir, "data")

    # Check outputs dir first, then data dir
    file_path = os.path.join(outputs_dir, filename)
    if not os.path.exists(file_path):
        file_path = os.path.join(data_dir, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path)
