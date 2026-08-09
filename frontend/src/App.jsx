import React, { useState, useEffect } from 'react';
import TabApply from './components/TabApply';
import TabTracking from './components/TabTracking';
import TabNotSelected from './components/TabNotSelected';
import TabGlobalAnalysis from './components/TabGlobalAnalysis';

export default function App() {
  // ---- Global Application State ----
  const [activeTab, setActiveTab] = useState('apply');
  const [applications, setApplications] = useState([]);
  const [currentProfileState, setCurrentProfileState] = useState(null);
  const [referenceResumeStyle, setReferenceResumeStyle] = useState(null);
  const [originalProfileText, setOriginalProfileText] = useState(null);

  // ---- UI States (Toasts and Modals) ----
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // { id, title, body, onConfirm }
  const [viewJdContent, setViewJdContent] = useState(null); // String content for View JD Modal

  // ---- Fetch & Refresh Data ----
  const refreshData = async () => {
    try {
      const resp = await fetch('/api/applications');
      if (resp.ok) {
        const data = await resp.json();
        setApplications(data.applications || []);
        setCurrentProfileState(data.current_profile_state || null);
        setReferenceResumeStyle(data.reference_resume_style || null);
        setOriginalProfileText(data.original_profile_text || null);
      }
    } catch (e) {
      showToast('Failed to load application data.', 'error');
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // ---- Toast Helper ----
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ---- Clear All Data Action ----
  const handleClearAllClick = () => {
    setModal({
      id: 'modal-clear-all',
      title: '⚠️ Clear All Data',
      body: 'Are you sure you want to clear all data? This will permanently wipe all applications, tracking history, rejection analysis, and your living profile. This action cannot be undone.',
      onConfirm: async () => {
        try {
          const resp = await fetch('/api/clear-all-data', { method: 'POST' });
          if (resp.ok) {
            showToast('All data cleared successfully.');
            // Reset state
            setApplications([]);
            setCurrentProfileState(null);
            setReferenceResumeStyle(null);
            setOriginalProfileText(null);
            setActiveTab('apply');
          }
        } catch (e) {
          showToast('Failed to clear data.', 'error');
        }
        setModal(null);
      }
    });
  };

  // Badge Counts
  const trackingCount = applications.filter(a => a.status !== 'Not Selected').length;
  const notSelectedCount = applications.filter(a => a.status === 'Not Selected').length;

  return (
    <div className="app-wrapper">
      {/* ============= HEADER ============= */}
      <header className="app-header">
        <div className="app-logo">
          <div className="app-logo-icon">🚀</div>
          <div>
            <h1>AI Job Application Assistant</h1>
            <p>Smart Resume · Skill Match · Application Tracker</p>
          </div>
        </div>
        <button className="btn-clear-all" id="btn-clear-all" onClick={handleClearAllClick}>
          ⟳ Clear All Data
        </button>
      </header>

      {/* ============= TAB NAVIGATION ============= */}
      <nav className="tab-nav" id="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'apply' ? 'active' : ''}`}
          data-tab="apply"
          onClick={() => setActiveTab('apply')}
        >
          📄 Apply
        </button>
        <button
          className={`tab-btn ${activeTab === 'tracking' ? 'active' : ''}`}
          data-tab="tracking"
          onClick={() => setActiveTab('tracking')}
        >
          📊 Tracking <span className="tab-badge" id="tracking-count">{trackingCount}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'not-selected' ? 'active' : ''}`}
          data-tab="not-selected"
          onClick={() => setActiveTab('not-selected')}
        >
          ❌ Not Selected <span className="tab-badge" id="not-selected-count">{notSelectedCount}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'global-analysis' ? 'active' : ''}`}
          data-tab="global-analysis"
          onClick={() => setActiveTab('global-analysis')}
        >
          🔍 Global Analysis
        </button>
      </nav>

      {/* ============= ACTIVE TAB PANEL ============= */}
      <div className="tab-content">
        {activeTab === 'apply' && (
          <TabApply
            currentProfileState={currentProfileState}
            setCurrentProfileState={setCurrentProfileState}
            referenceResumeStyle={referenceResumeStyle}
            setReferenceResumeStyle={setReferenceResumeStyle}
            refreshData={refreshData}
            showToast={showToast}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === 'tracking' && (
          <TabTracking
            applications={applications}
            refreshData={refreshData}
            showToast={showToast}
            setModal={setModal}
            setViewJdContent={setViewJdContent}
          />
        )}
        {activeTab === 'not-selected' && (
          <TabNotSelected
            applications={applications}
            refreshData={refreshData}
            showToast={showToast}
          />
        )}
        {activeTab === 'global-analysis' && (
          <TabGlobalAnalysis
            applications={applications}
            showToast={showToast}
          />
        )}
      </div>

      {/* ============= TOAST NOTIFICATION ============= */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* ============= GENERIC MODAL ============= */}
      {modal && (
        <div className="modal-overlay visible" id={modal.id}>
          <div className="modal-box">
            <h3>{modal.title}</h3>
            <p>{modal.body}</p>
            <div className="modal-actions">
              <button className="btn btn-outline btn-sm" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button
                className={`btn btn-sm ${modal.id.includes('danger') || modal.id.includes('clear') || modal.id.includes('not-selected') ? 'btn-danger' : 'btn-primary'}`}
                onClick={modal.onConfirm}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============= VIEW JD MODAL ============= */}
      {viewJdContent !== null && (
        <div className="modal-overlay visible" id="modal-view-jd">
          <div className="modal-box">
            <h3>📋 Job Description</h3>
            <div className="jd-modal-content" id="modal-jd-content" style={{ whiteSpace: 'pre-wrap' }}>
              {viewJdContent || 'No JD available.'}
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline btn-sm" onClick={() => setViewJdContent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
