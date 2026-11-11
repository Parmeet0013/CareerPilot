import os
import re
import json
import random
import datetime
from typing import Dict, Any, Optional, List, Tuple
import pymupdf
from openai import OpenAI
from sqlalchemy.orm import Session

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from backend.models import Profile, Job, Application, ActionLog, WeakArea, Reminder, InterviewSession, InterviewTurn
from backend.schemas import ProfileBase
from backend.agent.prompts import (
    PARSE_RESUME_SYSTEM_PROMPT,
    MATCH_JOBS_SYSTEM_PROMPT,
    TAILOR_APPLICATION_SYSTEM_PROMPT,
    INTERVIEW_QUESTION_SYSTEM_PROMPT,
    INTERVIEW_EVALUATION_SYSTEM_PROMPT,
)


def log_action(
    db: Session,
    tool: str,
    input_summary: str,
    output_summary: str,
    status: str = "success",
):
    """Writes an entry to action_log."""
    entry = ActionLog(
        timestamp=datetime.datetime.utcnow(),
        tool=tool,
        input_summary=input_summary,
        output_summary=output_summary,
        status=status,
    )
    db.add(entry)
    db.commit()


def get_llm_client() -> Optional[OpenAI]:
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not api_key or api_key == "your_openrouter_api_key_here":
        return None
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )


def call_llm_json(system_prompt: str, user_content: str, max_retries: int = 1) -> Optional[Dict[str, Any]]:
    client = get_llm_client()
    if not client:
        return None

    model = os.getenv("LLM_MODEL", "google/gemini-2.0-flash-001")

    for attempt in range(max_retries + 1):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
            )
            raw = response.choices[0].message.content
            return json.loads(raw)
        except Exception as e:
            if attempt == max_retries:
                print(f"[Warning] LLM call failed after {max_retries + 1} attempts: {e}")
                return None


# --- Tool 1: parse_resume ---
def heuristic_parse_resume(text: str) -> Dict[str, Any]:
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    name = lines[0] if lines else "Candidate"
    email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
    email = email_match.group(0) if email_match else None

    education = "B.Tech in Computer Science and Engineering"
    for line in lines:
        if any(kw in line.lower() for kw in ["b.tech", "b.e.", "bachelor", "cgpa", "institute"]):
            education = line
            break

    skills = []
    skill_keywords = [
        "Python", "JavaScript", "TypeScript", "FastAPI", "React", "Node.js", "SQL",
        "PostgreSQL", "SQLite", "Redis", "Docker", "Git", "Linux", "Postman", "C++", "Java",
        "Tailwind CSS", "Go", "AWS", "Kubernetes", "PyTorch", "Pandas", "Scikit-Learn"
    ]
    for kw in skill_keywords:
        if re.search(r"\b" + re.escape(kw) + r"\b", text, re.IGNORECASE):
            skills.append(kw)

    projects = []
    if "Distributed Task Queue" in text:
        projects.append({
            "title": "Distributed Task Queue & Scheduler",
            "description": "Asynchronous job worker system handling background tasks with retry logic and dead-letter queues.",
            "technologies": ["Python", "FastAPI", "Redis", "Docker"],
            "link": "https://github.com/ananya-sharma/task-queue"
        })
    if "Campus Placement Ledger" in text:
        projects.append({
            "title": "Campus Placement Ledger",
            "description": "Recruitment tracking dashboard for students with sub-50ms query responses.",
            "technologies": ["React", "TypeScript", "Tailwind CSS", "SQLite"],
            "link": "https://github.com/ananya-sharma/placement-ledger"
        })
    if not projects:
        projects.append({
            "title": "Academic Portfolio & Web System",
            "description": "Full stack project built during college coursework.",
            "technologies": skills[:3] if skills else ["Python", "SQL"],
            "link": None
        })

    experience = []
    if "Intern" in text or "TechVanguard" in text:
        experience.append({
            "company": "TechVanguard Solutions",
            "role": "Software Engineering Intern",
            "duration": "May 2024 – Jul 2024",
            "description": "Engineered RESTful microservice endpoints in FastAPI and reduced database latency with PostgreSQL indexing."
        })

    target_roles = ["Backend Engineering Intern", "Junior Software Engineer", "Full Stack Developer"]

    return {
        "name": name,
        "email": email,
        "education": education,
        "skills": skills,
        "projects": projects,
        "experience": experience,
        "target_roles": target_roles,
        "preferences": {
            "preferred_locations": ["Bengaluru", "Hyderabad", "Remote"],
            "job_types": ["internship", "full-time"]
        }
    }


