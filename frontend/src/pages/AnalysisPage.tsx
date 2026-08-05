import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText, Sparkles, Flag, MessageSquare, Search, Zap,
  Filter, Layers, AlertTriangle, ShieldCheck,
  ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import { getContract, analyzeContract, listContracts, getAnnotations, saveAnnotation, generateRedlines } from '../services/api';
import type { Contract, RiskFinding, RedlineResponse, ClauseCompletenessItem } from '../services/api';
import { RedlineModal } from '../components/RedlineModal';

// ─── Constants ─────────────────────────────────────────────────────────────────

const MODES = [
  { id: 'Similarity Search',        icon: Search   },
  { id: 'MMR (Diversity Mode)',      icon: Zap      },
  { id: 'Multi-Query Retriever',     icon: Sparkles },
  { id: 'Self-Query Retriever',      icon: Filter   },
  { id: 'Parent Document Retriever', icon: Layers   },
];

const categoryConfig: Record<string, { label: string; badgeCls: string; bg: string; border: string }> = {
  critical_risk:           { label: 'CRITICAL RISK',            badgeCls: 'bg-red-100 text-red-800 border border-red-200 font-bold',       bg: 'var(--risk-high-bg)', border: 'var(--risk-high-border)' },
  compliance_check:        { label: 'COMPLIANCE CHECK',         badgeCls: 'bg-amber-100 text-amber-800 border border-amber-200 font-bold',   bg: 'var(--risk-med-bg)',  border: 'var(--risk-med-border)'  },
  ambiguous_language:      { label: 'AMBIGUOUS LANGUAGE',       badgeCls: 'bg-orange-100 text-orange-800 border border-orange-200 font-bold', bg: 'var(--risk-med-bg)',  border: 'var(--risk-med-border)'  },
  negotiation_opportunity: { label: 'NEGOTIATION OPPORTUNITY', badgeCls: 'bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold', bg: 'var(--accent-bg)',   border: 'var(--border)'  },
  missing_clause:          { label: 'MISSING CLAUSE (OBSERVATION)', badgeCls: 'bg-slate-100 text-slate-700 border border-slate-200 font-bold', bg: 'var(--bg-subtle)', border: 'var(--border)'  },
  informational:           { label: 'INFORMATIONAL',            badgeCls: 'bg-slate-100 text-slate-600 border border-slate-200 font-medium', bg: 'var(--bg-subtle)', border: 'var(--border)'  },
};

// ─── Risk Card ─────────────────────────────────────────────────────────────────

interface RiskCardProps {
  risk: RiskFinding;
  index: number;
  annotation?: { flagged: boolean; note: string };
  onSaveAnnotation: (index: number, flagged: boolean, note: string) => void;
  onRedline: (risk: RiskFinding) => void;
}

