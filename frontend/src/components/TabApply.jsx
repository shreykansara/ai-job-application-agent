import React, { useState, useEffect } from 'react';

export default function TabApply({
  currentProfileState,
  setCurrentProfileState,
  referenceResumeStyle,
  setReferenceResumeStyle,
  refreshData,
  showToast,
  setActiveTab,
}) {
  // ---- Local Input States ----
  const [jdText, setJdText] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [candidateName, setCandidateName] = useState('');

  // ---- Upload States ----
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingRef, setUploadingRef] = useState(false);
  const [profileFilename, setProfileFilename] = useState('');
  const [refFilename, setRefFilename] = useState('');
  const [profilePreviewText, setProfilePreviewText] = useState('');

  // ---- Matching Results ----
  const [skillsRequired, setSkillsRequired] = useState([]);
  const [profileSkills, setProfileSkills] = useState(currentProfileState?.skills || []);
  const [skillMatchPct, setSkillMatchPct] = useState(0);
  const [matchCalculated, setMatchCalculated] = useState(false);
  const [strongMatches, setStrongMatches] = useState([]);
  const [moderateMatches, setModerateMatches] = useState([]);
  const [missingSkills, setMissingSkills] = useState([]);

  // ---- Button State ----
  const [resumeGenerated, setResumeGenerated] = useState(false);
  const [analyzingJd, setAnalyzingJd] = useState(false);
  const [preparingPdf, setPreparingPdf] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sync profile skills when global profile changes
  useEffect(() => {
    if (currentProfileState) {
      setProfileSkills(currentProfileState.skills || []);
      if (currentProfileState.candidate_name && !candidateName) {
        setCandidateName(currentProfileState.candidate_name);
      }
    } else {
      setProfileSkills([]);
    }
  }, [currentProfileState]);

  // ---- Upload Handlers ----
  const handleProfileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingProfile(true);
    setProfileFilename(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const resp = await fetch('/api/upload-profile', { method: 'POST', body: formData });
      const data = await resp.json();

      if (resp.ok) {
        setProfileSkills(data.skills || []);
        setProfilePreviewText(data.profile_preview || '');
        if (data.candidate_name && !candidateName) {
          setCandidateName(data.candidate_name);
        }
        // Save globally
        setCurrentProfileState({
          skills: data.skills || [],
          experience_level: data.experience_level || '',
          candidate_name: data.candidate_name || '',
          candidate_email: data.candidate_email || '',
        });
        showToast(`Profile "${file.name}" loaded successfully.`);
      } else {
        showToast(data.detail || 'Upload failed.', 'error');
      }
    } catch (err) {
      showToast('Upload failed: ' + err.message, 'error');
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleRefUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingRef(true);
    setRefFilename(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const resp = await fetch('/api/upload-reference-resume', { method: 'POST', body: formData });
      const data = await resp.json();

      if (resp.ok) {
        setReferenceResumeStyle(data.style || {});
        showToast(`Reference resume "${file.name}" loaded successfully.`);
      } else {
        showToast(data.detail || 'Upload failed.', 'error');
      }
    } catch (err) {
      showToast('Upload failed: ' + err.message, 'error');
    } finally {
      setUploadingRef(false);
    }
  };

  // ---- Analyze JD Handler ----
  const handleAnalyzeJd = async () => {
    if (!jdText.trim()) {
      showToast('Please paste a job description first.', 'error');
      return;
    }

    setAnalyzingJd(true);

    try {
      const formData = new FormData();
      formData.append('jd_text', jdText);
      const resp = await fetch('/api/analyze-jd', { method: 'POST', body: formData });
      const data = await resp.json();

      if (resp.ok) {
        setSkillsRequired(data.required_skills || []);
        if (data.user_profile_skills) setProfileSkills(data.user_profile_skills);
        setSkillMatchPct(data.skill_match_pct || 0);
        setStrongMatches(data.strong_matches || []);
        setModerateMatches(data.moderate_matches || []);
        setMissingSkills(data.missing_skills || []);
        
        // Match is calculated if both require skills and profile skills are present
        const hasReq = (data.required_skills || []).length > 0;
        const hasProf = (data.user_profile_skills || profileSkills).length > 0;
        setMatchCalculated(hasReq && hasProf);

        if (data.company_name) setCompanyName(data.company_name);
        if (data.job_role) setJobRole(data.job_role);

        showToast('JD analyzed — skills extracted & match calculated.');
      } else {
        showToast(data.detail || 'JD analysis failed.', 'error');
      }
    } catch (err) {
      showToast('Analysis error: ' + err.message, 'error');
    } finally {
      setAnalyzingJd(false);
    }
  };

  // ---- Prepare Resume Action ----
  const handlePrepareResume = async () => {
    setPreparingPdf(true);
    try {
      const formData = new FormData();
      formData.append('candidate_name', candidateName || 'Candidate');
      formData.append('job_role', jobRole);
      formData.append('company_name', companyName);
      formData.append('jd_skills', skillsRequired.join(','));

      const resp = await fetch('/api/generate-resume', { method: 'POST', body: formData });

      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeCandidateName = (candidateName || 'Candidate').replace(/ /g, '_');
        const safeCompanyName = companyName.replace(/ /g, '_');
        a.download = `Resume_${safeCandidateName}_${safeCompanyName}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        setResumeGenerated(true);
        showToast('Resume generated and downloaded!');
      } else {
        showToast('Resume generation failed.', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setPreparingPdf(false);
    }
  };

  // ---- Submit Application Action ----
  const handleSubmitted = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('company_name', companyName);
      formData.append('job_role', jobRole);
      formData.append('candidate_name', candidateName);
      formData.append('skills_required', skillsRequired.join(','));
      formData.append('skill_match_pct', skillMatchPct);
      formData.append('jd_text', jdText);

      const resp = await fetch('/api/submit-application', { method: 'POST', body: formData });
      const data = await resp.json();

      if (resp.ok) {
        showToast(`Application to ${companyName} logged as Submitted!`);
        resetForm();
        refreshData();
        setActiveTab('tracking');
      } else {
        showToast(data.detail || 'Submission failed.', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setJdText('');
    setCompanyName('');
    setJobRole('');
    setSkillsRequired([]);
    setSkillMatchPct(0);
    setMatchCalculated(false);
    setResumeGenerated(false);
    setStrongMatches([]);
    setModerateMatches([]);
    setMissingSkills([]);
    setProfilePreviewText('');
  };

  // ---- 7 conditions for Prepare Resume enablement ----
  const isProfileLoaded = !!currentProfileState;
  const isJdPasted = jdText.trim().length > 0;
  const isCompanyFilled = companyName.trim().length > 0;
  const isRoleFilled = jobRole.trim().length > 0;
  const hasSkillsRequired = skillsRequired.length > 0;
  const hasProfileSkills = profileSkills.length > 0;
  const isMatchCalculated = matchCalculated;

  const canPrepareResume =
    isProfileLoaded &&
    isJdPasted &&
    isCompanyFilled &&
    isRoleFilled &&
    hasSkillsRequired &&
    hasProfileSkills &&
    isMatchCalculated;

  // ---- Conditions for Submitted enablement ----
  const canSubmit = resumeGenerated && isCompanyFilled && isRoleFilled;

  return (
    <div className="tab-panel active">
      <div className="inputs-grid">
        {/* Candidate Profile Card */}
        <div className="card">
          <div className="card-title"><span className="icon">👤</span> Candidate Profile</div>
          <div className="card-subtitle">Upload your profile (.txt, .pdf, .docx)</div>
          <div className={`upload-zone ${isProfileLoaded ? 'loaded' : ''}`}>
            <input
              type="file"
              id="profile-file-input"
              accept=".txt,.pdf,.docx"
              onChange={handleProfileUpload}
              disabled={uploadingProfile}
            />
            <div className="upload-icon">📁</div>
            <div className="upload-label">
              {uploadingProfile ? 'Uploading...' : 'Click or drop your profile here'}
            </div>
            <div className="upload-hint">Accepted: .txt, .pdf, .docx</div>
            {isProfileLoaded && (
              <div className="upload-status" id="profile-upload-status" style={{ display: 'flex' }}>
                ✅ Profile Loaded {profileFilename ? `— ${profileFilename}` : '(from saved data)'}
              </div>
            )}
          </div>
          {profilePreviewText && (
            <div className="profile-preview" style={{ display: 'block', maxHeight: '150px', overflowY: 'auto' }}>
              {profilePreviewText}
            </div>
          )}
        </div>

        {/* Reference Resume Card */}
        <div className="card">
          <div className="card-title">
            <span className="icon">🎨</span> Reference Resume{' '}
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
          </div>
          <div className="card-subtitle">Upload a resume to guide styling (.pdf, .docx)</div>
          <div className={`upload-zone ${referenceResumeStyle ? 'loaded' : ''}`}>
            <input
              type="file"
              id="ref-file-input"
              accept=".pdf,.docx"
              onChange={handleRefUpload}
              disabled={uploadingRef}
            />
            <div className="upload-icon">📑</div>
            <div className="upload-label">
              {uploadingRef ? 'Uploading...' : 'Click or drop reference resume'}
            </div>
            <div className="upload-hint">Accepted: .pdf, .docx</div>
            {referenceResumeStyle && (
              <div className="upload-status" id="ref-upload-status" style={{ display: 'flex' }}>
                ✅ Reference Resume Loaded {refFilename ? `— ${refFilename}` : '(from saved data)'}
              </div>
            )}
          </div>
        </div>

        {/* Job Description Card */}
        <div className="card full-width">
          <div className="card-title"><span className="icon">📋</span> Job Description</div>
          <div className="card-subtitle">Paste the full job description from LinkedIn, company portal, or email</div>
          <textarea
            className="form-input jd-input"
            id="jd-input"
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste the complete job description here...&#10;&#10;Example:&#10;We are looking for a Software Engineer with 3+ years of experience in Python, REST APIs, and cloud technologies..."
          />
          <div style={{ marginTop: '12px', textAlign: 'right' }}>
            <button
              className="btn btn-outline btn-sm"
              id="btn-analyze-jd"
              onClick={handleAnalyzeJd}
              disabled={analyzingJd}
            >
              {analyzingJd ? (
                <>
                  <span className="spinner" style={{ marginRight: '6px' }}></span>
                  Analyzing...
                </>
              ) : (
                '🔎 Analyze JD'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Extracted Fields Card */}
      <div className="card" id="extracted-fields-card">
        <div className="card-title"><span className="icon">⚙️</span> Application Details</div>
        <div className="card-subtitle">Auto-extracted & editable fields from JD and profile</div>

        <div className="inputs-grid" style={{ marginBottom: 0 }}>
          <div className="form-group">
            <label htmlFor="company-name">Company Name</label>
            <input
              className="form-input"
              id="company-name"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Google, Amazon..."
            />
          </div>
          <div className="form-group">
            <label htmlFor="job-role">Job Role</label>
            <input
              className="form-input"
              id="job-role"
              type="text"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              placeholder="e.g. Software Engineer"
            />
          </div>
          <div className="form-group">
            <label htmlFor="candidate-name">Candidate Name</label>
            <input
              className="form-input"
              id="candidate-name"
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Your full name for the resume"
            />
          </div>
        </div>

        <div className="section-divider"></div>

        {/* Skills Required */}
        <div className="match-breakdown">
          <h4>📌 Skills Required (from JD)</h4>
          <div className="skills-container" id="skills-required-container">
            {skillsRequired.length === 0 ? (
              <span className="skill-chip default" style={{ opacity: 0.5 }}>
                Analyze JD to extract skills
              </span>
            ) : (
              skillsRequired.map((s, idx) => {
                let cls = 'missing';
                if (strongMatches.includes(s)) cls = 'strong';
                else if (moderateMatches.includes(s)) cls = 'moderate';
                return (
                  <span key={idx} className={`skill-chip ${cls}`}>
                    {s}
                  </span>
                );
              })
            )}
          </div>
        </div>

        {/* User Profile Skills */}
        <div className="match-breakdown" style={{ marginTop: '20px' }}>
          <h4>👤 Your Profile Skills</h4>
          <div className="skills-container" id="profile-skills-container">
            {profileSkills.length === 0 ? (
              <span className="skill-chip default" style={{ opacity: 0.5 }}>
                Upload profile to extract skills
              </span>
            ) : (
              profileSkills.map((s, idx) => (
                <span key={idx} className="skill-chip default">
                  {s}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="section-divider"></div>

        {/* Skill Match % Display */}
        <div className="match-meter-container" id="match-meter-area">
          <div className="match-meter-label">
            <span>Skill Match</span>
            <span className="match-pct-value" id="match-pct-display">
              {matchCalculated ? `${skillMatchPct}%` : '—%'}
            </span>
          </div>
          <div className="match-meter-track">
            <div
              className="match-meter-fill"
              id="match-meter-fill"
              style={{ width: `${matchCalculated ? skillMatchPct : 0}%` }}
            />
          </div>
        </div>

        {/* Match Breakdown Chips */}
        {matchCalculated && (
          <div className="match-breakdown" id="match-breakdown-area" style={{ marginTop: '16px', display: 'block' }}>
            <h4>Match Breakdown</h4>
            <div id="match-breakdown-chips">
              {strongMatches.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Strong Match
                  </span>
                  <div className="skills-container" style={{ marginTop: '4px' }}>
                    {strongMatches.map((s, idx) => (
                      <span key={idx} className="skill-chip strong">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {moderateMatches.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-amber)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Moderate Match
                  </span>
                  <div className="skills-container" style={{ marginTop: '4px' }}>
                    {moderateMatches.map((s, idx) => (
                      <span key={idx} className="skill-chip moderate">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {missingSkills.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-rose)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Missing Skills
                  </span>
                  <div className="skills-container" style={{ marginTop: '4px' }}>
                    {missingSkills.map((s, idx) => (
                      <span key={idx} className="skill-chip missing">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          className="btn btn-primary"
          id="btn-prepare-resume"
          disabled={!canPrepareResume || preparingPdf}
          onClick={handlePrepareResume}
        >
          {preparingPdf ? (
            <>
              <span className="spinner" style={{ marginRight: '6px' }}></span>
              Generating PDF...
            </>
          ) : (
            '📄 Prepare & Download Resume'
          )}
        </button>
        <button
          className="btn btn-success"
          id="btn-submitted"
          disabled={!canSubmit || submitting}
          onClick={handleSubmitted}
        >
          {submitting ? (
            <>
              <span className="spinner" style={{ marginRight: '6px' }}></span>
              Submitting...
            </>
          ) : (
            '✅ Submitted'
          )}
        </button>
      </div>
    </div>
  );
}
