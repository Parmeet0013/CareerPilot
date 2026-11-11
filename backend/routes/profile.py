import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models import Profile
from backend.schemas import ProfileResponse, ProfileUpdate
from backend.agent.tools import parse_resume

router = APIRouter(prefix="/api/profile", tags=["Profile"])


def profile_to_response(profile: Profile) -> ProfileResponse:
    return ProfileResponse(
        id=profile.id,
        name=profile.name,
        email=profile.email,
        education=profile.education,
        skills=profile.skills_json or [],
        projects=profile.projects_json or [],
        experience=profile.experience_json or [],
        target_roles=profile.target_roles_json or [],
        preferences=profile.preferences_json or {},
        resume_filename=profile.resume_filename,
        parsed_at=profile.parsed_at,
    )


@router.get("", response_model=ProfileResponse)
def get_profile(db: Session = Depends(get_db)):
    profile = db.query(Profile).first()
    if not profile:
        raise HTTPException(status_code=404, detail="No profile found. Please upload a resume.")
    return profile_to_response(profile)


@router.put("", response_model=ProfileResponse)
def update_profile(update_data: ProfileUpdate, db: Session = Depends(get_db)):
    profile = db.query(Profile).first()
    if not profile:
        # Create new profile if none exists
        profile = Profile()
        db.add(profile)

    if update_data.name is not None:
        profile.name = update_data.name
    if update_data.email is not None:
        profile.email = update_data.email
    if update_data.education is not None:
        profile.education = update_data.education
    if update_data.skills is not None:
        profile.skills_json = update_data.skills
    if update_data.projects is not None:
        profile.projects_json = [p.dict() for p in update_data.projects]
    if update_data.experience is not None:
        profile.experience_json = [e.dict() for e in update_data.experience]
    if update_data.target_roles is not None:
        profile.target_roles_json = update_data.target_roles
    if update_data.preferences is not None:
        profile.preferences_json = update_data.preferences

    db.commit()
    db.refresh(profile)
    return profile_to_response(profile)


@router.post("/upload", response_model=ProfileResponse)
async def upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    upload_dir = os.path.join(base_dir, "outputs", "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        profile = parse_resume(file_path=file_path, filename=file.filename, db=db)
        return profile_to_response(profile)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")
