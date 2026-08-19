import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText, Sparkles, Flag, MessageSquare, Zap,
  AlertTriangle, ShieldCheck,
  ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import { getContract, analyzeContract, listContracts, getAnnotations, saveAnnotation, generateRedlines } from '../services/api';
import type { Contract, RiskFinding, RedlineResponse, ClauseCompletenessItem } from '../services/api';
import { RedlineModal } from '../components/RedlineModal';

// ─── Constants ─────────────────────────────────────────────────────────────────

const ENGINE_INFO = {
  id: 'claw_1_0',
  name: 'Claw 1.0',
  subtitle: 'Contract intelligence engine',
  description: 'Precise retrieval, full clause context, evidence grounded analysis'
};

const categoryConfig: Record<string, { label: string; bg: string; border: string; color: string }> = {
  critical_risk:           { label: 'High priority',       bg: 'var(--risk-high-bg)', border: 'var(--risk-high-border)', color: 'var(--risk-high-text)' },
  compliance_check:        { label: 'Needs checking',      bg: 'var(--risk-med-bg)',  border: 'var(--risk-med-border)',  color: 'var(--risk-med-text)'  },
  ambiguous_language:      { label: 'Needs clarification', bg: 'var(--risk-med-bg)',  border: 'var(--risk-med-border)',  color: 'var(--risk-med-text)'  },
  negotiation_opportunity: { label: 'Worth discussing',    bg: 'var(--accent-bg)',    border: 'var(--border-strong)',     color: 'var(--accent)'          },
  missing_clause:          { label: 'Not found',           bg: 'var(--bg-subtle)',     border: 'var(--border)',            color: 'var(--text-secondary)'  },
  informational:           { label: 'For your information',bg: 'var(--bg-subtle)',     border: 'var(--border)',            color: 'var(--text-secondary)'  },
};

const severityLabel = (severity: RiskFinding['severity']) => {
  if (severity === 'High') return 'High priority';
  if (severity === 'Medium') return 'Review';
  return 'Low priority';
};

const severityColors = (severity: RiskFinding['severity']) => {
  if (severity === 'High') return { bg: 'var(--risk-high-bg)', border: 'var(--risk-high-border)', color: 'var(--risk-high-text)' };
  if (severity === 'Medium') return { bg: 'var(--risk-med-bg)', border: 'var(--risk-med-border)', color: 'var(--risk-med-text)' };
  return { bg: 'var(--risk-low-bg)', border: 'var(--risk-low-border)', color: 'var(--risk-low-text)' };
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
  const [expanded, setExpanded] = useState(index < 1);

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

  const handleBlur = () => onSaveAnnotation(index, flagged, comment);
  const fType = risk.finding_type || 'informational';
  const cat = categoryConfig[fType] || categoryConfig.informational;
  const severity = severityColors(risk.severity);

  return (
    <div style={{ border: `1px solid ${flagged ? 'var(--risk-high-border)' : severity.border}`, borderRadius: 12, background: flagged ? 'var(--risk-high-bg)' : 'var(--bg-surface)', overflow: 'hidden' }}>
      <div onClick={() => setExpanded(e => !e)} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, cursor: 'pointer' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: severity.bg, color: severity.color, border: `1px solid ${severity.border}` }}>{severityLabel(risk.severity)}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: cat.color }}>{cat.label}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{risk.risk_type}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Tap to see what this means and what to do.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button onClick={toggleFlag} aria-label={flagged ? 'Unflag this finding' : 'Flag this finding'} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '5px 8px', borderRadius: 7, border: '1px solid', cursor: 'pointer', background: flagged ? 'var(--risk-high-bg)' : 'var(--bg-subtle)', color: flagged ? 'var(--risk-high-text)' : 'var(--text-muted)', borderColor: flagged ? 'var(--risk-high-border)' : 'var(--border)' }}><Flag size={11} />{flagged ? 'Flagged' : 'Flag'}</button>
          {expanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: cat.bg, borderRadius: 8, padding: '10px 12px', fontSize: 12, fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1.5, borderLeft: `3px solid ${cat.border}` }}>
            “{risk.clause_text}”
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>What this means</div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>{risk.explanation}</div>
          </div>
          <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--border-strong)', borderRadius: 9, padding: '11px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}><ShieldCheck size={15} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} /><div><div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>What to do next</div>{risk.recommendation}</div></div>
            <button onClick={(e) => { e.stopPropagation(); onRedline(risk); }} className="btn-ghost" style={{ padding: '7px 9px', fontSize: 11, flexShrink: 0, color: 'var(--accent)', borderColor: 'var(--border-strong)' }}>Redline</button>
          </div>
          <details style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }} onClick={e => e.stopPropagation()}>
            <summary style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 700 }}>Show source and confidence details</summary>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {risk.grounded_citation && <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 5, background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Source: {risk.grounded_citation}</span>}
              <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 5, background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Confidence: {risk.assessment_confidence || risk.confidence_score || 76}%</span>
            </div>
          </details>
          <div style={{ paddingTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 5 }}><MessageSquare size={11} /> Your private note</div>
            <input type="text" value={comment} onChange={e => setComment(e.target.value)} onBlur={handleBlur} onKeyDown={e => { if (e.key === 'Enter') handleBlur(); }} placeholder="Add a note for your review…" className="input" style={{ fontSize: 12 }} onClick={e => e.stopPropagation()} />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Score Ring ────────────────────────────────────────────────────────────────

