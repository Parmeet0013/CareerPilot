"""
LangGraph Orchestrator for CareerPilot Application Preparation.
Receives a goal and shared state, plans, calls tools in a loop, and stops after producing the draft.
Max 8 steps per run.
"""

from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, END
from sqlalchemy.orm import Session

from backend.models import Profile, Job, Application
from backend.agent.tools import (
    recall_memory,
    tailor_application,
    generate_resume_pdf,
    create_application,
    create_reminder,
    log_action,
)


class OrchestratorState(TypedDict):
    goal: str
    job_id: int
    db: Any  # Session object passed in context
    profile: Optional[Dict[str, Any]]
    job: Optional[Dict[str, Any]]
    memory: Optional[Dict[str, Any]]
    tailored_result: Optional[Dict[str, Any]]
    resume_pdf_path: Optional[str]
    reminder_path: Optional[str]
    application_id: Optional[int]
    status: str
    steps_taken: List[Dict[str, Any]]
    step_count: int
    next_step: Optional[str]


def planner_node(state: OrchestratorState) -> OrchestratorState:
    """Orchestrator node: evaluates the goal and determines next tool action."""
    steps = state.get("steps_taken", [])
    step_count = state.get("step_count", 0)

    # Max 8 steps safeguard
    if step_count >= 8:
        state["next_step"] = "done"
        return state

    # Step planning loop
    if not state.get("memory"):
        state["next_step"] = "recall_memory"
    elif not state.get("tailored_result"):
        state["next_step"] = "tailor_application"
    elif not state.get("resume_pdf_path"):
        state["next_step"] = "generate_resume_pdf"
    elif not state.get("application_id"):
        state["next_step"] = "create_application"
    elif not state.get("reminder_path"):
        state["next_step"] = "create_reminder"
    else:
        state["next_step"] = "done"

    return state


def tool_node(state: OrchestratorState) -> OrchestratorState:
    """Tool node: executes the scheduled tool and writes a step entry."""
    db: Session = state["db"]
    next_step = state.get("next_step")
    steps = list(state.get("steps_taken", []))
    step_count = state.get("step_count", 0) + 1

    profile_obj = db.query(Profile).first()
    job_obj = db.query(Job).filter(Job.id == state["job_id"]).first()

    if not job_obj:
        steps.append({
            "step": step_count,
            "tool": "error",
            "summary": f"Job ID #{state['job_id']} not found in database.",
            "status": "error",
        })
        state["steps_taken"] = steps
        state["step_count"] = step_count
        state["next_step"] = "done"
        return state

    if next_step == "recall_memory":
        memory_data = recall_memory(db)
        state["memory"] = memory_data
        steps.append({
            "step": step_count,
            "tool": "recall_memory",
            "summary": f"Loaded profile for {profile_obj.name if profile_obj else 'Candidate'} and historical weak areas.",
            "status": "success",
        })

    elif next_step == "tailor_application":
        tailored = tailor_application(profile=profile_obj, job=job_obj, db=db)
        state["tailored_result"] = tailored
        steps.append({
            "step": step_count,
            "tool": "tailor_application",
            "summary": f"Adapted resume facts and drafted cover note tailored specifically for {job_obj.company}.",
            "status": "success",
        })

    elif next_step == "generate_resume_pdf":
        resume_changes = state["tailored_result"].get("resume_changes", {})
        pdf_filename = generate_resume_pdf(profile=profile_obj, resume_changes=resume_changes, job=job_obj, db=db)
        state["resume_pdf_path"] = pdf_filename
        steps.append({
            "step": step_count,
            "tool": "generate_resume_pdf",
            "summary": f"Compiled single-column PDF artifact: {pdf_filename}.",
            "status": "success",
        })

    elif next_step == "create_application":
        cover_note = state["tailored_result"].get("cover_note", "")
        pdf_path = state.get("resume_pdf_path")
        app = create_application(
            job_id=job_obj.id,
            tailored_resume_path=pdf_path,
            cover_note=cover_note,
            db=db,
        )
        state["application_id"] = app.id
        state["status"] = app.status  # "awaiting_approval"
        steps.append({
            "step": step_count,
            "tool": "create_application",
            "summary": f"Created application #{app.id} in status 'awaiting_approval'.",
            "status": "success",
        })

    elif next_step == "create_reminder":
        app_id = state.get("application_id")
        rem = create_reminder(
            application_id=app_id,
            title=f"Application deadline for {job_obj.role} @ {job_obj.company}",
            due_on=job_obj.closes_on,
            db=db,
        )
        state["reminder_path"] = rem.ics_path
        steps.append({
            "step": step_count,
            "tool": "create_reminder",
            "summary": f"Generated .ics calendar reminder for deadline ({job_obj.closes_on}).",
            "status": "success",
        })

    state["steps_taken"] = steps
    state["step_count"] = step_count
    return state


