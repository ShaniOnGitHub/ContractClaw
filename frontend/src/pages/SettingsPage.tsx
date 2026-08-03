import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Settings, Moon, Sun, Key } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="p-8 max-w-4xl mx-auto h-full overflow-y-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings & Preferences</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage application theme, API credentials, and role-based permissions.
        </p>
      </div>

      {/* Theme Settings Card per Design Direction #10 */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Settings className="w-4 h-4 text-teal-600" /> Interface Appearance
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
          <div>
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Dark Mode Theme</div>
            <div className="text-[11px] text-slate-400">Toggle dark/light background tokens</div>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-xs font-semibold px-4 py-2 rounded-xl transition text-slate-800 dark:text-slate-100"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
            {theme === 'light' ? 'Enable Dark Mode' : 'Enable Light Mode'}
          </button>
        </div>
      </div>

      {/* API Key Credentials Card */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Key className="w-4 h-4 text-teal-600" /> LLM API Credentials
        </div>
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">OpenAI API Key</label>
            <input
              type="password"
              placeholder="sk-proj-..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none font-mono text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">GroqCloud API Key</label>
            <input
              type="password"
              placeholder="gsk_..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none font-mono text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
