import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# --- Profile Schemas ---
class EducationItem(BaseModel):
    institution: Optional[str] = None
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    graduation_year: Optional[str] = None
    score: Optional[str] = None


class ProjectItem(BaseModel):
    title: str
    description: Optional[str] = None
    technologies: List[str] = Field(default_factory=list)
    link: Optional[str] = None


class ExperienceItem(BaseModel):
    company: str
    role: str
    duration: Optional[str] = None
    description: Optional[str] = None


class ProfileBase(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    education: Optional[str] = None  # Or structured string/json
    skills: List[str] = Field(default_factory=list)
    projects: List[ProjectItem] = Field(default_factory=list)
    experience: List[ExperienceItem] = Field(default_factory=list)
    target_roles: List[str] = Field(default_factory=list)
    preferences: Dict[str, Any] = Field(default_factory=dict)
    resume_filename: Optional[str] = None


class ProfileResponse(ProfileBase):
    id: int
    parsed_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    education: Optional[str] = None
    skills: Optional[List[str]] = None
    projects: Optional[List[ProjectItem]] = None
    experience: Optional[List[ExperienceItem]] = None
    target_roles: Optional[List[str]] = None
    preferences: Optional[Dict[str, Any]] = None


# --- Job Schemas ---
class JobBase(BaseModel):
    role: str
    company: str
    location: str
    type: str  # 'internship' | 'full-time'
    closes_on: str
    description: str
    required_skills: List[str] = Field(default_factory=list)


class JobResponse(JobBase):
    id: int
    fit: Optional[str] = None  # 'Strong' | 'Medium' | 'Weak'
    why_bullets: Optional[List[str]] = None
    missing_skills: Optional[List[str]] = None

    class Config:
        from_attributes = True


# --- Application Schemas ---
class ApplicationBase(BaseModel):
    job_id: int
    status: str = "saved"
    tailored_resume_path: Optional[str] = None
    cover_note: Optional[str] = None


class ApplicationResponse(ApplicationBase):
    id: int
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    applied_at: Optional[datetime.datetime] = None
    job: Optional[JobResponse] = None

    class Config:
        from_attributes = True


class PrepareApplicationRequest(BaseModel):
    job_id: int


class UpdateApplicationRequest(BaseModel):
    cover_note: Optional[str] = None
    status: Optional[str] = None


# --- Interview & Practice Schemas ---
class InterviewTurnBase(BaseModel):
    question: str
    answer: Optional[str] = None
    feedback: Optional[str] = None
    skill_tag: Optional[str] = None
    score_1_to_5: Optional[int] = None


class InterviewTurnResponse(InterviewTurnBase):
    id: int
    session_id: int

    class Config:
        from_attributes = True


class InterviewSessionResponse(BaseModel):
    id: int
    job_id: Optional[int] = None
    role: str
    started_at: datetime.datetime
    summary: Optional[str] = None
    turns: List[InterviewTurnResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class PracticeStartRequest(BaseModel):
    role: str
    job_id: Optional[int] = None


class PracticeAnswerRequest(BaseModel):
    session_id: int
    answer: str


class WeakAreaResponse(BaseModel):
    id: int
    skill: str
    last_score: int
    times_seen: int
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


# --- Reminder & Log Schemas ---
class ReminderResponse(BaseModel):
    id: int
    application_id: int
    title: str
    due_on: str
    ics_path: Optional[str] = None

    class Config:
        from_attributes = True


class ActionLogResponse(BaseModel):
    id: int
    timestamp: datetime.datetime
    tool: str
    input_summary: Optional[str] = None
    output_summary: Optional[str] = None
    status: str

    class Config:
        from_attributes = True


# --- Today / Dashboard Schemas ---
class AttentionItem(BaseModel):
    id: str
    type: str  # 'review_draft' | 'closing_soon' | 'follow_up' | 'weak_spot'
    title: str
    subtitle: str
    action_label: str
    action_url: str
    badge: Optional[str] = None
    badge_variant: Optional[str] = "muted"  # amber | red | muted | accent


class TodayCounts(BaseModel):
    applied: int
    interviews: int
    saved: int


class DayDeadline(BaseModel):
    date: str
    day_name: str
    day_num: int
    has_deadline: bool
    is_today: bool


class TodayResponse(BaseModel):
    today_formatted: str
    attention_items: List[AttentionItem]
    weekly_counts: TodayCounts
    week_strip: List[DayDeadline]
