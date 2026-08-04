import React, { useEffect, useState } from 'react';
import { getPlaybooks, createPlaybook } from '../services/api';
import type { Playbook, PlaybookRule } from '../services/api';

export const PlaybooksPage: React.FC = () => {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ruleDesc, setRuleDesc] = useState('');
  const [category, setCategory] = useState('Limitation of Liability');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [disallowed, setDisallowed] = useState('');
  const [preferred, setPreferred] = useState('');
  const [rules, setRules] = useState<PlaybookRule[]>([]);

  useEffect(() => {
    fetchPlaybooks();
  }, []);

  const fetchPlaybooks = async () => {
    setLoading(true);
    try {
      const res = await getPlaybooks();
      setPlaybooks(res.playbooks);
    } catch (err) {
      console.error("Failed to load playbooks", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = () => {
    if (!ruleDesc.trim()) return;
    const newRule: PlaybookRule = {
      rule_id: `rule_${Date.now()}`,
      category,
      description: ruleDesc,
      severity,
      disallowed_phrases: disallowed ? disallowed.split(',').map(s => s.trim()) : [],
      preferred_standard: preferred
    };
    setRules([...rules, newRule]);
    setRuleDesc('');
    setDisallowed('');
    setPreferred('');
  };

  const handleSavePlaybook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createPlaybook(name, description, rules);
      setShowModal(false);
      setName('');
      setDescription('');
      setRules([]);
      fetchPlaybooks();
    } catch (err) {
      console.error("Failed to save playbook", err);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 28, height: '100%', overflowY: 'auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-.02em' }}>
            Legal & Compliance Playbooks
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Define mandatory procurement rules, fallback thresholds, and negotiation standards.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
          style={{ padding: '9px 22px', fontSize: 13, whiteSpace: 'nowrap', borderRadius: 'var(--radius)', flexShrink: 0 }}
        >
          + Create Custom Playbook
        </button>
      </div>

      {/* Playbooks Grid */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          Loading enterprise playbooks...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: 20 }}>
          {playbooks.map((pb) => (
            <div key={pb.id} className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em',
                    padding: '3px 10px', borderRadius: 999, background: 'var(--accent-bg)', color: 'var(--accent)',
                    border: '1px solid var(--border)'
                  }}>
                    {pb.id.startsWith('playbook-') ? 'Standard Template' : 'Custom Team Playbook'}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{pb.rules.length} Rules</span>
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 12 }}>{pb.name}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>{pb.description}</p>

                {/* Rules List Preview */}
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pb.rules.map((r, idx) => (
                    <div key={idx} style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', fontSize: 12 }}>
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.category}: </span>
                        <span style={{ color: 'var(--text-secondary)' }}>{r.description}</span>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', marginLeft: 8,
                        background: r.severity === 'CRITICAL' ? 'var(--risk-high-bg)' : r.severity === 'HIGH' ? 'var(--risk-med-bg)' : 'var(--risk-low-bg)',
                        color: r.severity === 'CRITICAL' ? 'var(--risk-high-text)' : r.severity === 'HIGH' ? 'var(--risk-med-text)' : 'var(--risk-low-text)',
                        border: '1px solid var(--border)'
                      }}>
                        {r.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Playbook Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(4px)', padding: 20
        }}>
          <div style={{
            background: 'var(--bg-surface)', borderRadius: 16,
            border: '1px solid var(--border)', boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            width: '100%', maxWidth: 620, maxHeight: '90vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--bg-subtle)', flexShrink: 0
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Create New Legal Playbook</h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 24, color: 'var(--text-muted)', cursor: 'pointer', padding: 4, lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePlaybook} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Playbook Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Enterprise SaaS Vendor Policy"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief summary of when to apply this playbook..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input"
                    style={{ resize: 'vertical', minHeight: 60 }}
                  />
                </div>

                {/* Add Rule Section Box */}
                <div style={{ background: 'var(--bg-subtle)', borderRadius: 12, border: '1px solid var(--border)', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)' }}>
                    Add Rule to Playbook
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Category</label>
                      <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="input"
                        style={{ background: 'var(--bg-surface)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Severity</label>
                      <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value as any)}
                        className="input"
                        style={{ background: 'var(--bg-surface)', cursor: 'pointer' }}
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="CRITICAL">CRITICAL</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Rule Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Liability cap must not be under $1M"
                      value={ruleDesc}
                      onChange={(e) => setRuleDesc(e.target.value)}
                      className="input"
                      style={{ background: 'var(--bg-surface)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Disallowed Phrases (Comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. uncapped liability, no warranty"
                      value={disallowed}
                      onChange={(e) => setDisallowed(e.target.value)}
                      className="input"
                      style={{ background: 'var(--bg-surface)' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="btn-ghost"
                    style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
                  >
                    + Add Rule ({rules.length} added)
                  </button>
                </div>
              </div>

              {/* Pinned Modal Footer */}
              <div style={{
                padding: '16px 24px', background: 'var(--bg-subtle)', borderTop: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, flexShrink: 0
              }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 22px' }}
                >
                  Save Playbook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
