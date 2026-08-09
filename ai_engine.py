"""
AI Engine – AI Job Application Assistant
Uses OpenAI GPT to perform real semantic analysis for:
  - Candidate profile parsing
  - JD analysis & skill matching
  - Rejection notes analysis & Living Profile evolution
  - Global cross-rejection pattern synthesis
"""

import re
import math
import json
import os
from typing import List, Dict, Any

# ---- OpenAI client ----
try:
    from openai import OpenAI
    try:
        from dotenv import load_dotenv
        _env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
        load_dotenv(_env_path)
    except ImportError:
        pass

    _API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()
    _client = OpenAI(api_key=_API_KEY) if _API_KEY else None
except Exception:
    _client = None


def _gpt(system_prompt: str, user_prompt: str, model: str = "gpt-4o-mini") -> str:
    """Call OpenAI Chat Completions and return the response text."""
    if not _client:
        return ""
    try:
        resp = _client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=1500,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"[OpenAI Error] {e}")
        return ""


def _parse_json_response(text: str) -> dict:
    """Safely extract JSON from GPT response (handles markdown code fences)."""
    text = text.strip()
    # Remove markdown fences
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    try:
        return json.loads(text)
    except Exception as e:
        print(f"[JSON Parse Error] {e} for text snippet:\n{text[:200]}")
        # Try to find a JSON object using regex braces match
        match = re.search(r"(\{.*\})", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception as e2:
                print(f"[JSON Parse Regex Retry Error] {e2}")
        return {}


# ---- Fallback known skills list ----
KNOWN_SKILLS = [
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust",
    "SQL", "HTML", "CSS", "R", "PHP", "Ruby", "FastAPI", "Flask", "Django",
    "React", "Next.js", "Vue", "Angular", "Node.js", "Express", "Spring Boot",
    "Pandas", "NumPy", "Scikit-Learn", "TensorFlow", "PyTorch", "OpenCV",
    "ReportLab", "TailwindCSS", "Docker", "Kubernetes", "Git", "GitHub", "AWS",
    "Azure", "GCP", "Linux", "CI/CD", "PostgreSQL", "MongoDB", "Redis", "Kafka",
    "Elasticsearch", "REST APIs", "GraphQL", "Microservices", "System Design",
    "Machine Learning", "Artificial Intelligence", "Deep Learning", "NLP",
    "Data Analysis", "Agile", "Scrum", "Unit Testing", "DevOps",
    "Cloud Computing", "Cybersecurity", "Data Engineering",
    "Object-Oriented Programming",
]


def _regex_extract_skills(text: str) -> List[str]:
    """Regex-based skill extraction (fallback when OpenAI is unavailable)."""
    extracted = set()
    text_lower = text.lower()
    for skill in KNOWN_SKILLS:
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, text_lower):
            extracted.add(skill)
    return sorted(list(extracted))


def _infer_experience_level(text: str) -> str:
    text_lower = text.lower()
    if any(k in text_lower for k in ["lead", "principal", "architect", "senior", "sr.", "5+ years", "7+ years", "10+ years"]):
        return "Senior"
    elif any(k in text_lower for k in ["mid-level", "3+ years", "4+ years", "intermediate"]):
        return "Mid-Level"
    elif any(k in text_lower for k in ["junior", "entry", "intern", "associate", "0-2 years", "1+ year"]):
        return "Entry-Level"
    return "Mid-Level"


# ============================================================
# WORKFLOW 1: Candidate Profile Parsing
# ============================================================

