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
    credentials = profile_state.get("credentials") or {}
    email = credentials.get("email") or profile_state.get("candidate_email") or "candidate@email.com"
    phone = credentials.get("phone") or profile_state.get("candidate_phone") or ""
    github = credentials.get("github") or ""
    linkedin = credentials.get("linkedin") or ""
    portfolio = credentials.get("portfolio") or ""
    
    contact_parts = []
    if email:
        contact_parts.append(email)
    if phone:
        contact_parts.append(phone)
    if github:
        contact_parts.append(f"GitHub: {github}")
    if linkedin:
        contact_parts.append(f"LinkedIn: {linkedin}")
    if portfolio:
        contact_parts.append(f"Portfolio: {portfolio}")
    if not contact_parts:
        contact_parts = ["candidate@email.com"]

    story.append(Paragraph("  |  ".join(contact_parts), contact_style))
    story.append(HRFlowable(width="100%", thickness=2, color=accent_color, spaceBefore=6, spaceAfter=14))

    # ---- Compute skill groups (clean – no flags exposed) ----
    skills_val = profile_state.get("skills", [])
    if isinstance(skills_val, dict):
        all_skills = []
        for cat, items in skills_val.items():
            if isinstance(items, list):
                all_skills.extend(items)
            elif isinstance(items, str):
                all_skills.append(items)
    else:
        all_skills = skills_val

    weak_skills   = set(profile_state.get("weak_skills", []))
    skill_levels  = profile_state.get("skill_levels", {})

    # Prioritise JD-relevant strong skills in the core section
    highlighted   = [s for s in all_skills if s in jd_required_skills and s not in weak_skills]
    supporting    = [s for s in all_skills if s not in highlighted and s not in weak_skills]
    familiarities = [s for s in all_skills if s in weak_skills]

    # Append Achievements and Extra Curriculars dynamically to section order if present
    section_order_dynamic = list(section_order)
    if "Achievements" not in section_order_dynamic and profile_state.get("achievements"):
        section_order_dynamic.append("Achievements")
    if "Extra Curriculars" not in section_order_dynamic and profile_state.get("extra_curriculars"):
        section_order_dynamic.append("Extra Curriculars")

    # ---- Render sections ----
    for sec in section_order_dynamic:
        sec_clean = sec.lower()

        # ---- SUMMARY ----
        if "summary" in sec_clean:
            story.append(Paragraph("Professional Summary", heading_style))
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1"), spaceAfter=6))
            summary_val = profile_state.get("profile_summary") or ""
            if not summary_val:
                exp_level = profile_state.get("experience_level", "experienced")
                skills_snippet = ", ".join(highlighted[:4]) if highlighted else ", ".join(all_skills[:4])
                summary_val = (
                    f"Results-driven {exp_level.lower()} <b>{job_role}</b> with a proven track record in software "
                    f"engineering and delivery of production-grade systems. Skilled in {skills_snippet} and committed to "
                    f"leveraging engineering best practices to build scalable, high-quality solutions. "
                    f"Eager to contribute technical expertise and collaborative energy to <b>{company_name}</b>."
                )
            story.append(Paragraph(summary_val, body_style))
            story.append(Spacer(1, 8))

        # ---- SKILLS ----
        elif "skill" in sec_clean:
            story.append(Paragraph("Technical Skills", heading_style))
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1"), spaceAfter=6))
            skills_dict = profile_state.get("skills", {})
            if isinstance(skills_dict, dict):
                for cat, items in skills_dict.items():
                    if items:
                        clean_items = [s for s in items if s not in weak_skills]
                        if clean_items:
                            story.append(Paragraph(
                                f"<b>{cat}:</b>  {' · '.join(clean_items)}", body_style
                            ))
                if familiarities:
                    story.append(Paragraph(
                        f"<b>Actively Expanding:</b>  {' · '.join(familiarities)}", body_style
                    ))
            else:
                if highlighted:
                    story.append(Paragraph(
                        f"<b>Core Role Competencies:</b>  {' · '.join(highlighted)}", body_style
                    ))
                if supporting:
                    story.append(Paragraph(
                        f"<b>Additional Technical Skills:</b>  {' · '.join(supporting[:10])}", body_style
                    ))
                if familiarities:
                    story.append(Paragraph(
                        f"<b>Actively Expanding:</b>  {' · '.join(familiarities[:6])}", body_style
                    ))
            story.append(Spacer(1, 8))

        # ---- EXPERIENCE ----
        elif "experience" in sec_clean:
            story.append(Paragraph("Professional Experience", heading_style))
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1"), spaceAfter=6))

            work_exp = profile_state.get("work_experience", [])
            if isinstance(work_exp, list) and work_exp:
                for job in work_exp:
                    comp = job.get("company") or ""
                    role = job.get("job_role") or job_role
                    dates = job.get("dates") or ""
                    proj = job.get("project") or ""
                    desc = job.get("description") or ""

                    header_text = f"<b>{role}</b>"
                    if comp:
                        header_text += f"  —  {comp}"
                    story.append(Paragraph(header_text, body_style))
                    if dates:
                        story.append(Paragraph(f"<i>{dates}</i>", bullet_style))
                    if proj:
                        story.append(Paragraph(f"Project: {proj}", bullet_style))
                    if desc:
                        for line in desc.split("."):
                            line_clean = line.strip()
                            if len(line_clean) > 8:
                                story.append(Paragraph(f"• {line_clean}.", bullet_style))
                    story.append(Spacer(1, 6))
            else:
                # Fallback experience
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
                story.append(Spacer(1, 8))

        # ---- PROJECTS ----
        elif "project" in sec_clean:
            projects_list = profile_state.get("projects", [])
            if projects_list:
                story.append(Paragraph("Key Projects", heading_style))
                story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1"), spaceAfter=6))
                for proj in projects_list:
                    title = proj.get("title") or "Project"
                    desc = proj.get("description") or ""
                    tech = proj.get("tech_used") or []
                    links = proj.get("links") or {}
                    dates = proj.get("dates") or ""

                    proj_header = f"<b>{title}</b>"
                    if dates:
                        proj_header += f" ({dates})"
                    if tech:
                        proj_header += f" — <i>{', '.join(tech)}</i>"
                    story.append(Paragraph(proj_header, body_style))
                    if desc:
                        story.append(Paragraph(f"• {desc}", bullet_style))
                    
                    link_parts = []
                    if isinstance(links, dict):
                        src = links.get("source_code")
                        prod = links.get("production")
                        if src:
                            link_parts.append(f"Source: {src}")
                        if prod:
                            link_parts.append(f"Live: {prod}")
                    if link_parts:
                        story.append(Paragraph(f"• Links: {' | '.join(link_parts)}", bullet_style))
                    story.append(Spacer(1, 6))
            story.append(Spacer(1, 8))

        # ---- EDUCATION ----
        elif "education" in sec_clean:
            story.append(Paragraph("Education & Certifications", heading_style))
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1"), spaceAfter=6))
            edu_list = profile_state.get("education", [])
            if isinstance(edu_list, list) and edu_list:
                for edu in edu_list:
                    college = edu.get("college") or ""
                    degree = edu.get("degree") or ""
                    cgpa = edu.get("cgpa") or ""
                    dates = edu.get("dates") or ""

                    edu_text = f"<b>{degree}</b>"
                    if college:
                        edu_text += f"  —  {college}"
                    if dates:
                        edu_text += f" ({dates})"
                    story.append(Paragraph(edu_text, body_style))
                    if cgpa:
                        story.append(Paragraph(f"• CGPA: {cgpa}", bullet_style))
                    story.append(Spacer(1, 6))
            else:
                story.append(Paragraph("<b>Bachelor of Science in Computer Science</b>  —  University of Technology", body_style))
                story.append(Spacer(1, 8))

        # ---- ACHIEVEMENTS ----
        elif "achievement" in sec_clean:
            ach_list = profile_state.get("achievements", [])
            if isinstance(ach_list, list) and ach_list:
                story.append(Paragraph("Achievements", heading_style))
                story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1"), spaceAfter=6))
                for ach in ach_list:
                    title = ach.get("title") or ""
                    dates = ach.get("dates") or ""
                    desc = ach.get("description") or ""

                    ach_text = f"<b>{title}</b>"
                    if dates:
                        ach_text += f" ({dates})"
                    story.append(Paragraph(ach_text, body_style))
                    if desc:
                        story.append(Paragraph(f"• {desc}", bullet_style))
                    story.append(Spacer(1, 6))
                story.append(Spacer(1, 8))

        # ---- EXTRA CURRICULARS ----
        elif "curricular" in sec_clean:
            ext_list = profile_state.get("extra_curriculars", [])
            if isinstance(ext_list, list) and ext_list:
                story.append(Paragraph("Extra Curriculars", heading_style))
                story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1"), spaceAfter=6))
                for ext in ext_list:
                    title = ext.get("title") or ""
                    dates = ext.get("dates") or ""
                    desc = ext.get("description") or ""

                    ext_text = f"<b>{title}</b>"
                    if dates:
                        ext_text += f" ({dates})"
                    story.append(Paragraph(ext_text, body_style))
                    if desc:
                        story.append(Paragraph(f"• {desc}", bullet_style))
                    story.append(Spacer(1, 6))
                story.append(Spacer(1, 8))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
