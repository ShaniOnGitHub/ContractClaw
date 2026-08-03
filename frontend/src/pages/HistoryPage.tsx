import React, { useState } from 'react';
import { History, Search } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const historyLogs = [
    { id: '1', filename: 'sample_nda.pdf', action: 'Cosine Similarity Query', user: 'James Garcia', risk: 'Low', time: '10 mins ago' },
    { id: '2', filename: 'sample_employment.pdf', action: 'MMR Diversity Search (λ=0.5)', user: 'James Garcia', risk: 'Medium', time: '1 hour ago' },
    { id: '3', filename: 'sample_service_agreement.pdf', action: 'Self-Query Metadata Filter (contract_type==NDA)', user: 'James Garcia', risk: 'High', time: '3 hours ago' },
    { id: '4', filename: 'vendor_msa_v2.pdf', action: 'Multi-Query AI Expansion', user: 'Admin User', risk: 'High', time: '1 day ago' },
  ];

  const filteredLogs = historyLogs.filter(l => 
    l.filename.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.action.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto h-full overflow-y-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Contract Audit History</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Historical record of all contract analysis executions, user queries, and risk flags.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search audit logs..."
            className="w-full bg-slate-50 dark:bg-slate-900 text-xs rounded-xl pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 outline-none text-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      {/* History Timeline Cards */}
      <div className="space-y-3">
        {filteredLogs.map((log) => (
          <div key={log.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-200 dark:border-teal-800">
                <History className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{log.filename}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{log.action}</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className={log.risk === 'High' ? 'badge-risk-high' : log.risk === 'Medium' ? 'badge-risk-med' : 'badge-risk-low'}>
                {log.risk}
              </span>
              <div className="text-right text-xs text-slate-400">
                <div>{log.user}</div>
                <div>{log.time}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
