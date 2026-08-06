import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Settings, ChevronLeft, ChevronRight,
  UserCheck, ShieldCheck, LogOut, BookOpen, Columns3
} from 'lucide-react';
import { getCredits, getMe } from '../services/api';
import type { UserProfile } from '../services/api';

interface SidebarProps { userRole?: 'admin' | 'reviewer' | 'viewer'; }

export const Sidebar: React.FC<SidebarProps> = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem('contractclaw_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

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

  const handleLogout = () => {
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
  const isUnlimited = (user?.tier || '').toLowerCase() === 'creator'
    || (user?.tier || '').toLowerCase() === 'admin'
    || (user?.credits_remaining ?? credits ?? maxCredits) < 0;
  const creditsDisplay = credits ?? user?.credits_remaining ?? maxCredits;
  const pct = isUnlimited ? 100 : Math.max(0, Math.min(100, (creditsDisplay / maxCredits) * 100));
  const creditsLabel = isUnlimited ? 'Unlimited' : `${creditsDisplay} / ${maxCredits}`;
  const tierLabel = isUnlimited ? 'Creator Tier' : `${user?.tier || 'Free'} Tier`;

  const email = user?.email || 'User';
  const initial = email.charAt(0).toUpperCase();

  return (
    <aside className={`sidebar-shell ${collapsed ? 'collapsed' : 'expanded'}`} style={{ padding: '16px 10px' }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>ContractClaw</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="status-dot" />
                Live analysis suite
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={16} color="#fff" />
          </div>
        )}
        <button onClick={() => setCollapsed(c => !c)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'flex' }}>
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to} to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            title={collapsed ? label : undefined}
          >
            <Icon size={16} style={{ flexShrink: 0 }} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
        {!collapsed && (
          <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
              {isUnlimited ? 'Credits status' : 'Credits remaining'}
            </div>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 999, overflow: 'hidden', margin: '6px 0' }}>
              <div style={{
                width: `${pct}%`, height: '100%', borderRadius: 999, transition: 'width .4s ease',
                background: pct > 30 ? 'var(--accent)' : pct > 10 ? 'var(--risk-med-text)' : 'var(--risk-high-text)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
              <span>{creditsLabel}</span>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{tierLabel}</span>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {initial}
            </div>
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={email}>
                  {email}
                </div>
                <div style={{ fontSize: 10, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <UserCheck size={10} /> Active Account
                </div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={handleLogout}
              title="Sign Out"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', transition: 'color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
