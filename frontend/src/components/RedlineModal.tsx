import React, { useState } from 'react';
import type { RedlineResponse, RedlinePosition } from '../services/api';

interface RedlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  redlineData: RedlineResponse | null;
  loading: boolean;
}

export const RedlineModal: React.FC<RedlineModalProps> = ({
  isOpen,
  onClose,
  redlineData,
  loading
}) => {
  const [activePosition, setActivePosition] = useState<'balanced' | 'buyer_friendly' | 'vendor_friendly'>('balanced');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentRedline: RedlinePosition | undefined = redlineData?.positions[activePosition];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-neutral-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              AI Redline Assistant
            </span>
            <h3 className="text-lg font-bold text-neutral-900 capitalize mt-1">
              {redlineData?.clause_type ? redlineData.clause_type.replace(/_/g, ' ') : 'Clause Redline'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors text-2xl font-light leading-none p-1"
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-neutral-600">Analyzing clause and drafting benchmark redlines...</p>
            </div>
          ) : redlineData && currentRedline ? (
            <>
              {/* Position Selector Tabs */}
              <div className="flex bg-neutral-100 p-1 rounded-xl">
                <button
                  onClick={() => setActivePosition('balanced')}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    activePosition === 'balanced'
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  ⚖️ Balanced Market
                </button>
                <button
                  onClick={() => setActivePosition('buyer_friendly')}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    activePosition === 'buyer_friendly'
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  🛡️ Buyer Protective
                </button>
                <button
                  onClick={() => setActivePosition('vendor_friendly')}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    activePosition === 'vendor_friendly'
                      ? 'bg-white text-indigo-800 shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  🏢 Vendor Protective
                </button>
              </div>

              {/* Rationale Banner */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-700 flex items-start space-x-2">
                <span className="text-base">💡</span>
                <div>
                  <span className="font-semibold text-neutral-900">Negotiation Rationale: </span>
                  {currentRedline.rationale}
                </div>
              </div>

              {/* Original vs Redline Comparison */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                    Original Contract Language
                  </label>
                  <div className="p-3.5 bg-red-50/40 rounded-xl border border-red-100 text-xs text-neutral-800 leading-relaxed font-mono">
                    {redlineData.original_text}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                    Proposed Redline Revision
                  </label>
                  <div className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-100 text-xs text-neutral-800 leading-relaxed font-mono">
                    {currentRedline.proposed_text}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center py-6 text-neutral-500 text-sm">Failed to generate redline proposal.</p>
          )}
        </div>

        {/* Footer Actions */}
        {currentRedline && (
          <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => handleCopy(currentRedline.proposed_text)}
              className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-all flex items-center space-x-1.5"
            >
              <span>{copied ? '✓ Copied to Clipboard!' : '📋 Copy Proposed Text'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
