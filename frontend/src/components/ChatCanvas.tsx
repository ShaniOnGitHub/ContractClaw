import React from 'react';
import type { QueryResponse } from '../services/api';
import { CitationCard } from './CitationCard';
import { FloatingUpgradeBanner } from './FloatingUpgradeBanner';
import { Sparkles, Filter, Layers } from 'lucide-react';

interface ChatCanvasProps {
  userQuery: string;
  response: QueryResponse | null;
  isLoading: boolean;
}

export const ChatCanvas: React.FC<ChatCanvasProps> = ({ userQuery, response, isLoading }) => {
  if (!userQuery && !response) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4 border border-teal-100 shadow-sm">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Welcome to ContractClaw</h2>
        <p className="text-sm text-slate-500 max-w-md">
          Select a sample contract or upload a PDF from the sidebar, then ask any question below to test advanced LangChain retrievers!
        </p>
      </div>
    );
  }

  return (
    <div className="chat-scroll-area">
      {/* Floating Upgrade Banner matching User Reference */}
      <FloatingUpgradeBanner />

      {/* User Bubble */}
      {userQuery && (
        <div className="user-bubble-container">
          <div className="user-bubble">
            {userQuery}
          </div>
        </div>
      )}

      {/* AI Assistant Card Response */}
      {isLoading && (
        <div className="ai-response-card animate-pulse text-slate-500 text-sm">
          Executing vector store indexing and {response?.mode || 'LangChain'} retrieval...
        </div>
      )}

      {response && !isLoading && (
        <div className="ai-response-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="ai-card-title !mb-0">
              Contract Review & Retracted Clause Analysis
            </h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-semibold">
              {response.results.length} Clauses Retrieved via {response.mode}
            </span>
          </div>

          {/* Transparent Multi-Query Drawer */}
          {response.info?.type === 'multi_query' && response.info?.variations && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-xs">
              <div className="font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                AI-Generated Legal Query Perspectives (Multi-Query Expansion):
              </div>
              <ul className="list-disc list-inside space-y-1 text-amber-950 font-mono">
                {response.info.variations.map((v: string, idx: number) => (
                  <li key={idx}>{v}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Transparent Self-Query Metadata Filter Drawer */}
          {response.info?.type === 'self_query' && response.info?.filter && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-xs">
              <div className="font-bold text-blue-900 flex items-center gap-1.5 mb-2">
                <Filter className="w-4 h-4 text-blue-600" />
                Extracted Metadata Filter Rules (Self-Query Parsing):
              </div>
              <pre className="bg-white p-2 rounded border border-blue-200 text-blue-950 font-mono">
                {JSON.stringify(response.info.filter, null, 2)}
              </pre>
            </div>
          )}

          {/* Parent-Doc Architecture Badge */}
          {response.info?.type === 'parent_doc' && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4 text-xs text-indigo-900 font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Full Context Mode: {String(response.info.full_context)} (Parent 2000-char Sections)
            </div>
          )}

          {/* Retrieved Citations Cards */}
          <div>
            {response.results.map((doc, idx) => (
              <CitationCard
                key={idx}
                index={idx + 1}
                doc={doc}
                retrieverName={response.mode}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
