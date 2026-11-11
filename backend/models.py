import datetime

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from backend.db import Base


class Profile(Base):
    __tablename__ = "profile"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    education = Column(Text, nullable=True)
    skills_json = Column(JSON, default=list)
    projects_json = Column(JSON, default=list)
    experience_json = Column(JSON, default=list)
    target_roles_json = Column(JSON, default=list)
    preferences_json = Column(JSON, default=dict)
    resume_filename = Column(String(255), nullable=True)
    parsed_at = Column(DateTime, default=datetime.datetime.utcnow)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String(255), nullable=False, index=True)
    company = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False, index=True)
    type = Column(String(50), nullable=False, index=True)  # 'internship' or 'full-time'
    stipend_or_ctc = Column(String(50), nullable=True)  # e.g. '₹30,000/month' or '₹8–12 LPA'
    closes_on = Column(String(50), nullable=False, index=True)  # YYYY-MM-DD
    description = Column(Text, nullable=False)
    required_skills_json = Column(JSON, default=list)

    applications = relationship("Application", back_populates="job")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    status = Column(String(50), default="saved", index=True)  # saved, drafted, awaiting_approval, applied, interview, offer, rejected
    tailored_resume_path = Column(String(500), nullable=True)
    cover_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    applied_at = Column(DateTime, nullable=True)

    job = relationship("Job", back_populates="applications")
    reminders = relationship("Reminder", back_populates="application")


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True)
    role = Column(String(255), nullable=False)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    summary = Column(Text, nullable=True)

    turns = relationship("InterviewTurn", back_populates="session")


class InterviewTurn(Base):
    __tablename__ = "interview_turns"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=True)
    feedback = Column(Text, nullable=True)
    skill_tag = Column(String(100), nullable=True)
    score_1_to_5 = Column(Integer, nullable=True)

    session = relationship("InterviewSession", back_populates="turns")


class WeakArea(Base):
    __tablename__ = "weak_areas"

    id = Column(Integer, primary_key=True, index=True)
    skill = Column(String(100), unique=True, nullable=False)
    last_score = Column(Integer, nullable=False)
    times_seen = Column(Integer, default=1)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    title = Column(String(255), nullable=False)
    due_on = Column(String(50), nullable=False)
    ics_path = Column(String(500), nullable=True)

    application = relationship("Application", back_populates="reminders")


class ActionLog(Base):
    __tablename__ = "action_log"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    tool = Column(String(100), nullable=False)
    input_summary = Column(Text, nullable=True)
    output_summary = Column(Text, nullable=True)
    status = Column(String(50), default="success")  # success, error, warning
