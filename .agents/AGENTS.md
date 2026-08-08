# Workspace Agent Guidelines & Specifications

## Application Overview
This workspace implements the **AI Job Application Assistant with Application Tracker**, a 4-tab AI-powered web application for resume preparation, application tracking, rejection learning (Living Profile), and strategic global cross-rejection analysis.

## Core Behavioral Rules
1. **Shared Data Layer Persistence**: All application records, application status history, rejection notes, per-rejection analysis, and evolving living candidate profile state MUST be stored in a single JSON file (`data.json`).
2. **Living Profile Evolution**: When rejection notes are analyzed in Tab 3, `current_profile_state` in `data.json` MUST be updated to reflect weaker skills, struggle topics, and focus areas. All subsequent job applications in Tab 1 MUST evaluate skill matching and generate resumes using this updated profile.
3. **Resume Generation Cleanliness**: Tailored resumes generated via ReportLab MUST read as clean, professional candidate documents. Never display internal system annotations, flags, or scores inside generated resumes.
4. **Button Enablement Rules**:
   - `Prepare Resume` button in Tab 1 MUST remain disabled until all 7 conditions are satisfied:
     1. Candidate Profile uploaded
     2. Job Description pasted
     3. Company Name filled
     4. Job Role filled
     5. Skills Required extracted
     6. User Profile Skills extracted
     7. Skill Match % calculated
   - `Submitted` button MUST remain disabled until the tailored resume is generated/downloaded and mandatory fields remain filled.
5. **Confirmation Modals**:
   - Direct transition to `Selected` without prior `Interview` state MUST show confirmation modal: *"Candidate has not been marked for Interview. Do you want to mark as Selected directly?"*
   - Marking application as `Not Selected` MUST show confirmation modal: *"Are you sure you want to mark this application as Not Selected? This will move the application to the Not Selected tab for rejection analysis."*
   - Clicking `Clear All Data` MUST show confirmation modal before wiping `data.json` completely and resetting all 4 tabs to empty state.
6. **Visual Indicators**: The `Submitted` status badge in Tab 2 MUST display a green blinking indicator (`.status-submitted-blink`).
