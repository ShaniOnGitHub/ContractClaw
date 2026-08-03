import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Sparkles, 
  Flag, 
  MessageSquare, 
  Search, 
  Zap, 
  Filter, 
  Layers, 
  RefreshCw, 
  Download,
  AlertTriangle
} from 'lucide-react';
import { queryRetriever, selectSample } from '../services/api';
import type { QueryResponse } from '../services/api';

export const AnalysisPage: React.FC = () => {
  const [activeSample] = useState('sample_nda.pdf');
  const [activeMode, setActiveMode] = useState('Similarity Search');
  const [queryText, setQueryText] = useState('What are the termination clauses, liability caps, and payment obligations?');
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [flaggedClauses, setFlaggedClauses] = useState<Record<number, boolean>>({});
  const [clauseComments, setClauseComments] = useState<Record<number, string>>({});

  useEffect(() => {
    runAnalysis();
  }, [activeMode]);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      await selectSample(activeSample);
      const res = await queryRetriever(queryText, activeMode);
      setResponse(res);
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = (index: number) => {
    setFlaggedClauses(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleCommentChange = (index: number, text: string) => {
    setClauseComments(prev => ({ ...prev, [index]: text }));
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Top Controls Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold text-xs px-3 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> {activeSample}
          </div>
          <span className="text-xs text-slate-400">|</span>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Strategy: {activeMode}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Re-analyze button per Functional Fix #3 */}
          <button 
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Re-Analyze Contract
          </button>

          {/* Export Report per Functional Fix #5 */}
          <button className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
            <Download className="w-3.5 h-3.5" />
            Export Report (PDF)
          </button>
        </div>
      </div>

      {/* Dual-Pane Analysis Splitter per Design Direction #4 */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden divide-x divide-slate-200 dark:divide-slate-700">
        
        {/* Left Pane: Original Document Viewer with Color-Coded Risk Highlights */}
        <div className="p-6 overflow-y-auto bg-slate-50 dark:bg-slate-900/60 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Original Document (Risk Highlighted View)
            </h3>
            <div className="flex items-center gap-2 text-[11px] font-semibold">
              <span className="badge-risk-high">High Risk</span>
              <span className="badge-risk-med">Med Risk</span>
              <span className="badge-risk-low">Low Risk</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm text-xs leading-relaxed space-y-4 font-sans text-slate-800 dark:text-slate-200">
            <div className="font-bold text-base border-b border-slate-100 dark:border-slate-700 pb-2 text-slate-900 dark:text-white">
              MUTUAL NON-DISCLOSURE AGREEMENT
            </div>

            <p>
              This Mutual Non-Disclosure Agreement ("Agreement") is entered into by and between 
              <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold px-1 rounded mx-1">
                Apex Innovations Inc. & Beta Technologies LLC
              </span>
              effective as of August 15, 2025.
            </p>

            <div className="p-3 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 rounded-r-lg space-y-1">
              <div className="font-bold text-red-900 dark:text-red-300 text-xs flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> High Risk Clause - Unilateral Termination
              </div>
              <p className="text-red-800 dark:text-red-200">
                "Either party may terminate this Agreement immediately upon written notice without penalty..."
              </p>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 rounded-r-lg space-y-1">
              <div className="font-bold text-amber-900 dark:text-amber-300 text-xs">
                Medium Risk Clause - Indemnification Cap
              </div>
              <p className="text-amber-800 dark:text-amber-200">
                "Liability cap under this Agreement shall not exceed total fees paid in preceding six (6) months..."
              </p>
            </div>

            <p>
              Confidential Information refers to proprietary information, technical data, trade secrets, and software code...
            </p>
          </div>
        </div>

        {/* Right Pane: Clause Extractor, Summary, & Expandable Cards */}
        <div className="p-6 overflow-y-auto bg-white dark:bg-slate-800 space-y-6">
          {/* Risk Score Summary Card */}
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase">Overall Legal Risk Index</div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">25 / 100</div>
              <div className="text-xs text-emerald-600 font-semibold mt-1">Low Risk Contract</div>
            </div>
            <div className="w-14 h-14 rounded-full border-4 border-emerald-500 text-emerald-600 font-bold text-base flex items-center justify-center">
              25%
            </div>
          </div>

          {/* Retriever Strategy Selection Bar */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'Similarity Search', icon: Search },
              { id: 'MMR (Diversity Mode)', icon: Zap },
              { id: 'Multi-Query Retriever', icon: Sparkles },
              { id: 'Self-Query Retriever', icon: Filter },
              { id: 'Parent Document Retriever', icon: Layers }
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveMode(item.id)}
                  className={`flex-1 py-2 px-2 rounded-lg transition flex items-center justify-center gap-1 ${
                    activeMode === item.id 
                      ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">{item.id.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Search Query Input Bar */}
          <div className="flex gap-2">
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Ask a question about clauses..."
              className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-teal-500"
            />
            <button
              onClick={runAnalysis}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition"
            >
              Analyze
            </button>
          </div>

          {/* Skeleton Loaders during Processing State per Design Direction #8 */}
          {loading && (
            <div className="space-y-4">
              <div className="skeleton h-24 w-full" />
              <div className="skeleton h-32 w-full" />
              <div className="skeleton h-28 w-full" />
            </div>
          )}

          {/* Extracted Clause Cards with Inline Commenting/Flagging per Functional Fix #6 */}
          {!loading && response && (
            <div className="space-y-4">
              {response.results.map((doc, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="badge-risk-low">Low Risk</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Clause #{idx + 1}
                      </span>
                    </div>

                    {/* Inline Flagging per Functional Fix #6 */}
                    <button
                      onClick={() => toggleFlag(idx)}
                      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                        flaggedClauses[idx]
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      {flaggedClauses[idx] ? 'Flagged for Legal Review' : 'Flag Clause'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                    {doc.content}
                  </p>

                  {/* Inline Commenting per Functional Fix #6 */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-1">
                      <MessageSquare className="w-3.5 h-3.5" /> Note / Legal Review Comment:
                    </div>
                    <input
                      type="text"
                      value={clauseComments[idx] || ''}
                      onChange={(e) => handleCommentChange(idx, e.target.value)}
                      placeholder="Add an internal note or review instruction..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs px-3 py-1.5 outline-none focus:border-teal-500 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
