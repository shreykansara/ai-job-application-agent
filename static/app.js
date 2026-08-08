/* ========================================================================
   AI Job Application Assistant – Client Application Controller
   ======================================================================== */

// ---- Application State ----
const appState = {
    profileLoaded: false,
    refResumeLoaded: false,
    jdPasted: false,
    companyName: '',
    jobRole: '',
    candidateName: '',
    skillsRequired: [],
    profileSkills: [],
    skillMatchPct: 0,
    matchCalculated: false,
    resumeGenerated: false,
    strongMatches: [],
    moderateMatches: [],
    missingSkills: [],
};

// ---- Tab Switching ----
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));

    document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`panel-${tabName}`).classList.add('active');

    if (tabName === 'tracking') refreshTracking();
    if (tabName === 'not-selected') refreshNotSelected();
    if (tabName === 'global-analysis') runGlobalAnalysis();
}

// ---- Toast Notifications ----
function showToast(msg, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ---- Modal Helpers ----
function showModal(id) {
    document.getElementById(id).classList.add('visible');
}

function hideModal(id) {
    document.getElementById(id).classList.remove('visible');
}

function showClearAllModal() {
    showModal('modal-clear-all');
}

async function confirmClearAll() {
    hideModal('modal-clear-all');
    try {
        const resp = await fetch('/api/clear-all-data', { method: 'POST' });
        if (resp.ok) {
            resetApplyTab();
            refreshTracking();
            refreshNotSelected();
            runGlobalAnalysis();
            showToast('All data cleared successfully.');
        }
    } catch (e) {
        showToast('Failed to clear data.', 'error');
    }
}

// ---- Profile Upload ----
async function handleProfileUpload(input) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const resp = await fetch('/api/upload-profile', { method: 'POST', body: formData });
        const data = await resp.json();

        if (resp.ok) {
            appState.profileLoaded = true;
            appState.profileSkills = data.skills || [];

            document.getElementById('profile-upload-zone').classList.add('loaded');
            document.getElementById('profile-upload-status').style.display = 'flex';
            document.getElementById('profile-upload-status').textContent = `✅ Profile Loaded — ${file.name}`;

            if (data.profile_preview) {
                const preview = document.getElementById('profile-preview');
                preview.textContent = data.profile_preview;
                preview.style.display = 'block';
            }

            // Auto-fill candidate name if detected from profile
            if (data.candidate_name) {
                const nameField = document.getElementById('candidate-name');
                if (!nameField.value.trim()) {
                    nameField.value = data.candidate_name;
                }
            }

            renderProfileSkills();
            checkPrepareResumeEnabled();
            showToast(`Profile "${file.name}" loaded.`);
        } else {
            showToast(data.detail || 'Upload failed.', 'error');
        }
    } catch (e) {
        showToast('Upload failed: ' + e.message, 'error');
    }
}

// ---- Reference Resume Upload ----
async function handleRefUpload(input) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const resp = await fetch('/api/upload-reference-resume', { method: 'POST', body: formData });
        const data = await resp.json();

        if (resp.ok) {
            appState.refResumeLoaded = true;
            document.getElementById('ref-upload-zone').classList.add('loaded');
            document.getElementById('ref-upload-status').style.display = 'flex';
            document.getElementById('ref-upload-status').textContent = `✅ Reference Resume Loaded — ${file.name}`;
            showToast(`Reference resume "${file.name}" loaded.`);
        } else {
            showToast(data.detail || 'Upload failed.', 'error');
        }
    } catch (e) {
        showToast('Upload failed: ' + e.message, 'error');
    }
}

