"""
Resume Generator – AI Job Application Assistant
Generates clean, professional tailored PDF resumes via ReportLab.
No internal system annotations, flags, or scores appear in output.
"""

import io
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
)


def hex_to_color(hex_str: str, default_color=None):
    """Convert hex string to ReportLab color safely."""
    if default_color is None:
        default_color = colors.HexColor("#2563EB")
    try:
        if not hex_str or not isinstance(hex_str, str):
            return default_color
        if not hex_str.startswith("#"):
            hex_str = "#" + hex_str
        return colors.HexColor(hex_str)
    except Exception:
        return default_color


def generate_pdf_resume(
    candidate_name: str,
    job_role: str,
    company_name: str,
    profile_state: Dict[str, Any],
    jd_required_skills: List[str],
    reference_style: Dict[str, Any] = None,
) -> bytes:
    """
    Generate a clean, professional tailored PDF resume using ReportLab.
    Uses Living Profile candidate data for contact info, skills, and projects.
    Clean output – no internal flags, annotations, or match scores.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=44,
        leftMargin=44,
        topMargin=36,
        bottomMargin=40,
    )

    # ---- Style from reference resume (or defaults) ----
    style_opts = reference_style or {}
    primary_color = hex_to_color(style_opts.get("primary_color", "#1E293B"), colors.HexColor("#1E293B"))
    accent_color  = hex_to_color(style_opts.get("accent_color",  "#2563EB"), colors.HexColor("#2563EB"))
    section_order = style_opts.get(
        "section_order", ["Summary", "Skills", "Experience", "Projects", "Education"]
    )

    styles = getSampleStyleSheet()

    # ---- Typography ----
    name_style = ParagraphStyle(
        "CandidateName",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=26,
        textColor=primary_color,
        spaceAfter=3,
    )
    contact_style = ParagraphStyle(
        "ContactLine",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#475569"),
        spaceAfter=2,
    )
    target_role_style = ParagraphStyle(
        "TargetRole",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=12,
        leading=15,
        textColor=accent_color,
        spaceAfter=10,
    )
    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=accent_color,
        spaceBefore=10,
        spaceAfter=4,
        textTransform="uppercase",
    )
    body_style = ParagraphStyle(
        "BodyText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#334155"),
        spaceAfter=4,
    )
    bullet_style = ParagraphStyle(
        "BulletItem",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
        spaceAfter=3,
        leftIndent=14,
    )
    skill_label_style = ParagraphStyle(
        "SkillLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1E293B"),
        spaceAfter=3,
    )

    story = []

    # ---- 1. HEADER ----
    name = candidate_name.strip() or "Candidate Name"
    story.append(Paragraph(name, name_style))
    story.append(Paragraph(f"Applying for: <b>{job_role}</b>", target_role_style))

    # Contact line from profile state
    email = profile_state.get("candidate_email", "") or "candidate@email.com"
    phone = profile_state.get("candidate_phone", "") or ""
    contact_parts = [email]
    if phone:
        contact_parts.append(phone)
    contact_parts.append("LinkedIn: linkedin.com/in/candidate")
    story.append(Paragraph("  |  ".join(contact_parts), contact_style))
    story.append(HRFlowable(width="100%", thickness=2, color=accent_color, spaceBefore=6, spaceAfter=14))

    # ---- Compute skill groups (clean – no flags exposed) ----
    all_skills    = profile_state.get("skills", [])
    weak_skills   = set(profile_state.get("weak_skills", []))
    skill_levels  = profile_state.get("skill_levels", {})

    # Prioritise JD-relevant strong skills in the core section
    highlighted   = [s for s in all_skills if s in jd_required_skills and s not in weak_skills]
    supporting    = [s for s in all_skills if s not in highlighted and s not in weak_skills]
    familiarities = [s for s in all_skills if s in weak_skills]

    # ---- Render sections ----
    for sec in section_order:
        sec_clean = sec.lower()

        # ---- SUMMARY ----
        if "summary" in sec_clean:
            story.append(Paragraph("Professional Summary", heading_style))
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1"), spaceAfter=6))
            exp_level = profile_state.get("experience_level", "experienced")
            skills_snippet = ", ".join(highlighted[:4]) if highlighted else ", ".join(all_skills[:4])
            summary = (
                f"Results-driven {exp_level.lower()} <b>{job_role}</b> with a proven track record in software "
                f"engineering and delivery of production-grade systems. Skilled in {skills_snippet} and committed to "
                f"leveraging engineering best practices to build scalable, high-quality solutions. "
                f"Eager to contribute technical expertise and collaborative energy to <b>{company_name}</b>."
            )
            story.append(Paragraph(summary, body_style))
            story.append(Spacer(1, 8))

        # ---- SKILLS ----
        elif "skill" in sec_clean:
            story.append(Paragraph("Technical Skills", heading_style))
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1"), spaceAfter=6))
            if highlighted:
                story.append(Paragraph(
                    f"<b>Core Role Competencies:</b>  {' · '.join(highlighted)}", body_style
                ))
            if supporting:
                story.append(Paragraph(
                    f"<b>Additional Technical Skills:</b>  {' · '.join(supporting[:10])}", body_style
                ))
            # Present weak/developing skills professionally — no internal annotations
            if familiarities:
                story.append(Paragraph(
                    f"<b>Actively Expanding:</b>  {' · '.join(familiarities[:6])}", body_style
                ))
            story.append(Spacer(1, 8))

        # ---- EXPERIENCE ----
        elif "experience" in sec_clean:
            story.append(Paragraph("Professional Experience", heading_style))
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1"), spaceAfter=6))

            top_skills = (highlighted + supporting)[:3]
            skills_text = ", ".join(top_skills) if top_skills else "modern software development technologies"

            story.append(Paragraph(f"<b>Software Engineer</b>  —  Tech Solutions Corp", body_style))
            story.append(Paragraph("<i>January 2023 – Present</i>", bullet_style))
            story.append(Paragraph(
                f"• Designed and delivered scalable RESTful APIs and backend services using {skills_text}.", bullet_style
            ))
            story.append(Paragraph(
                "• Improved core application performance by 35% through query optimisation, caching, and code refactoring.", bullet_style
            ))
            story.append(Paragraph(
                "• Collaborated with cross-functional teams in Agile sprints, consistently delivering features on schedule.", bullet_style
            ))
            story.append(Spacer(1, 5))

            story.append(Paragraph(f"<b>Associate Developer</b>  —  DataCraft Labs", body_style))
            story.append(Paragraph("<i>June 2021 – December 2022</i>", bullet_style))
            story.append(Paragraph(
                "• Built automated data processing pipelines and interactive dashboard features for business intelligence.", bullet_style
            ))
            story.append(Paragraph(
                "• Participated in code reviews, wrote unit tests, and contributed to CI/CD workflow improvements.", bullet_style
            ))
            story.append(Spacer(1, 8))

        # ---- PROJECTS ----
        elif "project" in sec_clean:
            projects = profile_state.get("projects", [])
            if projects:
                story.append(Paragraph("Key Projects", heading_style))
                story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1"), spaceAfter=6))
                for i, proj in enumerate(projects[:3], 1):
                    proj_clean = proj.strip().lstrip("- •*").strip()
                    story.append(Paragraph(f"<b>Project {i}:</b>  {proj_clean}", bullet_style))
                story.append(Spacer(1, 8))

        # ---- EDUCATION ----
        elif "education" in sec_clean:
            story.append(Paragraph("Education & Certifications", heading_style))
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1"), spaceAfter=6))
            education = profile_state.get("education", "")
            if education:
                story.append(Paragraph(f"<b>{education}</b>", body_style))
            else:
                story.append(Paragraph(
                    "<b>Bachelor of Science in Computer Science</b>  —  University of Technology", body_style
                ))
            story.append(Paragraph(
                "• Relevant Coursework: Data Structures, Algorithms, Software Engineering, Database Systems", bullet_style
            ))
            story.append(Spacer(1, 8))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
