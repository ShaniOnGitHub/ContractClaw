import React, { useState } from 'react';
import { FileText } from 'lucide-react';

const selectStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg-subtle)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 600,
  color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit', cursor: 'pointer'
};

export const ComparePage: React.FC = () => {
  const [versionA, setVersionA] = useState('sample_service_agreement_v1.pdf');
  const [versionB, setVersionB] = useState('sample_service_agreement_v2.pdf');

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 22, height: '100%', overflowY: 'auto' }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Version Diff &amp; Comparison</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Compare two contract versions side-by-side to surface clause changes and risk escalation.</p>
      </div>

      {/* Selector */}
      <div className="card" style={{ borderRadius: 10, padding: '18px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', marginBottom: 6 }}>Base Version (A)</label>
          <select value={versionA} onChange={e => setVersionA(e.target.value)} style={selectStyle}>
            <option value="sample_service_agreement_v1.pdf">sample_service_agreement_v1.pdf (Original)</option>
            <option value="sample_nda_v1.pdf">sample_nda_v1.pdf</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', marginBottom: 6 }}>Revised Version (B)</label>
          <select value={versionB} onChange={e => setVersionB(e.target.value)} style={selectStyle}>
            <option value="sample_service_agreement_v2.pdf">sample_service_agreement_v2.pdf (Revised)</option>
            <option value="sample_nda_v2.pdf">sample_nda_v2.pdf</option>
          </select>
        </div>
      </div>

      {/* Side-by-side diff */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Version A */}
        <div className="card" style={{ borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
              <FileText size={14} color="var(--accent)" />{versionA}
            </div>
            <span className="badge-risk-med">55/100</span>
          </div>
          <p style={{ background: 'var(--risk-high-bg)', borderLeft: '2px solid var(--risk-high-text)', borderRadius: '0 6px 6px 0', padding: '8px 12px', fontSize: 12, lineHeight: 1.6, color: 'var(--risk-high-text)' }}>
            <strong>Removed in v2:</strong> "Client shall pay invoices within thirty (30) days of receipt."
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            "Either party may terminate this Agreement upon 30 days written notice…"
          </p>
        </div>

        {/* Version B */}
        <div className="card" style={{ borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
              <FileText size={14} color="var(--accent)" />{versionB}
            </div>
            <span className="badge-risk-high">85/100</span>
          </div>
          <p style={{ background: 'var(--risk-low-bg)', borderLeft: '2px solid var(--risk-low-text)', borderRadius: '0 6px 6px 0', padding: '8px 12px', fontSize: 12, lineHeight: 1.6, color: 'var(--risk-low-text)' }}>
            <strong>Added in v2:</strong> "Client shall pay invoices within fifteen (15) calendar days. Late payments accrue interest at 2.5% per month."
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            "Either party may terminate this Agreement immediately upon written notice…"
          </p>
        </div>
      </div>
    </div>
  );
};
