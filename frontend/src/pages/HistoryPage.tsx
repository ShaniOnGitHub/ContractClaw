import React, { useState } from 'react';
import { History, Search } from 'lucide-react';

const historyLogs = [
  { id: '1', filename: 'sample_nda.pdf',              action: 'Cosine Similarity Query',                          user: 'James Garcia', risk: 'Low',    time: '10 mins ago' },
  { id: '2', filename: 'sample_employment.pdf',        action: 'MMR Diversity Search (λ=0.5)',                    user: 'James Garcia', risk: 'Medium', time: '1 hour ago'  },
  { id: '3', filename: 'sample_service_agreement.pdf', action: 'Self-Query Metadata Filter (contract_type==NDA)', user: 'James Garcia', risk: 'High',   time: '3 hours ago' },
  { id: '4', filename: 'vendor_msa_v2.pdf',            action: 'Multi-Query AI Expansion',                        user: 'Admin User',   risk: 'High',   time: '1 day ago'   },
];

const riskClass: Record<string, string> = { Low: 'badge-risk-low', Medium: 'badge-risk-med', High: 'badge-risk-high' };

export const HistoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = historyLogs.filter(l =>
    l.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.action.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 22, height: '100%', overflowY: 'auto' }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Audit History</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Historical record of all contract analysis executions, queries, and risk flags.</p>
      </div>

      {/* Search */}
      <div className="card" style={{ borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search audit logs…" className="input" style={{ paddingLeft: 32 }} />
        </div>
      </div>

      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(log => (
          <div key={log.id} className="card" style={{ borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--accent-bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <History size={16} color="var(--accent)" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{log.filename}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{log.action}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span className={riskClass[log.risk]}>{log.risk}</span>
              <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{log.user}</div>
                <div>{log.time}</div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--text-muted)' }}>No logs match your search.</div>
        )}
      </div>
    </div>
  );
};