// ---- JD Analysis ----
async function analyzeJD() {
    const jdText = document.getElementById('jd-input').value.trim();
    if (!jdText) {
        showToast('Please paste a job description first.', 'error');
        return;
    }

    const btn = document.getElementById('btn-analyze-jd');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Analyzing...';

    try {
        const formData = new FormData();
        formData.append('jd_text', jdText);
        const resp = await fetch('/api/analyze-jd', { method: 'POST', body: formData });
        const data = await resp.json();

        if (resp.ok) {
            appState.jdPasted = true;
            appState.skillsRequired = data.required_skills || [];
            appState.profileSkills = data.user_profile_skills || appState.profileSkills;
            appState.skillMatchPct = data.skill_match_pct || 0;
            appState.strongMatches = data.strong_matches || [];
            appState.moderateMatches = data.moderate_matches || [];
            appState.missingSkills = data.missing_skills || [];
            appState.matchCalculated = appState.skillsRequired.length > 0 && appState.profileSkills.length > 0;

            // Auto-fill fields
            if (data.company_name) {
                document.getElementById('company-name').value = data.company_name;
                appState.companyName = data.company_name;
            }
            if (data.job_role) {
                document.getElementById('job-role').value = data.job_role;
                appState.jobRole = data.job_role;
            }

            renderSkillsRequired();
            renderProfileSkills();
            renderMatchMeter();
            renderMatchBreakdown();
            checkPrepareResumeEnabled();
            showToast('JD analyzed — skills extracted & match calculated.');
        } else {
            showToast(data.detail || 'JD analysis failed.', 'error');
        }
    } catch (e) {
        showToast('Analysis error: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '🔎 Analyze JD';
    }
}

// ---- Render Skills ----
function renderSkillsRequired() {
    const container = document.getElementById('skills-required-container');
    if (!appState.skillsRequired.length) {
        container.innerHTML = '<span class="skill-chip default" style="opacity:0.5;">Analyze JD to extract skills</span>';
        return;
    }
    container.innerHTML = appState.skillsRequired.map(s => {
        let cls = 'missing';
        if (appState.strongMatches.includes(s)) cls = 'strong';
        else if (appState.moderateMatches.includes(s)) cls = 'moderate';
        return `<span class="skill-chip ${cls}">${s}</span>`;
    }).join('');
}

function renderProfileSkills() {
    const container = document.getElementById('profile-skills-container');
    if (!appState.profileSkills.length) {
        container.innerHTML = '<span class="skill-chip default" style="opacity:0.5;">Upload profile to extract skills</span>';
        return;
    }
    container.innerHTML = appState.profileSkills.map(s =>
        `<span class="skill-chip default">${s}</span>`
    ).join('');
}

function renderMatchMeter() {
    const display = document.getElementById('match-pct-display');
    const fill = document.getElementById('match-meter-fill');
    display.textContent = appState.skillMatchPct + '%';
    fill.style.width = appState.skillMatchPct + '%';
}

function renderMatchBreakdown() {
    const area = document.getElementById('match-breakdown-area');
    const chips = document.getElementById('match-breakdown-chips');

    if (!appState.matchCalculated) {
        area.style.display = 'none';
        return;
    }
    area.style.display = 'block';

    let html = '';
    if (appState.strongMatches.length) {
        html += '<div style="margin-bottom:8px;"><span style="font-size:0.72rem;color:var(--accent-emerald);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Strong Match</span><div class="skills-container" style="margin-top:4px;">';
        html += appState.strongMatches.map(s => `<span class="skill-chip strong">${s}</span>`).join('');
        html += '</div></div>';
    }
    if (appState.moderateMatches.length) {
        html += '<div style="margin-bottom:8px;"><span style="font-size:0.72rem;color:var(--accent-amber);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Moderate Match</span><div class="skills-container" style="margin-top:4px;">';
        html += appState.moderateMatches.map(s => `<span class="skill-chip moderate">${s}</span>`).join('');
        html += '</div></div>';
    }
    if (appState.missingSkills.length) {
        html += '<div style="margin-bottom:8px;"><span style="font-size:0.72rem;color:var(--accent-rose);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Missing Skills</span><div class="skills-container" style="margin-top:4px;">';
        html += appState.missingSkills.map(s => `<span class="skill-chip missing">${s}</span>`).join('');
        html += '</div></div>';
    }
    chips.innerHTML = html;
}

// ---- 7-Point Button Enable Check ----
function checkPrepareResumeEnabled() {
    const companyVal = document.getElementById('company-name').value.trim();
    const roleVal = document.getElementById('job-role').value.trim();

    appState.companyName = companyVal;
    appState.jobRole = roleVal;

    const conditions = [
        appState.profileLoaded,
        appState.jdPasted,
        companyVal.length > 0,
        roleVal.length > 0,
        appState.skillsRequired.length > 0,
        appState.profileSkills.length > 0,
        appState.matchCalculated,
    ];

    const allMet = conditions.every(Boolean);
    document.getElementById('btn-prepare-resume').disabled = !allMet;
}

// Listen to field changes for real-time validation
document.getElementById('company-name').addEventListener('input', checkPrepareResumeEnabled);
document.getElementById('job-role').addEventListener('input', checkPrepareResumeEnabled);
document.getElementById('jd-input').addEventListener('input', () => {
    const val = document.getElementById('jd-input').value.trim();
    appState.jdPasted = val.length > 0;
    checkPrepareResumeEnabled();
});

// ---- Prepare & Download Resume ----
async function prepareResume() {
    const candidateName = document.getElementById('candidate-name').value.trim() || 'Candidate';
    const btn = document.getElementById('btn-prepare-resume');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Generating PDF...';

    try {
        const formData = new FormData();
        formData.append('candidate_name', candidateName);
        formData.append('job_role', appState.jobRole);
        formData.append('company_name', appState.companyName);
        formData.append('jd_skills', appState.skillsRequired.join(','));

        const resp = await fetch('/api/generate-resume', { method: 'POST', body: formData });

        if (resp.ok) {
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Resume_${candidateName.replace(/ /g, '_')}_${appState.companyName.replace(/ /g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            appState.resumeGenerated = true;
            checkSubmittedEnabled();
            showToast('Resume generated and downloaded!');
        } else {
            showToast('Resume generation failed.', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '📄 Prepare & Download Resume';
        checkPrepareResumeEnabled();
    }
}

// ---- Submitted Button Check ----
function checkSubmittedEnabled() {
    const companyVal = document.getElementById('company-name').value.trim();
    const roleVal = document.getElementById('job-role').value.trim();
    const btn = document.getElementById('btn-submitted');
    btn.disabled = !(appState.resumeGenerated && companyVal && roleVal);
}

document.getElementById('company-name').addEventListener('input', checkSubmittedEnabled);
document.getElementById('job-role').addEventListener('input', checkSubmittedEnabled);

// ---- Mark Application as Submitted ----
async function markSubmitted() {
    const btn = document.getElementById('btn-submitted');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Submitting...';

    try {
        const formData = new FormData();
        formData.append('company_name', appState.companyName);
        formData.append('job_role', appState.jobRole);
        formData.append('candidate_name', document.getElementById('candidate-name').value.trim());
        formData.append('skills_required', appState.skillsRequired.join(','));
        formData.append('skill_match_pct', appState.skillMatchPct);
        formData.append('jd_text', document.getElementById('jd-input').value);

        const resp = await fetch('/api/submit-application', { method: 'POST', body: formData });
        const data = await resp.json();

        if (resp.ok) {
            showToast(`Application to ${appState.companyName} logged as Submitted!`);
            resetApplyTab();
            switchTab('tracking');
        } else {
            showToast(data.detail || 'Submission failed.', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '✅ Submitted';
    }
}

function resetApplyTab() {
    appState.jdPasted = false;
    appState.companyName = '';
    appState.jobRole = '';
    appState.skillsRequired = [];
    appState.skillMatchPct = 0;
    appState.matchCalculated = false;
    appState.resumeGenerated = false;
    appState.strongMatches = [];
    appState.moderateMatches = [];
    appState.missingSkills = [];

    document.getElementById('jd-input').value = '';
    document.getElementById('company-name').value = '';
    document.getElementById('job-role').value = '';
    document.getElementById('candidate-name').value = '';
    document.getElementById('match-pct-display').textContent = '—%';
    document.getElementById('match-meter-fill').style.width = '0%';
    document.getElementById('match-breakdown-area').style.display = 'none';
    document.getElementById('skills-required-container').innerHTML = '<span class="skill-chip default" style="opacity:0.5;">Analyze JD to extract skills</span>';

    document.getElementById('btn-prepare-resume').disabled = true;
    document.getElementById('btn-submitted').disabled = true;

    // Re-render profile skills if still loaded
    if (appState.profileLoaded) {
        renderProfileSkills();
    }
}

// ============================================================
// TAB 2: TRACKING
// ============================================================
async function refreshTracking() {
    try {
        const resp = await fetch('/api/applications');
        const data = await resp.json();
        const apps = (data.applications || []).filter(a => a.status !== 'Not Selected');
        const allApps = data.applications || [];

        // Update badge counts
        document.getElementById('tracking-count').textContent = apps.length;
        document.getElementById('not-selected-count').textContent =
            allApps.filter(a => a.status === 'Not Selected').length;

        const area = document.getElementById('tracking-table-area');

        if (!apps.length) {
            area.innerHTML = `<div class="empty-state" id="tracking-empty">
                <div class="empty-icon">📭</div>
                <h3>No Applications Yet</h3>
                <p>Submit your first application from the Apply tab to start tracking your progress.</p>
            </div>`;
            return;
        }

        let html = `<div class="tracking-table-wrapper"><table class="tracking-table">
            <thead><tr>
                <th>Company</th><th>Role</th><th>Skills Required</th><th>Match %</th><th>JD</th><th>Status</th><th>Actions</th>
            </tr></thead><tbody>`;

        apps.forEach(app => {
            const statusBadge = getStatusBadge(app.status);
            const skillChips = (app.skills_required || []).slice(0, 4).map(s =>
                `<span class="skill-chip default" style="font-size:0.7rem;padding:2px 8px;">${s}</span>`
            ).join('') + ((app.skills_required || []).length > 4 ? `<span class="skill-chip default" style="font-size:0.7rem;padding:2px 8px;">+${app.skills_required.length - 4}</span>` : '');

            html += `<tr>
                <td><strong>${app.company_name}</strong></td>
                <td>${app.job_role}</td>
                <td><div class="skills-container">${skillChips}</div></td>
                <td><strong>${app.skill_match_pct}%</strong></td>
                <td><button class="btn btn-outline btn-sm" onclick="viewJD('${app.id}')">View</button></td>
                <td>${statusBadge}</td>
                <td><div class="action-cell">
                    ${app.status === 'Submitted' ? `<button class="btn btn-outline btn-sm" onclick="updateStatus('${app.id}', 'Interview')">🎤 Interview</button>` : ''}
                    ${app.status !== 'Selected' ? `<button class="btn btn-outline btn-sm" onclick="tryMarkSelected('${app.id}', '${app.status}')">⭐ Selected</button>` : ''}
                    <button class="btn btn-sm btn-danger" onclick="tryMarkNotSelected('${app.id}')">❌ Not Selected</button>
                </div></td>
            </tr>`;
        });

        html += '</tbody></table></div>';
        area.innerHTML = html;

    } catch (e) {
        showToast('Failed to load applications.', 'error');
    }
}

function getStatusBadge(status) {
    if (status === 'Submitted') return `<span class="status-badge submitted"><span class="status-submitted-blink"></span> Submitted</span>`;
    if (status === 'Interview') return `<span class="status-badge interview">🎤 Interview</span>`;
    if (status === 'Selected') return `<span class="status-badge selected">⭐ Selected</span>`;
    if (status === 'Not Selected') return `<span class="status-badge not-selected">❌ Not Selected</span>`;
    return `<span class="status-badge">${status}</span>`;
}

// ---- Status Updates ----
async function updateStatus(appId, newStatus) {
    try {
        const formData = new FormData();
        formData.append('app_id', appId);
        formData.append('new_status', newStatus);
        const resp = await fetch('/api/update-status', { method: 'POST', body: formData });
        if (resp.ok) {
            showToast(`Status updated to ${newStatus}.`);
            refreshTracking();
        } else {
            const data = await resp.json();
            showToast(data.detail || 'Update failed.', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

function tryMarkSelected(appId, currentStatus) {
    if (currentStatus !== 'Interview') {
        // Show confirmation for direct selection without interview
        showModal('modal-selected-confirm');
        document.getElementById('modal-selected-ok').onclick = () => {
            hideModal('modal-selected-confirm');
            updateStatus(appId, 'Selected');
        };
    } else {
        updateStatus(appId, 'Selected');
    }
}

function tryMarkNotSelected(appId) {
    showModal('modal-not-selected-confirm');
    document.getElementById('modal-not-selected-ok').onclick = () => {
        hideModal('modal-not-selected-confirm');
        updateStatus(appId, 'Not Selected');
    };
}

// ---- View JD Modal ----
let cachedApps = [];

async function viewJD(appId) {
    try {
        const resp = await fetch('/api/applications');
        const data = await resp.json();
        cachedApps = data.applications || [];
        const app = cachedApps.find(a => a.id === appId);
        if (app) {
            document.getElementById('modal-jd-content').textContent = app.jd_text || 'No JD available.';
            showModal('modal-view-jd');
        }
    } catch (e) {
        showToast('Failed to load JD.', 'error');
    }
}

// ============================================================
// TAB 3: NOT SELECTED
// ============================================================
async function refreshNotSelected() {
    try {
        const resp = await fetch('/api/applications');
        const data = await resp.json();
        const rejectedApps = (data.applications || []).filter(a => a.status === 'Not Selected');

        document.getElementById('not-selected-count').textContent = rejectedApps.length;
        const area = document.getElementById('not-selected-table-area');

        if (!rejectedApps.length) {
            area.innerHTML = `<div class="empty-state" id="not-selected-empty">
                <div class="empty-icon">🎯</div>
                <h3>No Rejections Yet</h3>
                <p>Applications marked as "Not Selected" in the Tracking tab will appear here for AI-powered rejection analysis.</p>
            </div>`;
            return;
        }

        let html = `<div class="tracking-table-wrapper"><table class="tracking-table">
            <thead><tr>
                <th>Company</th><th>Job Title</th><th>Experience Match</th><th>Rejection Notes</th><th>Action</th>
            </tr></thead><tbody>`;

        rejectedApps.forEach(app => {
            const analysisHtml = app.rejection_analysis && Object.keys(app.rejection_analysis).length > 0
                ? renderRejectionAnalysis(app.rejection_analysis)
                : '';

            html += `<tr>
                <td><strong>${app.company_name}</strong></td>
                <td>${app.job_role}</td>
                <td><strong>${app.skill_match_pct}%</strong></td>
                <td style="min-width:280px;">
                    <textarea class="form-input" id="notes-${app.id}" rows="4" placeholder="What happened during the interview? Questions you couldn't answer? Feedback received? Rejection email content?"
                        onchange="saveRejectionNotes('${app.id}')">${app.rejection_notes || ''}</textarea>
                </td>
                <td>
                    <button class="btn btn-primary btn-sm" id="analyze-btn-${app.id}" onclick="analyzeRejection('${app.id}')">🔬 Analyze</button>
                    ${analysisHtml}
                </td>
            </tr>`;
        });

        html += '</tbody></table></div>';
        area.innerHTML = html;

    } catch (e) {
        showToast('Failed to load rejected applications.', 'error');
    }
}

function renderRejectionAnalysis(analysis) {
    if (!analysis || !Object.keys(analysis).length) return '';

    const gaps = analysis.identified_skill_gaps || [];
    const topics = analysis.struggle_topics || [];
    const updates = analysis.profile_updates_applied || '';

    return `<div class="rejection-analysis-card">
        <h4>🔬 Analysis Results</h4>
        ${gaps.length ? `<p><strong>Skill Gaps:</strong></p><div class="gap-list">${gaps.map(g => `<span class="skill-chip missing">${g}</span>`).join('')}</div>` : ''}
        ${topics.length ? `<p style="margin-top:8px;"><strong>Struggle Topics:</strong></p><div class="gap-list">${topics.map(t => `<span class="skill-chip moderate">${t}</span>`).join('')}</div>` : ''}
        ${updates ? `<p style="margin-top:8px;font-size:0.78rem;color:var(--text-muted);"><em>${updates}</em></p>` : ''}
    </div>`;
}

async function saveRejectionNotes(appId) {
    const notes = document.getElementById(`notes-${appId}`).value;
    try {
        const formData = new FormData();
        formData.append('app_id', appId);
        formData.append('rejection_notes', notes);
        await fetch('/api/save-rejection-notes', { method: 'POST', body: formData });
    } catch (e) {
        // silently fail on autosave
    }
}

async function analyzeRejection(appId) {
    const notes = document.getElementById(`notes-${appId}`).value.trim();
    if (!notes) {
        showToast('Please enter rejection notes before analyzing.', 'error');
        return;
    }

    // Save notes first
    await saveRejectionNotes(appId);

    const btn = document.getElementById(`analyze-btn-${appId}`);
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Analyzing...';

    try {
        const formData = new FormData();
        formData.append('app_id', appId);
        const resp = await fetch('/api/analyze-rejection', { method: 'POST', body: formData });
        const data = await resp.json();

        if (resp.ok) {
            showToast('Rejection analyzed — Living Profile updated!');
            refreshNotSelected();
        } else {
            showToast(data.detail || 'Analysis failed.', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '🔬 Analyze';
    }
}

// ============================================================
// TAB 4: GLOBAL ANALYSIS
// ============================================================
async function runGlobalAnalysis() {
    const content = document.getElementById('global-analysis-content');

    try {
        const resp = await fetch('/api/global-analysis');
        const data = await resp.json();

        if (!data.has_data) {
            content.innerHTML = `<div class="empty-state" id="global-analysis-empty">
                <div class="empty-icon">📈</div>
                <h3>Not Enough Data Yet</h3>
                <p>${data.message || 'As applications are marked as "Not Selected" and analyzed in Tab 3, global cross-rejection insights will automatically populate here.'}</p>
            </div>`;
            return;
        }

        let html = '';

        // Recurring Skill Gaps
        html += `<div class="analysis-section">
            <h3>🔴 Recurring Skill Gaps</h3>
            <ul>${(data.recurring_skill_gaps || []).map(g => `<li>${g}</li>`).join('')}</ul>
        </div>`;

        // Common Unanswered Topics
        html += `<div class="analysis-section">
            <h3>❓ Common Unanswered Topics</h3>
            <ul>${(data.common_unanswered_topics || []).map(t => `<li>${t}</li>`).join('')}</ul>
        </div>`;

        // Consistent Weak Areas
        html += `<div class="analysis-section">
            <h3>⚠️ Consistent Weak Areas</h3>
            <ul>${(data.consistent_weak_areas || []).map(w => `<li>${w}</li>`).join('')}</ul>
        </div>`;

        // Strategic Recommendation
        html += `<div class="analysis-section">
            <h3>💡 Strategic Recommendation</h3>
            <div class="analysis-recommendation">
                <strong>Action Plan:</strong> ${data.summary_recommendation || 'No recommendation available yet.'}
            </div>
        </div>`;

        // Summary Stats
        html += `<div style="margin-top:20px; font-size:0.78rem; color:var(--text-muted);">
            Total rejections analyzed: <strong>${data.total_rejections_analyzed}</strong> |
            Companies: <strong>${(data.companies_analyzed || []).join(', ')}</strong>
        </div>`;

        content.innerHTML = html;

    } catch (e) {
        content.innerHTML = `<div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <h3>Analysis Error</h3>
            <p>${e.message}</p>
        </div>`;
    }
}

// ---- Init: Load data on page load ----
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const resp = await fetch('/api/applications');
        const data = await resp.json();

        // Update profile loaded state if profile exists
        if (data.current_profile_state) {
            appState.profileLoaded = true;
            appState.profileSkills = data.current_profile_state.skills || [];
            document.getElementById('profile-upload-zone').classList.add('loaded');
            document.getElementById('profile-upload-status').style.display = 'flex';
            document.getElementById('profile-upload-status').textContent = '✅ Profile Loaded (from saved data)';
            // Restore candidate name if available
            const savedName = data.current_profile_state.candidate_name || '';
            if (savedName && !document.getElementById('candidate-name').value.trim()) {
                document.getElementById('candidate-name').value = savedName;
            }
            renderProfileSkills();
        }

        if (data.reference_resume_style) {
            appState.refResumeLoaded = true;
            document.getElementById('ref-upload-zone').classList.add('loaded');
            document.getElementById('ref-upload-status').style.display = 'flex';
            document.getElementById('ref-upload-status').textContent = '✅ Reference Resume Loaded (from saved data)';
        }

        const apps = data.applications || [];
        document.getElementById('tracking-count').textContent = apps.filter(a => a.status !== 'Not Selected').length;
        document.getElementById('not-selected-count').textContent = apps.filter(a => a.status === 'Not Selected').length;

    } catch (e) {
        // Server not yet running — that's OK on first load
    }
});
