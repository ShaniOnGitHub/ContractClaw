import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, AlertTriangle, Clock, CheckCircle2, ArrowRight, UploadCloud, GitCompare, ShieldCheck } from 'lucide-react';

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '28px 32px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 28 },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 },
  subtitle: { fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 },
  metricCard: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', boxShadow: 'var(--shadow-card)' },
  metricLabel: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '.05em', color: 'var(--text-muted)', marginBottom: 10 },
  metricValue: { fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 },
  metricNote: { fontSize: 11, fontWeight: 600, marginTop: 8 },
  quickGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  table: { width: '100%', borderCollapse: 'collapse' as const },
};

const recentActivity = [
  { id: '1', filename: 'sample_nda.pdf',             type: 'NDA',               risk: 'Low',    score: 25, date: '2026-08-03' },
  { id: '2', filename: 'sample_employment.pdf',       type: 'Employment',        risk: 'Medium', score: 55, date: '2026-08-03' },
  { id: '3', filename: 'sample_service_agreement.pdf',type: 'Service Agreement', risk: 'High',   score: 85, date: '2026-08-02' },
  { id: '4', filename: 'vendor_msa_v2.pdf',           type: 'MSA',               risk: 'High',   score: 90, date: '2026-08-01' },
];

const riskClass: Record<string, string> = {
  Low:    'badge-risk-low',
  Medium: 'badge-risk-med',
  High:   'badge-risk-high',
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      {/* Header row */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Contract Intelligence Dashboard</h1>
          <p style={styles.subtitle}>Real-time overview of parsed legal contracts, risk scores, and retriever benchmarks.</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/upload')}>
          <UploadCloud size={14} /> Upload Contract
        </button>
      </div>

      {/* Metrics */}
      <div style={styles.metricsGrid}>
        {[
          { label: 'Total Analyzed',       icon: <FileText size={14} color="var(--accent)" />, value: '128', note: '↑ +12% this month',    noteColor: 'var(--accent)' },
          { label: 'High Risk Contracts',  icon: <AlertTriangle size={14} color="var(--risk-high-text)" />, value: '14', note: 'Action required: 3',  noteColor: 'var(--risk-high-text)' },
          { label: 'Pending Review',       icon: <Clock size={14} color="var(--risk-med-text)" />, value: '3',   note: 'Queued for review',    noteColor: 'var(--text-muted)' },
          { label: 'Avg Turnaround',       icon: <CheckCircle2 size={14} color="var(--risk-low-text)" />, value: '1.2s', note: 'Vector indexing',    noteColor: 'var(--risk-low-text)' },
        ].map(m => (
          <div key={m.label} style={styles.metricCard}>
            <div style={styles.metricLabel}><span>{m.label}</span>{m.icon}</div>
            <div style={styles.metricValue}>{m.value}</div>
            <div style={{ ...styles.metricNote, color: m.noteColor }}>{m.note}</div>
          </div>
        ))}
      </div>

      {/* Quick Launch */}
      <div style={styles.quickGrid}>
        <div
          onClick={() => navigate('/analysis')}
          style={{ background: 'var(--accent)', borderRadius: 12, padding: '24px', cursor: 'pointer', boxShadow: 'var(--shadow-md)', transition: 'opacity .15s' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '.9')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,.75)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
            <ShieldCheck size={14} /> Clause Analysis
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Interactive Contract Risk Reviewer</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', marginBottom: 18 }}>Color-coded risk clauses with dual-pane document view and metadata filters.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#fff' }}>Launch Analysis <ArrowRight size={13} /></div>
        </div>

        <div
          onClick={() => navigate('/compare')}
          className="card"
          style={{ borderRadius: 12, padding: '24px', cursor: 'pointer', transition: 'border-color .15s' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
            <GitCompare size={14} /> Benchmark Lab
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Compare Retriever Modes</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 18 }}>Run Cosine Similarity vs MMR Diversity side-by-side to inspect retrieval differences.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>Open Benchmark Lab <ArrowRight size={13} /></div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="card" style={{ borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Recent Contract Audits</div>
          <button onClick={() => navigate('/contracts')} style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer' }}>
            View All →
          </button>
        </div>
        <table style={styles.table}>
          <thead>
            <tr style={{ background: 'var(--bg-subtle)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>
              {['Contract Name', 'Type', 'Risk', 'Score', 'Date', ''].map(h => (
                <th key={h} style={{ padding: '10px 18px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentActivity.map(row => (
              <tr key={row.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  <FileText size={14} color="var(--accent)" />{row.filename}
                </td>
                <td style={{ padding: '13px 18px', fontSize: 12, color: 'var(--text-secondary)' }}>{row.type}</td>
                <td style={{ padding: '13px 18px' }}><span className={riskClass[row.risk]}>{row.risk}</span></td>
                <td style={{ padding: '13px 18px', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{row.score}/100</td>
                <td style={{ padding: '13px 18px', fontSize: 12, color: 'var(--text-muted)' }}>{row.date}</td>
                <td style={{ padding: '13px 18px', textAlign: 'right' }}>
                  <button onClick={() => navigate('/analysis')} style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer' }}>Analyze →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