def router_condition(state: OrchestratorState) -> str:
    if state.get("next_step") == "done" or state.get("step_count", 0) >= 8:
        return END
    return "tool"


def build_application_graph():
    """Builds and compiles the LangGraph application preparation state graph."""
    graph = StateGraph(OrchestratorState)
    graph.add_node("planner", planner_node)
    graph.add_node("tool", tool_node)

    graph.set_entry_point("planner")
    graph.add_conditional_edges("planner", router_condition, {"tool": "tool", END: END})
    graph.add_edge("tool", "planner")

    return graph.compile()


# Compiled singleton graph
application_agent_graph = build_application_graph()


def run_prepare_application_agent(job_id: int, db: Session) -> Dict[str, Any]:
    """Runs the LangGraph agent to prepare a job application."""
    initial_state: OrchestratorState = {
        "goal": f"Prepare an application for job #{job_id}",
        "job_id": job_id,
        "db": db,
        "profile": None,
        "job": None,
        "memory": None,
        "tailored_result": None,
        "resume_pdf_path": None,
        "reminder_path": None,
        "application_id": None,
        "status": "awaiting_approval",
        "steps_taken": [],
        "step_count": 0,
        "next_step": None,
    }

    final_state = application_agent_graph.invoke(initial_state)

    # Build response bundle with steps taken, tailored data, diffs, and app state
    job_obj = db.query(Job).filter(Job.id == job_id).first()
    profile_obj = db.query(Profile).first()
    app_obj = db.query(Application).filter(Application.id == final_state.get("application_id")).first()

    return {
        "application_id": final_state.get("application_id"),
        "job_id": job_id,
        "status": app_obj.status if app_obj else "awaiting_approval",
        "tailored_resume_path": final_state.get("resume_pdf_path"),
        "reminder_path": final_state.get("reminder_path"),
        "cover_note": final_state.get("tailored_result", {}).get("cover_note", app_obj.cover_note if app_obj else ""),
        "resume_changes": final_state.get("tailored_result", {}).get("resume_changes", {}),
        "steps_taken": final_state.get("steps_taken", []),
        "job": {
            "id": job_obj.id if job_obj else job_id,
            "role": job_obj.role if job_obj else "",
            "company": job_obj.company if job_obj else "",
            "location": job_obj.location if job_obj else "",
            "type": job_obj.type if job_obj else "internship",
            "closes_on": job_obj.closes_on if job_obj else "",
            "required_skills": job_obj.required_skills_json or [] if job_obj else [],
        },
        "master_profile": {
            "name": profile_obj.name if profile_obj else "Candidate",
            "email": profile_obj.email if profile_obj else "",
            "education": profile_obj.education if profile_obj else "",
            "skills": (profile_obj.skills_json or []) if profile_obj else [],
            "projects": (profile_obj.projects_json or []) if profile_obj else [],
            "experience": (profile_obj.experience_json or []) if profile_obj else [],
        }
    }
