import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, UploadCloud, Search,
  History, GitCompare, Settings, ShieldCheck,
  ChevronLeft, ChevronRight, Sparkles, UserCheck
} from 'lucide-react';

interface SidebarProps { userRole?: 'admin' | 'reviewer' | 'viewer'; }

export const Sidebar: React.FC<SidebarProps> = ({ userRole = 'admin' }) => {
  const [collapsed, setCollapsed] = useState(false);

  const nav = [
    { to: '/dashboard', label: 'Dashboard',        icon: LayoutDashboard },
    { to: '/contracts', label: 'Contracts',         icon: FileText },
    { to: '/upload',    label: 'Upload',            icon: UploadCloud },
    { to: '/analysis',  label: 'Clause Analysis',   icon: Search },
    { to: '/history',   label: 'History',           icon: History },
    { to: '/compare',   label: 'Version Diff',      icon: GitCompare },
    { to: '/settings',  label: 'Settings',          icon: Settings },
  ];

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
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Enterprise AI</div>
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
          <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} title={collapsed ? label : undefined}>
            <Icon size={16} style={{ flexShrink: 0 }} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
        {!collapsed && (
          <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Credits remaining</div>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 999, overflow: 'hidden', margin: '6px 0' }}>
              <div style={{ width: '15%', height: '100%', background: 'var(--accent)', borderRadius: 999 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
              <span>15 / 100</span>
              <button onClick={() => {}} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Sparkles size={11} /> Upgrade
              </button>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>JG</div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>James Garcia</div>
              <div style={{ fontSize: 10, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <UserCheck size={10} /> {userRole}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
