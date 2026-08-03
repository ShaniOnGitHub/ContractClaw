import React, { useRef } from 'react';
import { 
  ChevronDown, 
  Folder, 
  Search, 
  Sparkles, 
  Zap, 
  Layers, 
  Filter, 
  GitCompare, 
  ShieldCheck,
  FileText,
  Upload
} from 'lucide-react';

interface SidebarProps {
  samples: string[];
  activeSample: string;
  onSelectSample: (filename: string) => void;
  activeMode: string;
  onSelectMode: (mode: string) => void;
  onFileUpload: (file: File) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  samples,
  activeSample,
  onSelectSample,
  activeMode,
  onSelectMode,
  onFileUpload
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const retrieverModes = [
    { id: 'Similarity Search', label: 'Similarity Search', icon: Search },
    { id: 'MMR (Diversity Mode)', label: 'MMR Diversity Mode', icon: Zap },
    { id: 'Multi-Query Retriever', label: 'Multi-Query Expansion', icon: Sparkles },
    { id: 'Self-Query Retriever', label: 'Self-Query Smart Filter', icon: Filter },
    { id: 'Parent Document Retriever', label: 'Parent-Doc Full Context', icon: Layers },
    { id: 'Compare Modes Lab', label: 'Compare Modes Lab', icon: GitCompare },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="sidebar">
      <div>
        {/* Workspace Dropdown Header */}
        <div className="sidebar-header">
          <div className="sidebar-header-left">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>ContractClaw Workspace</span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>

        {/* Resources Section */}
        <div className="sidebar-section-label">Resources</div>
        <div className="sidebar-item">
          <Folder className="w-4 h-4 text-gray-500" />
          <span>Contract Assets Library</span>
        </div>

        {/* Contract Projects List */}
        <div className="flex items-center justify-between px-2 mt-4 mb-2">
          <span className="sidebar-section-label !m-0">Contracts</span>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-1 hover:bg-white rounded transition text-gray-500 hover:text-gray-900"
              title="Upload Contract PDF"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".pdf" 
              className="hidden" 
            />
          </div>
        </div>

        {samples.map((filename) => (
          <div
            key={filename}
            onClick={() => onSelectSample(filename)}
            className={`sidebar-item ${activeSample === filename ? 'active' : ''}`}
          >
            <FileText className="w-4 h-4" />
            <span className="truncate">{filename}</span>
          </div>
        ))}

        {/* Retriever Strategy Labs Section */}
        <div className="sidebar-section-label mt-6">Retriever Strategies</div>
        {retrieverModes.map((mode) => {
          const Icon = mode.icon;
          return (
            <div
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              className={`sidebar-item ${activeMode === mode.id ? 'active' : ''}`}
            >
              <Icon className="w-4 h-4" />
              <span>{mode.label}</span>
            </div>
          );
        })}
      </div>

      {/* Bottom Section: Credit Card & Profile */}
      <div>
        {/* Credit Usage Meter Card */}
        <div className="credit-card">
          <div className="credit-title">You're running out of Credits</div>
          <div className="credit-sub">
            Keep your flow going. Add more credits and stay in the creative zone.
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" />
          </div>
          <div className="credit-count">15/100</div>
          <button className="btn-upgrade-plan">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Upgrade plan</span>
          </button>
        </div>

        {/* User Profile Footer */}
        <div className="user-profile">
          <div className="user-profile-left">
            <div className="avatar">JG</div>
            <div className="user-name">James Garcia (Pro)</div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>
  );
};