const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 60 ? 'var(--risk-high-text)' : score >= 30 ? 'var(--risk-med-text)' : 'var(--risk-low-text)';
  const label = score >= 60 ? 'High risk' : score >= 30 ? 'Moderate risk' : 'Low risk';
  const guidance = score >= 60 ? 'Review the high-priority items before signing.' : score >= 30 ? 'A few items deserve attention before signing.' : 'No major risks were identified by this review.';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>Your contract risk score</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 3 }}><span style={{ fontSize: 25, fontWeight: 800, color }}>{score}</span><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/ 100</span></div>
        <div style={{ fontSize: 13, fontWeight: 800, color, marginTop: 1 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 5, maxWidth: 280 }}>{guidance}</div>
      </div>
      <svg width={64} height={64} viewBox="0 0 64 64" aria-label={`${score} out of 100 risk score`}>
        <circle cx={32} cy={32} r={25} fill="none" stroke="var(--border)" strokeWidth={6} />
        <circle cx={32} cy={32} r={25} fill="none" stroke={color} strokeWidth={6} strokeDasharray={157} strokeDashoffset={157 - (157 * score) / 100} strokeLinecap="round" transform="rotate(-90 32 32)" />
        <text x={32} y={37} textAnchor="middle" fontSize={14} fontWeight={800} fill={color}>{score}</text>
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
  const activeMode = 'claw_1_0';
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

  useEffect(() => {
    if (!selectedId) return;

    let alive = true;
    const refresh = async () => {
      try {
        const latest = await getContract(selectedId);
        if (alive) {
          setContract(latest);
        }
      } catch (err) {
        console.error(err);
      }
    };

    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
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
  const highRiskCount = risks.filter(r => r.severity === 'High').length;
  const reviewCount = risks.filter(r => r.severity === 'Medium').length;
  const nextStep = highRiskCount > 0
    ? `Start with the ${highRiskCount} high-priority ${highRiskCount === 1 ? 'item' : 'items'} below before signing.`
    : reviewCount > 0
      ? `Review the ${reviewCount} item${reviewCount === 1 ? '' : 's'} marked “Review” and discuss any changes before signing.`
      : 'No major risks were identified. Read the summary and confirm the business terms are right for you.';

  return (
    <div className="analysis-page-shell" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Sub-header */}
      <div className="analysis-subheader" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 12 }}>
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
          disabled={analyzing || !selectedId || contract?.status !== 'indexed'}
          className="btn-primary"
          style={{ opacity: analyzing || !selectedId || contract?.status !== 'indexed' ? .6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {analyzing ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
          {analyzing ? 'Analyzing Risks…' : contract?.status !== 'indexed' ? 'Waiting for Indexing…' : 'Run Risk Analysis'}
        </button>
      </div>

      {/* Dual-pane */}
      {contracts.length > 0 && (
        <div className="analysis-dual-pane" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>
          {/* Left pane — raw text */}
          <div className="analysis-text-pane" style={{ ...pane, background: 'var(--bg-subtle)', borderRight: '1px solid var(--border)' }}>
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
          <div className="analysis-results-pane" style={{ ...pane }}>
            {/* Claw 1.0 Engine Display */}
            <div className="card" style={{ borderRadius: 10, padding: '12px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--accent-bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>
                  <Zap size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{ENGINE_INFO.name}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', textTransform: 'uppercase' }}>Review ready</span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 1 }}>
                    Plain-English review of the important contract terms
                  </div>
                </div>
              </div>
            </div>

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
                  Click <strong>Run Risk Analysis</strong> above to extract clause-by-clause risks using <strong>Claw 1.0</strong>.
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

            {/* Simple, score-first analysis results */}
            {risks.length > 0 && !analyzing && (
              <>
                {score !== null && <ScoreRing score={score} />}

                <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--border-strong)', borderRadius: 12, padding: '13px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>What should I do?</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.55 }}>{nextStep}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  <div style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 9, border: '1px solid var(--border)' }}><div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>High priority</div><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--risk-high-text)', marginTop: 2 }}>{highRiskCount}</div></div>
                  <div style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 9, border: '1px solid var(--border)' }}><div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Review</div><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--risk-med-text)', marginTop: 2 }}>{reviewCount}</div></div>
                  <div style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 9, border: '1px solid var(--border)' }}><div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Total findings</div><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{risks.length}</div></div>
                </div>

                <div className="card" style={{ borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-muted)', marginBottom: 4 }}>Short summary</div>
                  {summary || 'The review is complete. Open each item below for a plain-English explanation and suggested next step.'}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 9, border: '1px solid var(--border)' }}><div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Document</div><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 3 }}>{checklist.some(c => c.clause_name === 'Document Validity' || contract?.raw_text?.includes('SOFTWARE TESTING')) ? 'Test document' : 'Agreement detected'}</div></div>
                  <div style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 9, border: '1px solid var(--border)' }}><div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Signing status</div><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 3 }}>{contract?.raw_text?.includes('____') || contract?.raw_text?.includes('Signature') ? 'Check signatures' : 'Appears signed'}</div></div>
                </div>

                {checklist.length > 0 && (
                  <details className="card" style={{ borderRadius: 10, padding: '12px 14px' }}>
                    <summary style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', cursor: 'pointer' }}>Show clause checklist ({checklist.length})</summary>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, marginTop: 10 }}>
                      {checklist.map((item, idx) => {
                        const isGood = item.status === 'present_complete' || item.status === 'present';
                        const needsAttention = item.status === 'mentioned_incomplete' || item.status === 'needs_attention' || item.status === 'missing_expected' || item.status === 'missing';
                        const badgeText = isGood ? 'Present' : needsAttention ? 'Review' : 'Not found';
                        const badge = isGood ? severityColors('Low') : needsAttention ? severityColors('Medium') : { bg: 'var(--bg-subtle)', border: 'var(--border)', color: 'var(--text-secondary)' };
                        return <div key={idx} style={{ padding: '8px 10px', background: 'var(--bg-subtle)', borderRadius: 7, border: '1px solid var(--border)' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}><span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{item.clause_name}</span><span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>{badgeText}</span></div><span style={{ display: 'block', fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: 4 }}>{item.summary}</span></div>;
                      })}
                    </div>
                  </details>
                )}

                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginTop: 4 }}>Findings to review ({risks.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {risks.map((r, i) => <RiskCard key={i} risk={r} index={i} annotation={annotations[i]} onSaveAnnotation={handleSaveAnnotation} onRedline={handleOpenRedline} />)}
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
