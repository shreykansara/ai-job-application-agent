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
    except Exception:
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
    Falls back to regex extraction if OpenAI unavailable.
    """
    system = (
        "You are an expert HR analyst and career coach. Parse the provided candidate "
        "profile text and return a JSON object with these exact keys:\n"
        "- skills: array of specific technical and domain skills (strings)\n"
        "- skill_levels: object mapping each skill to one of: 'Expert', 'Proficient', 'Developing'\n"
        "- experience_level: one of 'Entry-Level', 'Mid-Level', 'Senior'\n"
        "- projects: array of up to 4 concise project description strings (1-2 sentences each)\n"
        "- domain_knowledge: array of 3-5 domain/industry knowledge areas\n"
        "- candidate_name: the candidate's full name if found, else empty string\n"
        "- candidate_email: the candidate's email if found, else empty string\n"
        "- candidate_phone: the candidate's phone if found, else empty string\n"
        "- education: the candidate's highest education degree + institution if found\n"
        "Return ONLY the JSON object, no extra text."
    )

    raw_snippet = raw_text[:3500]
    gpt_result = _gpt(system, f"Candidate Profile:\n{raw_snippet}")
    parsed = _parse_json_response(gpt_result)

    # Validate / fill defaults
    skills = parsed.get("skills") or _regex_extract_skills(raw_text)
    if not skills:
        skills = ["Python", "Problem Solving", "Software Development", "REST APIs", "SQL"]

    skill_levels = parsed.get("skill_levels") or {s: "Proficient" for s in skills}
    # Ensure all skills have a level
    for s in skills:
        if s not in skill_levels:
            skill_levels[s] = "Proficient"

    projects = parsed.get("projects") or []
    if not projects:
        # Try simple regex extraction
        lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
        in_proj = False
        for line in lines:
            if "project" in line.lower() and len(line) < 30:
                in_proj = True
                continue
            if in_proj:
                if any(h in line.lower() for h in ["education", "experience", "skills", "summary"]):
                    break
                if len(line) > 10:
                    projects.append(line)
        if not projects:
            projects = [
                "Full-stack web application with REST API and database persistence.",
                "Machine learning data analysis pipeline for automated reporting.",
            ]

    return {
        "raw_text": raw_text[:2000],
        "skills": skills,
        "skill_levels": skill_levels,
        "weak_skills": [],
        "struggle_topics": [],
        "experience_level": parsed.get("experience_level") or _infer_experience_level(raw_text),
        "projects": projects[:4],
        "domain_knowledge": parsed.get("domain_knowledge") or ["Software Engineering", "Web Applications", "Data Processing"],
        "candidate_name": parsed.get("candidate_name", ""),
        "candidate_email": parsed.get("candidate_email", ""),
        "candidate_phone": parsed.get("candidate_phone", ""),
        "education": parsed.get("education", ""),
        "rejection_learnings_count": 0,
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
    user_skills = profile_state.get("skills", [])
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
        "You are a senior technical recruiter performing a semantic skill match analysis. "
        "Given a candidate's skill list and a list of required JD skills, categorize each JD skill as:\n"
        "- 'strong': candidate clearly has this skill\n"
        "- 'moderate': candidate partially matches (related skill, older version, or weaker variant)\n"
        "- 'missing': candidate does not have this skill\n"
        "Use semantic understanding (e.g. 'FastAPI' covers 'REST APIs', 'React' covers 'JavaScript' partially). "
        "Return JSON: {\"strong\": [...], \"moderate\": [...], \"missing\": [...]}"
    )

    user_prompt = (
        f"Candidate Skills: {', '.join(user_skills)}\n"
        f"Weak/Developing Skills: {', '.join(weak_skills)}\n"
        f"JD Required Skills: {', '.join(jd_skills)}"
    )

    gpt_result = _gpt(system, user_prompt)
    parsed = _parse_json_response(gpt_result)

    strong_matches = parsed.get("strong", []) or []
    moderate_matches = parsed.get("moderate", []) or []
    missing_skills = parsed.get("missing", []) or []

    # Fallback: exact match if GPT failed
    if not strong_matches and not moderate_matches and not missing_skills:
        for req in jd_skills:
            if req in user_skills:
                if req in weak_skills or skill_levels.get(req) == "Developing":
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

    return {
        "skill_match_pct": match_pct,
        "strong_matches": final_strong,
        "moderate_matches": final_moderate,
        "missing_skills": missing_skills,
        "user_profile_skills": user_skills,
        "required_skills": jd_skills,
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
        f"Candidate's Current Skills: {', '.join(profile_state.get('skills', []))}\n"
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

    for skill in weakness_identified:
        existing_weak.add(skill)
        skill_levels[skill] = "Needs Practice / Developing"
        # If skill is not in profile skills, add it as a gap
        if skill not in updated_profile.get("skills", []):
            updated_profile.setdefault("skills", [])

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

def compute_global_analysis(applications: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    GPT-powered cross-rejection synthesis across all rejected applications.
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

    for app in rejected_apps:
        companies_analyzed.append(app.get("company_name", "Unknown"))
        analysis = app.get("rejection_analysis", {})
        gaps = analysis.get("identified_skill_gaps", [])
        topics = analysis.get("struggle_topics", [])
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

    if not gaps_list:
        gaps_list = ["Advanced System Architecture", "Production DevOps / Containerization"]
    if not topics_list:
        topics_list = ["Live Technical Coding & Algorithm Probing", "Detailed System Scalability Questions"]

    # GPT strategic synthesis
    system = (
        "You are an expert career strategist. Based on a job seeker's rejection history across multiple companies, "
        "provide a 2-3 sentence strategic improvement recommendation that is specific, actionable, and prioritized. "
        "Focus on the top bottlenecks. Write in second person ('You should...'). No bullet points, just a paragraph."
    )
    user_prompt = (
        f"Rejection summary across {len(rejected_apps)} application(s):\n"
        + "\n".join(summaries[:6])
        + f"\n\nTop recurring skill gaps: {', '.join([s for s, _ in recurring_skill_gaps[:3]])}"
        + f"\nTop struggle topics: {', '.join([t for t, _ in common_unanswered_topics[:3]])}"
    )
    strategic_recommendation = _gpt(system, user_prompt)

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
    }
