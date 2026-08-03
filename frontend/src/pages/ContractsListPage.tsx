import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Filter, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const allContracts = [
  { id: '1', filename: 'sample_nda.pdf',              type: 'NDA',               risk: 'Low',    score: 25, date: '2026-08-03' },
  { id: '2', filename: 'sample_employment.pdf',        type: 'Employment',        risk: 'Medium', score: 55, date: '2026-08-03' },
  { id: '3', filename: 'sample_service_agreement.pdf', type: 'Service Agreement', risk: 'High',   score: 85, date: '2026-08-02' },
  { id: '4', filename: 'vendor_msa_v2.pdf',            type: 'MSA',               risk: 'High',   score: 90, date: '2026-08-01' },
  { id: '5', filename: 'cloud_sla_2026.pdf',           type: 'Service Agreement', risk: 'Low',    score: 15, date: '2026-07-28' },
  { id: '6', filename: 'contractor_nda_john.pdf',      type: 'NDA',               risk: 'Medium', score: 45, date: '2026-07-25' },
  { id: '7', filename: 'executive_offer_letter.pdf',   type: 'Employment',        risk: 'Low',    score: 30, date: '2026-07-20' },
];

const riskClass: Record<string, string> = {
  Low: 'badge-risk-low', Medium: 'badge-risk-med', High: 'badge-risk-high'
};

const ITEMS_PER_PAGE = 5;

export const ContractsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = allContracts.filter(item => {
    const q = searchTerm.toLowerCase();
    return (item.filename.toLowerCase().includes(q) || item.type.toLowerCase().includes(q))
      && (riskFilter === 'ALL' || item.risk.toUpperCase() === riskFilter);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const page = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const filterBtn = (level: string) => ({
    padding: '5px 12px',
    borderRadius: 7,
    border: '1px solid',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all .12s',
    ...(riskFilter === level
      ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }
      : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)', borderColor: 'var(--border)' })
  } as React.CSSProperties);

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 22, height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Contracts Directory</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Browse, search and filter all parsed legal contracts.</p>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Search by name or type…"
            className="input"
            style={{ paddingLeft: 32 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
          <Filter size={13} /> Risk:
        </div>
        {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(l => (
          <button key={l} style={filterBtn(l)} onClick={() => { setRiskFilter(l); setCurrentPage(1); }}>{l}</button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ borderRadius: 10, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-subtle)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>
              {['Contract Name', 'Type', 'Risk', 'Score', 'Date Added', ''].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {page.map((row, i) => (
              <tr key={row.id} style={{ borderBottom: i < page.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                  <FileText size={14} color="var(--accent)" />{row.filename}
                </td>
                <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{row.type}</td>
                <td style={{ padding: '13px 16px' }}><span className={riskClass[row.risk]}>{row.risk}</span></td>
                <td style={{ padding: '13px 16px', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{row.score}/100</td>
                <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Calendar size={12} />{row.date}
                </td>
                <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                  <button onClick={() => navigate('/analysis')} style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer' }}>Analyze →</button>
                </td>
              </tr>
            ))}
            {page.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No contracts match your filters.</td></tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 'auto' }}>
          <span>Page {currentPage} of {totalPages} · {filtered.length} contracts</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? .4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={14} />
            </button>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? .4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
