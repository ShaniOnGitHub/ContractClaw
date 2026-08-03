import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  UploadCloud, 
  GitCompare, 
  ShieldCheck 
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const recentActivity = [
    { id: '1', filename: 'sample_nda.pdf', type: 'NDA', risk: 'Low', score: 25, date: '2026-08-03', status: 'Passed' },
    { id: '2', filename: 'sample_employment.pdf', type: 'Employment', risk: 'Medium', score: 55, date: '2026-08-03', status: 'Reviewed' },
    { id: '3', filename: 'sample_service_agreement.pdf', type: 'Service Agreement', risk: 'High', score: 85, date: '2026-08-02', status: 'Action Required' },
    { id: '4', filename: 'vendor_msa_v2.pdf', type: 'MSA', risk: 'High', score: 90, date: '2026-08-01', status: 'Action Required' },
  ];

  return (
    <div className="p-8 overflow-y-auto h-full space-y-8">
      {/* Top Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Contract Intelligence Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time overview of parsed legal contracts, risk scores, and LangChain retriever benchmarks.
          </p>
        </div>
        <button 
          onClick={() => navigate('/upload')}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload New Contract</span>
        </button>
      </div>

      {/* 4 Summary Metric Cards per Design Direction #2 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase mb-3">
            <span>Total Analyzed</span>
            <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">128</div>
          <div className="text-xs text-teal-600 font-semibold mt-2">↑ +12% from last month</div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase mb-3">
            <span>High Risk Contracts</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-3xl font-extrabold text-red-600 dark:text-red-400">14</div>
          <div className="text-xs text-red-500 font-semibold mt-2">Action required on 3 files</div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase mb-3">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">3</div>
          <div className="text-xs text-slate-400 mt-2">Queued for legal review</div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase mb-3">
            <span>Avg Turnaround Time</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">1.2s</div>
          <div className="text-xs text-emerald-600 font-semibold mt-2">Vector indexing instant</div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div 
          onClick={() => navigate('/analysis')}
          className="bg-gradient-to-r from-teal-700 to-teal-900 text-white rounded-2xl p-6 shadow-md cursor-pointer hover:opacity-95 transition"
        >
          <div className="flex items-center gap-2 text-teal-200 text-xs font-semibold uppercase mb-2">
            <ShieldCheck className="w-4 h-4" /> Dual-Pane Clause Analysis
          </div>
          <h3 className="text-lg font-bold mb-2">Interactive Contract Risk Reviewer</h3>
          <p className="text-xs text-teal-100 mb-4 leading-relaxed">
            Inspect raw text on the left pane and color-coded risk clauses, metadata filters, and citations on the right pane.
          </p>
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            Launch Analysis <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        <div 
          onClick={() => navigate('/compare')}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm cursor-pointer hover:border-teal-500 transition"
        >
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 text-xs font-semibold uppercase mb-2">
            <GitCompare className="w-4 h-4" /> Benchmark Laboratory
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Compare Any 2 Retriever Modes</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
            Run Cosine Similarity vs MMR Diversity Mode or Multi-Query side-by-side to visually inspect vector retrieval differences.
          </p>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-600 dark:text-teal-400">
            Open Benchmark Lab <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Recent Activity Table per Design Direction #2 */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Contract Audits</h3>
          <button 
            onClick={() => navigate('/contracts')}
            className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
          >
            View All Contracts
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-[11px] font-bold text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
                <th className="py-3.5 px-6">Contract Name</th>
                <th className="py-3.5 px-6">Type</th>
                <th className="py-3.5 px-6">Risk Level</th>
                <th className="py-3.5 px-6">Risk Score</th>
                <th className="py-3.5 px-6">Date</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
              {recentActivity.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                  <td className="py-4 px-6 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-600" /> {row.filename}
                  </td>
                  <td className="py-4 px-6 text-slate-500 dark:text-slate-400 text-xs font-medium">{row.type}</td>
                  <td className="py-4 px-6">
                    <span className={
                      row.risk === 'High' ? 'badge-risk-high' :
                      row.risk === 'Medium' ? 'badge-risk-med' : 'badge-risk-low'
                    }>
                      {row.risk}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-mono font-semibold text-xs text-slate-700 dark:text-slate-300">
                    {row.score}/100
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-400">{row.date}</td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => navigate('/analysis')}
                      className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                    >
                      Analyze Clause
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