def parse_candidate_profile(raw_text: str) -> Dict[str, Any]:
    """
    Parse candidate profile into structured Living Profile state using GPT.
    Organizes it according to the requested extraction schema.
    """
    system = (
        "You are a precise resume parser. Extract candidate details from the provided text into the JSON format matching the schema below.\n"
        "CRITICAL INSTRUCTIONS:\n"
        "- DO NOT fabricate, guess, or extrapolate any information that is not explicitly present in the candidate profile text. If a field, category, or section is not present in the text, leave it empty or as an empty array/object in the JSON schema.\n"
        "- Extract all text for summaries, job descriptions, titles, dates, college, degree, achievements, and curriculars WORD-TO-WORD exactly as they appear in the original text. DO NOT paraphrase, rewrite, summarize, or alter the wording. Keep the original wording intact.\n"
        "- Return ONLY the raw JSON object conforming to the schema below. Do not wrap it in markdown code blocks or add any conversational prologue or epilogue.\n\n"
        "Schema:\n"
        "{\n"
        "  \"name\": \"Full Name (string, empty if not found)\",\n"
        "  \"credentials\": {\n"
        "     \"email\": \"Email address (string, empty if not found)\",\n"
        "     \"phone\": \"Phone number (string, empty if not found)\",\n"
        "     \"github\": \"GitHub URL (string, empty if not found)\",\n"
        "     \"linkedin\": \"LinkedIn URL (string, empty if not found)\",\n"
        "     \"portfolio\": \"Portfolio URL if present (string, empty if not found)\"\n"
        "  },\n"
        "  \"profile_summary\": \"A short professional summary extracted word-to-word (string, empty if not found)\",\n"
        "  \"skills\": {\n"
        "     \"Languages\": [\"List of programming languages (strings)\"],\n"
        "     \"Frameworks\": [\"List of web/other frameworks (strings)\"],\n"
        "     \"Tools\": [\"List of tools/technologies (strings)\"],\n"
        "     \"Databases\": [\"List of databases (strings)\"]\n"
        "  },\n"
        "  \"projects\": [\n"
        "     {\n"
        "        \"title\": \"Project Name extracted word-to-word (string)\",\n"
        "        \"description\": \"Description of the project extracted word-to-word (string)\",\n"
        "        \"tech_used\": [\"Technologies used (strings)\"],\n"
        "        \"links\": {\n"
        "           \"source_code\": \"GitHub/source code URL (string, empty if not found)\",\n"
        "           \"production\": \"Live URL (string, empty if not found)\"\n"
        "        },\n"
        "        \"dates\": \"Project duration or completion date extracted word-to-word (string)\"\n"
        "     }\n"
        "  ],\n"
        "  \"work_experience\": [\n"
        "     {\n"
        "        \"company\": \"Company Name extracted word-to-word (string)\",\n"
        "        \"job_role\": \"Job Title/Role extracted word-to-word (string)\",\n"
        "        \"dates\": \"Employment dates/duration extracted word-to-word (string)\",\n"
        "        \"project\": \"Key project/client name worked on extracted word-to-word (string, empty if not found)\",\n"
        "        \"description\": \"Work responsibilities and achievements extracted word-to-word (string)\"\n"
        "     }\n"
        "  ],\n"
        "  \"extra_curriculars\": [\n"
        "     {\n"
        "        \"title\": \"Title/Activity name extracted word-to-word (string)\",\n"
        "        \"dates\": \"Dates extracted word-to-word (string)\",\n"
        "        \"description\": \"Details extracted word-to-word (string)\"\n"
        "     }\n"
        "  ],\n"
        "  \"achievements\": [\n"
        "     {\n"
        "        \"title\": \"Award/Achievement title extracted word-to-word (string)\",\n"
        "        \"dates\": \"Date received extracted word-to-word (string)\",\n"
        "        \"description\": \"Details extracted word-to-word (string)\"\n"
        "     }\n"
        "  ],\n"
        "  \"education\": [\n"
        "     {\n"
        "        \"college\": \"College/University extracted word-to-word (string)\",\n"
        "        \"degree\": \"Degree & major extracted word-to-word (string)\",\n"
        "        \"cgpa\": \"CGPA or GPA (string, empty if not found)\",\n"
        "        \"dates\": \"Graduation or study dates extracted word-to-word (string)\"\n"
        "     }\n"
        "  ]\n"
        "}"
    )

    raw_snippet = raw_text[:4000]
    gpt_result = _gpt(system, f"Candidate Profile:\n{raw_snippet}")
    parsed = _parse_json_response(gpt_result)

    # Fallback structure if GPT failed
    if not parsed or not isinstance(parsed, dict):
        parsed = {}

    # Extract name, credentials, summary
    name = parsed.get("name") or ""
    if not name:
        for line in raw_text.split("\n")[:5]:
            if len(line.strip()) > 3 and not any(k in line.lower() for k in ["resume", "profile", "cv", "email", "phone"]):
                name = line.strip()
                break

    credentials = parsed.get("credentials") or {}
    if not credentials.get("email"):
        email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", raw_text)
        credentials["email"] = email_match.group(0) if email_match else ""
    if not credentials.get("phone"):
        phone_match = re.search(r"[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}", raw_text)
        credentials["phone"] = phone_match.group(0) if phone_match else ""
    for k in ["github", "linkedin", "portfolio"]:
        if k not in credentials:
            credentials[k] = ""

    profile_summary = parsed.get("profile_summary") or ""

    # Skills categories
    skills = parsed.get("skills") or {}
    if not isinstance(skills, dict):
        skills = {"Languages": [], "Frameworks": [], "Tools": [], "Databases": []}
    
    # If empty, run regex fallback
    has_skills = any(isinstance(v, list) and len(v) > 0 for v in skills.values())
    if not has_skills:
        extracted_flat = _regex_extract_skills(raw_text)
        skills = {
            "Languages": [s for s in extracted_flat if s in ["Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust"]],
            "Frameworks": [s for s in extracted_flat if s in ["FastAPI", "Flask", "Django", "React", "Next.js", "Vue", "Angular", "Node.js", "Express", "Spring Boot", "TailwindCSS"]],
            "Tools": [s for s in extracted_flat if s in ["Docker", "Kubernetes", "Git", "GitHub", "AWS", "Azure", "GCP", "Linux", "CI/CD"]],
            "Databases": [s for s in extracted_flat if s in ["SQL", "PostgreSQL", "MongoDB", "Redis", "Kafka", "Elasticsearch"]]
        }

    projects = parsed.get("projects") or []
    if not isinstance(projects, list):
        projects = []

    work_experience = parsed.get("work_experience") or []
    if not isinstance(work_experience, list):
        work_experience = []

    extra_curriculars = parsed.get("extra_curriculars") or []
    if not isinstance(extra_curriculars, list):
        extra_curriculars = []

    achievements = parsed.get("achievements") or []
    if not isinstance(achievements, list):
        achievements = []

    education = parsed.get("education") or []
    if not isinstance(education, list):
        education = []

    # Return complete structure conforming to schema
    return {
        "raw_text": raw_text[:2000],
        "name": name,
        "credentials": credentials,
        "profile_summary": profile_summary,
        "skills": skills,
        "projects": projects,
        "work_experience": work_experience,
        "extra_curriculars": extra_curriculars,
        "achievements": achievements,
        "education": education,
        "weak_skills": parsed.get("weak_skills") or [],
        "struggle_topics": parsed.get("struggle_topics") or [],
        "experience_level": parsed.get("experience_level") or _infer_experience_level(raw_text),
        "rejection_learnings_count": parsed.get("rejection_learnings_count") or 0
    }


