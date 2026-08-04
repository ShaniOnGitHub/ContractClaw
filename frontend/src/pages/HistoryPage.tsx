import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, ShieldCheck } from 'lucide-react';
import { listHistory } from '../services/api';
import type { HistoryEntry } from '../services/api';

const riskClass: Record<string, string> = { Low: 'badge-risk-low', Medium: 'badge-risk-med', High: 'badge-risk-high' };
const scoreToRisk = (s: number) => s >= 70 ? 'High' : s >= 40 ? 'Medium' : 'Low';

const modeShort: Record<string, string> = {
  'Similarity Search':        'Similarity',
  'MMR (Diversity Mode)':     'MMR',
  'Multi-Query Retriever':    'Multi-Query',
  'Self-Query Retriever':     'Self-Query',
  'Parent Document Retriever':'Parent-Doc',
};

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    listHistory()
      .then(r => setHistory(r.history))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = history.filter(h =>
    (h.filename || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.retriever_mode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 22, height: '100%', overflowY: 'auto' }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Analysis History</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Full log of every GPT-4o-mini risk analysis, retriever mode used, and credits consumed.</p>
      </div>

      <div className="card" style={{ borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by filename or retriever mode…" className="input" style={{ paddingLeft: 32 }} />
        </div>
      </div>

      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading history…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-muted)' }}>
          <ShieldCheck size={36} color="var(--border)" />
          <div style={{ fontSize: 14, fontWeight: 600 }}>{history.length === 0 ? 'No analyses yet' : 'No matches'}</div>
          <div style={{ fontSize: 13 }}>{history.length === 0 ? 'Run your first risk analysis to see it here.' : 'Try a different search term.'}</div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="card" style={{ borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>
                {['Contract', 'Type', 'Risk', 'Score', 'Mode', 'Credits', 'Timestamp', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                    {row.filename || row.contract_id.slice(0, 8) + '…'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{row.contract_type || '—'}</td>
                  <td style={{ padding: '12px 16px' }}><span className={riskClass[scoreToRisk(row.overall_score)]}>{scoreToRisk(row.overall_score)}</span></td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{row.overall_score}/100</td>
                  <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--text-muted)' }}>{modeShort[row.retriever_mode] || row.retriever_mode}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>{row.credits_used}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(row.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button onClick={() => navigate(`/analysis/${row.contract_id}`)} style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer' }}>Re-run →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
