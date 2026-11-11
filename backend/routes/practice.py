import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.models import InterviewSession, WeakArea, ActionLog
from backend.schemas import (
    InterviewSessionResponse,
    PracticeAnswerResponse,
    PracticeStartRequest,
    PracticeAnswerRequest,
    WeakAreaResponse,
)
from backend.agent.tools import run_interview_turn

router = APIRouter(prefix="/api/practice", tags=["Practice"])


@router.post("/start", response_model=InterviewSessionResponse)
def start_practice(payload: PracticeStartRequest, db: Session = Depends(get_db)):
    """Creates a session and asks the first question via run_interview_turn."""
    session = InterviewSession(
        role=payload.role,
        job_id=payload.job_id,
        started_at=datetime.datetime.utcnow(),
        summary=f"Mock interview for {payload.role}.",
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    try:
        run_interview_turn(session_id=session.id, answer=None, db=db)
    except Exception as exc:
        db.delete(session)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Could not generate the first question: {exc}")

    db.add(ActionLog(
        timestamp=datetime.datetime.utcnow(),
        tool="start_interview",
        input_summary=f"Started practice session for {payload.role}",
        output_summary="First question generated",
        status="success",
    ))
    db.commit()
    db.refresh(session)
    return session


@router.post("/answer", response_model=PracticeAnswerResponse)
def answer_turn(payload: PracticeAnswerRequest, db: Session = Depends(get_db)):
    """Evaluates the answer, updates weak areas, and returns the next question."""
    try:
        return run_interview_turn(session_id=payload.session_id, answer=payload.answer, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {exc}")


@router.get("/session/{session_id}", response_model=InterviewSessionResponse)
def get_session(session_id: int, db: Session = Depends(get_db)):
    """Returns a session with its turns, so practice can be resumed."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/memory", response_model=list[WeakAreaResponse])
def get_memory(db: Session = Depends(get_db)):
    """Weak areas across all sessions, weakest first."""
    return db.query(WeakArea).order_by(WeakArea.last_score.asc()).all()
