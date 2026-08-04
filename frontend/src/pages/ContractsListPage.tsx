import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Filter, ChevronLeft, ChevronRight, Loader2, UploadCloud, ArrowUpDown } from 'lucide-react';
import { listContracts } from '../services/api';
import type { Contract } from '../services/api';

const riskClass: Record<string, string> = { Low: 'badge-risk-low', Medium: 'badge-risk-med', High: 'badge-risk-high' };
const scoreToRisk = (s: number) => s >= 70 ? 'High' : s >= 40 ? 'Medium' : 'Low';
const ITEMS_PER_PAGE = 10;

export const ContractsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'risk' | 'name'>('date');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    listContracts()
      .then(r => setContracts(r.contracts))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = contracts
    .filter(c => {
      const q = searchTerm.toLowerCase();
      const matchSearch = c.filename.toLowerCase().includes(q) || c.contract_type.toLowerCase().includes(q) || c.parties.toLowerCase().includes(q);
      const matchRisk = riskFilter === 'ALL' || scoreToRisk(c.risk_score).toUpperCase() === riskFilter;
      return matchSearch && matchRisk;
    })
    .sort((a, b) => {
      if (sortBy === 'risk') return b.risk_score - a.risk_score;
      if (sortBy === 'name') return a.filename.localeCompare(b.filename);
      return new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime();
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const page = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const filterBtn = (level: string): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 7, border: '1px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .12s',
    ...(riskFilter === level
      ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
      : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)', borderColor: 'var(--border)' })
  });

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 22, height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Contracts</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Full contract library. Click any row to view clause risk analysis.
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/upload')}>
          <UploadCloud size={14} /> Upload Contract
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="card" style={{ borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input type="text" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} placeholder="Search contracts by name, type, or parties…" className="input" style={{ paddingLeft: 32 }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
          <Filter size={13} /> Risk Level:
        </div>
        {['ALL','HIGH','MEDIUM','LOW'].map(l => (
          <button key={l} style={filterBtn(l)} onClick={() => { setRiskFilter(l); setCurrentPage(1); }}>{l}</button>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginLeft: 'auto' }}>
          <ArrowUpDown size={13} /> Sort:
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 7, padding: '4px 8px', fontSize: 12, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
          >
            <option value="date">Upload Date (Recent First)</option>
            <option value="risk">Risk Score (Highest First)</option>
            <option value="name">Filename (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ borderRadius: 10, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13, padding: 40 }}>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading contract library…
          </div>
        )}
        {!loading && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>
                {['Contract Name', 'Type', 'Parties', 'Status', 'Risk Score', 'Upload Date', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {page.map((c, i) => (
                <tr key={c.id}
                  onClick={() => navigate(`/analysis/${c.id}`)}
                  style={{ borderBottom: i < page.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background .1s', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                    <FileText size={13} color="var(--accent)" />{c.filename}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{c.contract_type}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.parties || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, border: '1px solid',
                      ...(c.status === 'indexed'
                        ? { background: 'var(--risk-low-bg)', color: 'var(--risk-low-text)', borderColor: 'var(--risk-low-border)' }
                        : c.status === 'error'
                        ? { background: 'var(--risk-high-bg)', color: 'var(--risk-high-text)', borderColor: 'var(--risk-high-border)' }
                        : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', borderColor: 'var(--border)' })
                    }}>{c.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {c.risk_score > 0 ? (
                      <span className={riskClass[scoreToRisk(c.risk_score)]}>
                        {scoreToRisk(c.risk_score)} ({c.risk_score}/100)
                      </span>
                    ) : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                    {new Date(c.upload_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>Open Analysis →</span>
                  </td>
                </tr>
              ))}
              {page.length === 0 && !loading && (
                <tr><td colSpan={7} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  {contracts.length === 0 ? 'No contracts yet — click "Upload Contract" to add your first contract.' : 'No contracts match your search or filters.'}
                </td></tr>
              )}
            </tbody>
          </table>
        )}
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 'auto' }}>
          <span>Page {currentPage} of {totalPages} · {filtered.length} contracts</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ dir: -1, icon: <ChevronLeft size={14} />, disabled: currentPage === 1 }, { dir: 1, icon: <ChevronRight size={14} />, disabled: currentPage === totalPages }].map(({ dir, icon, disabled }) => (
              <button key={dir} disabled={disabled} onClick={() => setCurrentPage(p => p + dir)}
                style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
