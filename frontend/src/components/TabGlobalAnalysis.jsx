import React, { useState, useEffect } from 'react';

export default function TabGlobalAnalysis({ applications, showToast }) {
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);

  // Fetch analysis data
  const runGlobalAnalysis = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/global-analysis');
      if (resp.ok) {
        const data = await resp.json();
        setAnalysisData(data);
      } else {
        showToast('Failed to run global analysis.', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Run automatically on mount
  useEffect(() => {
    runGlobalAnalysis();
  }, []);

  const renderContent = () => {
    if (loading && !analysisData) {
      return (
        <div className="empty-state">
          <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto 16px auto' }}></div>
          <h3>Running Analysis...</h3>
          <p>We are aggregating rejection data and compiling strategic insights.</p>
        </div>
      );
    }

    if (!analysisData || !analysisData.has_data) {
      return (
        <div className="empty-state" id="global-analysis-empty">
          <div className="empty-icon">📈</div>
          <h3>Not Enough Data Yet</h3>
          <p>
            {analysisData?.message ||
              'As applications are marked as "Not Selected" and analyzed in Tab 3, global cross-rejection insights will automatically populate here.'}
          </p>
        </div>
      );
    }

    const {
      recurring_skill_gaps,
      common_unanswered_topics,
      consistent_weak_areas,
      summary_recommendation,
      total_rejections_analyzed,
      companies_analyzed,
    } = analysisData;

    return (
      <div id="global-analysis-content">
        {/* Recurring Skill Gaps */}
        <div className="analysis-section" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            🔴 Recurring Skill Gaps
          </h3>
          {recurring_skill_gaps.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No recurring skill gaps identified yet.</p>
          ) : (
            <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
              {recurring_skill_gaps.map((g, idx) => (
                <li key={idx} style={{ color: 'var(--text-primary)' }}>{g}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Common Unanswered Topics */}
        <div className="analysis-section" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            ❓ Common Unanswered Topics
          </h3>
          {common_unanswered_topics.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No common unanswered topics identified yet.</p>
          ) : (
            <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
              {common_unanswered_topics.map((t, idx) => (
                <li key={idx} style={{ color: 'var(--text-primary)' }}>{t}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Consistent Weak Areas */}
        <div className="analysis-section" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            ⚠️ Consistent Weak Areas
          </h3>
          {consistent_weak_areas.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No consistent weak areas identified yet.</p>
          ) : (
            <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
              {consistent_weak_areas.map((w, idx) => (
                <li key={idx} style={{ color: 'var(--text-primary)' }}>{w}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Strategic Recommendation */}
        <div className="analysis-section" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-indigo-light)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            💡 Strategic Recommendation
          </h3>
          <div className="analysis-recommendation" style={{ padding: '16px', background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
            <strong style={{ color: 'var(--text-accent)' }}>Action Plan:</strong> {summary_recommendation || 'No recommendation available yet.'}
          </div>
        </div>

        {/* Summary Stats */}
        <div style={{ marginTop: '20px', fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
          Total rejections analyzed: <strong>{total_rejections_analyzed}</strong> | Companies:{' '}
          <strong>{(companies_analyzed || []).join(', ')}</strong>
        </div>
      </div>
    );
  };

  return (
    <div className="tab-panel active">
      <div className="card">
        <div className="card-title"><span className="icon">🔍</span> Global Cross-Rejection Analysis</div>
        <div className="card-subtitle">Consolidated strategic insights across all your rejection experiences</div>

        <div style={{ marginBottom: '20px', textAlign: 'right' }}>
          <button className="btn btn-primary btn-sm" onClick={runGlobalAnalysis} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" style={{ marginRight: '6px' }}></span>
                Analyzing...
              </>
            ) : (
              '🔄 Run Global Analysis'
            )}
          </button>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
