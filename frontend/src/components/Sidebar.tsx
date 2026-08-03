import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  UploadCloud, 
  History, 
  GitCompare, 
  Settings, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Search,
  UserCheck
} from 'lucide-react';

interface SidebarProps {
  userRole?: 'admin' | 'reviewer' | 'viewer';
}

export const Sidebar: React.FC<SidebarProps> = ({ userRole = 'admin' }) => {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/contracts', label: 'Contracts List', icon: FileText },
    { path: '/upload', label: 'Upload Contract', icon: UploadCloud },
    { path: '/analysis', label: 'Clause Analysis', icon: Search },
    { path: '/history', label: 'Contract History', icon: History },
    { path: '/compare', label: 'Version Diffing', icon: GitCompare },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className={`sidebar-shell ${collapsed ? 'collapsed' : 'expanded'}`}>
      <div>
        {/* Workspace Brand Header */}
        <div className="flex items-center justify-between pb-6 mb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0 font-bold shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white leading-tight">ContractClaw</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Enterprise AI</div>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Section */}
      <div>
        {/* Credit Meter Card (Only visible when expanded) */}
        {!collapsed && (
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 mb-4">
            <div className="text-xs font-semibold text-slate-900 dark:text-white mb-1">
              Credits Remaining
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mb-2">
              <div className="bg-teal-600 h-full w-[15%]" />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>15/100 used</span>
              <button className="text-teal-600 dark:text-teal-400 font-semibold hover:underline flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Upgrade
              </button>
            </div>
          </div>
        )}

        {/* User Profile & Role Badge */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
              JG
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">James Garcia</div>
                <div className="text-[10px] text-teal-700 dark:text-teal-400 uppercase font-semibold flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> {userRole}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
