import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Settings, UserCheck,
  ShieldCheck, LogOut, BookOpen, Columns3, Sun, Moon, Bell
} from 'lucide-react';
import { getCredits, getMe } from '../services/api';
import type { UserProfile } from '../services/api';

export const TopNav: React.FC = () => {
  const navigate = useNavigate();
  const [credits, setCredits] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem('contractclaw_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCredits()
      .then(r => setCredits(r.credits_remaining))
      .catch(() => setCredits(null));

    getMe()
      .then(u => {
        setUser(u);
        localStorage.setItem('contractclaw_user', JSON.stringify(u));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);
    localStorage.removeItem('contractclaw_token');
    localStorage.removeItem('contractclaw_user');
    navigate('/login');
  };

  const nav = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/contracts', label: 'Contracts', icon: FileText },
    { to: '/compare', label: 'Compare', icon: Columns3 },
    { to: '/playbooks', label: 'Playbooks', icon: BookOpen },
    { to: '/settings',  label: 'Settings',  icon: Settings },
  ];

  const maxCredits = 15;
  const creditsDisplay = Math.max(0, credits ?? user?.credits_remaining ?? maxCredits);
  const pct = Math.max(0, Math.min(100, (creditsDisplay / maxCredits) * 100));
  const creditsLabel = `${creditsDisplay} / ${maxCredits}`;
  const tierLabel = `${user?.tier ? user.tier.charAt(0).toUpperCase() + user.tier.slice(1) : 'Free'} Tier`;

  const email = user?.email || 'User';
  const initial = email.charAt(0).toUpperCase();

  return (
    <nav className="top-nav">
      {/* Brand */}
      <div className="top-nav-brand" onClick={() => navigate('/dashboard')}>
        <div className="top-nav-brand-mark">
          <ShieldCheck size={17} color="#fff" />
        </div>
        <div>
          <div className="top-nav-brand-name">ContractClaw</div>
          <div className="top-nav-brand-sub">v1.0 Engine</div>
        </div>
      </div>

      {/* Pill navigation */}
      <div className="top-nav-pills">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) => `topnav-pill ${isActive ? 'active' : ''}`}
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </div>

      {/* Right: credits, history, account */}
      <div className="top-nav-right" ref={menuRef}>
        <div className="credits-chip" title={`${tierLabel} · ${creditsLabel} credits`}>
          <span>{creditsLabel}</span>
          <span className="credits-bar"><span className="credits-fill" style={{ width: `${pct}%` }} /></span>
          <span className="tier-label">{tierLabel}</span>
        </div>

        <button
          className="nav-icon-btn"
          onClick={() => navigate('/history')}
          title="Open activity feed"
        >
          <Bell size={15} />
          <span style={{ position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: '50%', background: 'var(--risk-high-text)', border: '1.5px solid var(--bg-base)' }} />
        </button>

        <div style={{ position: 'relative' }}>
          <button className="account-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Account menu">
            <div className="account-avatar">{initial}</div>
            <span className="account-email" title={email}>{email}</span>
            <UserCheck size={13} color="var(--accent)" />
          </button>

          {menuOpen && (
            <div className="account-dropdown">
              <div style={{ padding: '6px 12px 2px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{email}</div>
                <div style={{ fontSize: 11, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <UserCheck size={11} /> Active Account
                </div>
              </div>
              <hr className="account-dropdown-divider" />
              <button className="account-dropdown-item danger" onClick={handleLogout}>
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
