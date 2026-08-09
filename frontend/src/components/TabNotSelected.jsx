import React, { useState } from 'react';

export default function TabNotSelected({ applications, refreshData, showToast }) {
  const rejectedApps = applications.filter((a) => a.status === 'Not Selected');
  const [analyzingAppId, setAnalyzingAppId] = useState(null);

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
        <h4>🔬 Analysis Results</h4>
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
          <p style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <em>{updates}</em>
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="tab-panel active">
      <div className="card">
        <div className="card-title"><span className="icon">❌</span> Rejection Analysis & Profile Learning</div>
        <div className="card-subtitle">Enter rejection notes and let AI update your Living Profile</div>

        {rejectedApps.length === 0 ? (
          <div className="empty-state" id="not-selected-empty">
            <div className="empty-icon">🎯</div>
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
                  <th>Experience Match</th>
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
                    <td style={{ minWidth: '280px' }}>
                      <textarea
                        className="form-input"
                        id={`notes-${app.id}`}
                        rows="4"
                        defaultValue={app.rejection_notes || ''}
                        onBlur={(e) => handleNotesChange(app.id, e.target.value)}
                        placeholder="What happened during the interview? Questions you couldn't answer? Feedback received? Rejection email content?"
                      />
                    </td>
                    <td style={{ minWidth: '220px' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        id={`analyze-btn-${app.id}`}
                        onClick={() => {
                          const ta = document.getElementById(`notes-${app.id}`);
                          handleAnalyze(app.id, ta ? ta.value : '');
                        }}
                        disabled={analyzingAppId === app.id}
                      >
                        {analyzingAppId === app.id ? (
                          <>
                            <span className="spinner" style={{ marginRight: '6px' }}></span>
                            Analyzing...
                          </>
                        ) : (
                          '🔬 Analyze'
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