# ============================================================
# WORKFLOW 2: JD Parsing & Skill Matching
# ============================================================

def parse_jd(jd_text: str) -> Dict[str, Any]:
    """
    Extract structured info from Job Description using GPT.
    """
    system = (
        "You are a senior recruiter. Analyze the job description and return a JSON object with:\n"
        "- company_name: the hiring company name\n"
        "- job_role: the exact job title/role\n"
        "- required_skills: array of specific required technical skills mentioned\n"
        "- preferred_skills: array of nice-to-have skills mentioned\n"
        "- experience_level: one of 'Entry-Level', 'Mid-Level', 'Senior'\n"
        "- responsibilities: array of up to 5 key responsibilities (concise)\n"
        "Return ONLY the JSON object."
    )
    gpt_result = _gpt(system, f"Job Description:\n{jd_text[:3500]}")
    parsed = _parse_json_response(gpt_result)

    company_name = parsed.get("company_name", "").strip()
    job_role = parsed.get("job_role", "").strip()
    required_skills = parsed.get("required_skills") or []
    preferred_skills = parsed.get("preferred_skills") or []

    # Fallback heuristics
    if not company_name:
        for line in jd_text.split("\n")[:5]:
            if "company:" in line.lower():
                company_name = line.split(":", 1)[1].strip()
                break
            elif " at " in line.lower():
                company_name = line.lower().split(" at ")[1].split()[0].strip(":,.-").title()
                break
        if not company_name:
            company_name = "Tech Solutions Inc."

    if not job_role:
        for line in jd_text.split("\n")[:5]:
            for kw in ["developer", "engineer", "analyst", "manager", "architect", "intern", "specialist"]:
                if kw in line.lower():
                    job_role = line.strip()
                    break
        if not job_role:
            job_role = "Software Engineer"

    if not required_skills:
        required_skills = _regex_extract_skills(jd_text)
    if not required_skills:
        required_skills = ["Python", "REST APIs", "SQL", "Git", "Docker"]

    return {
        "company_name": company_name,
        "job_role": job_role,
        "required_skills": required_skills,
        "preferred_skills": preferred_skills,
        "experience_level": parsed.get("experience_level") or _infer_experience_level(jd_text),
        "full_jd": jd_text,
    }


