import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models import Profile
from backend.schemas import ProfileResponse, ProfileUpdate

router = APIRouter(prefix="/api/profile", tags=["Profile"])


def profile_to_response(profile: Profile) -> ProfileResponse:
    return ProfileResponse(
        id=profile.id,
        name=profile.name,
        email=profile.email,
        education=profile.education,
        skills=json.loads(profile.skills_json or "[]"),
        projects=json.loads(profile.projects_json or "[]"),
        experience=json.loads(profile.experience_json or "[]"),
        target_roles=json.loads(profile.target_roles_json or "[]"),
        preferences=json.loads(profile.preferences_json or "{}"),
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
        raise HTTPException(status_code=404, detail="No profile found to update.")

    if update_data.name is not None:
        profile.name = update_data.name
    if update_data.email is not None:
        profile.email = update_data.email
    if update_data.education is not None:
        profile.education = update_data.education
    if update_data.skills is not None:
        profile.skills_json = json.dumps(update_data.skills)
    if update_data.projects is not None:
        profile.projects_json = json.dumps([p.dict() for p in update_data.projects])
    if update_data.experience is not None:
        profile.experience_json = json.dumps([e.dict() for e in update_data.experience])
    if update_data.target_roles is not None:
        profile.target_roles_json = json.dumps(update_data.target_roles)
    if update_data.preferences is not None:
        profile.preferences_json = json.dumps(update_data.preferences)

    db.commit()
    db.refresh(profile)
    return profile_to_response(profile)


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Will be connected to agent parse_resume in Milestone 2
    return {"message": "Upload endpoint ready", "filename": file.filename}
