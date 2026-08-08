import json
import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
import io

from document_parser import extract_text_from_file, extract_reference_style
from ai_engine import (
    parse_candidate_profile,
    parse_jd,
    calculate_skill_match,
    analyze_rejection_notes,
    compute_global_analysis,
)
from resume_generator import generate_pdf_resume

app = FastAPI(title="AI Job Application Assistant")

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.json")
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_data() -> dict:
    """Load persisted JSON data."""
    if not os.path.exists(DATA_FILE):
        return {
            "applications": [],
            "current_profile_state": None,
            "profile_history": [],
            "reference_resume_style": None,
            "original_profile_text": None,
        }
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {
            "applications": [],
            "current_profile_state": None,
            "profile_history": [],
            "reference_resume_style": None,
            "original_profile_text": None,
        }


def save_data(data: dict):
    """Persist data to JSON file."""
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/upload-profile")
async def upload_profile(file: UploadFile = File(...)):
    """Parse candidate profile (.txt/.pdf/.docx) and initialise Living Profile."""
    allowed = (".txt", ".pdf", ".docx")
    if not any(file.filename.lower().endswith(ext) for ext in allowed):
        raise HTTPException(400, f"Unsupported format. Accepted: {', '.join(allowed)}")

    content = await file.read()
    raw_text = extract_text_from_file(content, file.filename)
    profile = parse_candidate_profile(raw_text)

    data = load_data()
    if data.get("current_profile_state") is None:
        data["current_profile_state"] = profile
    else:
        # Preserve learned weaknesses when re‑uploading
        existing = data["current_profile_state"]
        profile["weak_skills"] = list(
            set(profile.get("weak_skills", []))
            | set(existing.get("weak_skills", []))
        )
        profile["struggle_topics"] = list(
            set(profile.get("struggle_topics", []))
            | set(existing.get("struggle_topics", []))
        )
        profile["rejection_learnings_count"] = existing.get(
            "rejection_learnings_count", 0
        )
        # Update skill levels for weak skills
        for ws in profile["weak_skills"]:
            profile["skill_levels"][ws] = "Needs Practice / Developing"
        data["current_profile_state"] = profile

    data["original_profile_text"] = raw_text[:3000]
    save_data(data)

    return {
        "status": "success",
        "filename": file.filename,
        "profile_preview": raw_text[:500],
        "skills": profile["skills"],
        "experience_level": profile["experience_level"],
        "candidate_name": profile.get("candidate_name", ""),
        "candidate_email": profile.get("candidate_email", ""),
    }


@app.post("/api/upload-reference-resume")
async def upload_reference_resume(file: UploadFile = File(...)):
    """Parse reference resume for stylistic guidance."""
    allowed = (".pdf", ".docx")
    if not any(file.filename.lower().endswith(ext) for ext in allowed):
        raise HTTPException(400, f"Unsupported format. Accepted: {', '.join(allowed)}")

    content = await file.read()
    style = extract_reference_style(content, file.filename)

    data = load_data()
    data["reference_resume_style"] = style
    save_data(data)

    return {"status": "success", "filename": file.filename, "style": style}


@app.post("/api/analyze-jd")
async def analyze_jd(jd_text: str = Form(...)):
    """Analyze a pasted Job Description and compute skill match against Living Profile."""
    data = load_data()
    profile_state = data.get("current_profile_state")

    jd_info = parse_jd(jd_text)

    if profile_state:
        match_result = calculate_skill_match(
            profile_state, jd_info["required_skills"], jd_text
        )
    else:
        match_result = {
            "skill_match_pct": 0,
            "strong_matches": [],
            "moderate_matches": [],
            "missing_skills": jd_info["required_skills"],
            "user_profile_skills": [],
            "required_skills": jd_info["required_skills"],
        }

    return {
        "company_name": jd_info["company_name"],
        "job_role": jd_info["job_role"],
        "required_skills": jd_info["required_skills"],
        "user_profile_skills": match_result["user_profile_skills"],
        "skill_match_pct": match_result["skill_match_pct"],
        "strong_matches": match_result["strong_matches"],
        "moderate_matches": match_result["moderate_matches"],
        "missing_skills": match_result["missing_skills"],
    }


@app.post("/api/generate-resume")
async def generate_resume(
    candidate_name: str = Form(""),
    job_role: str = Form(...),
    company_name: str = Form(...),
    jd_skills: str = Form(""),
):
    """Generate a tailored ReportLab PDF resume and return it for download."""
    data = load_data()
    profile_state = data.get("current_profile_state") or {
        "skills": [],
        "skill_levels": {},
        "weak_skills": [],
        "projects": [],
    }
    ref_style = data.get("reference_resume_style")
    skill_list = [s.strip() for s in jd_skills.split(",") if s.strip()]

    # Use profile candidate_name if UI field left blank
    resolved_name = (
        candidate_name.strip()
        or profile_state.get("candidate_name", "")
        or "Candidate"
    )

    pdf_bytes = generate_pdf_resume(
        candidate_name=resolved_name,
        job_role=job_role,
        company_name=company_name,
        profile_state=profile_state,
        jd_required_skills=skill_list,
        reference_style=ref_style,
    )

    safe_name = resolved_name.replace(" ", "_")
    safe_company = company_name.replace(" ", "_")
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="Resume_{safe_name}_{safe_company}.pdf"'
        },
    )


