import os
import json
import datetime
from sqlalchemy.orm import Session
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
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors


def create_sample_resume_pdf(output_path: str):
    """Generates a sample resume PDF using ReportLab with clean single-column layout."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Times-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#1A1A1A'),
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#6B6860'),
        spaceAfter=12,
    )
    heading_style = ParagraphStyle(
        'SectionHead',
        parent=styles['Heading2'],
        fontName='Times-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1E5B4A'),
        spaceBefore=10,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#1A1A1A'),
        spaceAfter=4,
    )
    bullet_style = ParagraphStyle(
        'Bullet',
        parent=body_style,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=3,
    )

    story = [
        Paragraph("Ananya Sharma", title_style),
        Paragraph("ananya.sharma@example.com • +91 98765 43210 • Bengaluru, India • linkedin.com/in/ananyasharma • github.com/ananyasharma", subtitle_style),

        Paragraph("EDUCATION", heading_style),
        Paragraph("<b>B.Tech in Computer Science and Engineering</b> — National Institute of Technology Karnataka (2021 – 2025)", body_style),
        Paragraph("CGPA: 8.8 / 10.0 • Coursework: Data Structures, Operating Systems, Database Management, Computer Networks", bullet_style),

        Paragraph("TECHNICAL SKILLS", heading_style),
        Paragraph("<b>Languages & Frameworks:</b> Python, JavaScript, TypeScript, FastAPI, React, Node.js, SQL", body_style),
        Paragraph("<b>Databases & Tools:</b> PostgreSQL, SQLite, Redis, Docker, Git, Linux, Postman", body_style),

        Paragraph("PROJECTS", heading_style),
        Paragraph("<b>Distributed Task Queue & Scheduler</b> | Python, FastAPI, Redis, Docker", body_style),
        Paragraph("• Designed an asynchronous job worker system handling 1,500 background tasks/sec with retry logic and dead-letter queues.", bullet_style),
        Paragraph("• Implemented Redis-based token bucket rate limiter preventing upstream third-party API exhaustion.", bullet_style),
        Paragraph("<b>Campus Placement Ledger</b> | React, TypeScript, Tailwind CSS, SQLite", body_style),
        Paragraph("• Built an end-to-end recruitment tracking dashboard for 400+ final year engineering students.", bullet_style),
        Paragraph("• Structured relational database schema with automated index tuning for sub-50ms query responses.", bullet_style),

        Paragraph("EXPERIENCE", heading_style),
        Paragraph("<b>Software Engineering Intern</b> — TechVanguard Solutions, Bengaluru (May 2024 – Jul 2024)", body_style),
        Paragraph("• Engineered RESTful microservice endpoints in FastAPI for internal student assessment evaluations.", bullet_style),
        Paragraph("• Reduced average database response latency by 28% through targeted PostgreSQL index optimizations and connection pooling.", bullet_style),

        Paragraph("TARGET ROLES & INTERESTS", heading_style),
        Paragraph("Backend Engineering Intern, Junior Software Engineer, Full Stack Developer. Open to Bengaluru, Hyderabad, Pune, and Remote.", body_style),
    ]

    doc.build(story)


def seed_database(db: Session):
    """Resets and seeds the CareerPilot database."""
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    # 1. Clear existing rows
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

    # Generate sample resume PDF
    create_sample_resume_pdf(sample_pdf_path)

    # 2. Seed Jobs
    today = datetime.date.today()
    with open(jobs_file, "r", encoding="utf-8") as f:
        jobs_data = json.load(f)

    inserted_jobs = []
    for item in jobs_data:
        days = item.get("closes_days", 7)
        closes_date = (today + datetime.timedelta(days=days)).strftime("%Y-%m-%d")
        job = Job(
            role=item["role"],
            company=item["company"],
            location=item["location"],
            type=item["type"],
            closes_on=closes_date,
            description=item["description"],
            required_skills_json=json.dumps(item["required_skills"]),
        )
        db.add(job)
        inserted_jobs.append(job)

    db.commit()
    for j in inserted_jobs:
        db.refresh(j)

    # 3. Seed Demo Profile
    demo_profile = Profile(
        name="Ananya Sharma",
        email="ananya.sharma@example.com",
        education="B.Tech in Computer Science and Engineering, NITK (2021-2025), CGPA: 8.8/10",
        skills_json=json.dumps([
            "Python", "FastAPI", "React", "TypeScript", "PostgreSQL",
            "Redis", "Docker", "Git", "SQL", "Linux", "Tailwind CSS"
        ]),
        projects_json=json.dumps([
            {
                "title": "Distributed Task Queue & Scheduler",
                "description": "Asynchronous job worker processing 1,500 background tasks/sec with retry logic and dead-letter queue.",
                "technologies": ["Python", "FastAPI", "Redis", "Docker"],
                "link": "https://github.com/ananyasharma/task-queue"
            },
            {
                "title": "Campus Placement Ledger",
                "description": "Recruitment tracking dashboard for 400+ final year engineering students with sub-50ms query times.",
                "technologies": ["React", "TypeScript", "Tailwind CSS", "SQLite"],
                "link": "https://github.com/ananyasharma/placement-ledger"
            }
        ]),
        experience_json=json.dumps([
            {
                "company": "TechVanguard Solutions",
                "role": "Software Engineering Intern",
                "duration": "May 2024 – Jul 2024",
                "description": "Built RESTful endpoints in FastAPI and reduced DB response latency by 28% with indexing."
            }
        ]),
        target_roles_json=json.dumps(["Backend Engineering Intern", "Junior Software Engineer", "Full Stack Developer"]),
        preferences_json=json.dumps({"preferred_locations": ["Bengaluru", "Hyderabad", "Remote"], "job_types": ["internship", "full-time"]}),
        resume_filename="sample_resume.pdf",
        parsed_at=datetime.datetime.utcnow(),
    )
    db.add(demo_profile)
    db.commit()
    db.refresh(demo_profile)

    # 4. Seed Applications (2 sample applications)
    # App 1: Kavach Systems (Job 1) - awaiting approval
    app1 = Application(
        job_id=inserted_jobs[0].id,
        status="awaiting_approval",
        cover_note=(
            "Dear Hiring Team at Kavach Systems,\n\n"
            "I am writing to express my strong interest in the Backend Engineering Intern role. "
            "During my internship at TechVanguard Solutions, I engineered high-throughput REST APIs using FastAPI and optimized PostgreSQL query plans to reduce latency by 28%. "
            "Additionally, my Distributed Task Queue project directly aligns with Kavach Systems' focus on caching and scalable backend services.\n\n"
            "I look forward to contributing to your backend infrastructure.\n\nSincerely,\nAnanya Sharma"
        ),
        tailored_resume_path=os.path.join(os.path.dirname(base_dir), "outputs", "tailored_resume_kavach.pdf"),
        created_at=datetime.datetime.utcnow() - datetime.timedelta(days=1),
        updated_at=datetime.datetime.utcnow(),
    )

    # App 2: PrismCloud Labs (Job 3) - applied
    app2 = Application(
        job_id=inserted_jobs[2].id,
        status="applied",
        cover_note=(
            "Dear Hiring Manager,\n\n"
            "I am excited to apply for the Frontend Developer Intern role at PrismCloud Labs. "
            "With practical experience developing responsive user interfaces in React, TypeScript, and Tailwind CSS through my Campus Placement Ledger project, "
            "I am confident in my ability to build polished client components for PrismCloud's platform.\n\n"
            "Sincerely,\nAnanya Sharma"
        ),
        tailored_resume_path=None,
        created_at=datetime.datetime.utcnow() - datetime.timedelta(days=3),
        applied_at=datetime.datetime.utcnow() - datetime.timedelta(days=2),
    )
    db.add(app1)
    db.add(app2)
    db.commit()

    # 5. Seed Weak Areas
    w1 = WeakArea(
        skill="System Design: Indexing & Sharding",
        last_score=2,
        times_seen=2,
        updated_at=datetime.datetime.utcnow() - datetime.timedelta(days=1),
    )
    w2 = WeakArea(
        skill="Concurrency & Threading",
        last_score=3,
        times_seen=1,
        updated_at=datetime.datetime.utcnow() - datetime.timedelta(days=2),
    )
    db.add(w1)
    db.add(w2)

    # 6. Seed Reminders
    rem1 = Reminder(
        application_id=app1.id,
        title="Review and submit application for Kavach Systems",
        due_on=inserted_jobs[0].closes_on,
        ics_path=None,
    )
    db.add(rem1)

    # 7. Seed Action Log
    log1 = ActionLog(
        timestamp=datetime.datetime.utcnow() - datetime.timedelta(days=1, hours=2),
        tool="parse_resume",
        input_summary="Parsed sample_resume.pdf (1.2 KB)",
        output_summary="Extracted profile for Ananya Sharma with 11 skills and 2 projects",
        status="success",
    )
    log2 = ActionLog(
        timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=18),
        tool="tailor_application",
        input_summary="Tailored application for Kavach Systems (Job #1)",
        output_summary="Reordered projects, highlighted Redis & FastAPI, generated tailored cover note",
        status="success",
    )
    db.add(log1)
    db.add(log2)

    db.commit()
    print("Database successfully seeded with 40 jobs, sample profile, 2 applications, weak areas, and logs.")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
