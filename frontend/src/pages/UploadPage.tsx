import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { uploadPdf } from '../services/api';

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'parsing' | 'completed' | 'error';
  errorMsg?: string;
}

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState<UploadItem[]>([]);

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.name.endsWith('.pdf'));
    if (fileArray.length === 0) return;

    const newItems: UploadItem[] = fileArray.map(f => ({
      id: Math.random().toString(),
      file: f,
      progress: 0,
      status: 'uploading'
    }));

    setQueue(prev => [...prev, ...newItems]);

    // Process files sequentially or in batch
    for (const item of newItems) {
      try {
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'parsing', progress: 50 } : q));
        await uploadPdf(item.file);
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'completed', progress: 100 } : q));
      } catch (err: any) {
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', errorMsg: err.message || 'Upload failed' } : q));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto h-full overflow-y-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Upload Contract PDF</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Drag and drop PDF contracts to extract metadata and index into vector storage automatically.
        </p>
      </div>

      {/* Large Drag and Drop Dropzone per Design Direction #3 */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all ${
          dragOver 
            ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 scale-[1.01]' 
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal-400'
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-4 border border-teal-200 dark:border-teal-700">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
          Click to upload or drag & drop PDFs here
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Supports single or batch contract file uploads
        </p>

        <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-600">
          <span>Accepted format:</span>
          <span className="font-mono text-teal-600 dark:text-teal-400">PDF (Max 25MB)</span>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          accept=".pdf"
          multiple
          className="hidden"
        />
      </div>

      {/* Batch Upload Queue List with per-file status per Functional Addition #7 */}
      {queue.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Batch Upload Queue ({queue.length})</h3>
            {queue.some(q => q.status === 'completed') && (
              <button
                onClick={() => navigate('/analysis')}
                className="flex items-center gap-2 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
              >
                Go to Dual-Pane Analysis <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            {queue.map((item) => (
              <div key={item.id} className="p-3.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-teal-600" />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.file.name}</div>
                    <div className="text-[10px] text-slate-400">{(item.file.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {item.status === 'uploading' && (
                    <span className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                    </span>
                  )}
                  {item.status === 'parsing' && (
                    <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Indexing Vectors...
                    </span>
                  )}
                  {item.status === 'completed' && (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Ready for Analysis
                    </span>
                  )}
                  {item.status === 'error' && (
                    <span className="text-xs text-red-600 font-semibold">{item.errorMsg}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