def calculate_skill_match(
    profile_state: Dict[str, Any],
    jd_skills: List[str],
    jd_text: str,
) -> Dict[str, Any]:
    """
    Compute semantic skill match between Living Profile and JD requirements using GPT.
    """
    skills_val = profile_state.get("skills", [])
    if isinstance(skills_val, dict):
        user_skills = []
        for cat, items in skills_val.items():
            if isinstance(items, list):
                user_skills.extend(items)
            elif isinstance(items, str):
                user_skills.append(items)
    else:
        user_skills = skills_val

    weak_skills = set(profile_state.get("weak_skills", []))
    skill_levels = profile_state.get("skill_levels", {})

    if not jd_skills:
        return {
            "skill_match_pct": 25,
            "strong_matches": [],
            "moderate_matches": [],
            "missing_skills": [],
            "user_profile_skills": user_skills,
            "required_skills": jd_skills,
        }

    system = (
        "You are a senior technical recruiter and career coach. Perform a semantic skill match "
        "and a job-specific SWOT (Strengths, Weaknesses, Opportunities, Threats) analysis between the candidate's profile and the Job Description.\n"
        "Categorize each required JD skill as:\n"
        "- 'strong': candidate clearly has this skill\n"
        "- 'moderate': candidate partially matches (related skill, or weaker variant)\n"
        "- 'missing': candidate does not have this skill\n"
        "Also produce 2 specific points for each SWOT category regarding how well the candidate is aligned to this specific role.\n"
        "Return conforming exactly to this JSON schema:\n"
        "{\n"
        "  \"strong\": [\"Skill A\"],\n"
        "  \"moderate\": [\"Skill B\"],\n"
        "  \"missing\": [\"Skill C\"],\n"
        "  \"swot\": {\n"
        "     \"strengths\": [\"Strength point 1\", \"Strength point 2\"],\n"
        "     \"weaknesses\": [\"Weakness point 1\", \"Weakness point 2\"],\n"
        "     \"opportunities\": [\"Opportunity point 1\", \"Opportunity point 2\"],\n"
        "     \"threats\": [\"Threat point 1\", \"Threat point 2\"]\n"
        "  }\n"
        "}"
    )

    user_prompt = (
        f"Candidate Summary: {profile_state.get('profile_summary', 'N/A')}\n"
        f"Candidate Skills: {', '.join(user_skills)}\n"
        f"Weak/Developing Skills: {', '.join(weak_skills)}\n"
        f"JD Required Skills: {', '.join(jd_skills)}\n"
        f"Job Description context: {jd_text[:1500]}"
    )

    gpt_result = _gpt(system, user_prompt)
    parsed = _parse_json_response(gpt_result)

    strong_matches = parsed.get("strong", []) or []
    moderate_matches = parsed.get("moderate", []) or []
    missing_skills = parsed.get("missing", []) or []
    swot_parsed = parsed.get("swot") or {}

    # Fallback: exact match if GPT failed
    if not strong_matches and not moderate_matches and not missing_skills:
        for req in jd_skills:
            if req in user_skills:
                if req in weak_skills or (isinstance(skill_levels, dict) and skill_levels.get(req) == "Developing"):
                    moderate_matches.append(req)
                else:
                    strong_matches.append(req)
            else:
                missing_skills.append(req)

    # Downgrade any weak skills from strong → moderate
    final_strong = [s for s in strong_matches if s not in weak_skills]
    final_moderate = list(set(moderate_matches + [s for s in strong_matches if s in weak_skills]))

    total = len(jd_skills) if jd_skills else 1
    weighted = len(final_strong) * 1.0 + len(final_moderate) * 0.5
    match_pct = int(min(98, max(20, math.ceil((weighted / total) * 100))))

    # Small bonus for experience level alignment
    if profile_state.get("experience_level") == _infer_experience_level(jd_text):
        match_pct = min(98, match_pct + 5)

    # Reconstruct or fallback SWOT
    swot_data = {
        "strengths": swot_parsed.get("strengths") or [
            f"Strong alignment with {len(final_strong)} of the required core stack skills.",
            "Demonstrated relevant project/work history matching the role profile."
        ],
        "weaknesses": swot_parsed.get("weaknesses") or [
            f"Missing required skills: {', '.join(missing_skills[:3]) or 'None'}.",
            f"Some skills (like {', '.join(list(weak_skills)[:2]) or 'none'}) are marked as developing."
        ],
        "opportunities": swot_parsed.get("opportunities") or [
            "Upskill in missing stack components to achieve total compatibility.",
            "Certify or build projects around the remaining required languages/tools."
        ],
        "threats": swot_parsed.get("threats") or [
            "Competitors with full alignment on the missing technologies.",
            "Potential interview pressure surrounding weak or missing skills."
        ]
    }

    return {
        "skill_match_pct": match_pct,
        "strong_matches": final_strong,
        "moderate_matches": final_moderate,
        "missing_skills": missing_skills,
        "user_profile_skills": user_skills,
        "required_skills": jd_skills,
        "swot": swot_data
    }


