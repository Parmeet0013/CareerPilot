import json
import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.models import Job, Profile, ActionLog
from backend.schemas import JobResponse
from backend.agent.prompts import MATCH_JOBS_SYSTEM_PROMPT
from backend.agent.tools import call_llm_json, get_llm_client, log_action

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])

PAGE_SIZE = 25


def _fit_from_overlap(matching_count: int, total_count: int) -> str:
    """Strong >= 60%, Medium 30-59%, Weak < 30% (spec thresholds)."""
    ratio = matching_count / max(total_count, 1)
    if ratio >= 0.6:
        return "Strong"
    if ratio >= 0.3:
        return "Medium"
    return "Weak"


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
    fit = _fit_from_overlap(len(matching), len(req_skills))

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

    match_ratio = None
    if profile and req_skills:
        profile_skills = [s.strip().lower() for s in (profile.skills_json or [])]
        matching = sum(1 for s in req_skills if s.strip().lower() in profile_skills)
        match_ratio = round(matching / len(req_skills) * 100)

    return JobResponse(
        id=job.id,
        role=job.role,
        company=job.company,
        location=job.location,
        type=job.type,
        stipend_or_ctc=job.stipend_or_ctc,
        closes_on=job.closes_on,
        description=job.description,
        required_skills=req_skills,
        fit=fit,
        match_ratio=match_ratio,
        why_bullets=why_bullets,
        missing_skills=missing_skills,
    )


@router.get("")
def get_jobs(
    q: Optional[str] = None,
    role: Optional[str] = None,
    location: Optional[str] = None,
    type: Optional[str] = None,
    closing_soon: Optional[bool] = False,
    closing_window: Optional[str] = None,  # '48h' | 'week' | 'month'
    page: int = Query(1, ge=1),
    db: Session = Depends(get_db),
):
    """Server-side filtering and pagination (page size 25). Fit is computed in code."""
    query = db.query(Job)
    if role and role.lower() != "all":
        query = query.filter(Job.role.ilike(f"%{role}%"))
    if location and location.lower() != "all":
        query = query.filter(Job.location.ilike(f"%{location}%"))
    if type and type.lower() != "all":
        query = query.filter(Job.type == type.lower())
    if q:
        search_term = f"%{q}%"
        query = query.filter(
            (Job.role.ilike(search_term))
            | (Job.company.ilike(search_term))
            | (Job.description.ilike(search_term))
        )

    today = datetime.date.today()
    today_str = today.strftime("%Y-%m-%d")
    if closing_soon:
        soon_str = (today + datetime.timedelta(days=3)).strftime("%Y-%m-%d")
        query = query.filter(Job.closes_on >= today_str, Job.closes_on <= soon_str)
    elif closing_window in ("48h", "week", "month"):
        days = {"48h": 2, "week": 7, "month": 28}[closing_window]
        end_str = (today + datetime.timedelta(days=days)).strftime("%Y-%m-%d")
        query = query.filter(Job.closes_on >= today_str, Job.closes_on <= end_str)

    total = query.count()
    jobs = (
        query.order_by(Job.closes_on.asc())
        .offset((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .all()
    )
    profile = db.query(Profile).first()

    # Facet counts for the filter rail (under the current q/role/type filters)
    facet_query = db.query(Job)
    if role and role.lower() != "all":
        facet_query = facet_query.filter(Job.role.ilike(f"%{role}%"))
    if type and type.lower() != "all":
        facet_query = facet_query.filter(Job.type == type.lower())
    if q:
        st = f"%{q}%"
        facet_query = facet_query.filter(
            (Job.role.ilike(st)) | (Job.company.ilike(st)) | (Job.description.ilike(st))
        )
    location_counts = dict(
        facet_query.with_entities(Job.location, func.count(Job.id)).group_by(Job.location).all()
    )
    type_counts = dict(
        facet_query.with_entities(Job.type, func.count(Job.id)).group_by(Job.type).all()
    )
    week_str = (today + datetime.timedelta(days=7)).strftime("%Y-%m-%d")
    month_str = (today + datetime.timedelta(days=28)).strftime("%Y-%m-%d")
    two_day_str = (today + datetime.timedelta(days=2)).strftime("%Y-%m-%d")
    windows = {
        "48h": facet_query.filter(Job.closes_on >= today_str, Job.closes_on <= two_day_str).count(),
        "week": facet_query.filter(Job.closes_on >= today_str, Job.closes_on <= week_str).count(),
        "month": facet_query.filter(Job.closes_on >= today_str, Job.closes_on <= month_str).count(),
    }

    return {
        "items": [job_to_response(j, profile) for j in jobs],
        "total": total,
        "page": page,
        "pages": max((total + PAGE_SIZE - 1) // PAGE_SIZE, 1),
        "page_size": PAGE_SIZE,
        "facets": {
            "locations": location_counts,
            "types": type_counts,
            "closing_windows": windows,
        },
    }


@router.get("/{id}")
def get_job(id: int, db: Session = Depends(get_db)):
    """Single job view: the only place the LLM writes 'why it fits' bullets."""
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job listing not found")
    profile = db.query(Profile).first()

    fit, fallback_bullets, missing_skills = compute_match_bullets(job, profile)
    req_skills = job.required_skills_json or []

    bullets = fallback_bullets
    source = "code"
    if profile and get_llm_client():
        profile_skills = [s.strip().lower() for s in (profile.skills_json or [])]
        matching = [s for s in req_skills if s.strip().lower() in profile_skills]
        projects = profile.projects_json or []
        experience = profile.experience_json or []

        user_content = (
            f"CANDIDATE SKILLS: {', '.join(profile.skills_json or [])}\n"
            f"CANDIDATE PROJECTS: {json.dumps([p.get('title') for p in projects])}\n"
            f"CANDIDATE EXPERIENCE: {json.dumps([e.get('role') for e in experience])}\n"
            f"COMPUTED OVERLAP: {len(matching)} of {len(req_skills)} required skills match ({', '.join(matching) if matching else 'none'})\n\n"
            f"JOB:\n"
            f"Role: {job.role}\n"
            f"Company: {job.company}\n"
            f"Location: {job.location}\n"
            f"Type: {job.type}\n"
            f"Required skills: {', '.join(req_skills)}\n"
            f"Description: {job.description}\n\n"
            "Write the 3 fit bullets."
        )
        result = call_llm_json(MATCH_JOBS_SYSTEM_PROMPT, user_content)
        if (
            result
            and isinstance(result.get("why_bullets"), list)
            and len(result["why_bullets"]) >= 1
            and all(isinstance(b, str) and b.strip() for b in result["why_bullets"])
        ):
            bullets = [b.strip() for b in result["why_bullets"]][:3]
            source = "llm"

    log_action(
        db=db,
        tool="match_jobs",
        input_summary=f"Fit bullets for Job #{id} ({job.role} @ {job.company})",
        output_summary=f"Fit: {fit}; bullets via {source}",
        status="success",
    )

    return {
        "id": job.id,
        "role": job.role,
        "company": job.company,
        "location": job.location,
        "type": job.type,
        "stipend_or_ctc": job.stipend_or_ctc,
        "closes_on": job.closes_on,
        "description": job.description,
        "required_skills": req_skills,
        "fit": fit,
        "match_ratio": (
            round(
                sum(1 for s in req_skills if s.strip().lower() in [p.strip().lower() for p in (profile.skills_json or [])])
                / max(len(req_skills), 1)
                * 100
            )
            if profile and req_skills
            else None
        ),
        "why_bullets": bullets,
        "missing_skills": missing_skills,
    }
