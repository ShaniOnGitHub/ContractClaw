import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Bell } from 'lucide-react';

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="top-header" style={{ justifyContent: 'flex-end' }}>
      {/* Right: theme toggle & notifications */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
          onClick={() => navigate('/history')}
          title="Open activity feed"
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