@app.post("/api/submit-application")
async def submit_application(
    company_name: str = Form(...),
    job_role: str = Form(...),
    candidate_name: str = Form(""),
    skills_required: str = Form(""),
    skill_match_pct: int = Form(0),
    jd_text: str = Form(""),
):
    """Log an application as Submitted."""
    data = load_data()
    app_id = str(uuid.uuid4())[:8]
    now = datetime.utcnow().isoformat()

    application = {
        "id": app_id,
        "company_name": company_name,
        "job_role": job_role,
        "candidate_name": candidate_name,
        "skills_required": [s.strip() for s in skills_required.split(",") if s.strip()],
        "skill_match_pct": skill_match_pct,
        "jd_text": jd_text,
        "status": "Submitted",
        "status_history": [{"status": "Submitted", "timestamp": now}],
        "rejection_notes": "",
        "rejection_analysis": {},
        "created_at": now,
    }

    data["applications"].append(application)
    save_data(data)

    return {"status": "success", "application": application}


@app.get("/api/applications")
async def get_applications():
    """Return all applications and current profile state."""
    data = load_data()
    return {
        "applications": data.get("applications", []),
        "current_profile_state": data.get("current_profile_state"),
        "reference_resume_style": data.get("reference_resume_style"),
    }


@app.post("/api/update-status")
async def update_status(
    app_id: str = Form(...),
    new_status: str = Form(...),
):
    """Update status of an existing application."""
    valid = {"Submitted", "Interview", "Selected", "Not Selected"}
    if new_status not in valid:
        raise HTTPException(400, f"Invalid status. Must be one of: {valid}")

    data = load_data()
    now = datetime.utcnow().isoformat()

    for application in data["applications"]:
        if application["id"] == app_id:
            application["status"] = new_status
            application["status_history"].append(
                {"status": new_status, "timestamp": now}
            )
            save_data(data)
            return {"status": "success", "application": application}

    raise HTTPException(404, "Application not found")


@app.post("/api/save-rejection-notes")
async def save_rejection_notes(
    app_id: str = Form(...),
    rejection_notes: str = Form(""),
):
    """Save free-text rejection notes for a rejected application."""
    data = load_data()
    for application in data["applications"]:
        if application["id"] == app_id:
            application["rejection_notes"] = rejection_notes
            save_data(data)
            return {"status": "success"}
    raise HTTPException(404, "Application not found")


@app.post("/api/analyze-rejection")
async def analyze_rejection(app_id: str = Form(...)):
    """Run AI rejection analysis and update the Living Profile."""
    data = load_data()
    target = None
    for application in data["applications"]:
        if application["id"] == app_id:
            target = application
            break

    if not target:
        raise HTTPException(404, "Application not found")

    rejection_notes = target.get("rejection_notes", "")
    if not rejection_notes.strip():
        raise HTTPException(
            400, "Please enter rejection notes before running the analysis."
        )

    profile_state = data.get("current_profile_state") or {}
    jd_skills = target.get("skills_required", [])

    result = analyze_rejection_notes(
        profile_state=profile_state,
        rejection_notes=rejection_notes,
        jd_required_skills=jd_skills,
        company_name=target.get("company_name", ""),
        job_role=target.get("job_role", ""),
    )

    # Update Living Profile
    data["current_profile_state"] = result["updated_profile_state"]
    data["profile_history"].append(
        {
            "app_id": app_id,
            "company_name": target.get("company_name", ""),
            "timestamp": datetime.utcnow().isoformat(),
            "changes": result["analysis_summary"],
        }
    )

    target["rejection_analysis"] = result["analysis_summary"]
    save_data(data)

    return {"status": "success", "analysis": result["analysis_summary"]}


@app.get("/api/global-analysis")
async def global_analysis():
    """Compute and return cross-rejection global analysis."""
    data = load_data()
    apps = data.get("applications", [])
    result = compute_global_analysis(apps)
    return result


@app.post("/api/clear-all-data")
async def clear_all_data():
    """Wipe data.json completely."""
    empty = {
        "applications": [],
        "current_profile_state": None,
        "profile_history": [],
        "reference_resume_style": None,
        "original_profile_text": None,
    }
    save_data(empty)
    return {"status": "success", "message": "All data cleared."}


# ---------------------------------------------------------------------------
# Static file serving & SPA fallback
# ---------------------------------------------------------------------------

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