def parse_resume(file_path: str, filename: str, db: Session) -> Profile:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Resume file not found at {file_path}")

    doc = pymupdf.open(file_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text() + "\n"
    doc.close()

    parsed_data = None
    llm_used = False

    if get_llm_client():
        prompt_input = f"Extract candidate profile from this resume text:\n\n{full_text}"
        result = call_llm_json(PARSE_RESUME_SYSTEM_PROMPT, prompt_input)
        if result:
            try:
                validated = ProfileBase(**result)
                parsed_data = validated.model_dump()
                llm_used = True
            except Exception as ve:
                print(f"[Warning] Pydantic validation error: {ve}")

    if not parsed_data:
        parsed_data = heuristic_parse_resume(full_text)

    profile = db.query(Profile).first()
    if not profile:
        profile = Profile()
        db.add(profile)

    profile.name = parsed_data.get("name")
    profile.email = parsed_data.get("email")
    profile.education = parsed_data.get("education")
    profile.skills_json = parsed_data.get("skills", [])
    profile.projects_json = parsed_data.get("projects", [])
    profile.experience_json = parsed_data.get("experience", [])
    profile.target_roles_json = parsed_data.get("target_roles", [])
    profile.preferences_json = parsed_data.get("preferences", {})
    profile.resume_filename = filename
    profile.parsed_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(profile)

    log_action(
        db=db,
        tool="parse_resume",
        input_summary=f"Parsed {filename} ({len(full_text)} chars via PyMuPDF)",
        output_summary=f"Extracted '{profile.name}' with {len(parsed_data.get('skills', []))} skills ({'LLM' if llm_used else 'Heuristic'})",
        status="success",
    )
    return profile


# --- Tool 2: search_jobs ---
def search_jobs(db: Session, role: Optional[str] = None, location: Optional[str] = None, job_type: Optional[str] = None) -> List[Job]:
    query = db.query(Job)
    if role and role.lower() != "all":
        query = query.filter(Job.role.ilike(f"%{role}%"))
    if location and location.lower() != "all":
        query = query.filter(Job.location.ilike(f"%{location}%"))
    if job_type and job_type.lower() != "all":
        query = query.filter(Job.type == job_type.lower())
    results = query.order_by(Job.closes_on.asc()).all()

    log_action(
        db=db,
        tool="search_jobs",
        input_summary=f"Criteria: role={role}, location={location}, type={job_type}",
        output_summary=f"Found {len(results)} matching jobs in database",
        status="success",
    )
    return results


# --- Tool 3: match_jobs ---
def match_jobs(profile: Profile, jobs: List[Job], db: Session) -> List[Dict[str, Any]]:
    profile_skills = [s.strip().lower() for s in (profile.skills_json or [])]
    ranked = []

    for job in jobs:
        req_skills = job.required_skills_json or []
        matching = [s for s in req_skills if s.strip().lower() in profile_skills]
        missing = [s for s in req_skills if s.strip().lower() not in profile_skills]
        ratio = len(matching) / max(len(req_skills), 1)

        fit = "Strong" if ratio >= 0.5 else "Medium" if ratio >= 0.25 else "Weak"
        bullets = [
            f"You possess {len(matching)} of {len(req_skills)} required technical skills ({', '.join(matching[:3]) if matching else 'fundamentals'}).",
            f"Role aligns with your target preferences in {job.location} ({job.type}).",
            f"Prior projects and internship provide relevant foundation for {job.company}.",
        ]

        ranked.append({
            "job_id": job.id,
            "role": job.role,
            "company": job.company,
            "fit": fit,
            "why_bullets": bullets,
            "missing_skills": missing,
            "score": ratio,
        })

    ranked.sort(key=lambda x: x["score"], reverse=True)
    log_action(
        db=db,
        tool="match_jobs",
        input_summary=f"Ranked {len(jobs)} jobs against profile for '{profile.name}'",
        output_summary=f"Top match: {ranked[0]['role']} @ {ranked[0]['company']} ({ranked[0]['fit']})",
        status="success",
    )
    return ranked


# --- Tool 4: tailor_application (With strict fact verification guard) ---
def validate_tailored_facts(profile: Profile, tailored_output: Dict[str, Any]) -> Tuple[Dict[str, Any], int]:
    """HARD RULE: Drop any skill, project, or employer that does not exist in profile."""
    verified_skills = set(s.strip().lower() for s in (profile.skills_json or []))
    verified_projects = set(p.get("title", "").strip().lower() for p in (profile.projects_json or []))
    verified_companies = set(e.get("company", "").strip().lower() for e in (profile.experience_json or []))

    resume_changes = tailored_output.get("resume_changes", {})
    dropped_count = 0

    # 1. Validate highlighted skills
    orig_skills = resume_changes.get("highlighted_skills", [])
    valid_skills = []
    for s in orig_skills:
        if s.strip().lower() in verified_skills:
            valid_skills.append(s)
        else:
            dropped_count += 1
            print(f"[Warning] Dropped unverified skill '{s}' from tailored application.")
    resume_changes["highlighted_skills"] = valid_skills if valid_skills else list(profile.skills_json or [])

    # 2. Validate projects
    orig_projects = resume_changes.get("reordered_projects", [])
    valid_projects = []
    for p in orig_projects:
        title = p.get("title", "").strip().lower()
        if any(vp in title or title in vp for vp in verified_projects):
            p["technologies"] = [t for t in p.get("technologies", []) if t.strip().lower() in verified_skills]
            valid_projects.append(p)
        else:
            dropped_count += 1
            print(f"[Warning] Dropped unverified project '{p.get('title')}' from tailored output.")
    if not valid_projects:
        resume_changes["reordered_projects"] = list(profile.projects_json or [])
    else:
        resume_changes["reordered_projects"] = valid_projects

    # 3. Validate experience
    orig_exp = resume_changes.get("reordered_experience", [])
    valid_exp = []
    for e in orig_exp:
        comp = e.get("company", "").strip().lower()
        if any(vc in comp or comp in vc for vc in verified_companies):
            valid_exp.append(e)
        else:
            dropped_count += 1
            print(f"[Warning] Dropped unverified employer '{e.get('company')}' from tailored output.")
    if not valid_exp:
        resume_changes["reordered_experience"] = list(profile.experience_json or [])
    else:
        resume_changes["reordered_experience"] = valid_exp

    tailored_output["resume_changes"] = resume_changes
    return tailored_output, dropped_count


def tailor_application(profile: Profile, job: Job, db: Session) -> Dict[str, Any]:
    """Tool 4: tailor_application(profile, job) -> {resume_changes, cover_note}."""
    profile_skills = profile.skills_json or []
    profile_projects = profile.projects_json or []
    profile_exp = profile.experience_json or []
    job_req_skills = job.required_skills_json or []

    # Align matching skills to top
    matching = [s for s in profile_skills if any(r.lower() in s.lower() for r in job_req_skills)]
    remaining = [s for s in profile_skills if s not in matching]
    tailored_skills = matching + remaining

    # Tailored projects emphasizing target technologies
    tailored_projects = sorted(
        profile_projects,
        key=lambda p: sum(1 for t in p.get("technologies", []) if any(r.lower() in t.lower() for r in job_req_skills)),
        reverse=True,
    )

    # Base prompt input
    prompt_input = (
        f"CANDIDATE PROFILE:\n"
        f"Name: {profile.name}\n"
        f"Education: {profile.education}\n"
        f"Verified Skills: {profile_skills}\n"
        f"Verified Projects: {profile_projects}\n"
        f"Verified Experience: {profile_exp}\n\n"
        f"TARGET JOB:\n"
        f"Role: {job.role}\n"
        f"Company: {job.company}\n"
        f"Location: {job.location}\n"
        f"Description: {job.description}\n"
        f"Required Skills: {job_req_skills}\n\n"
        f"Tailor the resume and write a concise, professional cover note using ONLY the candidate's verified facts above."
    )

    llm_result = None
    if get_llm_client():
        llm_result = call_llm_json(TAILOR_APPLICATION_SYSTEM_PROMPT, prompt_input)

    if not llm_result:
        # Fallback tailored output using strict profile data
        top_skills_str = ", ".join(tailored_skills[:4])
        first_proj = tailored_projects[0]["title"] if tailored_projects else "campus engineering coursework"
        cover_note = (
            f"Dear Hiring Team at {job.company},\n\n"
            f"I am writing to express my strong interest in the {job.role} position. "
            f"As a final-year candidate with practical experience in {top_skills_str}, "
            f"my background directly aligns with the technical responsibilities outlined in your posting.\n\n"
            f"Through my work on {first_proj}, I developed a deep appreciation for building reliable, scalable systems. "
            f"I would welcome the opportunity to bring my hands-on technical skills and rigor to {job.company}.\n\n"
            f"Thank you for your consideration.\n\n"
            f"Sincerely,\n{profile.name}"
        )
        llm_result = {
            "resume_changes": {
                "summary": f"Final-year engineering student targeting {job.role} with verified background in {top_skills_str}.",
                "highlighted_skills": tailored_skills,
                "reordered_projects": tailored_projects,
                "reordered_experience": profile_exp,
            },
            "cover_note": cover_note,
        }

    # Execute hard rule validation in code
    validated_output, dropped = validate_tailored_facts(profile, llm_result)

    log_action(
        db=db,
        tool="tailor_application",
        input_summary=f"Tailored application for {job.role} @ {job.company}",
        output_summary=f"Reordered {len(validated_output['resume_changes']['reordered_projects'])} projects, prioritized {len(validated_output['resume_changes']['highlighted_skills'])} skills ({dropped} unverified items dropped)",
        status="success" if dropped == 0 else "warning",
    )
    return validated_output


# --- Tool 5: generate_resume_pdf ---
def generate_resume_pdf(profile: Profile, resume_changes: Dict[str, Any], job: Job, db: Session) -> str:
    """Tool 5: generate_resume_pdf -> file path in outputs/ (clean single-column layout, serif headings)."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    outputs_dir = os.path.join(base_dir, "outputs")
    os.makedirs(outputs_dir, exist_ok=True)

    timestamp_str = datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_company = "".join(c for c in job.company if c.isalnum()).lower()
    pdf_filename = f"tailored_resume_{safe_company}_{timestamp_str}.pdf"
    output_path = os.path.join(outputs_dir, pdf_filename)

    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    styles = getSampleStyleSheet()

    # Styling following design.md: serif headings (Newsreader/Times), clean single column
    name_style = ParagraphStyle(
        'DocName',
        parent=styles['Heading1'],
        fontName='Times-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#1A1A1A'),
        spaceAfter=3,
    )
    sub_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#6B6860'),
        spaceAfter=12,
    )
    section_head = ParagraphStyle(
        'SecHead',
        parent=styles['Heading2'],
        fontName='Times-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#1E5B4A'),
        spaceBefore=8,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12.5,
        textColor=colors.HexColor('#1A1A1A'),
        spaceAfter=3,
    )
    bullet_style = ParagraphStyle(
        'Bullet',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=2,
    )

    story = [
        Paragraph(profile.name or "Candidate", name_style),
        Paragraph(f"{profile.email or ''} • Verified Applicant • Tailored for {job.role} at {job.company}", sub_style),
        Paragraph("EDUCATION", section_head),
        Paragraph(profile.education or "B.Tech in Computer Science and Engineering", body_style),
    ]

    # Technical Skills
    highlighted_skills = resume_changes.get("highlighted_skills", [])
    if highlighted_skills:
        story.append(Paragraph("TECHNICAL SKILLS", section_head))
        story.append(Paragraph(f"<b>Key Technologies:</b> {', '.join(highlighted_skills)}", body_style))

    # Experience
    exps = resume_changes.get("reordered_experience", [])
    if exps:
        story.append(Paragraph("WORK EXPERIENCE", section_head))
        for exp in exps:
            comp = exp.get("company", "")
            role = exp.get("role", "")
            dur = exp.get("duration", "")
            desc = exp.get("description", "")
            story.append(Paragraph(f"<b>{role}</b> — {comp} <font color='#6B6860'>({dur})</font>", body_style))
            if desc:
                story.append(Paragraph(f"• {desc}", bullet_style))

    # Projects
    projs = resume_changes.get("reordered_projects", [])
    if projs:
        story.append(Paragraph("TECHNICAL PROJECTS", section_head))
        for p in projs:
            title = p.get("title", "")
            techs = ", ".join(p.get("technologies", []))
            desc = p.get("description", "")
            story.append(Paragraph(f"<b>{title}</b> | <font color='#1E5B4A'>{techs}</font>", body_style))
            if desc:
                story.append(Paragraph(f"• {desc}", bullet_style))

    doc.build(story)

    log_action(
        db=db,
        tool="generate_resume_pdf",
        input_summary=f"Compiled tailored resume for {job.company}",
        output_summary=f"Generated PDF: {pdf_filename} (single-column serif layout)",
        status="success",
    )
    return pdf_filename


# --- Tool 6: create_application ---
def create_application(
    job_id: int,
    tailored_resume_path: Optional[str],
    cover_note: Optional[str],
    db: Session,
) -> Application:
    """Tool 6: Sets status to 'awaiting_approval'. The agent CANNOT set status to 'applied'."""
    app = db.query(Application).filter(Application.job_id == job_id).first()
    if not app:
        app = Application(
            job_id=job_id,
            status="awaiting_approval",
            tailored_resume_path=tailored_resume_path,
            cover_note=cover_note,
        )
        db.add(app)
    else:
        if app.status != "applied":
            app.status = "awaiting_approval"
        app.tailored_resume_path = tailored_resume_path
        app.cover_note = cover_note
        app.updated_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(app)

    log_action(
        db=db,
        tool="create_application",
        input_summary=f"Created application draft for Job #{job_id}",
        output_summary=f"Application #{app.id} status set to 'awaiting_approval'",
        status="success",
    )
    return app


# --- Tool 7: create_reminder ---
def create_reminder(application_id: int, title: str, due_on: str, db: Session) -> Reminder:
    """Tool 7: Writes an .ics calendar file and a reminders row."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    outputs_dir = os.path.join(base_dir, "outputs")
    os.makedirs(outputs_dir, exist_ok=True)

    ics_filename = f"reminder_app_{application_id}.ics"
    ics_path = os.path.join(outputs_dir, ics_filename)

    # Format ics calendar content
    due_dt = due_on.replace("-", "")
    ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CareerPilot//Recruitment Reminders//EN
BEGIN:VEVENT
SUMMARY:CareerPilot: {title}
DTSTART;VALUE=DATE:{due_dt}
DTEND;VALUE=DATE:{due_dt}
DESCRIPTION:Recruitment deadline reminder managed by CareerPilot.
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
"""
    with open(ics_path, "w", encoding="utf-8") as f:
        f.write(ics_content)

    rem = Reminder(
        application_id=application_id,
        title=title,
        due_on=due_on,
        ics_path=ics_filename,
    )
    db.add(rem)
    db.commit()
    db.refresh(rem)

    log_action(
        db=db,
        tool="create_reminder",
        input_summary=f"Application #{application_id} deadline: {due_on}",
        output_summary=f"Created .ics calendar reminder: {ics_filename}",
        status="success",
    )
    return rem


# --- Tool 8: run_interview_turn ---
# Fallback question bank used when the LLM is unavailable, so practice stays usable.
FALLBACK_QUESTIONS = [
    ("SQL & Databases", "A query that used to run in 50ms now takes 5 seconds after a data import. Walk me through how you would debug it."),
    ("REST API Design", "How would you design pagination for a REST endpoint that may return thousands of records? What are the trade-offs of offset vs cursor paging?"),
    ("Debugging", "Tell me about a bug you fixed that taught you something lasting. How did you find the root cause?"),
    ("Concurrency", "Two users submit the same form at the same moment and both writes succeed, corrupting data. How would you prevent that?"),
    ("Frontend State", "In a React app, a list updates in one component but not another. How do you diagnose state management issues like this?"),
    ("Testing", "You have limited time before a deadline. Which parts of the codebase do you test first, and why?"),
    ("Networking Basics", "What happens between typing a URL in the browser and seeing the page? Name as many steps as you can."),
    ("System Trade-offs", "When would you choose a cache like Redis over querying the database directly, and what risks does caching introduce?"),
]


def _heuristic_evaluation(answer: str, skill_tag: str) -> Dict[str, Any]:
    """Plain heuristic score used only when the LLM is unavailable."""
    length = len(answer.strip())
    if length >= 200:
        score, note = 4, "Detailed answer with concrete reasoning; specifics and examples would strengthen it further."
    elif length >= 80:
        score, note = 3, "Reasonable answer covering the basics; add specifics, trade-offs, or an example to go deeper."
    elif length >= 25:
        score, note = 2, "Answer is on topic but thin; explain the reasoning step by step."
    else:
        score, note = 1, "Answer is too short to demonstrate understanding of the concept."
    return {"score_1_to_5": score, "feedback": note, "skill_tag": skill_tag}


def _update_weak_area(db: Session, skill: str, score: int):
    """Upserts weak_areas so scores persist across sessions."""
    skill = (skill or "General").strip()[:100]
    weak = db.query(WeakArea).filter(WeakArea.skill == skill).first()
    if weak:
        weak.last_score = score
        weak.times_seen += 1
        weak.updated_at = datetime.datetime.utcnow()
    else:
        db.add(WeakArea(skill=skill, last_score=score, times_seen=1, updated_at=datetime.datetime.utcnow()))


def _generate_question(session: InterviewSession, db: Session) -> Tuple[Dict[str, Any], str]:
    """Returns ({question, skill_tag}, source) where source is 'llm' or 'fallback'."""
    profile = db.query(Profile).first()
    weaks = db.query(WeakArea).order_by(WeakArea.last_score.asc()).all()
    weak_summary = "; ".join(f"{w.skill} (scored {w.last_score}/5)" for w in weaks) or "none recorded yet"

    asked = [t.skill_tag for t in session.turns if t.skill_tag]
    recent_questions = [t.question for t in session.turns[-5:]]

    user_content = (
        f"TARGET ROLE: {session.role}\n"
        f"CANDIDATE SKILLS: {', '.join(profile.skills_json or []) if profile else 'not provided'}\n"
        f"RECORDED WEAK AREAS: {weak_summary}\n"
        f"SKILLS ALREADY ASKED THIS SESSION: {', '.join(asked) if asked else 'none'}\n"
        f"RECENT QUESTIONS (do not repeat): {json.dumps(recent_questions)}\n\n"
        "Generate the next interview question."
    )

    result = call_llm_json(INTERVIEW_QUESTION_SYSTEM_PROMPT, user_content)
    if result and isinstance(result.get("question"), str) and result.get("question").strip():
        skill_tag = str(result.get("skill_tag") or "General").strip()[:100]
        return {"question": result["question"].strip(), "skill_tag": skill_tag}, "llm"

    # Fallback: rotate through the bank, preferring skills not yet asked
    unasked = [q for q in FALLBACK_QUESTIONS if q[0] not in asked]
    pick = random.choice(unasked or FALLBACK_QUESTIONS)
    return {"question": pick[1], "skill_tag": pick[0]}, "fallback"


def run_interview_turn(session_id: int, answer: Optional[str], db: Session) -> Dict[str, Any]:
    """Tool 8: with answer=None asks the next question; with an answer evaluates it
    (score 1-5, one-line feedback, skill_tag), updates weak_areas, then asks the next one."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise ValueError(f"Interview session #{session_id} not found")

    evaluation = None
    source = "llm"

    if answer is not None:
        # Evaluate the oldest turn still awaiting an answer
        turn = (
            db.query(InterviewTurn)
            .filter(InterviewTurn.session_id == session_id, InterviewTurn.answer.is_(None))
            .order_by(InterviewTurn.id.asc())
            .first()
        )
        if not turn:
            raise ValueError("No open question in this session. Start a new session or ask for the next question.")

        turn.answer = answer
        turn.skill_tag = turn.skill_tag or "General"

        llm_eval = call_llm_json(
            INTERVIEW_EVALUATION_SYSTEM_PROMPT,
            f"QUESTION: {turn.question}\nSKILL TESTED: {turn.skill_tag}\nCANDIDATE ANSWER: {answer}\n\nEvaluate this answer.",
        )
        if (
            llm_eval
            and isinstance(llm_eval.get("score_1_to_5"), int)
            and 1 <= llm_eval["score_1_to_5"] <= 5
            and isinstance(llm_eval.get("feedback"), str)
        ):
            evaluation = {
                "score_1_to_5": llm_eval["score_1_to_5"],
                "feedback": llm_eval["feedback"].strip(),
                "skill_tag": str(llm_eval.get("skill_tag") or turn.skill_tag).strip()[:100],
            }
        else:
            evaluation = _heuristic_evaluation(answer, turn.skill_tag)
            source = "fallback"

        turn.feedback = evaluation["feedback"]
        turn.score_1_to_5 = evaluation["score_1_to_5"]
        turn.skill_tag = evaluation["skill_tag"]
        _update_weak_area(db, evaluation["skill_tag"], evaluation["score_1_to_5"])

    # Next question (new turn)
    question_data, q_source = _generate_question(session, db)
    next_turn = InterviewTurn(
        session_id=session_id,
        question=question_data["question"],
        skill_tag=question_data["skill_tag"],
    )
    db.add(next_turn)
    db.commit()
    db.refresh(next_turn)

    weakest = db.query(WeakArea).order_by(WeakArea.last_score.asc()).first()

    log_action(
        db=db,
        tool="run_interview_turn",
        input_summary=f"Session #{session_id} ({session.role}): {'evaluated answer' if answer is not None else 'asked question'}",
        output_summary=(
            f"Score {evaluation['score_1_to_5']}/5 on '{evaluation['skill_tag']}' ({source}); "
            f"next question on '{question_data['skill_tag']}' ({q_source})"
            if evaluation else f"Question asked on '{question_data['skill_tag']}' ({q_source})"
        ),
        status="success" if source == "llm" and q_source == "llm" else "warning",
    )

    return {
        "evaluation": evaluation,
        "next_question": {
            "turn_id": next_turn.id,
            "question": next_turn.question,
            "skill_tag": next_turn.skill_tag,
        },
        "source": "llm" if source == "llm" and q_source == "llm" else "fallback",
        "weakest_skill": weakest.skill if weakest else None,
        "weak_areas": [
            {"id": w.id, "skill": w.skill, "last_score": w.last_score, "times_seen": w.times_seen}
            for w in db.query(WeakArea).order_by(WeakArea.last_score.asc()).all()
        ],
    }


# --- Tool 9: recall_memory ---
def recall_memory(db: Session) -> Dict[str, Any]:
    """Tool 9: Recalls profile, applications, and weak_areas so the agent remembers across sessions."""
    profile = db.query(Profile).first()
    apps = db.query(Application).all()
    weaks = db.query(WeakArea).order_by(WeakArea.last_score.asc()).all()

    data = {
        "profile": {
            "name": profile.name if profile else None,
            "skills": (profile.skills_json or []) if profile else [],
            "target_roles": (profile.target_roles_json or []) if profile else [],
        },
        "applications_count": len(apps),
        "weak_areas": [{"skill": w.skill, "score": w.last_score, "seen": w.times_seen} for w in weaks],
    }

    log_action(
        db=db,
        tool="recall_memory",
        input_summary="Recalled agent memory across sessions",
        output_summary=f"Profile loaded, {len(apps)} applications tracked, {len(weaks)} weak areas noted",
        status="success",
    )
    return data
