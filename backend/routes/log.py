from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models import ActionLog
from backend.schemas import ActionLogResponse

router = APIRouter(prefix="/api/log", tags=["Log"])


@router.get("", response_model=List[ActionLogResponse])
def get_logs(db: Session = Depends(get_db)):
    return db.query(ActionLog).order_by(ActionLog.timestamp.desc()).limit(100).all()
