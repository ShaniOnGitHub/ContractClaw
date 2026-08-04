import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, AlertTriangle, Clock, BarChart2, UploadCloud, ShieldCheck } from 'lucide-react';
import { getDashboardMetrics, listContracts, getDeadlines } from '../services/api';
import type { DashboardMetrics, Contract, ContractDeadline } from '../services/api';

const riskClass: Record<string, string> = { Low: 'badge-risk-low', Medium: 'badge-risk-med', High: 'badge-risk-high' };

const scoreToRisk = (score: number) =>
  score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [deadlines, setDeadlines] = useState<ContractDeadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [m, c, d] = await Promise.all([getDashboardMetrics(), listContracts(), getDeadlines()]);
        setMetrics(m);
        setContracts(c.contracts.slice(0, 5));
        setDeadlines(d.deadlines || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);


  const isNewAccount = !loading && metrics && metrics.total_contracts === 0;

  const metricCards = metrics
    ? [
        { label: 'Total Analyzed',      icon: <FileText size={14} color="var(--accent)" />,             value: String(metrics.total_contracts),  note: 'Total contracts in your library',     noteColor: 'var(--text-muted)' },
        { label: 'High Risk Contracts', icon: <AlertTriangle size={14} color="var(--risk-high-text)" />, value: String(metrics.high_risk_count),  note: 'Contracts with risk score ≥ 70',       noteColor: 'var(--risk-high-text)' },
        { label: 'Pending Review',      icon: <Clock size={14} color="var(--risk-med-text)" />,          value: String(metrics.pending_review),   note: 'Queued for automated indexing',      noteColor: 'var(--text-muted)' },
        { label: 'Avg Risk Score',      icon: <BarChart2 size={14} color="var(--risk-low-text)" />,      value: String(metrics.avg_risk_score),   note: 'Average risk index across library',   noteColor: 'var(--text-muted)' },
      ]
    : [];

  return (
    <div style={{ padding: '28px 32px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Dashboard Overview</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          High-level overview of parsed contracts, risk scores, and recent audits.
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 96, borderRadius: 12 }} />)}
        </div>
      )}

      {/* Empty State for New Account */}
      {isNewAccount && (
        <div className="card" style={{
          borderRadius: 16, padding: '48px 32px', textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          background: 'var(--bg-surface)', border: '1px border var(--border)'
        }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={28} color="var(--accent)" />
          </div>
          <div style={{ maxWidth: 440 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>No contracts uploaded yet</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Upload your first contract PDF to run an automated AI risk breakdown, extract key clauses, and generate risk scores.
            </p>
          </div>
          <button className="btn-primary" onClick={() => navigate('/upload')} style={{ marginTop: 8, padding: '10px 24px', fontSize: 13 }}>
            <UploadCloud size={16} /> Upload Your First Contract
          </button>
        </div>
      )}

      {/* Metrics Cards (When contracts exist) */}
      {!loading && !isNewAccount && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {metricCards.map(m => (
            <div key={m.label} className="card" style={{ borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', marginBottom: 10 }}>
                <span>{m.label}</span>{m.icon}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{m.value}</div>
              <div style={{ fontSize: 11, fontWeight: 500, marginTop: 8, color: m.noteColor }}>{m.note}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Contracts Table */}
      {!loading && !isNewAccount && (
        <div className="card" style={{ borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Recent Contract Audits</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Click any row to open full clause risk analysis</div>
            </div>
            <button onClick={() => navigate('/contracts')} style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer' }}>View All Contracts →</button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>
                {['Contract', 'Type', 'Parties', 'Status', 'Risk Score', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contracts.map(row => (
                <tr key={row.id}
                  onClick={() => navigate(`/analysis/${row.id}`)}
                  style={{ borderBottom: '1px solid var(--border)', transition: 'background .1s', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                    <FileText size={13} color="var(--accent)" />{row.filename}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{row.contract_type || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.parties || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, border: '1px solid',
                      ...(row.status === 'indexed'
                        ? { background: 'var(--risk-low-bg)', color: 'var(--risk-low-text)', borderColor: 'var(--risk-low-border)' }
                        : row.status === 'error'
                        ? { background: 'var(--risk-high-bg)', color: 'var(--risk-high-text)', borderColor: 'var(--risk-high-border)' }
                        : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', borderColor: 'var(--border)' })
                    }}>{row.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {row.risk_score > 0 ? (
                      <span className={riskClass[scoreToRisk(row.risk_score)]}>
                        {scoreToRisk(row.risk_score)} ({row.risk_score}/100)
                      </span>
                    ) : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>Open Analysis →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upcoming Obligations & Notice Windows Widget */}
      {!loading && !isNewAccount && (
        <div className="card" style={{ borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={16} color="var(--accent)" /> Upcoming Contract Obligations & Deadlines
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Auto-extracted notice windows, renewal dates, and payment schedules</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{deadlines.length} Active Deadlines</span>
          </div>

          {deadlines.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '16px 0', textAlign: 'center' }}>
              No critical renewal or notice deadlines extracted yet. Analyze a contract to extract key obligations automatically.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {deadlines.map((d, idx) => (
                <div key={idx} style={{ background: 'var(--bg-subtle)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                      {d.obligation_type || 'Notice'}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--risk-high-text)' }}>
                      {d.days_remaining !== undefined ? `${d.days_remaining} days left` : d.deadline_date}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{d.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>{d.summary}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

};