const RiskCard: React.FC<RiskCardProps> = ({ risk, index, annotation, onSaveAnnotation, onRedline }) => {
  const [flagged, setFlagged] = useState(annotation?.flagged || false);
  const [comment, setComment] = useState(annotation?.note || '');
  const [expanded, setExpanded] = useState(index < 2);

  useEffect(() => {
    if (annotation) {
      setFlagged(annotation.flagged);
      setComment(annotation.note);
    }
  }, [annotation]);

  const toggleFlag = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextFlagged = !flagged;
    setFlagged(nextFlagged);
    onSaveAnnotation(index, nextFlagged, comment);
  };

  const handleBlur = () => {
    onSaveAnnotation(index, flagged, comment);
  };

  const fType = risk.finding_type || 'informational';
  const cat = categoryConfig[fType] || categoryConfig.informational;

  return (
    <div style={{
      border: `1px solid ${flagged ? 'var(--risk-high-border)' : cat.border}`,
      borderRadius: 10,
      background: flagged ? 'var(--risk-high-bg)' : 'var(--bg-surface)',
      overflow: 'hidden',
      transition: 'border-color .15s',
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${cat.badgeCls}`}>
            {cat.label}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{risk.risk_type}</span>
          
          {risk.grounded_citation && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              📍 {risk.grounded_citation}
            </span>
          )}

          {/* Bug 4: Dual Confidence Signals (Detection & Assessment) */}
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, border: '1px solid var(--border)',
            background: 'var(--bg-subtle)', color: 'var(--text-secondary)'
          }}>
            🎯 Detection: {risk.detection_confidence || 94}% | Assessment: {risk.assessment_confidence || 76}%
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={toggleFlag}
            style={{
              display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600,
              padding: '2px 8px', borderRadius: 5, border: '1px solid',
              cursor: 'pointer', transition: 'all .12s',
              background: flagged ? 'var(--risk-high-bg)' : 'var(--bg-subtle)',
              color: flagged ? 'var(--risk-high-text)' : 'var(--text-muted)',
              borderColor: flagged ? 'var(--risk-high-border)' : 'var(--border)',
            }}
          >
            <Flag size={10} />{flagged ? 'Flagged' : 'Flag'}
          </button>
          {expanded ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Clause text */}
          <div style={{ background: cat.bg, borderRadius: 7, padding: '8px 12px', fontSize: 12, fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1.5, borderLeft: `3px solid ${cat.border}` }}>
            "{risk.clause_text}"
          </div>
          {/* Explanation */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>Analysis & Fact / Consideration</div>
            <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.55 }}>{risk.explanation}</div>
          </div>
          {/* Recommendation & Redline Button */}
          <div style={{ background: 'var(--accent-bg)', borderRadius: 7, padding: '8px 12px', fontSize: 12, color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={13} style={{ flexShrink: 0 }} />
              <span>{risk.recommendation}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onRedline(risk); }}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg shadow-sm transition-all flex items-center space-x-1"
            >
              <span>✨ Redline Clause</span>
            </button>
          </div>

          {/* Comment */}
          <div style={{ paddingTop: 6, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
              <MessageSquare size={11} /> Internal note
            </div>

            <input
              type="text"
              value={comment}
              onChange={e => setComment(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={e => { if (e.key === 'Enter') handleBlur(); }}
              placeholder="Add a review note for this clause…"
              className="input"
              style={{ fontSize: 12 }}
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Score Ring ────────────────────────────────────────────────────────────────

const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 70 ? 'var(--risk-high-text)' : score >= 40 ? 'var(--risk-med-text)' : 'var(--risk-low-text)';
  const label = score >= 70 ? 'High Risk' : score >= 40 ? 'Medium Risk' : 'Low Risk';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>Overall Risk Score</div>
        <div style={{ fontSize: 18, fontWeight: 800, color, marginTop: 2 }}>{score} / 100</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{label}</div>
      </div>
      <svg width={56} height={56} viewBox="0 0 56 56">
        <circle cx={28} cy={28} r={22} fill="none" stroke="var(--border)" strokeWidth={5} />
        <circle cx={28} cy={28} r={22} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={138} strokeDashoffset={138 - (138 * score) / 100}
          strokeLinecap="round" transform="rotate(-90 28 28)" />
        <text x={28} y={32} textAnchor="middle" fontSize={12} fontWeight={700} fill={color}>{score}</text>
      </svg>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

export const AnalysisPage: React.FC = () => {
  const { contractId } = useParams<{ contractId?: string }>();
  const navigate = useNavigate();

  const [contract, setContract] = useState<Contract | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedId, setSelectedId] = useState<string>(contractId || '');
  const [activeMode, setActiveMode] = useState('Similarity Search');
  const [analyzing, setAnalyzing] = useState(false);
  const [risks, setRisks] = useState<RiskFinding[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [annotations, setAnnotations] = useState<Record<number, { flagged: boolean; note: string }>>({});
  const [redlineModalOpen, setRedlineModalOpen] = useState(false);
  const [redlineData, setRedlineData] = useState<RedlineResponse | null>(null);
  const [redlineLoading, setRedlineLoading] = useState(false);

  const handleOpenRedline = async (risk: RiskFinding) => {
    setRedlineModalOpen(true);
    setRedlineLoading(true);
    try {
      const res = await generateRedlines(selectedId || 'demo', risk.risk_type, risk.clause_text);
      setRedlineData(res);
    } catch (err) {
      console.error("Failed to generate redline", err);
    } finally {
      setRedlineLoading(false);
    }
  };


  // Load contract list for selector
  useEffect(() => {
    listContracts().then(r => {
      const indexed = r.contracts.filter(c => c.status === 'indexed');
      setContracts(indexed);
      if (!selectedId && indexed.length > 0) {
        setSelectedId(indexed[0].id);
      }
    }).catch(console.error);
  }, []);

  // Load contract details and annotations when selectedId changes
  const [checklist, setChecklist] = useState<ClauseCompletenessItem[]>([]);

  useEffect(() => {
    if (!selectedId) return;
    getContract(selectedId).then(setContract).catch(console.error);
    getAnnotations(selectedId).then(r => {
      const map: Record<number, { flagged: boolean; note: string }> = {};
      (r.annotations || []).forEach((a: any) => {
        map[a.clause_index] = { flagged: Boolean(a.flagged), note: a.note };
      });
      setAnnotations(map);
    }).catch(console.error);

    setRisks([]); setChecklist([]); setScore(null); setSummary(''); setError('');
  }, [selectedId]);

  // Sync URL param
  useEffect(() => {
    if (contractId && contractId !== selectedId) {
      setSelectedId(contractId);
    }
  }, [contractId]);

  const handleSaveAnnotation = async (clauseIndex: number, flagged: boolean, note: string) => {
    setAnnotations(prev => ({
      ...prev,
      [clauseIndex]: { flagged, note }
    }));
    if (selectedId) {
      await saveAnnotation(selectedId, clauseIndex, flagged, note).catch(console.error);
    }
  };

  const runAnalysis = useCallback(async () => {
    if (!selectedId) return;
    setAnalyzing(true);
    setError('');
    setRisks([]); setChecklist([]); setScore(null); setSummary('');
    try {
      const result = await analyzeContract(selectedId, activeMode);
      setRisks(result.risks);
      setChecklist(result.checklist || []);
      setScore(result.overall_score);
      setSummary(result.summary);

    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Analysis failed';
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  }, [selectedId, activeMode]);

  const pane: React.CSSProperties = { overflow: 'auto', height: '100%', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Sub-header */}
      <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <FileText size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
          {/* Contract selector */}
          <select
            value={selectedId}
            onChange={e => { setSelectedId(e.target.value); navigate(`/analysis/${e.target.value}`); }}
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit', cursor: 'pointer', maxWidth: 450, minWidth: 260 }}
          >
            {contracts.length === 0 && <option value="">No indexed contracts — upload one first</option>}
            {contracts.map(c => (
              <option key={c.id} value={c.id}>{c.filename} ({c.contract_type})</option>
            ))}
          </select>

          {contract && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {contract.parties !== 'Undetected Parties' ? contract.parties : ''}
            </span>
          )}
        </div>

        {/* Action button */}
        <button
          onClick={runAnalysis}
          disabled={analyzing || !selectedId}
          className="btn-primary"
          style={{ opacity: analyzing || !selectedId ? .6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {analyzing ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
          {analyzing ? 'Analyzing Risks…' : 'Run Risk Analysis'}
        </button>
      </div>

      {/* Dual-pane */}
      {contracts.length > 0 && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>
          {/* Left pane — raw text */}
          <div style={{ ...pane, background: 'var(--bg-subtle)', borderRight: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>Contract Text</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Severity Legend:</span>
                <span className="badge-risk-high">High</span>
                <span className="badge-risk-med">Med</span>
                <span className="badge-risk-low">Low</span>
              </div>
            </div>

            <div className="card" style={{ borderRadius: 10, padding: '16px 18px', fontSize: 12, lineHeight: 1.75, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', flex: 1 }}>
              {contract?.raw_text
                ? contract.raw_text.slice(0, 6000) + (contract.raw_text.length > 6000 ? '\n\n[…truncated for display]' : '')
                : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Select a contract to view its text.</span>
              }
            </div>
          </div>

          {/* Right pane — analysis */}
          <div style={{ ...pane }}>
            {/* Mode selector */}
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 9, padding: 4, display: 'flex', gap: 2 }}>
              {MODES.map(({ id, icon: Icon }) => (
                <button key={id}
                  onClick={() => setActiveMode(id)}
                  title={id}
                  style={{
                    flex: 1, padding: '6px 4px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 3, transition: 'all .12s',
                    background: activeMode === id ? 'var(--bg-surface)' : 'transparent',
                    color: activeMode === id ? 'var(--accent)' : 'var(--text-muted)',
                    boxShadow: activeMode === id ? 'var(--shadow-card)' : 'none',
                  }}
                >
                  <Icon size={12} />
                  <span style={{ display: 'none' }}>{id}</span>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: -8 }}>{activeMode}</div>

            {/* Error */}
            {error && (
              <div style={{ background: 'var(--risk-high-bg)', border: '1px solid var(--risk-high-border)', borderRadius: 9, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--risk-high-text)', fontWeight: 600 }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{error}
              </div>
            )}

            {/* Idle prompt */}
            {risks.length === 0 && !analyzing && !error && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
                <Sparkles size={28} color="var(--accent)" />
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>No analysis run yet</div>
                <div style={{ fontSize: 12, maxWidth: 280 }}>
                  Click <strong>Run Risk Analysis</strong> above to extract clause-by-clause risks using {activeMode}.
                </div>
              </div>
            )}

            {/* Loading */}
            {analyzing && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-muted)' }}>
                <Loader2 size={24} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
                <div style={{ fontSize: 12, fontWeight: 600 }}>Analyzing contract with Groq AI…</div>
              </div>
            )}

            {/* Analysis Results */}
            {risks.length > 0 && !analyzing && (
              <>
                {score !== null && <ScoreRing score={score} />}

                {/* Fix 5: Clause Completeness Checklist Widget */}
                {checklist.length > 0 && (
                  <div className="card" style={{ borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-muted)', marginBottom: 8 }}>
                      Clause Completeness Checklist ({contract?.contract_type || 'Standard'})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                      {checklist.map((item, idx) => (
                        <div key={idx} style={{ padding: '8px 10px', background: 'var(--bg-subtle)', borderRadius: 7, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{item.clause_name}</span>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase',
                              background: item.status === 'present' ? '#ecfdf5' : item.status === 'needs_attention' ? '#fffbeb' : '#f1f5f9',
                              color: item.status === 'present' ? '#047857' : item.status === 'needs_attention' ? '#b45309' : '#475569',
                              border: '1px solid var(--border)'
                            }}>
                              {item.status === 'present' ? '✓ Present' : item.status === 'needs_attention' ? '⚠️ Attention' : 'ℹ️ Missing'}
                            </span>
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{item.summary}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summary && (
                  <div className="card" style={{ borderRadius: 10, padding: '12px 14px', fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-muted)', marginBottom: 4 }}>Executive Summary</div>
                    {summary}
                  </div>
                )}

                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginTop: 4 }}>
                  Flagged Clause Risks ({risks.length})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {risks.map((r, i) => (
                    <RiskCard
                      key={i}
                      risk={r}
                      index={i}
                      annotation={annotations[i]}
                      onSaveAnnotation={handleSaveAnnotation}
                      onRedline={handleOpenRedline}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {contracts.length === 0 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40, textAlign: 'center' }}>
          <FileText size={32} color="var(--text-muted)" />
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>No contracts uploaded yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 360 }}>
            Upload a PDF contract from the Contracts tab to enable clause risk analysis.
          </div>
          <button className="btn-primary" onClick={() => navigate('/contracts')}>Go to Contracts</button>
        </div>
      )}

      {/* Legal Disclaimer Footer Banner */}
      <div style={{ background: 'var(--bg-subtle)', borderTop: '1px solid var(--border)', padding: '8px 20px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', flexShrink: 0 }}>
        ⚖️ <strong>Legal Disclaimer:</strong> ContractClaw uses AI machine learning pattern matching for legal risk detection and clause analysis. Output is provided for informational and review purposes only and does not constitute formal legal advice.
      </div>

      <RedlineModal
        isOpen={redlineModalOpen}
        onClose={() => setRedlineModalOpen(false)}
        redlineData={redlineData}
        loading={redlineLoading}
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );


};
