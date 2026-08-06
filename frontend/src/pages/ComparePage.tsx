import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Columns3, FileText, RefreshCw, Sparkles } from 'lucide-react';
import { getContract, listContracts } from '../services/api';
import type { Contract } from '../services/api';

const scoreLabel = (score: number) => {
  if (score >= 70) return 'High Risk';
  if (score >= 40) return 'Medium Risk';
  return 'Low Risk';
};

const snippet = (text?: string, maxChars = 260) => {
  if (!text) return 'No text available yet.';
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
};

export const ComparePage: React.FC = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  const [left, setLeft] = useState<Contract | null>(null);
  const [right, setRight] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;

    const loadLibrary = async () => {
      try {
        const result = await listContracts();
        if (!alive) return;

        setContracts(result.contracts);
        if (!leftId && result.contracts[0]) {
          setLeftId(result.contracts[0].id);
        }
        if (!rightId && result.contracts[1]) {
          setRightId(result.contracts[1].id);
        } else if (!rightId && result.contracts[0]) {
          setRightId(result.contracts[0].id);
        }
        setLastSynced(new Date());
      } catch (err) {
        console.error(err);
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadLibrary();
    const timer = window.setInterval(loadLibrary, 12000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [leftId, rightId]);

  useEffect(() => {
    if (!leftId) return;

    let alive = true;
    const load = async () => {
      try {
        const contract = await getContract(leftId);
        if (alive) setLeft(contract);
      } catch (err) {
        console.error(err);
      }
    };

    load();
    const timer = window.setInterval(load, 7000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [leftId]);

  useEffect(() => {
    if (!rightId) return;

    let alive = true;
    const load = async () => {
      try {
        const contract = await getContract(rightId);
        if (alive) setRight(contract);
      } catch (err) {
        console.error(err);
      }
    };

    load();
    const timer = window.setInterval(load, 7000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [rightId]);

  const comparisonSummary = useMemo(() => {
    if (!left || !right) {
      return [];
    }

    return [
      {
        label: 'Risk Score',
        leftValue: left.risk_score ? `${left.risk_score}/100` : 'Not analyzed',
        rightValue: right.risk_score ? `${right.risk_score}/100` : 'Not analyzed',
      },
      {
        label: 'Risk Band',
        leftValue: left.risk_score ? scoreLabel(left.risk_score) : 'Unknown',
        rightValue: right.risk_score ? scoreLabel(right.risk_score) : 'Unknown',
      },
      {
        label: 'Contract Type',
        leftValue: left.contract_type || 'Unknown',
        rightValue: right.contract_type || 'Unknown',
      },
      {
        label: 'Status',
        leftValue: left.status,
        rightValue: right.status,
      },
    ];
  }, [left, right]);

  const syncLabel = lastSynced
    ? `Synced ${lastSynced.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : 'Syncing live library';

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20, height: '100%', overflowY: 'auto' }}>
      <div className="hero-panel" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start', padding: '4px 10px', borderRadius: 999, background: 'rgba(37, 99, 235, 0.10)', color: 'var(--accent)', fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            <Columns3 size={12} />
            Live compare
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>Version Diff &amp; Comparison</h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6, maxWidth: 760 }}>
              Compare two contracts side by side using the live contract library, then jump into full analysis with one click.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
              <RefreshCw size={12} /> {syncLabel}
            </span>
            <button className="btn-primary" onClick={() => navigate('/upload')}>
              <Sparkles size={16} /> Upload Contract
            </button>
          </div>
        </div>
      </div>

      {contracts.length === 0 && !loading ? (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <FileText size={30} color="var(--accent)" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>No contracts to compare yet</h2>
          <p style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 13 }}>
            Upload two contract versions first, then this view will let you compare them side by side.
          </p>
          <button className="btn-primary" style={{ marginTop: 18 }} onClick={() => navigate('/upload')}>
            Upload a Contract
          </button>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)', marginBottom: 6 }}>Left Contract</label>
              <select value={leftId} onChange={e => setLeftId(e.target.value)} className="input">
                {contracts.map(contract => (
                  <option key={contract.id} value={contract.id}>{contract.filename}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)', marginBottom: 6 }}>Right Contract</label>
              <select value={rightId} onChange={e => setRightId(e.target.value)} className="input">
                {contracts.map(contract => (
                  <option key={contract.id} value={contract.id}>{contract.filename}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)' }}>Contract A</div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{left?.filename || 'Select a contract'}</h3>
                </div>
                <span className={left?.risk_score && left.risk_score >= 70 ? 'badge-risk-high' : left?.risk_score && left.risk_score >= 40 ? 'badge-risk-med' : 'badge-risk-low'}>
                  {left?.risk_score ? `${left.risk_score}/100` : 'Pending'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Type</div>
                  <div style={{ marginTop: 4, fontWeight: 700, color: 'var(--text-primary)' }}>{left?.contract_type || 'Unknown'}</div>
                </div>
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Status</div>
                  <div style={{ marginTop: 4, fontWeight: 700, color: 'var(--text-primary)' }}>{left?.status || 'Loading'}</div>
                </div>
              </div>
              <div className="card" style={{ padding: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--text-primary)', fontSize: 12 }}>
                {snippet(left?.raw_text)}
              </div>
              <button className="btn-ghost" onClick={() => leftId && navigate(`/analysis/${leftId}`)}>
                Open Full Analysis <ArrowRight size={14} />
              </button>
            </div>

            <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)' }}>Contract B</div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{right?.filename || 'Select a contract'}</h3>
                </div>
                <span className={right?.risk_score && right.risk_score >= 70 ? 'badge-risk-high' : right?.risk_score && right.risk_score >= 40 ? 'badge-risk-med' : 'badge-risk-low'}>
                  {right?.risk_score ? `${right.risk_score}/100` : 'Pending'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Type</div>
                  <div style={{ marginTop: 4, fontWeight: 700, color: 'var(--text-primary)' }}>{right?.contract_type || 'Unknown'}</div>
                </div>
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Status</div>
                  <div style={{ marginTop: 4, fontWeight: 700, color: 'var(--text-primary)' }}>{right?.status || 'Loading'}</div>
                </div>
              </div>
              <div className="card" style={{ padding: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--text-primary)', fontSize: 12 }}>
                {snippet(right?.raw_text)}
              </div>
              <button className="btn-ghost" onClick={() => rightId && navigate(`/analysis/${rightId}`)}>
                Open Full Analysis <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)' }}>Quick Comparison</div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>Key differences at a glance</h3>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {comparisonSummary.map(item => (
                <div key={item.label} className="card" style={{ padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)' }}>{item.label}</div>
                  <div style={{ display: 'grid', gap: 8, marginTop: 10, fontSize: 13 }}>
                    <div><strong style={{ color: 'var(--text-primary)' }}>A:</strong> <span style={{ color: 'var(--text-secondary)' }}>{item.leftValue}</span></div>
                    <div><strong style={{ color: 'var(--text-primary)' }}>B:</strong> <span style={{ color: 'var(--text-secondary)' }}>{item.rightValue}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
