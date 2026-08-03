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
      {/* Search Input Bar */}
      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search contracts, clauses, or risks..."
            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded-lg pl-9 pr-4 py-2 border border-transparent focus:border-teal-500 outline-none transition"
          />
        </div>

        <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
          <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>{activeSample}</span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-teal-200 dark:border-teal-800">
          <Zap className="w-3 h-3" />
          <span>{activeMode}</span>
        </div>
      </div>

      {/* Header Actions: Theme & Notifications */}
      <div className="flex items-center gap-3">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Notifications Icon */}
        <button className="relative p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
        </button>
      </div>
    </header>
  );
};
