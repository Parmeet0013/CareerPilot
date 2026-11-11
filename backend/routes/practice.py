import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models import InterviewSession, InterviewTurn, WeakArea, ActionLog
from backend.schemas import (
    InterviewSessionResponse,
    InterviewTurnResponse,
    PracticeStartRequest,
    PracticeAnswerRequest,
    WeakAreaResponse,
)

router = APIRouter(prefix="/api/practice", tags=["Practice"])


@router.post("/start", response_model=InterviewSessionResponse)
def start_practice(payload: PracticeStartRequest, db: Session = Depends(get_db)):
    # Check for lowest scoring weak area to prioritize
    weakest = db.query(WeakArea).order_by(WeakArea.last_score.asc()).first()
    skill_focus = weakest.skill if weakest else "Data Structures & Backend Architecture"

    session = InterviewSession(
        role=payload.role,
        job_id=payload.job_id,
        started_at=datetime.datetime.utcnow(),
        summary=f"Mock interview for {payload.role}. Focus area: {skill_focus}.",
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # First turn question
    initial_question = (
        f"In your recent projects, how did you handle query performance and indexing in databases? "
        f"Specifically, what trade-offs did you consider when adding compound indexes?"
    )
    first_turn = InterviewTurn(
        session_id=session.id,
        question=initial_question,
        skill_tag=skill_focus,
    )
    db.add(first_turn)

    log = ActionLog(
        timestamp=datetime.datetime.utcnow(),
        tool="start_interview",
        input_summary=f"Started practice session for {payload.role}",
        output_summary=f"Selected focus skill: {skill_focus}",
        status="success",
    )
    db.add(log)
    db.commit()
    db.refresh(session)

    return session


@router.post("/answer", response_model=InterviewTurnResponse)
def answer_turn(payload: PracticeAnswerRequest, db: Session = Depends(get_db)):
    # Find last incomplete turn
    turn = (
        db.query(InterviewTurn)
        .filter(InterviewTurn.session_id == payload.session_id, InterviewTurn.answer.is_(None))
        .first()
    )
    if not turn:
        # Create a new turn evaluation
        turn = (
            db.query(InterviewTurn)
            .filter(InterviewTurn.session_id == payload.session_id)
            .order_by(InterviewTurn.id.desc())
            .first()
        )
        if not turn:
            raise HTTPException(status_code=404, detail="No active turn found for this session")

    turn.answer = payload.answer
    # Default evaluation before full LLM integration in Milestone 6
    turn.feedback = "Solid explanation of compound index column ordering and write latency overhead."
    turn.score_1_to_5 = 4
    turn.skill_tag = turn.skill_tag or "Database Indexing"

    # Update weak areas
    weak = db.query(WeakArea).filter(WeakArea.skill == turn.skill_tag).first()
    if weak:
        weak.last_score = turn.score_1_to_5
        weak.times_seen += 1
        weak.updated_at = datetime.datetime.utcnow()
    else:
        weak = WeakArea(
            skill=turn.skill_tag,
            last_score=turn.score_1_to_5,
            times_seen=1,
            updated_at=datetime.datetime.utcnow(),
        )
        db.add(weak)

    log = ActionLog(
        timestamp=datetime.datetime.utcnow(),
        tool="run_interview_turn",
        input_summary=f"Evaluated answer for session #{payload.session_id}",
        output_summary=f"Score: {turn.score_1_to_5}/5, Tag: {turn.skill_tag}",
        status="success",
    )
    db.add(log)
    db.commit()
    db.refresh(turn)

    return turn


@router.get("/memory", response_model=List[WeakAreaResponse])
def get_memory(db: Session = Depends(get_db)):
    return db.query(WeakArea).order_by(WeakArea.last_score.asc()).all()
