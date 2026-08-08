---
name: job-assistant-skill
description: Agent specification skill for AI Job Application Assistant with Application Tracker.
---

# Job Application Assistant Agent Skill

## Overview
This skill defines the autonomous agent routines for analyzing candidate profiles, extracting job description requirements, computing semantic skill match scores, generating ReportLab PDF resumes, managing application status transitions, performing rejection learning, and generating global cross-rejection analytics.

## Agent Workflows

### Workflow 1: Profile & Resume Processing (Tab 1 - Apply)
1. **Document Parsing**: Extract raw text from candidate profile (`.txt`, `.pdf`, `.docx`) and optional reference resume (`.pdf`, `.docx`).
2. **Entity Extraction**: Identify candidate skills, tools, experience level, domain knowledge, and project descriptions. Store initial `current_profile_state` in `data.json`.
3. **Reference Style Extraction**: Extract reference resume structural metadata (section order, font sizing, color palette) to guide ReportLab styling parameters.
4. **JD Analysis & Skill Matching**:
   - Extract required skills, preferred skills, responsibilities, role seniority, and company info from JD text.
   - Match against `current_profile_state` using semantic overlap, project context, and experience alignment.
   - Categorize into `Strong Match`, `Moderate Match`, and `Missing Skills`, computing an overall `Skill Match %`.
5. **Button Activation Verification**: Validate all 7 mandatory criteria before enabling `Prepare Resume`.
6. **Resume Tailoring & PDF Export**: Build ReportLab PDF emphasizing skills relevant to the JD and candidate strengths from `current_profile_state`.
7. **Application Submission**: Enable `Submitted` button upon successful download; log record to `data.json` with `Submitted` status.

### Workflow 2: Application Tracking (Tab 2 - Tracking)
1. Display active applications in table view.
2. Status transitions: `Submitted` -> `Interview` -> `Selected` | `Not Selected`.
3. Highlight `Submitted` applications with green blinking badge.
4. Trigger confirmation popups for direct `Selected` skips and `Not Selected` moves.

### Workflow 3: Rejection Analysis & Profile Learning (Tab 3 - Not Selected)
1. Capture open-ended candidate rejection notes (interview questions missed, recruiter feedback, rejection email body).
2. Cross-reference notes with original JD and initial skill match profile.
3. Identify specific skill gaps, weak topics, and experience deficiencies.
4. **Intelligent Living Profile Update**: Downgrade/annotate skills in `current_profile_state` stored in `data.json`. Update profile revision history.
5. All subsequent applications in Tab 1 automatically read the updated `current_profile_state`.

### Workflow 4: Global Analysis (Tab 4 - Global Analysis)
1. Aggregate across all rejection rows in `data.json`.
2. Synthesize:
   - Recurring skill gaps (present across multiple rejections)
   - Common unanswered interview topics
   - Consistent weak knowledge areas
   - Plain-language strategic improvement recommendation
3. Display clear empty state when < 1 rejection exists.
