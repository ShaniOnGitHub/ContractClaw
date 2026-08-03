import React from 'react';
import type { CompareResponse } from '../services/api';
import { CitationCard } from './CitationCard';
import { GitCompare } from 'lucide-react';

interface ComparisonLabProps {
  data: CompareResponse | null;
  modeA: string;
  setModeA: (m: string) => void;
  modeB: string;
  setModeB: (m: string) => void;
  isLoading: boolean;
}

export const ComparisonLab: React.FC<ComparisonLabProps> = ({
  data,
  modeA,
  setModeA,
  modeB,
  setModeB,
  isLoading
}) => {
  const retrieverOptions = [
    'Similarity Search',
    'MMR (Diversity Mode)',
    'Multi-Query Retriever',
    'Self-Query Retriever',
    'Parent Document Retriever'
  ];

  return (
    <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-4">
        <GitCompare className="w-5 h-5 text-teal-600" />
        <h3 className="text-base font-bold text-slate-800">
          Comparative Retriever Benchmark Laboratory
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
            Mode A:
          </label>
          <select
            value={modeA}
            onChange={(e) => setModeA(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-800 text-sm font-semibold rounded-lg p-2.5 outline-none focus:border-teal-600"
          >
            {retrieverOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
            Mode B:
          </label>
          <select
            value={modeB}
            onChange={(e) => setModeB(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-800 text-sm font-semibold rounded-lg p-2.5 outline-none focus:border-teal-600"
          >
            {retrieverOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-8 text-slate-500 text-sm animate-pulse">
          Executing dual-mode vector search benchmark...
        </div>
      )}

      {data && !isLoading && (
        <div className="grid grid-cols-2 gap-6">
          {/* Column A */}
          <div>
            <div className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 mb-3">
              🔵 {data.mode_a.name} ({data.mode_a.results.length} Results)
            </div>
            {data.mode_a.results.map((doc, idx) => (
              <CitationCard
                key={idx}
                index={idx + 1}
                doc={doc}
                retrieverName={data.mode_a.name}
              />
            ))}
          </div>

          {/* Column B */}
          <div>
            <div className="text-xs font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 mb-3">
              🟢 {data.mode_b.name} ({data.mode_b.results.length} Results)
            </div>
            {data.mode_b.results.map((doc, idx) => (
              <CitationCard
                key={idx}
                index={idx + 1}
                doc={doc}
                retrieverName={data.mode_b.name}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
