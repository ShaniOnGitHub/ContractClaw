import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, CheckCircle2, Loader2, ArrowRight, X } from 'lucide-react';
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
      id: Math.random().toString(), file: f, progress: 0, status: 'uploading'
    }));
    setQueue(prev => [...prev, ...newItems]);

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

  const removeItem = (id: string) => setQueue(prev => prev.filter(q => q.id !== id));

  return (
    <div style={{ padding: '28px 32px', maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Upload Contracts</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          Drop PDF contracts here to extract metadata and index into vector storage automatically.
        </p>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 14,
          padding: '48px 32px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? 'var(--accent-bg)' : 'var(--bg-surface)',
          transition: 'all .15s',
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: 12,
          background: 'var(--accent-bg)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px'
        }}>
          <UploadCloud size={26} color="var(--accent)" />
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          Click to upload or drag & drop PDFs here
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Supports single or batch uploads
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 14px', fontSize: 12 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Accepted format:</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)' }}>PDF · Max 25 MB</span>
        </div>
        <input type="file" ref={fileInputRef} onChange={e => e.target.files && handleFiles(e.target.files)} accept=".pdf" multiple style={{ display: 'none' }} />
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="card" style={{ borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Upload Queue ({queue.length})</div>
            {queue.some(q => q.status === 'completed') && (
              <button onClick={() => navigate('/analysis')} style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                Go to Analysis <ArrowRight size={12} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {queue.map((item, i) => (
              <div key={item.id} style={{
                padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: i < queue.length - 1 ? '1px solid var(--border)' : 'none',
                background: 'var(--bg-surface)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={15} color="var(--accent)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.file.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(item.file.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {item.status === 'uploading' && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                      <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Uploading…
                    </span>
                  )}
                  {item.status === 'parsing' && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--risk-med-text)', fontWeight: 600 }}>
                      <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Indexing…
                    </span>
                  )}
                  {item.status === 'completed' && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--risk-low-text)', fontWeight: 600 }}>
                      <CheckCircle2 size={14} /> Ready
                    </span>
                  )}
                  {item.status === 'error' && (
                    <span style={{ fontSize: 12, color: 'var(--risk-high-text)', fontWeight: 600 }}>{item.errorMsg}</span>
                  )}
                  <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 2 }}>
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
