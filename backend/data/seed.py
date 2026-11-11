"""Idempotent seed script: wipes and reloads demo data on SQLite or Postgres.

Usage: python -m backend.data.seed
"""

import os
import json
import datetime

from sqlalchemy import insert, select

from backend.db import engine, SessionLocal, Base
from backend.models import (
    Profile,
    Job,
    Application,
    InterviewSession,
    InterviewTurn,
    WeakArea,
    Reminder,
    ActionLog,
)
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors


def create_sample_resume_pdf(output_path: str):
    """Generates the sample resume PDF used for testing upload."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40,
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "DocTitle", parent=styles["Heading1"],
        fontName="Times-Bold", fontSize=20, leading=24,
        textColor=colors.HexColor("#1A1A1A"), spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "DocSub", parent=styles["Normal"],
        fontName="Helvetica", fontSize=9, leading=12,
        textColor=colors.HexColor("#6B6860"), spaceAfter=12,
    )
    heading_style = ParagraphStyle(
        "SectionHead", parent=styles["Heading2"],
        fontName="Times-Bold", fontSize=12, leading=16,
        textColor=colors.HexColor("#1E5B4A"), spaceBefore=10, spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "Body", parent=styles["Normal"],
        fontName="Helvetica", fontSize=9.5, leading=13,
        textColor=colors.HexColor("#1A1A1A"), spaceAfter=4,
    )
    bullet_style = ParagraphStyle(
        "Bullet", parent=body_style, leftIndent=14, firstLineIndent=-10, spaceAfter=3,
    )

    story = [
        Paragraph("Ananya Sharma", title_style),
        Paragraph("ananya.sharma@example.com • +91 98765 43210 • Bengaluru, India • linkedin.com/in/ananyasharma • github.com/ananyasharma", subtitle_style),
        Paragraph("EDUCATION", heading_style),
        Paragraph("<b>B.Tech in Computer Science and Engineering</b> — National Institute of Technology Karnataka (2021 – 2025)", body_style),
        Paragraph("CGPA: 8.8 / 10.0 • Coursework: Data Structures, Operating Systems, Database Management, Computer Networks", bullet_style),
        Paragraph("TECHNICAL SKILLS", heading_style),
        Paragraph("<b>Languages &amp; Frameworks:</b> Python, JavaScript, TypeScript, FastAPI, React, Node.js, SQL", body_style),
        Paragraph("<b>Databases &amp; Tools:</b> PostgreSQL, SQLite, Redis, Docker, Git, Linux, Postman", body_style),
        Paragraph("PROJECTS", heading_style),
        Paragraph("<b>Distributed Task Queue &amp; Scheduler</b> | Python, FastAPI, Redis, Docker", body_style),
        Paragraph("• Designed an asynchronous job worker system handling 1,500 background tasks/sec with retry logic and dead-letter queues.", bullet_style),
        Paragraph("• Implemented Redis-based token bucket rate limiter preventing upstream third-party API exhaustion.", bullet_style),
        Paragraph("<b>Campus Placement Ledger</b> | React, TypeScript, Tailwind CSS, SQLite", body_style),
        Paragraph("• Built an end-to-end recruitment tracking dashboard for 400+ final year engineering students.", bullet_style),
        Paragraph("• Structured relational database schema with automated index tuning for sub-50ms query responses.", bullet_style),
        Paragraph("EXPERIENCE", heading_style),
        Paragraph("<b>Software Engineering Intern</b> — TechVanguard Solutions, Bengaluru (May 2024 – Jul 2024)", body_style),
        Paragraph("• Engineered RESTful microservice endpoints in FastAPI for internal student assessment evaluations.", bullet_style),
        Paragraph("• Reduced average database response latency by 28% through targeted PostgreSQL index optimizations and connection pooling.", bullet_style),
        Paragraph("TARGET ROLES &amp; INTERESTS", heading_style),
        Paragraph("Backend Engineering Intern, Junior Software Engineer, Full Stack Developer. Open to Bengaluru, Hyderabad, Pune, and Remote.", body_style),
    ]

    doc.build(story)


def seed_database(db) -> dict:
    """Wipes all tables then bulk-inserts the demo dataset. Safe to re-run."""
    Base.metadata.create_all(bind=engine)

    # 1. Clear existing rows (children first)
    db.query(ActionLog).delete()
    db.query(Reminder).delete()
    db.query(InterviewTurn).delete()
    db.query(InterviewSession).delete()
    db.query(WeakArea).delete()
    db.query(Application).delete()
    db.query(Job).delete()
    db.query(Profile).delete()
    db.commit()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    jobs_file = os.path.join(base_dir, "jobs.json")
    sample_pdf_path = os.path.join(base_dir, "sample_resume.pdf")
    create_sample_resume_pdf(sample_pdf_path)

    # 2. Bulk-insert jobs (closes_on computed relative to seed date)
    today = datetime.date.today()
    with open(jobs_file, "r", encoding="utf-8") as f:
        jobs_data = json.load(f)

    job_rows = []
    for item in jobs_data:
        days = item.get("closes_days", 7)
        job_rows.append({
            "role": item["role"],
            "company": item["company"],
            "location": item["location"],
            "type": item["type"],
            "closes_on": (today + datetime.timedelta(days=days)).strftime("%Y-%m-%d"),
            "description": item["description"],
            "required_skills_json": item["required_skills"],
        })
    db.execute(insert(Job), job_rows)
    db.commit()

    # 3. Demo profile (labelled as sample data via preferences flag)
    demo_profile = Profile(
        name="Ananya Sharma",
        email="ananya.sharma@example.com",
        education="B.Tech in Computer Science and Engineering, NITK (2021-2025), CGPA: 8.8/10",
        skills_json=[
            "Python", "FastAPI", "React", "TypeScript", "PostgreSQL",
            "Redis", "Docker", "Git", "SQL", "Linux", "Tailwind CSS",
        ],
        projects_json=[
            {
                "title": "Distributed Task Queue & Scheduler",
                "description": "Asynchronous job worker processing 1,500 background tasks/sec with retry logic and dead-letter queue.",
                "technologies": ["Python", "FastAPI", "Redis", "Docker"],
                "link": "https://github.com/ananyasharma/task-queue",
            },
            {
                "title": "Campus Placement Ledger",
                "description": "Recruitment tracking dashboard for 400+ final year engineering students with sub-50ms query times.",
                "technologies": ["React", "TypeScript", "Tailwind CSS", "SQLite"],
                "link": "https://github.com/ananyasharma/placement-ledger",
            },
        ],
        experience_json=[
            {
                "company": "TechVanguard Solutions",
                "role": "Software Engineering Intern",
                "duration": "May 2024 – Jul 2024",
                "description": "Built RESTful endpoints in FastAPI and reduced DB response latency by 28% with indexing.",
            },
        ],
        target_roles_json=["Backend Engineering Intern", "Junior Software Engineer", "Full Stack Developer"],
        preferences_json={
            "preferred_locations": ["Bengaluru", "Hyderabad", "Remote"],
            "job_types": ["internship", "full-time"],
            "sample_data": True,  # demo profile flag, surfaced in the UI
        },
        resume_filename="sample_resume.pdf",
        parsed_at=datetime.datetime.utcnow(),
    )
    db.add(demo_profile)
    db.commit()

    # 4. Two sample applications, bound to actual seeded jobs by role
    backend_job = db.execute(
        select(Job).where(Job.type == "internship", Job.role.ilike("%backend%")).order_by(Job.closes_on.asc()).limit(1)
    ).scalar_one_or_none()
    frontend_job = db.execute(
        select(Job).where(Job.type == "internship", Job.role.ilike("%frontend%")).order_by(Job.closes_on.asc()).limit(1)
    ).scalar_one_or_none()
    if backend_job is None:
        backend_job = db.query(Job).first()
    if frontend_job is None:
        frontend_job = db.query(Job).offset(2).first()

    app1 = Application(
        job_id=backend_job.id,
        status="awaiting_approval",
        cover_note=(
            f"Dear Hiring Team at {backend_job.company},\n\n"
            "I am writing to express my strong interest in the backend engineering role. "
            "During my internship at TechVanguard Solutions, I engineered high-throughput REST APIs using FastAPI "
            "and optimized PostgreSQL query plans to reduce latency by 28%. "
            f"My Distributed Task Queue project directly aligns with {backend_job.company}'s focus on caching and scalable backend services.\n\n"
            "I look forward to contributing to your backend infrastructure.\n\nSincerely,\nAnanya Sharma"
        ),
        created_at=datetime.datetime.utcnow() - datetime.timedelta(days=1),
    )

    app2 = Application(
        job_id=frontend_job.id,
        status="applied",
        cover_note=(
            f"Dear Hiring Manager,\n\n"
            f"I am excited to apply for the {frontend_job.role} role at {frontend_job.company}. "
            "With practical experience developing responsive user interfaces in React, TypeScript, and Tailwind CSS "
            "through my Campus Placement Ledger project, I am confident in my ability to build polished client "
            "components for your platform.\n\nSincerely,\nAnanya Sharma"
        ),
        created_at=datetime.datetime.utcnow() - datetime.timedelta(days=3),
        applied_at=datetime.datetime.utcnow() - datetime.timedelta(days=2),
    )
    db.add_all([app1, app2])
    db.commit()

    # 5. Weak areas, reminder, action log
    db.add_all([
        WeakArea(
            skill="System Design: Indexing & Sharding",
            last_score=2, times_seen=2,
            updated_at=datetime.datetime.utcnow() - datetime.timedelta(days=1),
        ),
        WeakArea(
            skill="Concurrency & Threading",
            last_score=3, times_seen=1,
            updated_at=datetime.datetime.utcnow() - datetime.timedelta(days=2),
        ),
    ])
    db.add(Reminder(
        application_id=app1.id,
        title=f"Review and submit application for {backend_job.company}",
        due_on=backend_job.closes_on,
        ics_path=None,
    ))
    db.add_all([
        ActionLog(
            timestamp=datetime.datetime.utcnow() - datetime.timedelta(days=1, hours=2),
            tool="parse_resume",
            input_summary="Parsed sample_resume.pdf",
            output_summary="Extracted profile for Ananya Sharma with 11 skills and 2 projects",
            status="success",
        ),
        ActionLog(
            timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=18),
            tool="tailor_application",
            input_summary=f"Tailored application for {backend_job.company} (Job #{backend_job.id})",
            output_summary="Reordered projects, highlighted Redis & FastAPI, generated tailored cover note",
            status="success",
        ),
    ])
    db.commit()

    job_count = db.query(Job).count()
    print(f"Seeded {job_count} jobs, demo profile, 2 applications, weak areas, reminder, and logs.")
    return {"jobs": job_count}


if __name__ == "__main__":
    with SessionLocal() as session:
        seed_database(session)
