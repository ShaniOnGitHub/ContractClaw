import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Settings, Moon, Sun, User, ShieldAlert, Trash2, Loader2 } from 'lucide-react';
import { getMe, deleteAccount } from '../services/api';
import type { UserProfile } from '../services/api';

const section: React.CSSProperties = {
  background: 'var(--bg-surface)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14,
  boxShadow: 'var(--shadow-card)',
};

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    getMe().then(setUser).catch(console.error);
  }, []);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      localStorage.removeItem('contractclaw_token');
      localStorage.removeItem('contractclaw_user');
      navigate('/login');
    } catch (err: any) {
      alert('Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 20, height: '100%', overflowY: 'auto' }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Settings</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          Manage your profile, theme appearance, and data privacy options.
        </p>
      </div>

      {/* Account Profile */}
      <div style={section}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
          <User size={15} color="var(--accent)" /> Account Profile
        </div>
        <hr className="divider" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>Email Address:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{user?.email || '—'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>Account Tier:</span>
            <span style={{ fontWeight: 600, color: 'var(--accent)', textTransform: 'capitalize' }}>{user?.tier || 'Free'} Tier</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>Credits Remaining:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{user?.credits_remaining ?? 15} / 15</strong>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div style={section}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
          <Settings size={15} color="var(--accent)" /> Interface Appearance
        </div>
        <hr className="divider" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Theme Mode</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Toggle between dark and light themes</div>
          </div>
          <button onClick={toggleTheme} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            {theme === 'light' ? 'Enable Dark Mode' : 'Enable Light Mode'}
          </button>
        </div>
      </div>

      {/* Privacy & Account Deletion */}
      <div style={{ ...section, borderColor: confirmDelete ? 'var(--risk-high-border)' : 'var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--risk-high-text)' }}>
          <ShieldAlert size={15} /> Privacy &amp; Data Control
        </div>
        <hr className="divider" />
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          In accordance with data privacy guidelines, you can permanently delete your account and all associated contract uploads and risk analyses.
        </div>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              alignSelf: 'flex-start', background: 'var(--bg-subtle)', border: '1px solid var(--risk-high-border)',
              color: 'var(--risk-high-text)', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s'
            }}
          >
            <Trash2 size={13} /> Delete Account &amp; All Data
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--risk-high-bg)', border: '1px solid var(--risk-high-border)', borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--risk-high-text)' }}>
              Are you sure? This action cannot be undone. All your uploaded contracts and audit analyses will be permanently deleted.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{
                  background: 'var(--risk-high-text)', color: '#fff', border: 'none',
                  borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 700,
                  cursor: deleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                {deleting && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
                Yes, Delete My Account
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="btn-ghost"
                style={{ fontSize: 12 }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
