import csv
import io
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.models import ActionLog
from backend.schemas import ActionLogResponse

router = APIRouter(prefix="/api/log", tags=["Log"])


@router.get("", response_model=List[ActionLogResponse])
def get_logs(db: Session = Depends(get_db)):
    return db.query(ActionLog).order_by(ActionLog.timestamp.desc()).limit(100).all()


@router.get("/export")
def export_logs_csv(db: Session = Depends(get_db)):
    """Audit trail as CSV download (feeds the Export Ledger / Export Audit CSV buttons)."""
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["timestamp", "tool", "input_summary", "output_summary", "status"])
    rows = db.query(ActionLog).order_by(ActionLog.timestamp.desc()).limit(1000).all()
    for row in rows:
        ts = row.timestamp.strftime("%Y-%m-%d %H:%M:%S") if isinstance(row.timestamp, datetime) else row.timestamp
        writer.writerow([ts, row.tool, row.input_summary, row.output_summary, row.status])
    return PlainTextResponse(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=careerpilot_audit_log.csv"},
    )
