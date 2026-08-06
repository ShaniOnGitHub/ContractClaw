import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, CheckCircle2, Loader2, ArrowRight, X, AlertCircle } from 'lucide-react';
import { uploadContract, getContract } from '../services/api';

type UploadStatus = 'idle' | 'uploading' | 'indexing' | 'done' | 'error';

interface UploadItem {
  id: string;
  file: File;
  status: UploadStatus;
  contractId?: string;
  contractType?: string;
  errorMsg?: string;
  progress: number;
}

const statusLabel: Record<UploadStatus, { text: string; color: string }> = {
  idle:      { text: 'Waiting…',             color: 'var(--text-muted)' },
  uploading: { text: 'Uploading & parsing…', color: 'var(--accent)'         },
  indexing:  { text: 'Indexing vectors…',    color: 'var(--risk-med-text)'  },
  done:      { text: 'Ready for analysis',   color: 'var(--risk-low-text)'  },
  error:     { text: 'Failed',               color: 'var(--risk-high-text)' },
};

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimersRef = useRef<Record<string, number>>({});
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState<UploadItem[]>([]);

  useEffect(() => {
    return () => {
      Object.values(pollTimersRef.current).forEach(timer => window.clearInterval(timer));
    };
  }, []);

  const setItemState = (id: string, patch: Partial<UploadItem>) =>
    setQueue(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q));

  const processFile = async (item: UploadItem) => {
    try {
      // Stage 1: Upload PDF (background parsing & indexing initiated)
      setItemState(item.id, { status: 'uploading', progress: 30 });
      const uploadResult = await uploadContract(item.file);
      setItemState(item.id, {
        status: 'indexing',
        progress: 70,
        contractId: uploadResult.contract_id,
        contractType: uploadResult.contract_type || 'PDF Document'
      });

      const poll = window.setInterval(async () => {
        try {
          const contract = await getContract(uploadResult.contract_id);
          if (contract.status === 'indexed') {
            window.clearInterval(poll);
            delete pollTimersRef.current[item.id];
            setItemState(item.id, {
              status: 'done',
              progress: 100,
              contractType: contract.contract_type || uploadResult.contract_type || 'PDF Document',
            });
          } else if (contract.status === 'error') {
            window.clearInterval(poll);
            delete pollTimersRef.current[item.id];
            setItemState(item.id, {
              status: 'error',
              errorMsg: contract.error_message || 'Indexing failed',
              progress: 0,
            });
          }
        } catch (pollErr) {
          console.error('Polling contract status failed', pollErr);
        }
      }, 2000);
      pollTimersRef.current[item.id] = poll;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Upload failed';
      setItemState(item.id, { status: 'error', errorMsg: msg, progress: 0 });
    }
  };

  const handleFiles = (files: FileList | File[]) => {
    const pdfs = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) return;

    const newItems: UploadItem[] = pdfs.map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      status: 'idle',
      progress: 0,
    }));
    setQueue(prev => [...prev, ...newItems]);
    newItems.forEach(processFile);
  };

  const firstDone = queue.find(q => q.status === 'done');

  return (
    <div style={{ padding: '28px 32px', maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Upload Contracts</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          Drop PDF contracts here. Text is extracted, chunked, and embedded into ChromaDB automatically.
        </p>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 14, padding: '48px 32px', textAlign: 'center',
          cursor: 'pointer', background: dragOver ? 'var(--accent-bg)' : 'var(--bg-surface)',
          transition: 'all .15s',
        }}
      >
        <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--accent-bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <UploadCloud size={26} color="var(--accent)" />
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          Click to upload or drag &amp; drop PDFs here
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Text is auto-extracted, type auto-detected (NDA, Employment, SOW…)
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 14px', fontSize: 12 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Format:</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)' }}>PDF · Max 25 MB</span>
        </div>
        <input type="file" ref={fileInputRef} onChange={e => e.target.files && handleFiles(e.target.files)} accept=".pdf" multiple style={{ display: 'none' }} />
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="card" style={{ borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Upload Queue ({queue.length})
            </div>
            {firstDone && (
              <button
                onClick={() => navigate(`/analysis/${firstDone.contractId}`)}
                style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                Go to Analysis <ArrowRight size={12} />
              </button>
            )}
          </div>

          {queue.map((item, i) => {
            const st = statusLabel[item.status];
            return (
              <div key={item.id} style={{
                padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: i < queue.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={15} color="var(--accent)" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.file.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                      {(item.file.size / 1024).toFixed(0)} KB
                      {item.contractType && <span style={{ marginLeft: 8, fontWeight: 600, color: 'var(--accent)' }}>{item.contractType}</span>}
                    </div>
                    {/* Progress bar */}
                    {item.status !== 'idle' && item.status !== 'error' && (
                      <div style={{ height: 3, background: 'var(--border)', borderRadius: 999, marginTop: 5, width: 180 }}>
                        <div style={{ width: `${item.progress}%`, height: '100%', background: item.status === 'done' ? 'var(--risk-low-text)' : 'var(--accent)', borderRadius: 999, transition: 'width .4s ease' }} />
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: st.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {item.status === 'uploading' && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                    {item.status === 'indexing'  && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                    {item.status === 'done'      && <CheckCircle2 size={13} />}
                    {item.status === 'error'     && <AlertCircle size={13} />}
                    {item.status === 'error' ? item.errorMsg : st.text}
                  </span>
                  {(item.status === 'done' || item.status === 'error') && (
                    <button onClick={() => setQueue(p => p.filter(q => q.id !== item.id))} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'flex' }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Quick-navigate to any done contract */}
          {queue.filter(q => q.status === 'done').length > 1 && (
            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {queue.filter(q => q.status === 'done').map(q => (
                <button
                  key={q.id}
                  onClick={() => navigate(`/analysis/${q.contractId}`)}
                  className="btn-ghost"
                  style={{ fontSize: 11, padding: '4px 10px' }}
                >
                  Analyze {q.file.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
