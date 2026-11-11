import datetime
import json
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models import Application, Job, Profile, ActionLog
from backend.schemas import (
    ApplicationResponse,
    PrepareApplicationRequest,
    UpdateApplicationRequest,
)
from backend.routes.jobs import job_to_response
from backend.agent.graph import run_prepare_application_agent

router = APIRouter(prefix="/api/applications", tags=["Applications"])


def app_to_response(app: Application) -> ApplicationResponse:
    job_resp = job_to_response(app.job) if app.job else None
    return ApplicationResponse(
        id=app.id,
        job_id=app.job_id,
        status=app.status,
        tailored_resume_path=app.tailored_resume_path,
        cover_note=app.cover_note,
        created_at=app.created_at,
        updated_at=app.updated_at,
        applied_at=app.applied_at,
        job=job_resp,
    )


@router.get("", response_model=List[ApplicationResponse])
def get_applications(db: Session = Depends(get_db)):
    apps = db.query(Application).order_by(Application.updated_at.desc()).all()
    return [app_to_response(a) for a in apps]


@router.get("/by-job/{job_id}")
def get_application_by_job(job_id: int, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.job_id == job_id).first()
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    profile = db.query(Profile).first()

    return {
        "application_id": app.id if app else None,
        "job_id": job.id,
        "status": app.status if app else "drafted",
        "tailored_resume_path": app.tailored_resume_path if app else None,
        "cover_note": app.cover_note if app else None,
        "job": {
            "id": job.id,
            "role": job.role,
            "company": job.company,
            "location": job.location,
            "type": job.type,
            "closes_on": job.closes_on,
            "required_skills": json.loads(job.required_skills_json or "[]"),
        },
        "master_profile": {
            "name": profile.name if profile else "Candidate",
            "email": profile.email if profile else "",
            "education": profile.education if profile else "",
            "skills": json.loads(profile.skills_json or "[]") if profile else [],
            "projects": json.loads(profile.projects_json or "[]") if profile else [],
            "experience": json.loads(profile.experience_json or "[]") if profile else [],
        }
    }


@router.post("/prepare")
def prepare_application_endpoint(payload: PrepareApplicationRequest, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Run LangGraph Agent Orchestrator
    try:
        agent_result = run_prepare_application_agent(job_id=payload.job_id, db=db)
        return agent_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent tailoring failed: {str(e)}")


@router.post("/save", response_model=ApplicationResponse)
def save_application(payload: PrepareApplicationRequest, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    app = db.query(Application).filter(Application.job_id == payload.job_id).first()
    if not app:
        app = Application(
            job_id=payload.job_id,
            status="saved",
            cover_note=None,
        )
        db.add(app)
    else:
        if app.status not in ["applied", "interview", "offer", "awaiting_approval"]:
            app.status = "saved"

    db.commit()
    db.refresh(app)
    return app_to_response(app)


@router.post("/{id}/reminder")
def generate_application_reminder(id: int, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    from backend.agent.tools import create_reminder
    job = app.job
    rem = create_reminder(
        application_id=app.id,
        title=f"Application Deadline: {job.role} @ {job.company}",
        due_on=job.closes_on,
        db=db,
    )
    return {"message": "Reminder created", "ics_path": rem.ics_path}


@router.post("/{id}/approve")
def approve_application(id: int, db: Session = Depends(get_db)):
    """The ONLY endpoint allowed to transition status to 'applied'."""
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app.status = "applied"
    app.applied_at = datetime.datetime.utcnow()
    app.updated_at = datetime.datetime.utcnow()

    log = ActionLog(
        timestamp=datetime.datetime.utcnow(),
        tool="approve_application",
        input_summary=f"User approved application #{app.id} for Job #{app.job_id}",
        output_summary="Application status updated to 'applied'",
        status="success",
    )
    db.add(log)
    db.commit()
    db.refresh(app)
    return app_to_response(app)


@router.post("/{id}/discard")
def discard_application(id: int, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app_id = app.id
    db.delete(app)
    db.commit()

    log = ActionLog(
        timestamp=datetime.datetime.utcnow(),
        tool="discard_application",
        input_summary=f"User discarded application #{app_id}",
        output_summary="Application record deleted",
        status="success",
    )
    db.add(log)
    db.commit()

    return {"message": f"Application #{app_id} discarded successfully"}


@router.patch("/{id}", response_model=ApplicationResponse)
def update_application(id: int, payload: UpdateApplicationRequest, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if payload.cover_note is not None:
        app.cover_note = payload.cover_note
    if payload.status is not None:
        if payload.status == "applied":
            raise HTTPException(
                status_code=400,
                detail="Cannot set status to 'applied' via PATCH. You must call POST /api/applications/{id}/approve.",
            )
        app.status = payload.status

    app.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(app)
    return app_to_response(app)
