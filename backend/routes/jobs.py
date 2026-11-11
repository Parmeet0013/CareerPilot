import json
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models import Job, Profile
from backend.schemas import JobResponse

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


def job_to_response(job: Job, profile: Optional[Profile] = None) -> JobResponse:
    req_skills = json.loads(job.required_skills_json or "[]")
    fit = "Medium"
    why_bullets = [
        f"Matches role requirements for {job.role}",
        f"Located in target area: {job.location}",
        f"Key tech requirements include {', '.join(req_skills[:3])}",
    ]
    missing_skills = []

    if profile:
        profile_skills = [s.lower() for s in json.loads(profile.skills_json or "[]")]
        matching = [s for s in req_skills if s.lower() in profile_skills]
        missing = [s for s in req_skills if s.lower() not in profile_skills]
        overlap_ratio = len(matching) / max(len(req_skills), 1)

        if overlap_ratio >= 0.6:
            fit = "Strong"
        elif overlap_ratio >= 0.3:
            fit = "Medium"
        else:
            fit = "Weak"

        why_bullets = [
            f"You possess {len(matching)} of {len(req_skills)} required skills ({', '.join(matching[:3])}).",
            f"Role aligns with your target preferences for {job.type} in {job.location}.",
            f"Your background matches the responsibilities described for {job.company}.",
        ]
        missing_skills = missing

    return JobResponse(
        id=job.id,
        role=job.role,
        company=job.company,
        location=job.location,
        type=job.type,
        closes_on=job.closes_on,
        description=job.description,
        required_skills=req_skills,
        fit=fit,
        why_bullets=why_bullets,
        missing_skills=missing_skills,
    )


@router.get("", response_model=List[JobResponse])
def get_jobs(
    role: Optional[str] = None,
    location: Optional[str] = None,
    type: Optional[str] = None,
    closing_soon: Optional[bool] = False,
    db: Session = Depends(get_db),
):
    query = db.query(Job)
    if role:
        query = query.filter(Job.role.ilike(f"%{role}%"))
    if location:
        query = query.filter(Job.location.ilike(f"%{location}%"))
    if type:
        query = query.filter(Job.type == type)

    today_str = datetime.date.today().strftime("%Y-%m-%d")
    soon_str = (datetime.date.today() + datetime.timedelta(days=3)).strftime("%Y-%m-%d")
    if closing_soon:
        query = query.filter(Job.closes_on >= today_str, Job.closes_on <= soon_str)

    jobs = query.order_by(Job.closes_on.asc()).all()
    profile = db.query(Profile).first()

    return [job_to_response(j, profile) for j in jobs]


@router.get("/{id}", response_model=JobResponse)
def get_job(id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job listing not found")
    profile = db.query(Profile).first()
    return job_to_response(job, profile)