# ============================================================
# WORKFLOW 3: Rejection Analysis & Living Profile Evolution
# ============================================================

def analyze_rejection_notes(
    profile_state: Dict[str, Any],
    rejection_notes: str,
    jd_required_skills: List[str],
    company_name: str,
    job_role: str,
) -> Dict[str, Any]:
    """
    GPT-powered rejection analysis that updates the Living Profile.
    Identifies skill gaps and struggle topics from rejection notes.
    """
    skills_val = profile_state.get("skills", [])
    if isinstance(skills_val, dict):
        user_skills = []
        for cat, items in skills_val.items():
            if isinstance(items, list):
                user_skills.extend(items)
            elif isinstance(items, str):
                user_skills.append(items)
    else:
        user_skills = skills_val

    system = (
        "You are an expert career coach specializing in technical interview failure analysis. "
        "Given a candidate's rejection notes (interview feedback, questions missed, recruiter notes), "
        "cross-referenced with the JD skills, return a JSON object:\n"
        "- identified_skill_gaps: array of specific technical skills the candidate was weak in\n"
        "- struggle_topics: array of conceptual topics or interview areas they struggled with\n"
        "- experience_assessment: one sentence describing overall interview performance issue\n"
        "- profile_update_reason: one sentence explaining why the profile needs to be updated\n"
        "Be specific and actionable. Return ONLY valid JSON."
    )

    user_prompt = (
        f"Company: {company_name}\n"
        f"Job Role: {job_role}\n"
        f"JD Required Skills: {', '.join(jd_required_skills)}\n"
        f"Candidate's Current Skills: {', '.join(user_skills)}\n"
        f"Rejection Notes:\n{rejection_notes}"
    )

    gpt_result = _gpt(system, user_prompt)
    parsed = _parse_json_response(gpt_result)

    weakness_identified = parsed.get("identified_skill_gaps", [])
    struggled_topics = parsed.get("struggle_topics", [])
    experience_assessment = parsed.get("experience_assessment", "Candidate exhibited gaps in technical depth during the interview process.")
    profile_update_reason = parsed.get("profile_update_reason", "")

    # Fallback: keyword scanning
    if not weakness_identified and not struggled_topics:
        notes_lower = rejection_notes.lower()
        for skill in KNOWN_SKILLS:
            if skill.lower() in notes_lower:
                weakness_identified.append(skill)

        concept_keywords = {
            "system design": "System Architecture & Scalability",
            "docker": "Containerization & Deployment",
            "kubernetes": "Cluster Orchestration",
            "database": "SQL Query Optimization & Data Modeling",
            "algorithm": "Data Structures & Algorithmic Problem Solving",
            "coding": "Live Coding & Problem Solving Speed",
            "communication": "Technical Communication & Behavioral Responses",
            "testing": "Unit Testing & QA Methodologies",
            "api": "REST API Architecture & Microservices",
        }
        for key, topic in concept_keywords.items():
            if key in notes_lower:
                struggled_topics.append(topic)

        if not weakness_identified and not struggled_topics:
            struggled_topics.append("Deep technical interview probing on core role responsibilities")
            weakness_identified.extend(jd_required_skills[:2])

    # ---- Update Living Profile ----
    updated_profile = dict(profile_state)
    existing_weak = set(updated_profile.get("weak_skills", []))
    existing_struggle = set(updated_profile.get("struggle_topics", []))
    skill_levels = dict(updated_profile.get("skill_levels", {}))

    flat_skills = []
    skills_obj = updated_profile.get("skills")
    if isinstance(skills_obj, dict):
        for cat, items in skills_obj.items():
            if isinstance(items, list):
                flat_skills.extend(items)
    elif isinstance(skills_obj, list):
        flat_skills = skills_obj

    for skill in weakness_identified:
        existing_weak.add(skill)
        skill_levels[skill] = "Needs Practice / Developing"
        if skill not in flat_skills:
            if isinstance(skills_obj, dict):
                skills_obj.setdefault("Tools", []).append(skill)
                flat_skills.append(skill)
            else:
                updated_profile.setdefault("skills", []).append(skill)
                flat_skills.append(skill)

    for topic in struggled_topics:
        existing_struggle.add(topic)

    updated_profile["weak_skills"] = sorted(list(existing_weak))
    updated_profile["struggle_topics"] = sorted(list(existing_struggle))
    updated_profile["skill_levels"] = skill_levels
    updated_profile["rejection_learnings_count"] = updated_profile.get("rejection_learnings_count", 0) + 1

    analysis_summary = {
        "company_name": company_name,
        "job_role": job_role,
        "identified_skill_gaps": weakness_identified,
        "struggle_topics": struggled_topics,
        "experience_assessment": experience_assessment,
        "profile_updates_applied": (
            profile_update_reason
            or f"Annotated weak skills ({', '.join(weakness_identified) if weakness_identified else 'General technical depth'}) "
               f"in Living Profile for future resume tailoring."
        ),
    }

    return {
        "updated_profile_state": updated_profile,
        "analysis_summary": analysis_summary,
    }


