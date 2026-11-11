import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models import Application, Job, ActionLog
from backend.schemas import (
    ApplicationResponse,
    PrepareApplicationRequest,
    UpdateApplicationRequest,
)
from backend.routes.jobs import job_to_response

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


@router.post("/prepare")
def prepare_application(payload: PrepareApplicationRequest, db: Session = Depends(get_db)):
    # In Milestone 4, this triggers the LangGraph agent
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Check if existing
    app = db.query(Application).filter(Application.job_id == payload.job_id).first()
    if not app:
        app = Application(
            job_id=payload.job_id,
            status="awaiting_approval",
            cover_note=f"Dear Hiring Team at {job.company},\n\nI am writing to apply for the {job.role} position...",
        )
        db.add(app)
        db.commit()
        db.refresh(app)

    return app_to_response(app)


@router.post("/{id}/approve")
def approve_application(id: int, db: Session = Depends(get_db)):
    # The ONLY endpoint allowed to set status to 'applied'
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
        output_summary="Status changed to 'applied'",
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

    db.delete(app)
    db.commit()
    return {"message": f"Application #{id} discarded successfully"}


@router.patch("/{id}", response_model=ApplicationResponse)
def update_application(id: int, payload: UpdateApplicationRequest, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if payload.cover_note is not None:
        app.cover_note = payload.cover_note
    if payload.status is not None:
        if payload.status == "applied":
            raise HTTPException(status_code=400, detail="Cannot set status to 'applied' via PATCH. Use POST /approve.")
        app.status = payload.status

    app.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(app)
    return app_to_response(app)
