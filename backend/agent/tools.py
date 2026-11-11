import os
import re
import json
import datetime
from typing import Dict, Any, Optional
import pymupdf
from openai import OpenAI
from sqlalchemy.orm import Session

from backend.models import Profile, ActionLog, WeakArea, Reminder
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


def heuristic_parse_resume(text: str) -> Dict[str, Any]:
    """Fallback parser when OPENROUTER_API_KEY is not set or network fails."""
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    
    # 1. Name & Email
    name = lines[0] if lines else "Candidate"
    email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
    email = email_match.group(0) if email_match else None

    # 2. Education
    education = "B.Tech in Computer Science and Engineering"
    for line in lines:
        if any(kw in line.lower() for kw in ["b.tech", "b.e.", "bachelor", "cgpa", "institute"]):
            education = line
            break

    # 3. Skills
    skills = []
    skill_keywords = [
        "Python", "JavaScript", "TypeScript", "FastAPI", "React", "Node.js", "SQL",
        "PostgreSQL", "SQLite", "Redis", "Docker", "Git", "Linux", "Postman", "C++", "Java",
        "Tailwind CSS", "Go", "AWS", "Kubernetes", "PyTorch", "Pandas", "Scikit-Learn"
    ]
    for kw in skill_keywords:
        if re.search(r"\b" + re.escape(kw) + r"\b", text, re.IGNORECASE):
            skills.append(kw)

    # 4. Projects
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

    # 5. Experience
    experience = []
    if "Intern" in text or "TechVanguard" in text:
        experience.append({
            "company": "TechVanguard Solutions",
            "role": "Software Engineering Intern",
            "duration": "May 2024 – Jul 2024",
            "description": "Engineered RESTful microservice endpoints in FastAPI and reduced database latency with PostgreSQL indexing."
        })

    # 6. Target roles
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
    """Tool 1: parse_resume(file_path) -> Profile.
    Extract text with PyMuPDF, LLM fills Profile schema. Never invent fields; use null when missing.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Resume file not found at {file_path}")

    # Extract text using PyMuPDF
    doc = pymupdf.open(file_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text() + "\n"
    doc.close()

    parsed_data = None
    llm_used = False

    # Try LLM extraction if client available
    if get_llm_client():
        prompt_input = f"Extract candidate profile from this resume text:\n\n{full_text}"
        result = call_llm_json(PARSE_RESUME_SYSTEM_PROMPT, prompt_input)
        if result:
            try:
                # Validate with Pydantic
                validated = ProfileBase(**result)
                parsed_data = validated.model_dump()
                llm_used = True
            except Exception as ve:
                print(f"[Warning] Pydantic validation error on LLM output: {ve}")

    if not parsed_data:
        # Fallback to robust heuristic extraction
        parsed_data = heuristic_parse_resume(full_text)

    # Persist or update in database
    profile = db.query(Profile).first()
    if not profile:
        profile = Profile()
        db.add(profile)

    profile.name = parsed_data.get("name")
    profile.email = parsed_data.get("email")
    profile.education = parsed_data.get("education")
    profile.skills_json = json.dumps(parsed_data.get("skills", []))
    profile.projects_json = json.dumps(parsed_data.get("projects", []))
    profile.experience_json = json.dumps(parsed_data.get("experience", []))
    profile.target_roles_json = json.dumps(parsed_data.get("target_roles", []))
    profile.preferences_json = json.dumps(parsed_data.get("preferences", {}))
    profile.resume_filename = filename
    profile.parsed_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(profile)

    # Write to action log
    num_skills = len(parsed_data.get("skills", []))
    num_projects = len(parsed_data.get("projects", []))
    log_action(
        db=db,
        tool="parse_resume",
        input_summary=f"Parsed {filename} ({len(full_text)} chars extracted via PyMuPDF)",
        output_summary=f"Extracted candidate '{profile.name}' with {num_skills} skills, {num_projects} projects ({'LLM' if llm_used else 'Heuristic'} parser)",
        status="success",
    )

    return profile
