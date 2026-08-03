import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Bell, Search, FileText, Zap } from 'lucide-react';

interface HeaderProps {
  activeSample?: string;
  activeMode?: string;
}

export const Header: React.FC<HeaderProps> = ({ activeSample = 'sample_nda.pdf', activeMode = 'Similarity Search' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="top-header">
      {/* Left: search + active context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search contracts, clauses, risks…"
            className="input"
            style={{ width: 280, paddingLeft: 32 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
          <FileText size={13} color="var(--accent)" />{activeSample}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--accent-bg)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
          <Zap size={12} />{activeMode}
        </div>
      </div>

      {/* Right: actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background .12s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
        >
          {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
        </button>

        <button
          style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', transition: 'background .12s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
        >
          <Bell size={15} />
          <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--risk-high-text)', border: '1.5px solid var(--bg-surface)' }} />
        </button>
      </div>
    </header>
  );
};
