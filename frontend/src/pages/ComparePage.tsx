import React, { useState } from 'react';
import { FileText } from 'lucide-react';

export const ComparePage: React.FC = () => {
  const [versionA, setVersionA] = useState('sample_service_agreement_v1.pdf');
  const [versionB, setVersionB] = useState('sample_service_agreement_v2.pdf');

  return (
    <div className="p-8 max-w-6xl mx-auto h-full overflow-y-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Contract Version Diffing & Comparison</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Compare two versions of a contract side-by-side to highlight clause additions, removals, and risk escalation.
        </p>
      </div>

      {/* Selector Bar */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
            Base Version (Version A):
          </label>
          <select
            value={versionA}
            onChange={(e) => setVersionA(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl p-3 outline-none text-slate-800 dark:text-slate-100"
          >
            <option value="sample_service_agreement_v1.pdf">sample_service_agreement_v1.pdf (Original)</option>
            <option value="sample_nda_v1.pdf">sample_nda_v1.pdf</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
            Revised Version (Version B):
          </label>
          <select
            value={versionB}
            onChange={(e) => setVersionB(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl p-3 outline-none text-slate-800 dark:text-slate-100"
          >
            <option value="sample_service_agreement_v2.pdf">sample_service_agreement_v2.pdf (Revised)</option>
            <option value="sample_nda_v2.pdf">sample_nda_v2.pdf</option>
          </select>
        </div>
      </div>

      {/* Side-by-Side Version Diff View per Functional Fix #4 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Version A */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <FileText className="w-4 h-4 text-teal-600" /> {versionA}
            </div>
            <span className="badge-risk-med">Risk Score: 55/100</span>
          </div>

          <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans space-y-3">
            <p className="bg-red-50 dark:bg-red-950/40 p-3 border-l-2 border-red-500 rounded">
              <strong className="text-red-900 dark:text-red-300">Removed in v2:</strong> "Client shall pay invoices within thirty (30) days of receipt."
            </p>
            <p>
              "Either party may terminate this Agreement upon 30 days written notice..."
            </p>
          </div>
        </div>

        {/* Version B */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <FileText className="w-4 h-4 text-teal-600" /> {versionB}
            </div>
            <span className="badge-risk-high">Risk Score: 85/100</span>
          </div>

          <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans space-y-3">
            <p className="bg-emerald-50 dark:bg-emerald-950/40 p-3 border-l-2 border-emerald-500 rounded">
              <strong className="text-emerald-900 dark:text-emerald-300">Added in v2:</strong> "Client shall pay invoices within fifteen (15) calendar days of receipt. Late payments accrue interest at 2.5% per month."
            </p>
            <p>
              "Either party may terminate this Agreement immediately upon written notice..."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
