import React, { useState } from 'react';
import { 
  User, UploadCloud, FileText, Settings, Briefcase, GraduationCap, 
  Trophy, Activity, ArrowLeft, Link2, 
  Sparkles, Trash2, PlusCircle, Hammer, Code, Palette, Edit3
} from 'lucide-react';

export default function ProfileSetup({
  currentProfileState,
  setCurrentProfileState,
  referenceResumeStyle,
  setReferenceResumeStyle,
  onSetupComplete,
  showToast,
}) {
  // ---- Local Wizard State ----
  const [profileLoaded, setProfileLoaded] = useState(!!currentProfileState?.name);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingRef, setUploadingRef] = useState(false);
  const [profileFilename, setProfileFilename] = useState('');
  const [refFilename, setRefFilename] = useState('');
  const [saving, setSaving] = useState(false);

  // ---- Form State conforming to the new schema ----
  const [profile, setProfile] = useState({
    name: currentProfileState?.name || '',
    credentials: {
      email: currentProfileState?.credentials?.email || currentProfileState?.candidate_email || '',
      phone: currentProfileState?.credentials?.phone || currentProfileState?.candidate_phone || '',
      github: currentProfileState?.credentials?.github || '',
      linkedin: currentProfileState?.credentials?.linkedin || '',
      portfolio: currentProfileState?.credentials?.portfolio || '',
      ...(currentProfileState?.credentials || {})
    },
    profile_summary: currentProfileState?.profile_summary || '',
    skills: currentProfileState?.skills || {
      Languages: [],
      Frameworks: [],
      Tools: [],
      Databases: [],
    },
    projects: currentProfileState?.projects || [],
    work_experience: currentProfileState?.work_experience || [],
    extra_curriculars: currentProfileState?.extra_curriculars || [],
    achievements: currentProfileState?.achievements || [],
    education: currentProfileState?.education || [],
  });

  // Local helper states for adding skills
  const [newSkillText, setNewSkillText] = useState({});
  const [newSkillCategory, setNewSkillCategory] = useState('');

  // ---- File Upload Handlers ----
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
        // Populate profile form state with parsed data
        const parsed = data.profile || {};
        setProfile({
          name: parsed.name || '',
          credentials: {
            email: parsed.credentials?.email || parsed.candidate_email || '',
            phone: parsed.credentials?.phone || parsed.candidate_phone || '',
            github: parsed.credentials?.github || '',
            linkedin: parsed.credentials?.linkedin || '',
            portfolio: parsed.credentials?.portfolio || '',
            ...parsed.credentials
          },
          profile_summary: parsed.profile_summary || '',
          skills: parsed.skills || {
            Languages: [],
            Frameworks: [],
            Tools: [],
            Databases: [],
          },
          projects: parsed.projects || [],
          work_experience: parsed.work_experience || [],
          extra_curriculars: parsed.extra_curriculars || [],
          achievements: parsed.achievements || [],
          education: parsed.education || [],
        });
        setProfileLoaded(true);
        showToast('Profile parsed successfully. Please verify and edit details below.');
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
        showToast(`Reference resume layout parsed successfully!`);
      } else {
        showToast(data.detail || 'Upload failed.', 'error');
      }
    } catch (err) {
      showToast('Upload failed: ' + err.message, 'error');
    } finally {
      setUploadingRef(false);
    }
  };

  // Start from scratch option
  const handleStartFromScratch = () => {
    setProfile({
      name: 'John Doe',
      credentials: {
        email: 'john.doe@example.com',
        phone: '',
        github: '',
        linkedin: '',
        portfolio: '',
      },
      profile_summary: 'Aspiring software developer seeking growth opportunities.',
      skills: {
        Languages: ['Python', 'JavaScript'],
        Frameworks: ['React', 'FastAPI'],
        Tools: ['Git', 'Docker'],
        Databases: ['PostgreSQL'],
      },
      projects: [],
      work_experience: [],
      extra_curriculars: [],
      achievements: [],
      education: [],
    });
    setProfileLoaded(true);
  };

  // ---- Field Change Handlers ----
  const handleTopLevelChange = (field, val) => {
    setProfile(prev => ({ ...prev, [field]: val }));
  };

  const handleCredentialChange = (key, val) => {
    setProfile(prev => ({
      ...prev,
      credentials: { ...prev.credentials, [key]: val }
    }));
  };

  // ---- Skills Category & Tag Add/Remove ----
  const handleRemoveSkill = (category, idx) => {
    setProfile(prev => {
      const catList = [...(prev.skills[category] || [])];
      catList.splice(idx, 1);
      return {
        ...prev,
        skills: { ...prev.skills, [category]: catList }
      };
    });
  };

  const handleAddSkill = (category) => {
    const text = newSkillText[category]?.trim();
    if (!text) return;

    setProfile(prev => {
      const catList = [...(prev.skills[category] || [])];
      if (!catList.includes(text)) {
        catList.push(text);
      }
      return {
        ...prev,
        skills: { ...prev.skills, [category]: catList }
      };
    });

    setNewSkillText(prev => ({ ...prev, [category]: '' }));
  };

  const handleAddSkillsCategory = () => {
    const cat = newSkillCategory.trim();
    if (!cat) return;

    setProfile(prev => {
      if (prev.skills[cat]) return prev;
      return {
        ...prev,
        skills: { ...prev.skills, [cat]: [] }
      };
    });
    setNewSkillCategory('');
  };

  const handleRemoveSkillsCategory = (cat) => {
    setProfile(prev => {
      const nextSkills = { ...prev.skills };
      delete nextSkills[cat];
      return { ...prev, skills: nextSkills };
    });
  };

  // ---- Projects Handlers ----
  const handleProjectFieldChange = (idx, field, val) => {
    setProfile(prev => {
      const nextList = [...prev.projects];
      nextList[idx] = { ...nextList[idx], [field]: val };
      return { ...prev, projects: nextList };
    });
  };

  const handleProjectLinkChange = (idx, linkKey, val) => {
    setProfile(prev => {
      const nextList = [...prev.projects];
      const nextLinks = { ...(nextList[idx].links || {}), [linkKey]: val };
      nextList[idx] = { ...nextList[idx], links: nextLinks };
      return { ...prev, projects: nextList };
    });
  };

  const handleAddProject = () => {
    setProfile(prev => ({
      ...prev,
      projects: [
        ...prev.projects,
        { title: '', description: '', tech_used: [], links: { source_code: '', production: '' }, dates: '' }
      ]
    }));
  };

  const handleRemoveProject = (idx) => {
    setProfile(prev => {
      const nextList = [...prev.projects];
      nextList.splice(idx, 1);
      return { ...prev, projects: nextList };
    });
  };

  // ---- Work Experience Handlers ----
  const handleExperienceFieldChange = (idx, field, val) => {
    setProfile(prev => {
      const nextList = [...prev.work_experience];
      nextList[idx] = { ...nextList[idx], [field]: val };
      return { ...prev, work_experience: nextList };
    });
  };

  const handleAddExperience = () => {
    setProfile(prev => ({
      ...prev,
      work_experience: [
        ...prev.work_experience,
        { company: '', job_role: '', dates: '', project: '', description: '' }
      ]
    }));
  };

  const handleRemoveExperience = (idx) => {
    setProfile(prev => {
      const nextList = [...prev.work_experience];
      nextList.splice(idx, 1);
      return { ...prev, work_experience: nextList };
    });
  };

  // ---- Extra Curriculars Handlers ----
  const handleExtraCurricularFieldChange = (idx, field, val) => {
    setProfile(prev => {
      const nextList = [...prev.extra_curriculars];
      nextList[idx] = { ...nextList[idx], [field]: val };
      return { ...prev, extra_curriculars: nextList };
    });
  };

  const handleAddExtraCurricular = () => {
    setProfile(prev => ({
      ...prev,
      extra_curriculars: [
        ...prev.extra_curriculars,
        { title: '', dates: '', description: '' }
      ]
    }));
  };

  const handleRemoveExtraCurricular = (idx) => {
    setProfile(prev => {
      const nextList = [...prev.extra_curriculars];
      nextList.splice(idx, 1);
      return { ...prev, extra_curriculars: nextList };
    });
  };

  // ---- Achievements Handlers ----
  const handleAchievementFieldChange = (idx, field, val) => {
    setProfile(prev => {
      const nextList = [...prev.achievements];
      nextList[idx] = { ...nextList[idx], [field]: val };
      return { ...prev, achievements: nextList };
    });
  };

  const handleAddAchievement = () => {
    setProfile(prev => ({
      ...prev,
      achievements: [
        ...prev.achievements,
        { title: '', dates: '', description: '' }
      ]
    }));
  };

  const handleRemoveAchievement = (idx) => {
    setProfile(prev => {
      const nextList = [...prev.achievements];
      nextList.splice(idx, 1);
      return { ...prev, achievements: nextList };
    });
  };

  // ---- Education Handlers ----
  const handleEducationFieldChange = (idx, field, val) => {
    setProfile(prev => {
      const nextList = [...prev.education];
      nextList[idx] = { ...nextList[idx], [field]: val };
      return { ...prev, education: nextList };
    });
  };

  const handleAddEducation = () => {
    setProfile(prev => ({
      ...prev,
      education: [
        ...prev.education,
        { college: '', degree: '', cgpa: '', dates: '' }
      ]
    }));
  };

  const handleRemoveEducation = (idx) => {
    setProfile(prev => {
      const nextList = [...prev.education];
      nextList.splice(idx, 1);
      return { ...prev, education: nextList };
    });
  };

  // ---- Finish & Save ----
  const handleSaveProfile = async () => {
    if (!profile.name.trim()) {
      showToast('Candidate Name is required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const resp = await fetch('/api/save-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (resp.ok) {
        const data = await resp.json();
        setCurrentProfileState(data.profile);
        showToast('Living Profile saved and set up successfully!');
        onSetupComplete();
      } else {
        showToast('Failed to save profile.', 'error');
      }
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      {/* 1. UPLOAD STAGE */}
      {!profileLoaded && (
        <div className="inputs-grid" style={{ marginBottom: '30px' }}>
          <div className="card">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} style={{ color: 'var(--text-accent)' }} /> Setup Candidate Profile
            </div>
            <div className="card-subtitle">Upload your existing profile raw text/resume to initialize setup (.txt, .pdf, .docx)</div>
            <div className={`upload-zone ${uploadingProfile ? 'loading' : ''}`}>
              <input
                type="file"
                accept=".txt,.pdf,.docx"
                onChange={handleProfileUpload}
                disabled={uploadingProfile}
              />
              <div className="upload-icon" style={{ color: 'var(--accent-indigo)' }}>
                <UploadCloud size={32} />
              </div>
              <div className="upload-label">
                {uploadingProfile ? 'Extracting & organizing data...' : 'Click or drop your profile here'}
              </div>
              <div className="upload-hint">Accepted formats: .txt, .pdf, .docx</div>
            </div>
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>— OR —</span>
              <br />
              <button className="btn btn-outline btn-sm" style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={handleStartFromScratch}>
                <Edit3 size={14} /> Setup Manually from Scratch
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Palette size={18} style={{ color: 'var(--text-accent)' }} /> Reference Resume (Optional)
            </div>
            <div className="card-subtitle">Upload a pre-styled PDF/Word resume to guide ReportLab style parameters</div>
            <div className={`upload-zone ${referenceResumeStyle ? 'loaded' : ''}`}>
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={handleRefUpload}
                disabled={uploadingRef}
              />
              <div className="upload-icon" style={{ color: 'var(--accent-indigo)' }}>
                <UploadCloud size={32} />
              </div>
              <div className="upload-label">
                {uploadingRef ? 'Analyzing layout...' : 'Click or drop reference resume'}
              </div>
              <div className="upload-hint">Accepted formats: .pdf, .docx</div>
              {referenceResumeStyle && (
                <div className="upload-status" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)' }}>
                  <Sparkles size={14} /> Style guidance extracted successfully!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. EDIT / CUSTOMIZE STAGE */}
      {profileLoaded && (
        <div className="tab-panel active" style={{ animation: 'none' }}>
          <div className="card">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={18} style={{ color: 'var(--text-accent)' }} /> Review & Organize Living Profile
            </div>
            <div className="card-subtitle">Verify and edit the extracted candidate schema details below to finalize profile setup.</div>

            {/* Basic Info */}
            <div className="inputs-grid">
              <div className="form-group full-width">
                <label>Candidate Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.name}
                  onChange={(e) => handleTopLevelChange('name', e.target.value)}
                  placeholder="e.g. John Doe"
                />
              </div>

              {/* Credentials Key-Value list */}
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={profile.credentials.email}
                  onChange={(e) => handleCredentialChange('email', e.target.value)}
                  placeholder="john.doe@example.com"
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.credentials.phone}
                  onChange={(e) => handleCredentialChange('phone', e.target.value)}
                  placeholder="+1 (555) 019-9234"
                />
              </div>
              <div className="form-group">
                <label>GitHub Profile</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.credentials.github}
                  onChange={(e) => handleCredentialChange('github', e.target.value)}
                  placeholder="github.com/johndoe"
                />
              </div>
              <div className="form-group">
                <label>LinkedIn Profile</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.credentials.linkedin}
                  onChange={(e) => handleCredentialChange('linkedin', e.target.value)}
                  placeholder="linkedin.com/in/johndoe"
                />
              </div>
              <div className="form-group full-width">
                <label>Portfolio / Personal Website</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.credentials.portfolio || ''}
                  onChange={(e) => handleCredentialChange('portfolio', e.target.value)}
                  placeholder="johndoe.dev"
                />
              </div>
            </div>

            {/* Profile Summary */}
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label>Professional Profile Summary</label>
              <textarea
                className="form-input"
                value={profile.profile_summary}
                onChange={(e) => handleTopLevelChange('profile_summary', e.target.value)}
                placeholder="A compelling professional summary describing your experience, values, and targets..."
              />
            </div>

            <div className="section-divider"></div>

            {/* Skills categorized */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-accent)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Hammer size={18} /> Categorized Skills
              </h3>
              
              {Object.keys(profile.skills).map((category) => (
                <div key={category} style={{ marginBottom: '16px', padding: '16px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <strong style={{ fontSize: '0.88rem', color: '#fff' }}>{category}</strong>
                    <button className="btn btn-sm btn-danger" style={{ padding: '3px 10px', fontSize: '0.72rem' }} onClick={() => handleRemoveSkillsCategory(category)}>
                      Remove Category
                    </button>
                  </div>
                  
                  <div className="skills-container">
                    {(profile.skills[category] || []).map((skill, idx) => (
                      <span key={idx} className="skill-chip default" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                        {skill}
                        <span 
                          style={{ marginLeft: '8px', cursor: 'pointer', color: 'var(--accent-rose)', fontWeight: 'bold' }}
                          onClick={() => handleRemoveSkill(category, idx)}
                        >
                          ×
                        </span>
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: '6px 12px', fontSize: '0.82rem', maxWidth: '240px' }}
                      placeholder={`Add to ${category}...`}
                      value={newSkillText[category] || ''}
                      onChange={(e) => setNewSkillText(prev => ({ ...prev, [category]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSkill(category)}
                    />
                    <button className="btn btn-outline btn-sm" style={{ padding: '6px 14px' }} onClick={() => handleAddSkill(category)}>
                      + Add
                    </button>
                  </div>
                </div>
              ))}

              {/* Add new Category */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '16px' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '8px 14px', fontSize: '0.85rem', maxWidth: '280px' }}
                  placeholder="New skills category (e.g. Cloud)..."
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value)}
                />
                <button className="btn btn-outline btn-sm" onClick={handleAddSkillsCategory}>
                  + Add Skills Category
                </button>
              </div>
            </div>

            <div className="section-divider"></div>

            {/* Work Experience */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-accent)', display: 'flex', alignItems: 'center', gap: '8px' }}><Briefcase size={18} /> Work Experience</h3>
                <button className="btn btn-outline btn-sm" onClick={handleAddExperience}>+ Add Job Experience</button>
              </div>

              {profile.work_experience.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No work experience added yet.</p>
              ) : (
                profile.work_experience.map((job, idx) => (
                  <div key={idx} className="card" style={{ background: 'rgba(255,255,255,0.01)', borderStyle: 'dashed', padding: '20px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <strong style={{ fontSize: '0.88rem' }}>Job #{idx + 1}</strong>
                      <button className="btn btn-sm btn-danger" onClick={() => handleRemoveExperience(idx)}>Remove Job</button>
                    </div>

                    <div className="inputs-grid" style={{ marginBottom: 0 }}>
                      <div className="form-group">
                        <label>Company Name</label>
                        <input
                          type="text"
                          className="form-input"
                          value={job.company}
                          onChange={(e) => handleExperienceFieldChange(idx, 'company', e.target.value)}
                          placeholder="e.g. Google"
                        />
                      </div>
                      <div className="form-group">
                        <label>Job Role / Title</label>
                        <input
                          type="text"
                          className="form-input"
                          value={job.job_role}
                          onChange={(e) => handleExperienceFieldChange(idx, 'job_role', e.target.value)}
                          placeholder="e.g. Software Engineer"
                        />
                      </div>
                      <div className="form-group">
                        <label>Employment Dates</label>
                        <input
                          type="text"
                          className="form-input"
                          value={job.dates}
                          onChange={(e) => handleExperienceFieldChange(idx, 'dates', e.target.value)}
                          placeholder="e.g. June 2021 – Present"
                        />
                      </div>
                      <div className="form-group">
                        <label>Key Project / Client</label>
                        <input
                          type="text"
                          className="form-input"
                          value={job.project}
                          onChange={(e) => handleExperienceFieldChange(idx, 'project', e.target.value)}
                          placeholder="e.g. Cloud API Migration"
                        />
                      </div>
                      <div className="form-group full-width">
                        <label>Description & Achievements</label>
                        <textarea
                          className="form-input"
                          value={job.description}
                          onChange={(e) => handleExperienceFieldChange(idx, 'description', e.target.value)}
                          placeholder="Describe responsibilities, stack, and quantifiable metrics..."
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="section-divider"></div>

            {/* Key Projects */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-accent)', display: 'flex', alignItems: 'center', gap: '8px' }}><Code size={18} /> Key Projects</h3>
                <button className="btn btn-outline btn-sm" onClick={handleAddProject}>+ Add Project</button>
              </div>

              {profile.projects.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No projects added yet.</p>
              ) : (
                profile.projects.map((proj, idx) => (
                  <div key={idx} className="card" style={{ background: 'rgba(255,255,255,0.01)', borderStyle: 'dashed', padding: '20px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <strong style={{ fontSize: '0.88rem' }}>Project #{idx + 1}</strong>
                      <button className="btn btn-sm btn-danger" onClick={() => handleRemoveProject(idx)}>Remove Project</button>
                    </div>

                    <div className="inputs-grid" style={{ marginBottom: 0 }}>
                      <div className="form-group">
                        <label>Project Title</label>
                        <input
                          type="text"
                          className="form-input"
                          value={proj.title}
                          onChange={(e) => handleProjectFieldChange(idx, 'title', e.target.value)}
                          placeholder="e.g. Portfolio Manager"
                        />
                      </div>
                      <div className="form-group">
                        <label>Dates / Completion</label>
                        <input
                          type="text"
                          className="form-input"
                          value={proj.dates}
                          onChange={(e) => handleProjectFieldChange(idx, 'dates', e.target.value)}
                          placeholder="e.g. Dec 2023"
                        />
                      </div>
                      <div className="form-group full-width">
                        <label>Tech Used (Comma-separated list)</label>
                        <input
                          type="text"
                          className="form-input"
                          value={(proj.tech_used || []).join(', ')}
                          onChange={(e) => handleProjectFieldChange(idx, 'tech_used', e.target.value.split(',').map(s => s.trim()))}
                          placeholder="e.g. React, Python, PostgreSQL"
                        />
                      </div>
                      <div className="form-group">
                        <label>Source Code Link</label>
                        <input
                          type="text"
                          className="form-input"
                          value={proj.links?.source_code || ''}
                          onChange={(e) => handleProjectLinkChange(idx, 'source_code', e.target.value)}
                          placeholder="GitHub repo URL"
                        />
                      </div>
                      <div className="form-group">
                        <label>Production Live Link</label>
                        <input
                          type="text"
                          className="form-input"
                          value={proj.links?.production || ''}
                          onChange={(e) => handleProjectLinkChange(idx, 'production', e.target.value)}
                          placeholder="Live deployment URL"
                        />
                      </div>
                      <div className="form-group full-width">
                        <label>Project Description</label>
                        <textarea
                          className="form-input"
                          value={proj.description}
                          onChange={(e) => handleProjectFieldChange(idx, 'description', e.target.value)}
                          placeholder="Brief description of project outcomes, architecture, and features..."
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="section-divider"></div>

            {/* Education */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-accent)', display: 'flex', alignItems: 'center', gap: '8px' }}><GraduationCap size={18} /> Education</h3>
                <button className="btn btn-outline btn-sm" onClick={handleAddEducation}>+ Add Education</button>
              </div>

              {profile.education.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No education history added yet.</p>
              ) : (
                profile.education.map((edu, idx) => (
                  <div key={idx} className="card" style={{ background: 'rgba(255,255,255,0.01)', borderStyle: 'dashed', padding: '20px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <strong style={{ fontSize: '0.88rem' }}>Education #{idx + 1}</strong>
                      <button className="btn btn-sm btn-danger" onClick={() => handleRemoveEducation(idx)}>Remove Education</button>
                    </div>

                    <div className="inputs-grid" style={{ marginBottom: 0 }}>
                      <div className="form-group">
                        <label>Institution / College</label>
                        <input
                          type="text"
                          className="form-input"
                          value={edu.college}
                          onChange={(e) => handleEducationFieldChange(idx, 'college', e.target.value)}
                          placeholder="e.g. Stanford University"
                        />
                      </div>
                      <div className="form-group">
                        <label>Degree & Major</label>
                        <input
                          type="text"
                          className="form-input"
                          value={edu.degree}
                          onChange={(e) => handleEducationFieldChange(idx, 'degree', e.target.value)}
                          placeholder="e.g. B.S. in Computer Science"
                        />
                      </div>
                      <div className="form-group">
                        <label>CGPA / GPA</label>
                        <input
                          type="text"
                          className="form-input"
                          value={edu.cgpa}
                          onChange={(e) => handleEducationFieldChange(idx, 'cgpa', e.target.value)}
                          placeholder="e.g. 3.92/4.0"
                        />
                      </div>
                      <div className="form-group">
                        <label>Dates attended</label>
                        <input
                          type="text"
                          className="form-input"
                          value={edu.dates}
                          onChange={(e) => handleEducationFieldChange(idx, 'dates', e.target.value)}
                          placeholder="e.g. 2018 - 2022"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="section-divider"></div>

            {/* Achievements */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-accent)', display: 'flex', alignItems: 'center', gap: '8px' }}><Trophy size={18} /> Achievements & Awards</h3>
                <button className="btn btn-outline btn-sm" onClick={handleAddAchievement}>+ Add Achievement</button>
              </div>

              {profile.achievements.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No achievements added yet.</p>
              ) : (
                profile.achievements.map((ach, idx) => (
                  <div key={idx} className="card" style={{ background: 'rgba(255,255,255,0.01)', borderStyle: 'dashed', padding: '20px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <strong style={{ fontSize: '0.88rem' }}>Achievement #{idx + 1}</strong>
                      <button className="btn btn-sm btn-danger" onClick={() => handleRemoveAchievement(idx)}>Remove Achievement</button>
                    </div>

                    <div className="inputs-grid" style={{ marginBottom: 0 }}>
                      <div className="form-group">
                        <label>Achievement Title</label>
                        <input
                          type="text"
                          className="form-input"
                          value={ach.title}
                          onChange={(e) => handleAchievementFieldChange(idx, 'title', e.target.value)}
                          placeholder="e.g. Hackathon 1st Place"
                        />
                      </div>
                      <div className="form-group">
                        <label>Date Received</label>
                        <input
                          type="text"
                          className="form-input"
                          value={ach.dates}
                          onChange={(e) => handleAchievementFieldChange(idx, 'dates', e.target.value)}
                          placeholder="e.g. Oct 2023"
                        />
                      </div>
                      <div className="form-group full-width">
                        <label>Details / Description</label>
                        <textarea
                          className="form-input"
                          value={ach.description}
                          onChange={(e) => handleAchievementFieldChange(idx, 'description', e.target.value)}
                          placeholder="Describe the context, competition size, and achievements..."
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="section-divider"></div>

            {/* Extra Curriculars */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-accent)', display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={18} /> Extra Curricular Activities</h3>
                <button className="btn btn-outline btn-sm" onClick={handleAddExtraCurricular}>+ Add Activity</button>
              </div>

              {profile.extra_curriculars.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No extra curricular activities added yet.</p>
              ) : (
                profile.extra_curriculars.map((ext, idx) => (
                  <div key={idx} className="card" style={{ background: 'rgba(255,255,255,0.01)', borderStyle: 'dashed', padding: '20px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <strong style={{ fontSize: '0.88rem' }}>Activity #{idx + 1}</strong>
                      <button className="btn btn-sm btn-danger" onClick={() => handleRemoveExtraCurricular(idx)}>Remove Activity</button>
                    </div>

                    <div className="inputs-grid" style={{ marginBottom: 0 }}>
                      <div className="form-group">
                        <label>Activity Title / Role</label>
                        <input
                          type="text"
                          className="form-input"
                          value={ext.title}
                          onChange={(e) => handleExtraCurricularFieldChange(idx, 'title', e.target.value)}
                          placeholder="e.g. Club President"
                        />
                      </div>
                      <div className="form-group">
                        <label>Dates / Duration</label>
                        <input
                          type="text"
                          className="form-input"
                          value={ext.dates}
                          onChange={(e) => handleExtraCurricularFieldChange(idx, 'dates', e.target.value)}
                          placeholder="e.g. 2020 - 2022"
                        />
                      </div>
                      <div className="form-group full-width">
                        <label>Description</label>
                        <textarea
                          className="form-input"
                          value={ext.description}
                          onChange={(e) => handleExtraCurricularFieldChange(idx, 'description', e.target.value)}
                          placeholder="Briefly describe your contributions and responsibilities..."
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Save Buttons */}
            <div style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={() => setProfileLoaded(false)}>
                <ArrowLeft size={14} /> Back
              </button>
              <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={handleSaveProfile} disabled={saving}>
                {saving ? (
                  <>
                    <span className="spinner" style={{ marginRight: '6px' }}></span>
                    Saving Profile...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Save Profile & Launch Dashboard
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
