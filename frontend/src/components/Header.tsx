import React from 'react';
import { FileText, Sliders, Layers } from 'lucide-react';

interface HeaderProps {
  activeSample: string;
  activeMode: string;
  k: number;
  setK: (val: number) => void;
  lambdaMult: number;
  setLambdaMult: (val: number) => void;
  fullContext: boolean;
  setFullContext: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSample,
  activeMode,
  k,
  setK,
  lambdaMult,
  setLambdaMult,
  fullContext,
  setFullContext
}) => {
  return (
    <header className="main-header">
      <div className="flex items-center gap-3">
        <div className="header-tag">
          <FileText className="w-3.5 h-3.5 text-teal-600" />
          <span>{activeSample || 'No Contract Loaded'}</span>
        </div>
        <div className="bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold px-3 py-1 rounded-full">
          Mode: {activeMode}
        </div>
      </div>

      <div className="header-controls">
        <div className="control-group">
          <Sliders className="w-3.5 h-3.5" />
          <span>Top K ({k}):</span>
          <input
            type="range"
            min="1"
            max="10"
            value={k}
            onChange={(e) => setK(Number(e.target.value))}
            className="w-20 accent-teal-600 cursor-pointer"
          />
        </div>

        {activeMode.includes('MMR') && (
          <div className="control-group">
            <span>λ ({lambdaMult}):</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={lambdaMult}
              onChange={(e) => setLambdaMult(Number(e.target.value))}
              className="w-20 accent-teal-600 cursor-pointer"
            />
          </div>
        )}

        {activeMode.includes('Parent') && (
          <div className="control-group">
            <Layers className="w-3.5 h-3.5" />
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={fullContext}
                onChange={(e) => setFullContext(e.target.checked)}
                className="accent-teal-600"
              />
              <span>Full Parent Context</span>
            </label>
          </div>
        )}
      </div>
    </header>
  );
};
