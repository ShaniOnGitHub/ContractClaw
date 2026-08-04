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
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Legal & Compliance Playbooks</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Define mandatory procurement rules, fallback thresholds, and negotiation standards.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center whitespace-nowrap"
        >
          + Create Custom Playbook
        </button>
      </div>

      {/* Playbooks Grid */}
      {loading ? (
        <div className="py-16 text-center text-sm text-neutral-500">Loading enterprise playbooks...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {playbooks.map((pb) => (
            <div key={pb.id} className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                    {pb.id.startsWith('playbook-') ? 'Standard Template' : 'Custom Team Playbook'}
                  </span>
                  <span className="text-xs font-medium text-neutral-400">{pb.rules.length} Rules</span>
                </div>
                <h3 className="text-base font-bold text-neutral-900 mt-3">{pb.name}</h3>
                <p className="text-xs text-neutral-600 mt-1 leading-relaxed">{pb.description}</p>

                {/* Rules List Preview */}
                <div className="mt-4 space-y-2 border-t border-neutral-100 pt-3">
                  {pb.rules.map((r, idx) => (
                    <div key={idx} className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 flex items-start justify-between text-xs">
                      <div>
                        <span className="font-semibold text-neutral-800">{r.category}: </span>
                        <span className="text-neutral-600">{r.description}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ml-2 ${
                        r.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                        r.severity === 'HIGH' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-neutral-200 flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50 flex-shrink-0">
              <h3 className="text-base font-bold text-neutral-900">Create New Legal Playbook</h3>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-neutral-600 text-2xl font-light leading-none p-1">&times;</button>
            </div>

            <form onSubmit={handleSavePlaybook} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Playbook Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Enterprise SaaS Vendor Policy"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Brief summary of when to apply this playbook..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>

                {/* Add Rule Form */}
                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                  <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Add Rule to Playbook</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-600 mb-1">Category</label>
                      <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-600 mb-1">Severity</label>
                      <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs"
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="CRITICAL">CRITICAL</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-600 mb-1">Rule Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Liability cap must not be under $1M"
                      value={ruleDesc}
                      onChange={(e) => setRuleDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-600 mb-1">Disallowed Phrases (Comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. uncapped liability, no warranty"
                      value={disallowed}
                      onChange={(e) => setDisallowed(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="w-full py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-semibold rounded-lg transition-all"
                  >
                    + Add Rule ({rules.length} added)
                  </button>
                </div>
              </div>

              {/* Pinned Modal Footer */}
              <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-end space-x-3 flex-shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all">
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

