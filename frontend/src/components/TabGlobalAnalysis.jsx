import React, { useState, useEffect } from 'react';
import { 
  Globe, TrendingUp, AlertTriangle, AlertOctagon, HelpCircle, 
  Settings, Info, Sparkles, TrendingDown, RefreshCw, BarChart2,
  Compass, Award
} from 'lucide-react';

export default function TabGlobalAnalysis({ applications, showToast }) {
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);

  // Load saved analysis data on mount
  const loadGlobalAnalysis = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/global-analysis');
      if (resp.ok) {
        const data = await resp.json();
        setAnalysisData(data);
      }
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // Run/Regenerate analysis data (on button click)
  const runGlobalAnalysis = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/run-global-analysis', { method: 'POST' });
      if (resp.ok) {
        const data = await resp.json();
        setAnalysisData(data);
        showToast('Global analysis successfully updated.');
      } else {
        showToast('Failed to compile global analysis.', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Run automatically on mount
  useEffect(() => {
    loadGlobalAnalysis();
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
          <div className="empty-icon" style={{ color: 'var(--text-muted)' }}>
            <TrendingUp size={48} />
          </div>
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
            <AlertOctagon size={18} /> Recurring Skill Gaps
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
            <HelpCircle size={18} /> Common Unanswered Topics
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
            <TrendingDown size={18} /> Consistent Weak Areas
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

        {/* SWOT Analysis Section */}
        {analysisData.swot && (
          <div className="analysis-section" style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-accent)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Compass size={18} /> SWOT Alignment Matrix
            </h3>
            
            <div className="swot-grid">
              {/* Strengths */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.03)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                backdropFilter: 'blur(12px)'
              }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-emerald-light)', fontSize: '0.92rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                  <Award size={16} /> Strengths (S)
                </h4>
                <ul style={{ paddingLeft: '18px', listStyleType: 'disc', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                  {(analysisData.swot.strengths || []).map((s, idx) => (
                    <li key={idx} style={{ marginBottom: '8px' }}>{s}</li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div style={{
                background: 'rgba(244, 63, 94, 0.03)',
                border: '1px solid rgba(244, 63, 94, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                backdropFilter: 'blur(12px)'
              }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-rose)', fontSize: '0.92rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                  <AlertOctagon size={16} /> Weaknesses (W)
                </h4>
                <ul style={{ paddingLeft: '18px', listStyleType: 'disc', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                  {(analysisData.swot.weaknesses || []).map((w, idx) => (
                    <li key={idx} style={{ marginBottom: '8px' }}>{w}</li>
                  ))}
                </ul>
              </div>

              {/* Opportunities */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.03)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                backdropFilter: 'blur(12px)'
              }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-indigo-light)', fontSize: '0.92rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                  <Sparkles size={16} /> Opportunities (O)
                </h4>
                <ul style={{ paddingLeft: '18px', listStyleType: 'disc', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                  {(analysisData.swot.opportunities || []).map((o, idx) => (
                    <li key={idx} style={{ marginBottom: '8px' }}>{o}</li>
                  ))}
                </ul>
              </div>

              {/* Threats */}
              <div style={{
                background: 'rgba(245, 158, 11, 0.03)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                backdropFilter: 'blur(12px)'
              }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-amber)', fontSize: '0.92rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                  <AlertTriangle size={16} /> Threats (T)
                </h4>
                <ul style={{ paddingLeft: '18px', listStyleType: 'disc', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                  {(analysisData.swot.threats || []).map((t, idx) => (
                    <li key={idx} style={{ marginBottom: '8px' }}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Strategic Recommendation */}
        <div className="analysis-section" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-indigo-light)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Sparkles size={18} /> Strategic Recommendation
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
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={18} style={{ color: 'var(--text-accent)' }} /> Global Cross-Rejection Analysis
        </div>
        <div className="card-subtitle">Consolidated strategic insights across all your rejection experiences</div>

        <div style={{ marginBottom: '20px', textAlign: 'right' }}>
          <button className="btn btn-primary btn-sm" onClick={runGlobalAnalysis} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {loading ? (
              <>
                <span className="spinner" style={{ marginRight: '6px' }}></span>
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw size={14} /> Run Global Analysis
              </>
            )}
          </button>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
