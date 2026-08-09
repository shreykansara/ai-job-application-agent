import React from 'react';
import { 
  BarChart2, Inbox, Calendar, Star, XCircle, CheckCircle, ExternalLink
} from 'lucide-react';

export default function TabTracking({
  applications,
  refreshData,
  showToast,
  setModal,
  setViewJdContent,
}) {
  // Filter out Not Selected applications from the active tracking board
  const activeApps = applications.filter((a) => a.status !== 'Not Selected');

  // Helper to get status badge elements
  const getStatusBadge = (status) => {
    if (status === 'Submitted') {
      return (
        <span className="status-badge submitted" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span className="status-submitted-blink"></span> Submitted
        </span>
      );
    }
    if (status === 'Interview') {
      return (
        <span className="status-badge interview" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={12} /> Interview
        </span>
      );
    }
    if (status === 'Selected') {
      return (
        <span className="status-badge selected" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Star size={12} /> Selected
        </span>
      );
    }
    if (status === 'Not Selected') {
      return (
        <span className="status-badge not-selected" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <XCircle size={12} /> Not Selected
        </span>
      );
    }
    return <span className="status-badge">{status}</span>;
  };

  // Status transition API call
  const updateStatus = async (appId, newStatus) => {
    try {
      const formData = new FormData();
      formData.append('app_id', appId);
      formData.append('new_status', newStatus);
      const resp = await fetch('/api/update-status', { method: 'POST', body: formData });
      if (resp.ok) {
        showToast(`Status updated to ${newStatus}.`);
        refreshData();
      } else {
        const data = await resp.json();
        showToast(data.detail || 'Update failed.', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  // Handle transitions with warnings
  const handleMarkSelected = (appId, currentStatus) => {
    if (currentStatus !== 'Interview') {
      // Direct selected transition triggers a confirmation modal
      setModal({
        id: 'modal-selected-confirm',
        title: '📋 Confirm Direct Selection',
        body: 'Candidate has not been marked for Interview. Do you want to mark as Selected directly?',
        onConfirm: () => {
          updateStatus(appId, 'Selected');
          setModal(null);
        },
      });
    } else {
      updateStatus(appId, 'Selected');
    }
  };

  const handleMarkNotSelected = (appId) => {
    setModal({
      id: 'modal-not-selected-confirm-danger',
      title: '❌ Confirm Not Selected',
      body: 'Are you sure you want to mark this application as Not Selected? This will move the application to the Not Selected tab for rejection analysis.',
      onConfirm: () => {
        updateStatus(appId, 'Not Selected');
        setModal(null);
      },
    });
  };

  return (
    <div className="tab-panel active">
      <div className="card">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart2 size={18} style={{ color: 'var(--text-accent)' }} /> Application Tracker
        </div>
        <div className="card-subtitle">Track the status of all your active job applications</div>

        {activeApps.length === 0 ? (
          <div className="empty-state" id="tracking-empty">
            <div className="empty-icon" style={{ color: 'var(--text-muted)' }}>
              <Inbox size={48} />
            </div>
            <h3>No Applications Yet</h3>
            <p>Submit your first application from the Apply tab to start tracking your progress.</p>
          </div>
        ) : (
          <div className="tracking-table-wrapper">
            <table className="tracking-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Skills Required</th>
                  <th>Match %</th>
                  <th>JD</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeApps.map((app) => {
                  const requiredSkills = app.skills_required || [];
                  const displayedSkills = requiredSkills.slice(0, 4);
                  const extraCount = requiredSkills.length - 4;

                  return (
                    <tr key={app.id}>
                      <td><strong>{app.company_name}</strong></td>
                      <td>{app.job_role}</td>
                      <td>
                        <div className="skills-container">
                          {displayedSkills.map((s, idx) => (
                            <span key={idx} className="skill-chip default" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                              {s}
                            </span>
                          ))}
                          {extraCount > 0 && (
                            <span className="skill-chip default" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                              +{extraCount}
                            </span>
                          )}
                        </div>
                      </td>
                      <td><strong>{app.skill_match_pct}%</strong></td>
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={() => setViewJdContent(app.jd_text)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ExternalLink size={12} /> View
                        </button>
                      </td>
                      <td>{getStatusBadge(app.status)}</td>
                      <td>
                        <div className="action-cell">
                          {app.status === 'Submitted' && (
                            <button className="btn btn-outline btn-sm" onClick={() => updateStatus(app.id, 'Interview')} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={12} /> Interview
                            </button>
                          )}
                          {app.status !== 'Selected' && (
                            <button className="btn btn-outline btn-sm" onClick={() => handleMarkSelected(app.id, app.status)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Star size={12} /> Selected
                            </button>
                          )}
                          <button className="btn btn-sm btn-danger" onClick={() => handleMarkNotSelected(app.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <XCircle size={12} /> Not Selected
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
