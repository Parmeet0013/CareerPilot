import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models import Application, Job, WeakArea
from backend.schemas import TodayResponse, AttentionItem, TodayCounts, DayDeadline

router = APIRouter(prefix="/api/today", tags=["Today"])


@router.get("", response_model=TodayResponse)
def get_today_dashboard(db: Session = Depends(get_db)):
    today = datetime.date.today()
    today_formatted = today.strftime("%A, %d %b")

    # Counts
    applied_count = db.query(Application).filter(Application.status == "applied").count()
    interview_count = db.query(Application).filter(Application.status == "interview").count()
    saved_count = db.query(Application).filter(Application.status.in_(["saved", "drafted", "awaiting_approval"])).count()

    attention_items = []

    # 1. Drafts to review / awaiting approval
    awaiting = (
        db.query(Application)
        .filter(Application.status == "awaiting_approval")
        .order_by(Application.updated_at.desc())
        .first()
    )
    if awaiting and awaiting.job:
        attention_items.append(
            AttentionItem(
                id=f"app-{awaiting.id}",
                type="review_draft",
                title=f"Review tailored application for {awaiting.job.company}",
                subtitle=f"{awaiting.job.role} • Closes on {awaiting.job.closes_on}",
                action_label="Review draft",
                action_url=f"/prepare/{awaiting.job_id}",
                badge="Awaiting approval",
                badge_variant="amber",
            )
        )

    # 2. Closing soon jobs
    today_str = today.strftime("%Y-%m-%d")
    soon_str = (today + datetime.timedelta(days=3)).strftime("%Y-%m-%d")
    closing_jobs = (
        db.query(Job)
        .filter(Job.closes_on >= today_str, Job.closes_on <= soon_str)
        .order_by(Job.closes_on.asc())
        .limit(2)
        .all()
    )
    for cj in closing_jobs:
        attention_items.append(
            AttentionItem(
                id=f"job-{cj.id}",
                type="closing_soon",
                title=f"{cj.role} @ {cj.company}",
                subtitle=f"Application window closing on {cj.closes_on}",
                action_label="Apply now",
                action_url=f"/jobs?highlight={cj.id}",
                badge="Closing soon",
                badge_variant="amber",
            )
        )

    # 3. Weak spot practice
    weakest = db.query(WeakArea).order_by(WeakArea.last_score.asc()).first()
    if weakest:
        attention_items.append(
            AttentionItem(
                id=f"weak-{weakest.id}",
                type="weak_spot",
                title=f"Practice weak area: {weakest.skill}",
                subtitle=f"Last scored {weakest.last_score}/5 • Seen {weakest.times_seen} time(s)",
                action_label="Start practice",
                action_url="/practice",
                badge="Priority focus",
                badge_variant="muted",
            )
        )

    # Week strip
    # Generate 7 days starting from Monday of current week
    start_of_week = today - datetime.timedelta(days=today.weekday())
    day_letters = ["M", "T", "W", "T", "F", "S", "S"]
    week_strip = []

    # Get closing dates for jobs in this week
    end_of_week = start_of_week + datetime.timedelta(days=6)
    week_jobs = (
        db.query(Job.closes_on)
        .filter(
            Job.closes_on >= start_of_week.strftime("%Y-%m-%d"),
            Job.closes_on <= end_of_week.strftime("%Y-%m-%d")
        )
        .all()
    )
    deadline_dates = {j[0] for j in week_jobs}

    for i in range(7):
        current_day = start_of_week + datetime.timedelta(days=i)
        date_str = current_day.strftime("%Y-%m-%d")
        week_strip.append(
            DayDeadline(
                date=date_str,
                day_name=day_letters[i],
                day_num=current_day.day,
                has_deadline=date_str in deadline_dates,
                is_today=current_day == today,
            )
        )

    return TodayResponse(
        today_formatted=today_formatted,
        attention_items=attention_items,
        weekly_counts=TodayCounts(
            applied=applied_count,
            interviews=interview_count,
            saved=saved_count,
        ),
        week_strip=week_strip,
    )
