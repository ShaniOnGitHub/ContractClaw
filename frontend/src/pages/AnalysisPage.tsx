import React, { useState, useEffect } from 'react';
import { FileText, Sparkles, Flag, MessageSquare, Search, Zap, Filter, Layers, RefreshCw, Download, AlertTriangle } from 'lucide-react';
import { queryRetriever, selectSample } from '../services/api';
import type { QueryResponse } from '../services/api';

const MODES = [
  { id: 'Similarity Search',         icon: Search    },
  { id: 'MMR (Diversity Mode)',       icon: Zap       },
  { id: 'Multi-Query Retriever',      icon: Sparkles  },
  { id: 'Self-Query Retriever',       icon: Filter    },
  { id: 'Parent Document Retriever',  icon: Layers    },
];

export const AnalysisPage: React.FC = () => {
  const [activeSample]  = useState('sample_nda.pdf');
  const [activeMode, setActiveMode] = useState('Similarity Search');
  const [queryText, setQueryText] = useState('What are the termination clauses, liability caps, and payment obligations?');
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [flaggedClauses, setFlaggedClauses] = useState<Record<number, boolean>>({});
  const [clauseComments, setClauseComments] = useState<Record<number, string>>({});

  useEffect(() => { runAnalysis(); }, [activeMode]);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      await selectSample(activeSample);
      const res = await queryRetriever(queryText, activeMode);
      setResponse(res);
    } catch (err) { console.error('Analysis failed:', err); }
    finally { setLoading(false); }
  };

  const pane: React.CSSProperties = { overflow: 'auto', height: '100%', padding: 20 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Sub-header */}
      <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent-bg)', border: '1px solid var(--border)', borderRadius: 7, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
            <FileText size={13} />{activeSample}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>·</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Strategy: {activeMode}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={runAnalysis} disabled={loading} className="btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Re-Analyze
          </button>
          <button className="btn-primary" style={{ fontSize: 12, padding: '5px 12px' }}>
            <Download size={13} /> Export PDF
          </button>
        </div>
      </div>

      {/* Dual-pane */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', borderTop: 'none' }}>
        {/* Left pane — original doc */}
        <div style={{ ...pane, background: 'var(--bg-subtle)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>Original Document</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="badge-risk-high">High</span>
              <span className="badge-risk-med">Med</span>
              <span className="badge-risk-low">Low</span>
            </div>
          </div>

          <div className="card" style={{ borderRadius: 10, padding: '18px 20px', fontSize: 13, lineHeight: 1.7, color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>MUTUAL NON-DISCLOSURE AGREEMENT</div>

            <p>
              This Mutual Non-Disclosure Agreement ("Agreement") is entered into by and between{' '}
              <mark style={{ background: 'var(--risk-low-bg)', color: 'var(--risk-low-text)', padding: '1px 4px', borderRadius: 4, fontWeight: 600 }}>
                Apex Innovations Inc. &amp; Beta Technologies LLC
              </mark>{' '}
              effective as of August 15, 2025.
            </p>

            <div style={{ background: 'var(--risk-high-bg)', borderLeft: '3px solid var(--risk-high-text)', borderRadius: '0 6px 6px 0', padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--risk-high-text)', marginBottom: 4 }}>
                <AlertTriangle size={12} /> High Risk — Unilateral Termination
              </div>
              <p style={{ fontSize: 12, color: 'var(--risk-high-text)', opacity: .9 }}>"Either party may terminate this Agreement immediately upon written notice without penalty…"</p>
            </div>

            <div style={{ background: 'var(--risk-med-bg)', borderLeft: '3px solid var(--risk-med-text)', borderRadius: '0 6px 6px 0', padding: '10px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--risk-med-text)', marginBottom: 4 }}>Medium Risk — Indemnification Cap</div>
              <p style={{ fontSize: 12, color: 'var(--risk-med-text)', opacity: .9 }}>"Liability cap under this Agreement shall not exceed total fees paid in preceding six (6) months…"</p>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Confidential Information refers to proprietary information, technical data, trade secrets, and software code…</p>
          </div>
        </div>

        {/* Right pane — analysis */}
        <div style={{ ...pane, background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Risk score summary */}
          <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>Overall Risk Index</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, margin: '4px 0' }}>25 / 100</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--risk-low-text)' }}>Low Risk Contract</div>
            </div>
            <div style={{ width: 52, height: 52, borderRadius: '50%', border: '3px solid var(--risk-low-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'var(--risk-low-text)' }}>25%</div>
          </div>

          {/* Mode selector */}
          <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 9, padding: 4, display: 'flex', gap: 2 }}>
            {MODES.map(({ id, icon: Icon }) => (
              <button key={id}
                onClick={() => setActiveMode(id)}
                style={{
                  flex: 1, padding: '6px 4px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all .12s',
                  background: activeMode === id ? 'var(--bg-surface)' : 'transparent',
                  color: activeMode === id ? 'var(--accent)' : 'var(--text-muted)',
                  boxShadow: activeMode === id ? 'var(--shadow-card)' : 'none',
                }}
              >
                <Icon size={12} /><span style={{ display: 'none' }}>{id}</span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: -10 }}>{activeMode}</div>

          {/* Query bar */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" value={queryText} onChange={e => setQueryText(e.target.value)} placeholder="Ask about clauses…" className="input" style={{ flex: 1 }} />
            <button onClick={runAnalysis} className="btn-primary" style={{ padding: '7px 16px', flexShrink: 0 }}>Analyze</button>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[88, 112, 96].map(h => <div key={h} className="skeleton" style={{ height: h, borderRadius: 10 }} />)}
            </div>
          )}

          {/* Results */}
          {!loading && response && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {response.results.map((doc, idx) => (
                <div key={idx} className="card" style={{ borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge-risk-low">Low Risk</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Clause #{idx + 1}</span>
                    </div>
                    <button
                      onClick={() => setFlaggedClauses(prev => ({ ...prev, [idx]: !prev[idx] }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
                        padding: '3px 10px', borderRadius: 6, border: '1px solid', cursor: 'pointer', transition: 'all .12s',
                        background: flaggedClauses[idx] ? 'var(--risk-high-bg)' : 'var(--bg-subtle)',
                        color: flaggedClauses[idx] ? 'var(--risk-high-text)' : 'var(--text-muted)',
                        borderColor: flaggedClauses[idx] ? 'var(--risk-high-border)' : 'var(--border)',
                      }}
                    >
                      <Flag size={11} />{flaggedClauses[idx] ? 'Flagged' : 'Flag'}
                    </button>
                  </div>

                  <p style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.6 }}>{doc.content}</p>

                  <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 5 }}>
                      <MessageSquare size={11} /> Internal Note
                    </div>
                    <input
                      type="text"
                      value={clauseComments[idx] || ''}
                      onChange={e => setClauseComments(prev => ({ ...prev, [idx]: e.target.value }))}
                      placeholder="Add a review note…"
                      className="input"
                      style={{ fontSize: 12 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
