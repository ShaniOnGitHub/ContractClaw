import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Layers } from 'lucide-react';
import { getRunTrace } from '../services/api';

interface StageLog {
  id: number;
  stage_id: string;
  attempt: number;
  status: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  model?: string;
  temperature?: number;
  seed?: number;
  input_tokens?: number;
  output_tokens?: number;
  estimated_cost_usd?: number;
  error_message?: string;
}

interface RunDetails {
  run_id: string;
  contract_id: string;
  status: string;
  total_duration_ms: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  document_type: string;
  overall_score: number;
  risk_level: string;
  stages: StageLog[];
}

interface RunTimelineModalProps {
  runId: string;
  onClose: () => void;
}

export const RunTimelineModal: React.FC<RunTimelineModalProps> = ({ runId, onClose }) => {
  const [details, setDetails] = useState<RunDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getRunTrace(runId)
      .then(setDetails)
      .catch(err => setError(err?.message || 'Failed to load run details'))
      .finally(() => setLoading(false));
  }, [runId]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12,
        width: '100%', maxWidth: 720, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: 'var(--shadow-modal)'
      }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={16} color="var(--accent)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Run Observability Timeline</span>
            <span style={{ fontSize: 11, background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 5, color: 'var(--text-secondary)' }}>{runId}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading && <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Loading execution timeline...</div>}
          {error && <div style={{ color: 'var(--risk-high-text)', fontSize: 12 }}>{error}</div>}

          {details && (
            <>
              {/* Summary Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <div style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>DOCUMENT TYPE</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{details.document_type || 'Employment'}</div>
                </div>
                <div style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>DURATION</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{(details.total_duration_ms / 1000).toFixed(2)}s</div>
                </div>
                <div style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL TOKENS</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{details.total_input_tokens + details.total_output_tokens}</div>
                </div>
                <div style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>ESTIMATED COST</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>${(details.total_cost_usd || 0).toFixed(4)}</div>
                </div>
              </div>

              {/* Stage List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  Execution Stages ({details.stages?.length || 0})
                </div>

                {(details.stages || []).map((stage, idx) => (
                  <div key={idx} style={{
                    padding: '12px 14px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {stage.status === 'completed' ? <CheckCircle size={14} color="#15803d" /> : <AlertTriangle size={14} color="#b45309" />}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {stage.stage_id.replace('_', ' ').toUpperCase()}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', gap: 8 }}>
                          <span>Model: {stage.model || 'Deterministic Rules'}</span>
                          <span>• temp: {stage.temperature ?? 0}</span>
                          <span>• seed: {stage.seed ?? 1001}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-secondary)' }}>
                      <div>⏱️ {stage.duration_ms} ms</div>
                      {(stage.input_tokens || 0) > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          Tokens: {stage.input_tokens}in / {stage.output_tokens}out
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
