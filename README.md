# AI Job Application Assistant & Application Tracker

An AI-powered web application designed to optimize candidate resumes, track job applications, learn from rejections through an evolving Living Profile, and provide global strategic feedback across multiple rejections.

---

## Core Workflows

The application is structured into **four specialized tabs** that create a continuous feedback loop:

### 1. Tab 1: Apply (Profile & Resume Processing)
* **Document Parsing:** Upload your candidate profile (`.txt`, `.pdf`, `.docx`) and an optional reference resume to parse your skills, experience levels, and projects.
* **Semantic JD Matching:** Paste a target Job Description (JD). The system extracts required/preferred skills and evaluates your alignment, outputting categorizations (`Strong Match`, `Moderate Match`, `Missing Skills`) and calculating an overall **Skill Match %**.
* **Button Activation Checks:** The `Prepare Resume` button activates only after all 7 mandatory parameters (Candidate Profile, JD, Company, Role, Extracted Skills, User Profile Skills, and Match %) are completed.
* **Resume Generation:** Generates a professional tailored resume as a clean PDF via ReportLab, drawing on candidate strengths from your **Living Profile** (completely free of internal system match scores, annotations, or flags).
* **Submission Logging:** Once the tailored resume is generated/downloaded, you can click `Submitted` to persist the job application record in `data.json` with a `Submitted` status.

### 2. Tab 2: Tracking (Application Status Tracker)
* **Table Dashboard:** Lists all active and past applications.
* **Status Transitions:** Manage the candidate pipeline: `Submitted` ➔ `Interview` ➔ `Selected` | `Not Selected`.
* **Visual Badges:** Applications in `Submitted` status show a blinking green indicator (`.status-submitted-blink`).
* **Confirmation Safety Modals:** 
  * Transitioning directly to `Selected` without going through `Interview` triggers a warning prompt.
  * Moving a record to `Not Selected` prompts confirmation before sending the candidate record to the rejection analysis tab.

### 3. Tab 3: Not Selected (Rejection Analysis & Learning)
* **Living Profile Evolution:** Input unstructured rejection details (rejection email body, interview questions missed, recruiter feedback) for any unsuccessful application.
* **Deficiency Identification:** The AI engine parses this feedback, identifying specific weak skill sets, struggle areas, or technical gaps.
* **Living Profile Update:** The AI automatically downgrades or annotates those weak skills in the `current_profile_state` inside `data.json`.
* **Continuous Integration:** All subsequent resumes prepared under Tab 1 will dynamically pull from this evolved, realistic candidate profile state.

### 4. Tab 4: Global Analysis (Cross-Rejection Analytics)
* **Aggregated Insights:** Scans all rejections in `data.json` to synthesize common issues.
* **Strategic Dashboard:** Displays recurring skill gaps, common unanswered questions, and provides a clear plain-language recommendation for improvement.
* **Empty State:** If fewer than 1 rejection is recorded, it displays a neat, clean placeholder prompting user engagement.

---

## Data Layer Persistence

All profile state, application history, and revision logs are stored in a single unified JSON file:
* **`data.json`**: Located at the project root. This file acts as the single source of truth for the local database, containing:
  * `applications`: Array of tracked applications.
  * `current_profile_state`: The candidate's living skills, tools, and projects.
  * `profile_history`: Historical revisions of the living profile.
  * `reference_resume_style`: Extracted style configurations from reference resumes.
  * `original_profile_text`: The raw text of the initially uploaded candidate profile.

---

## Localhost Run Instructions

### Prerequisites
* **Python 3.8+** installed.
* An **OpenAI API Key** (for parsing, matching, and analysis).

### Setup and Start

#### 1. Configure the API Key
Create a file named `.env` in the root folder of the project (if it doesn't already exist) and define your OpenAI API key:
```env
OPENAI_API_KEY=your_actual_openai_api_key_here
```

#### 2. Run the Server

##### On Windows (Automatically handles dependencies)
Simply double-click or run:
```cmd
run.bat
```
This script will check if Python dependencies are installed. If any dependencies (`fastapi`, `uvicorn`, `reportlab`, `pypdf`, `python-docx`, `openai`, `python-multipart`, `python-dotenv`) are missing, it will automatically install them using `pip`, and then spin up the server.

##### Manual Startup (All Platforms)
1. **Install Dependencies:**
   ```bash
   pip install fastapi uvicorn reportlab pypdf python-docx openai python-multipart python-dotenv
   ```
2. **Start the FastAPI Server:**
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```

#### 3. Access the Web App
Open your web browser and navigate to:
* **[http://127.0.0.1:8000](http://127.0.0.1:8000)**
