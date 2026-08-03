import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Settings, Moon, Sun, Key } from 'lucide-react';

const section: React.CSSProperties = {
  background: 'var(--bg-surface)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14,
  boxShadow: 'var(--shadow-card)'
};

const sectionTitle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)'
};

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={{ padding: '28px 32px', maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 20, height: '100%', overflowY: 'auto' }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Settings</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Manage appearance, API credentials, and preferences.</p>
      </div>

      {/* Appearance */}
      <div style={section}>
        <div style={sectionTitle}><Settings size={15} color="var(--accent)" /> Interface Appearance</div>
        <hr className="divider" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Dark Mode</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Toggle dark / light background tokens</div>
          </div>
          <button onClick={toggleTheme} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            {theme === 'light' ? 'Enable Dark Mode' : 'Enable Light Mode'}
          </button>
        </div>
      </div>

      {/* API Credentials */}
      <div style={section}>
        <div style={sectionTitle}><Key size={15} color="var(--accent)" /> LLM API Credentials</div>
        <hr className="divider" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[{ label: 'OpenAI API Key', placeholder: 'sk-proj-…' }, { label: 'GroqCloud API Key', placeholder: 'gsk_…' }].map(({ label, placeholder }) => (
            <div key={label}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>{label}</label>
              <input type="password" placeholder={placeholder} className="input" style={{ fontFamily: 'monospace', fontSize: 13 }} />
            </div>
          ))}
          <button className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: 4 }}>Save Credentials</button>
        </div>
      </div>
    </div>
  );
};