# ============================================================
# WORKFLOW 4: Global Cross-Rejection Analysis
# ============================================================

def compute_global_analysis(applications: List[Dict[str, Any]], profile_state: Dict[str, Any] = None, upskilled_skills: List[str] = None) -> Dict[str, Any]:
    """
    GPT-powered cross-rejection synthesis across all rejected applications,
    returning a structured SWOT analysis and strategic recommendations.
    """
    rejected_apps = [a for a in applications if a.get("status") == "Not Selected"]

    if not rejected_apps:
        return {
            "has_data": False,
            "message": (
                "Not enough rejection data yet. As applications are marked as 'Not Selected' "
                "and analyzed in Tab 3, global cross-rejection insights will automatically populate here."
            ),
        }

    # Collect rejection summaries
    summaries = []
    skill_gap_counts: Dict[str, int] = {}
    topic_counts: Dict[str, int] = {}
    companies_analyzed = []

    upskilled_set = {s.lower().strip() for s in (upskilled_skills or [])}
    has_any_raw_data = False

    for app in rejected_apps:
        companies_analyzed.append(app.get("company_name", "Unknown"))
        analysis = app.get("rejection_analysis", {})
        raw_gaps = analysis.get("identified_skill_gaps", [])
        raw_topics = analysis.get("struggle_topics", [])
        
        if raw_gaps or raw_topics:
            has_any_raw_data = True
            
        gaps = [g for g in raw_gaps if g.lower().strip() not in upskilled_set]
        topics = [t for t in raw_topics if t.lower().strip() not in upskilled_set]
        notes = app.get("rejection_notes", "")

        for g in gaps:
            skill_gap_counts[g] = skill_gap_counts.get(g, 0) + 1
        for t in topics:
            topic_counts[t] = topic_counts.get(t, 0) + 1

        summaries.append(
            f"- {app.get('company_name', 'Unknown')} ({app.get('job_role', 'Unknown')}): "
            f"Gaps: {', '.join(gaps) or 'N/A'}. Topics: {', '.join(topics) or 'N/A'}. "
            f"Notes: {notes[:200]}"
        )

    # Frequency-sorted lists
    recurring_skill_gaps = sorted(skill_gap_counts.items(), key=lambda x: x[1], reverse=True)
    common_unanswered_topics = sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)

    gaps_list = [f"{s} ({c} rejection{'s' if c > 1 else ''})" for s, c in recurring_skill_gaps[:5]]
    topics_list = [f"{t} ({c} company)" for t, c in common_unanswered_topics[:5]]

    if not gaps_list and not has_any_raw_data:
        gaps_list = ["Advanced System Architecture", "Production DevOps / Containerization"]
    if not topics_list and not has_any_raw_data:
        topics_list = ["Live Technical Coding & Algorithm Probing", "Detailed System Scalability Questions"]

    # GPT SWOT strategic synthesis
    system_swot = (
        "You are an expert career strategist. Analyze the candidate's profile summary, skills, and recent job rejections "
        "to construct a highly encouraging, actionable, and structured SWOT (Strengths, Weaknesses, Opportunities, Threats) analysis.\n"
        "Return a JSON object conforming exactly to this schema:\n"
        "{\n"
        "  \"strengths\": [\"Strength 1 (2-3 sentences explaining a clear asset)\", \"Strength 2\"],\n"
        "  \"weaknesses\": [\"Weakness 1 (2-3 sentences explaining a skill gap/struggle topic)\", \"Weakness 2\"],\n"
        "  \"opportunities\": [\"Opportunity 1 (2-3 sentences recommending an upskilling path/certification)\", \"Opportunity 2\"],\n"
        "  \"threats\": [\"Threat 1 (2-3 sentences explaining market competition or interview bottlenecks)\", \"Threat 2\"],\n"
        "  \"recommendation\": \"A 2-3 sentence strategic recommendation...\"\n"
        "}"
    )

    if not profile_state:
        profile_state = {}

    user_swot_prompt = (
        f"Candidate Name: {profile_state.get('name', 'Candidate')}\n"
        f"Profile Summary: {profile_state.get('profile_summary', 'N/A')}\n"
        f"Current Skills: {json.dumps(profile_state.get('skills', {}))}\n"
        f"Rejection summaries across {len(rejected_apps)} application(s):\n"
        + "\n".join(summaries[:6])
        + f"\n\nTop recurring skill gaps: {', '.join([s for s, _ in recurring_skill_gaps[:3]])}"
        + f"\nTop struggle topics: {', '.join([t for t, _ in common_unanswered_topics[:3]])}"
    )

    gpt_res = _gpt(system_swot, user_swot_prompt)
    parsed_swot = _parse_json_response(gpt_res) if gpt_res else {}

    # Read SWOT items with fallbacks
    strengths = parsed_swot.get("strengths") or [
        f"Solid professional experience as a candidate with a strong background in QA and delivery.",
        "Demonstrated learning agility by actively tracking and documenting profile weaknesses."
    ]
    weaknesses = parsed_swot.get("weaknesses") or [
        f"Skill gaps identified in domains: {', '.join([s for s, _ in recurring_skill_gaps[:2]]) or 'core technical topics'}."
    ]
    opportunities = parsed_swot.get("opportunities") or [
        "Upskilling in missing technical areas and adding certifications to the profile.",
        "Leveraging existing fintech/QA experience to target specialized domain roles."
    ]
    threats = parsed_swot.get("threats") or [
        "Increasing market competition for generic cloud and engineering roles.",
        "Rising expectations for hands-on scripting and programming in QA lead interviews."
    ]
    strategic_recommendation = parsed_swot.get("recommendation") or ""

    if not strategic_recommendation:
        top_gap_names = [s for s, _ in recurring_skill_gaps[:2]]
        gap_str = " and ".join(top_gap_names) if top_gap_names else "core technical domain topics"
        strategic_recommendation = (
            f"Based on analysis across {len(rejected_apps)} rejection round(s) "
            f"(including {', '.join(companies_analyzed[:3])}), "
            f"your primary bottleneck is technical depth in {gap_str}. "
            "Prioritize hands-on project building and mock technical interview practice before your next applications."
        )

    consistent_weak_areas = [
        "System Architecture & Distributed Design under interview pressure",
        "Hands-on production container orchestration (Docker/Kubernetes)",
        "Articulating complex trade-offs during live technical rounds",
    ]
    if recurring_skill_gaps:
        consistent_weak_areas = [s for s, _ in recurring_skill_gaps[:3]]

    return {
        "has_data": True,
        "total_rejections_analyzed": len(rejected_apps),
        "companies_analyzed": companies_analyzed,
        "recurring_skill_gaps": gaps_list,
        "common_unanswered_topics": topics_list,
        "consistent_weak_areas": consistent_weak_areas,
        "summary_recommendation": strategic_recommendation,
        "swot": {
            "strengths": strengths,
            "weaknesses": weaknesses,
            "opportunities": opportunities,
            "threats": threats
        }
    }
