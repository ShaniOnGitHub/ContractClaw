import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import type { RetrievedDocument } from '../services/api';

interface CitationCardProps {
  index: number;
  doc: RetrievedDocument;
  retrieverName: string;
}

export const CitationCard: React.FC<CitationCardProps> = ({ index, doc, retrieverName }) => {
  const [expanded, setExpanded] = useState(index === 1);
  const metadata = doc.metadata || {};
  const filename = metadata.filename || 'Contract.pdf';
  const contractType = metadata.contract_type || 'Legal Document';
  const chunkId = metadata.chunk_id ?? metadata.parent_chunk_index ?? index;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow mb-4">
      <div 
        onClick={() => setExpanded(!expanded)} 
        className="flex items-center justify-between cursor-pointer py-1"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-6 h-6 rounded-full bg-teal-50 text-teal-700 text-xs font-bold flex items-center justify-center border border-teal-200">
            #{index}
          </span>
          <span className="font-semibold text-sm text-slate-800">
            Chunk ID: {chunkId}
          </span>
          {doc.score !== undefined && (
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-mono font-medium">
              Score: {doc.score.toFixed(4)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">{doc.content.length} chars</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3 flex-wrap">
            <span className="flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              <FileText className="w-3.5 h-3.5 text-teal-600" /> {filename}
            </span>
            <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
              <Tag className="w-3.5 h-3.5 text-slate-400" /> {contractType}
            </span>
            <span className="text-teal-700 font-semibold bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
              Retrieved via {retrieverName}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
            {doc.content}
          </div>
        </div>
      )}
    </div>
  );
};
