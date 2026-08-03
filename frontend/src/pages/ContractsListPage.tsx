import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Filter, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export const ContractsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const allContracts = [
    { id: '1', filename: 'sample_nda.pdf', type: 'NDA', risk: 'Low', score: 25, date: '2026-08-03' },
    { id: '2', filename: 'sample_employment.pdf', type: 'Employment', risk: 'Medium', score: 55, date: '2026-08-03' },
    { id: '3', filename: 'sample_service_agreement.pdf', type: 'Service Agreement', risk: 'High', score: 85, date: '2026-08-02' },
    { id: '4', filename: 'vendor_msa_v2.pdf', type: 'MSA', risk: 'High', score: 90, date: '2026-08-01' },
    { id: '5', filename: 'cloud_sla_2026.pdf', type: 'Service Agreement', risk: 'Low', score: 15, date: '2026-07-28' },
    { id: '6', filename: 'contractor_nda_john.pdf', type: 'NDA', risk: 'Medium', score: 45, date: '2026-07-25' },
    { id: '7', filename: 'executive_offer_letter.pdf', type: 'Employment', risk: 'Low', score: 30, date: '2026-07-20' },
  ];

  const filteredContracts = allContracts.filter(item => {
    const matchesSearch = item.filename.toLowerCase().includes(searchTerm.toLowerCase()) || item.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === 'ALL' || item.risk.toUpperCase() === riskFilter;
    return matchesSearch && matchesRisk;
  });

  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);
  const paginatedContracts = filteredContracts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-8 max-w-6xl mx-auto h-full overflow-y-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Contracts Directory</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse, search, and filter all parsed legal contracts.
          </p>
        </div>
      </div>

      {/* Filter and Search Control Bar per Functional Fix #2 */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search contracts by name or type..."
            className="w-full bg-slate-50 dark:bg-slate-900 text-xs rounded-xl pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 outline-none focus:border-teal-500 text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Filter className="w-3.5 h-3.5" /> Risk Level:
          </div>
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(level => (
            <button
              key={level}
              onClick={() => { setRiskFilter(level); setCurrentPage(1); }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                riskFilter === level 
                  ? 'bg-teal-600 text-white border-teal-600' 
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 text-[11px] font-bold text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
              <th className="py-3.5 px-6">Contract Name</th>
              <th className="py-3.5 px-6">Document Type</th>
              <th className="py-3.5 px-6">Risk Rating</th>
              <th className="py-3.5 px-6">Risk Score</th>
              <th className="py-3.5 px-6">Date Added</th>
              <th className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
            {paginatedContracts.map((row) => (
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
                <td className="py-4 px-6 text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {row.date}
                </td>
                <td className="py-4 px-6 text-right">
                  <button 
                    onClick={() => navigate('/analysis')}
                    className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    Analyze
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination Bar per Functional Fix #10 */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
          <span>Showing page {currentPage} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="p-1.5 rounded bg-slate-100 dark:bg-slate-700 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="p-1.5 rounded bg-slate-100 dark:bg-slate-700 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
