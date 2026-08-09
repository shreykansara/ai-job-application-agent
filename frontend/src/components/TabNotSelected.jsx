import React, { useState } from 'react';
import { 
  XCircle, Award, Compass, Search, Sparkles, AlertTriangle, Target, Info, Check
} from 'lucide-react';

export default function TabNotSelected({ applications, refreshData, showToast, currentProfileState }) {
  const rejectedApps = applications.filter((a) => a.status === 'Not Selected');
  const [analyzingAppId, setAnalyzingAppId] = useState(null);
  const [togglingSkill, setTogglingSkill] = useState(null);

  const upskilledSkills = currentProfileState?.upskilled_skills || [];

  // Toggle upskilled state API call
  const handleToggleUpskilled = async (skill) => {
    setTogglingSkill(skill);
    try {
      const formData = new FormData();
      formData.append('skill', skill);
      const resp = await fetch('/api/toggle-upskilled', { method: 'POST', body: formData });
      if (resp.ok) {
        const data = await resp.json();
        showToast(
          data.action === 'added' 
            ? `Marked "${skill}" as completed/upskilled!` 
            : `Reopened "${skill}" as a pending skill gap.`
        );
        refreshData();
      } else {
        showToast('Failed to update skill status.', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setTogglingSkill(null);
    }
  };

  // Autosave notes
  const saveRejectionNotes = async (appId, notes) => {
    try {
      const formData = new FormData();
      formData.append('app_id', appId);
      formData.append('rejection_notes', notes);
      await fetch('/api/save-rejection-notes', { method: 'POST', body: formData });
    } catch (e) {
      // silently fail on autosave
    }
  };

  // Handle textarea change
  const handleNotesChange = (appId, val) => {
    saveRejectionNotes(appId, val);
  };

  // Run analysis
  const handleAnalyze = async (appId, notes) => {
    const trimmedNotes = (notes || '').trim();
    if (!trimmedNotes) {
      showToast('Please enter rejection notes before analyzing.', 'error');
      return;
    }

    setAnalyzingAppId(appId);
    
    // Make sure we save the latest notes first
    await saveRejectionNotes(appId, trimmedNotes);

    try {
      const formData = new FormData();
      formData.append('app_id', appId);
      const resp = await fetch('/api/analyze-rejection', { method: 'POST', body: formData });
      const data = await resp.json();

      if (resp.ok) {
        showToast('Rejection analyzed — Living Profile updated!');
        refreshData();
      } else {
        showToast(data.detail || 'Analysis failed.', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setAnalyzingAppId(null);
    }
  };

  const renderRejectionAnalysis = (analysis) => {
    if (!analysis || !Object.keys(analysis).length) return null;

    const gaps = analysis.identified_skill_gaps || [];
    const topics = analysis.struggle_topics || [];
    const updates = analysis.profile_updates_applied || '';

    return (
      <div className="rejection-analysis-card" style={{ marginTop: '12px', textAlign: 'left' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Search size={14} style={{ color: 'var(--text-accent)' }} /> Analysis Results
        </h4>
        {gaps.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Skill Gaps:</p>
            <div className="gap-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
              {gaps.map((g, idx) => (
                <span key={idx} className="skill-chip missing" style={{ fontSize: '0.7rem' }}>
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}
        {topics.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Struggle Topics:</p>
            <div className="gap-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
              {topics.map((t, idx) => (
                <span key={idx} className="skill-chip moderate" style={{ fontSize: '0.7rem' }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
        {updates && (
          <p style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Info size={12} /> <em>{updates}</em>
          </p>
        )}
      </div>
    );
  };

  // Get all unique skill gaps and struggle topics from all rejected applications
  const allGapsSet = new Set();
  rejectedApps.forEach((app) => {
    const analysis = app.rejection_analysis || {};
    const gaps = analysis.identified_skill_gaps || [];
    const topics = analysis.struggle_topics || [];
    gaps.forEach((g) => {
      if (g && g.trim()) allGapsSet.add(g.trim());
    });
    topics.forEach((t) => {
      if (t && t.trim()) allGapsSet.add(t.trim());
    });
  });
  const allGapsList = Array.from(allGapsSet);

  return (
    <div className="tab-panel active">
      {/* Upskilling & Gap Checklist Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={18} style={{ color: 'var(--text-accent)' }} /> Upskilling Checklist
        </div>
        <div className="card-subtitle">
          Track and check off identified skill gaps once you have upskilled. Marked skills are filtered out of the Global Analysis.
        </div>
        
        {allGapsList.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontStyle: 'italic' }}>
            No skill gaps or struggle topics identified from rejections yet. Run rejection analysis below to populate this checklist.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {allGapsList.map((skill, idx) => {
              const isDone = upskilledSkills.includes(skill);
              return (
                <div 
                  key={idx} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: isDone ? 'rgba(16, 185, 129, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                    border: isDone ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <span style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: 500,
                    color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                    textDecoration: isDone ? 'line-through' : 'none',
                    marginRight: '12px',
                    lineHeight: '1.4'
                  }}>
                    {skill}
                  </span>
                  <button
                    className={`btn btn-sm ${isDone ? 'btn-success' : 'btn-outline'}`}
                    disabled={togglingSkill === skill}
                    onClick={() => handleToggleUpskilled(skill)}
                    style={{ 
                      padding: '4px 12px', 
                      fontSize: '0.72rem', 
                      minHeight: '26px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    {isDone ? (
                      <>
                        <Check size={12} /> Done
                      </>
                    ) : (
                      <>Mark Done</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <XCircle size={18} style={{ color: 'var(--accent-rose)' }} /> Rejection Analysis & Profile Learning
        </div>
        <div className="card-subtitle">Enter rejection notes and let AI update your Living Profile</div>

        {rejectedApps.length === 0 ? (
          <div className="empty-state" id="not-selected-empty">
            <div className="empty-icon" style={{ color: 'var(--text-muted)' }}>
              <Target size={48} />
            </div>
            <h3>No Rejections Yet</h3>
            <p>Applications marked as "Not Selected" in the Tracking tab will appear here for AI-powered rejection analysis.</p>
          </div>
        ) : (
          <div className="tracking-table-wrapper">
            <table className="tracking-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Job Title</th>
                  <th>Match %</th>
                  <th>Rejection Notes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rejectedApps.map((app) => (
                  <tr key={app.id}>
                    <td><strong>{app.company_name}</strong></td>
                    <td>{app.job_role}</td>
                    <td><strong>{app.skill_match_pct}%</strong></td>
                    <td style={{ minWidth: '280px', verticalAlign: 'top' }}>
                      <textarea
                        className="form-input"
                        id={`notes-${app.id}`}
                        style={{ width: '100%', minHeight: '340px', resize: 'vertical' }}
                        defaultValue={app.rejection_notes || ''}
                        onBlur={(e) => handleNotesChange(app.id, e.target.value)}
                        placeholder="What happened during the interview? Questions you couldn't answer? Feedback received? Rejection email content?"
                      />
                    </td>
                    <td style={{ minWidth: '280px', verticalAlign: 'top' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        id={`analyze-btn-${app.id}`}
                        onClick={() => {
                          const ta = document.getElementById(`notes-${app.id}`);
                          handleAnalyze(app.id, ta ? ta.value : '');
                        }}
                        disabled={analyzingAppId === app.id}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        {analyzingAppId === app.id ? (
                          <>
                            <span className="spinner" style={{ marginRight: '6px' }}></span>
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles size={12} /> Analyze
                          </>
                        )}
                      </button>
                      {renderRejectionAnalysis(app.rejection_analysis)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
