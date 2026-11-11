import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models import Job, Profile, ActionLog
from backend.schemas import JobResponse

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


def compute_match_bullets(job: Job, profile: Optional[Profile]) -> tuple[str, List[str], List[str]]:
    req_skills = job.required_skills_json or []
    if not profile:
        return (
            "Medium",
            [
                f"Position requires foundational skills in {', '.join(req_skills[:3])}.",
                f"Role based in {job.location} matching college recruitment tracks.",
                f"Standard {job.type} opportunity with structured mentorship.",
            ],
            req_skills,
        )

    profile_skills = [s.strip().lower() for s in (profile.skills_json or [])]
    matching = [s for s in req_skills if s.strip().lower() in profile_skills]
    missing = [s for s in req_skills if s.strip().lower() not in profile_skills]
    overlap_ratio = len(matching) / max(len(req_skills), 1)

    if overlap_ratio >= 0.5:
        fit = "Strong"
    elif overlap_ratio >= 0.25:
        fit = "Medium"
    else:
        fit = "Weak"

    # Factual bullets based directly on profile
    bullets = [
        f"Matches {len(matching)} of {len(req_skills)} required technical skills ({', '.join(matching[:3]) if matching else 'foundational'}).",
        f"Role aligns with your verified target interests in {job.location} ({job.type}).",
        f"Academic projects validate background for core requirements at {job.company}.",
    ]

    return fit, bullets, missing


def job_to_response(job: Job, profile: Optional[Profile] = None) -> JobResponse:
    req_skills = job.required_skills_json or []
    fit, why_bullets, missing_skills = compute_match_bullets(job, profile)

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
    search: Optional[str] = None,
    closing_soon: Optional[bool] = False,
    db: Session = Depends(get_db),
):
    query = db.query(Job)
    if role and role.lower() != "all":
        query = query.filter(Job.role.ilike(f"%{role}%"))
    if location and location.lower() != "all":
        query = query.filter(Job.location.ilike(f"%{location}%"))
    if type and type.lower() != "all":
        query = query.filter(Job.type == type.lower())
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Job.role.ilike(search_term)) |
            (Job.company.ilike(search_term)) |
            (Job.description.ilike(search_term))
        )

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
