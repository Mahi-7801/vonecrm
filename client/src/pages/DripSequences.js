import React, { useState, useEffect } from 'react';
import api from '../services/api';
import useSubscriptionGuard from '../hooks/useSubscriptionGuard';
import PaywallOverlay from '../components/PaywallOverlay';
import {
  FiPlus, FiTrash2, FiPlay, FiPause, FiClock, FiMessageSquare,
  FiUsers, FiPhone, FiZap, FiCheck, FiAlertTriangle, FiSettings,
  FiSend, FiArrowRight, FiShield, FiToggleRight, FiToggleLeft,
  FiCopy, FiStar, FiBook, FiTrendingUp, FiEdit
} from 'react-icons/fi';
import { toast } from 'react-toastify';

// Pre-built drip templates from admin
const PREBUILT_TEMPLATES = [
  {
    id: 'welcome',
    name: 'Welcome Series',
    description: 'Greet new contacts and introduce your business',
    icon: '👋',
    color: '#10b981',
    steps: [
      { delay: 0, message: 'Hello {{1}}! Welcome to our community. We are excited to have you on board!', template_name: null },
      { delay: 24, message: 'Hi {{1}}, here is a quick overview of our services. Check out what we offer!', template_name: null },
      { delay: 72, message: 'Hey {{1}}, just checking in! Is there anything we can help you with today?', template_name: null },
    ]
  },
  {
    id: 'followup',
    name: 'Follow-Up Series',
    description: 'Re-engage contacts who went silent',
    icon: '📞',
    color: '#f59e0b',
    steps: [
      { delay: 0, message: 'Hi {{1}}, we noticed you haven\'t been active lately. We miss you!', template_name: null },
      { delay: 48, message: 'Hey {{1}}, we have some exciting updates to share with you. Want to know more?', template_name: null },
      { delay: 168, message: 'Hi {{1}}, this is a friendly reminder. We are here whenever you need us!', template_name: null },
    ]
  },
  {
    id: 'onboarding',
    name: 'Onboarding Flow',
    description: 'Guide new users through setup step by step',
    icon: '🚀',
    color: '#6366f1',
    steps: [
      { delay: 0, message: 'Welcome {{1}}! Let us get you started. First, complete your profile setup.', template_name: null },
      { delay: 12, message: 'Great progress {{1}}! Next, connect your WhatsApp number in Settings.', template_name: null },
      { delay: 24, message: 'Almost there {{1}}! Import your contacts and send your first message.', template_name: null },
      { delay: 48, message: 'You are all set {{1}}! Start exploring broadcasts, templates, and automation.', template_name: null },
    ]
  },
  {
    id: 'feedback',
    name: 'Feedback Collection',
    description: 'Collect reviews and feedback from customers',
    icon: '⭐',
    color: '#ec4899',
    steps: [
      { delay: 0, message: 'Hi {{1}}, thank you for your recent interaction! We value your feedback.', template_name: null },
      { delay: 24, message: 'Hi {{1}}, could you take a moment to rate your experience? It helps us improve!', template_name: null },
      { delay: 72, message: 'Hey {{1}}, your feedback matters! Share your thoughts and help us serve you better.', template_name: null },
    ]
  },
  {
    id: 'promotion',
    name: 'Promotional Campaign',
    description: 'Promote offers, discounts, and events',
    icon: '🎯',
    color: '#ef4444',
    steps: [
      { delay: 0, message: '🎉 Special offer for you {{1}}! We have exclusive deals just for our valued customers.', template_name: null },
      { delay: 24, message: 'Hi {{1}}, don\'t miss out! Our limited-time offer ends soon. Act now!', template_name: null },
      { delay: 48, message: 'Last chance {{1}}! Our special offer expires tomorrow. Grab it before it\'s gone!', template_name: null },
    ]
  }
];

export default function DripSequences() {
  const { hasSubscription, loading: subLoading } = useSubscriptionGuard();
  const [sequences, setSequences] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [waNumbers, setWaNumbers] = useState([]);
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSequence, setEditingSequence] = useState(null);
  const [form, setForm] = useState({ name: '', steps: [] });
  const [connectingId, setConnectingId] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [seqRes, tplRes, contactRes, waRes, flowRes] = await Promise.all([
        api.get('/drip-sequences').catch(() => ({ data: [] })),
        api.get('/templates').catch(() => ({ data: [] })),
        api.get('/contacts').catch(() => ({ data: [] })),
        api.get('/whatsapp/numbers').catch(() => ({ data: [] })),
        api.get('/flows').catch(() => ({ data: [] }))
      ]);
      setSequences(seqRes.data);
      setTemplates(tplRes.data);
      setContacts(contactRes.data);
      setWaNumbers(waRes.data);
      setFlows(flowRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addStep = () => {
    setForm({ ...form, steps: [...form.steps, { delay: 24, template_id: '', message: '' }] });
  };

  const updateStep = (idx, key, value) => {
    const steps = [...form.steps];
    steps[idx] = { ...steps[idx], [key]: value };
    setForm({ ...form, steps });
  };

  const removeStep = (idx) => {
    setForm({ ...form, steps: form.steps.filter((_, i) => i !== idx) });
  };

  const handleEdit = (seq) => {
    setEditingSequence(seq);
    setForm({
      name: seq.name || '',
      steps: (seq.steps || []).map(s => ({
        delay: s.delay ?? s.delay_hours ?? 0,
        message: s.message || '',
        template_id: s.template_id || ''
      }))
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name || form.steps.length === 0) return alert('Name and at least one step required');
    try {
      if (editingSequence) {
        await api.put(`/drip-sequences/${editingSequence.id}`, form);
        toast.success('Drip sequence updated!');
      } else {
        await api.post('/drip-sequences', form);
        toast.success('Drip sequence created!');
      }
      setForm({ name: '', steps: [] });
      setEditingSequence(null);
      setShowForm(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    }
  };

  const usePrebuilt = (template) => {
    setEditingSequence(null);
    setForm({
      name: template.name,
      steps: template.steps.map(s => ({ ...s, template_id: '' }))
    });
    setShowForm(true);
    toast.info(`Loaded "${template.name}" template — customize and save!`);
  };

  const toggleActive = async (seq) => {
    try {
      await api.put(`/drip-sequences/${seq.id}`, { active: !seq.active });
      toast.success(seq.active ? 'Sequence paused' : 'Sequence activated');
      fetchData();
    } catch (err) {
      toast.error('Failed to toggle');
    }
  };

  const deleteSequence = async (seq) => {
    if (!window.confirm(`Delete "${seq.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/drip-sequences/${seq.id}`);
      toast.success('Deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const connectSequence = async (seq) => {
    setConnectingId(seq.id);
    try {
      // Activate the sequence
      if (!seq.active) {
        await api.put(`/drip-sequences/${seq.id}`, { active: true });
      }
      toast.success(`"${seq.name}" connected! Messages will be sent automatically based on the schedule.`);
      fetchData();
    } catch (err) {
      toast.error('Failed to connect');
    } finally {
      setConnectingId(null);
    }
  };

  if (!subLoading && !hasSubscription) return <PaywallOverlay toolName="Drip Sequences" />;
  if (loading) return <div className="loading">Loading drip sequences...</div>;

  const activeFlows = flows.filter(f => f.active);
  const connectedNumbers = waNumbers.filter(n => n.verified);
  const activeSequences = sequences.filter(s => s.active);

  return (
    <div style={{ padding: '24px 32px 40px', maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            Drip Campaigns & Sequences
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
            Automate follow-up messages and nurture your contacts over time
          </p>
        </div>
        <button
          onClick={() => { setEditingSequence(null); setForm({ name: '', steps: [] }); setShowForm(true); }}
          style={{
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #25d366, #128c7e)',
            color: 'white', fontWeight: 700, fontSize: '0.85rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <FiPlus size={16} /> New Sequence
        </button>
      </div>

      {/* Connected Numbers & Contacts Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* WhatsApp Numbers */}
        <div style={{
          background: 'var(--card)', borderRadius: 14, padding: '18px 20px',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiPhone size={18} color="#16a34a" />
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)' }}>{connectedNumbers.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Connected Numbers</div>
            </div>
          </div>
          {connectedNumbers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {connectedNumbers.map(n => (
                <div key={n.id} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                  {n.display_phone_number || n.phone_number_id}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>No numbers connected</div>
          )}
        </div>

        {/* Contacts */}
        <div style={{
          background: 'var(--card)', borderRadius: 14, padding: '18px 20px',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiUsers size={18} color="#6366f1" />
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)' }}>{contacts.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Contacts</div>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {contacts.length > 0 ? `${contacts.length} contacts available for drip campaigns` : 'Add contacts to start campaigns'}
          </div>
        </div>

        {/* Active Sequences */}
        <div style={{
          background: 'var(--card)', borderRadius: 14, padding: '18px 20px',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiSend size={18} color="#f59e0b" />
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)' }}>{activeSequences.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Sequences</div>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {activeSequences.length > 0 ? 'Running and sending messages automatically' : 'No active sequences'}
          </div>
        </div>
      </div>

      {/* AI Agent Status Alert */}
      {activeFlows.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
          background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', borderRadius: 12,
          border: '1px solid #6ee7b7', marginBottom: 24
        }}>
          <FiZap size={20} color="#16a34a" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#065f46' }}>
              AI Agent Active — {activeFlows.length} flow{activeFlows.length > 1 ? 's' : ''} running
            </div>
            <div style={{ fontSize: '0.78rem', color: '#047857' }}>
              Auto-reply is enabled. When a user sends a message, the AI will respond automatically based on your flows.
            </div>
          </div>
          <FiCheck size={18} color="#16a34a" />
        </div>
      )}

      {activeFlows.length === 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
          background: 'linear-gradient(135deg, #fef3c7, #fef9c3)', borderRadius: 12,
          border: '1px solid #fde68a', marginBottom: 24
        }}>
          <FiAlertTriangle size={20} color="#d97706" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#92400e' }}>
              AI Agent Inactive
            </div>
            <div style={{ fontSize: '0.78rem', color: '#a16207' }}>
              No active flows. Create a flow and enable it to auto-reply to user messages.
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <div style={{
          background: 'var(--card)', borderRadius: 16, padding: '24px',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', marginBottom: 24
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700 }}>
            {editingSequence ? 'Edit Drip Sequence' : 'Create Drip Sequence'}
          </h3>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>Sequence Name</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Welcome Series"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <strong style={{ fontSize: '0.9rem' }}>Steps ({form.steps.length})</strong>
              <button onClick={addStep} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                <FiPlus size={14} /> Add Step
              </button>
            </div>

            {form.steps.map((step, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 14px', background: 'var(--bg)', borderRadius: 10, marginBottom: 8, border: '1px solid var(--border)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>
                  {idx + 1}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <input type="number" value={step.delay} onChange={e => updateStep(idx, 'delay', parseInt(e.target.value) || 0)} style={{ width: 55, padding: '6px 8px', textAlign: 'center', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: '0.85rem' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>hrs</span>
                </div>
                <textarea
                  value={step.message}
                  onChange={e => updateStep(idx, 'message', e.target.value)}
                  placeholder="Enter message... use {{1}} for contact name"
                  rows={2}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: '0.82rem', resize: 'none' }}
                />
                <button onClick={() => removeStep(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4, flexShrink: 0 }}>
                  <FiTrash2 size={16} />
                </button>
              </div>
            ))}

            {form.steps.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No steps yet. Click "Add Step" or use a pre-built template below.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSubmit} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #25d366, #128c7e)', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
              {editingSequence ? 'Update Sequence' : 'Save Sequence'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingSequence(null); setForm({ name: '', steps: [] }); }} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pre-Built Templates */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
          Pre-Built Templates — Quick Start
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {PREBUILT_TEMPLATES.map(tpl => (
            <div key={tpl.id} style={{
              background: 'var(--card)', borderRadius: 12, padding: '16px',
              border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s'
            }}
              onClick={() => usePrebuilt(tpl)}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = ''; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: '1.5rem' }}>{tpl.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>{tpl.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{tpl.steps.length} steps</div>
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{tpl.description}</div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: tpl.color, fontWeight: 700 }}>
                <FiCopy size={12} /> Use Template
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* My Sequences */}
      <div style={{
        background: 'var(--card)', borderRadius: 16, padding: '24px',
        border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)'
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}>
          My Sequences ({sequences.length})
        </h3>

        {sequences.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
            <FiClock size={40} style={{ opacity: 0.2, marginBottom: 10 }} />
            <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No sequences yet</p>
            <p style={{ fontSize: '0.8rem' }}>Create one above or use a pre-built template</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sequences.map(seq => (
              <div key={seq.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)',
                transition: 'all 0.2s'
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: seq.active ? '#dcfce7' : 'var(--card)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FiMessageSquare size={18} color={seq.active ? '#16a34a' : 'var(--text-muted)'} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{seq.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {seq.steps?.length || 0} steps • Created {new Date(seq.created_at).toLocaleDateString()}
                  </div>
                </div>

                <span style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700,
                  background: seq.active ? '#dcfce7' : '#f1f5f9',
                  color: seq.active ? '#16a34a' : '#64748b'
                }}>
                  {seq.active ? 'Active' : 'Draft'}
                </span>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {!seq.active ? (
                    <button
                      onClick={() => connectSequence(seq)}
                      disabled={connectingId === seq.id}
                      title="Connect & Activate"
                      style={{
                        padding: '6px 12px', borderRadius: 8, border: 'none',
                        background: 'linear-gradient(135deg, #25d366, #128c7e)',
                        color: 'white', fontWeight: 700, fontSize: '0.75rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                      }}
                    >
                      <FiPlay size={12} /> Connect
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleActive(seq)}
                      title="Pause"
                      style={{
                        padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
                        background: 'var(--card)', color: 'var(--text-muted)',
                        fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4
                      }}
                    >
                      <FiPause size={12} /> Pause
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(seq)}
                    title="Edit Sequence"
                    style={{
                      padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'var(--card)', color: 'var(--text)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center'
                    }}
                  >
                    <FiEdit size={13} />
                  </button>
                  <button
                    onClick={() => deleteSequence(seq)}
                    title="Delete"
                    style={{
                      padding: '6px 10px', borderRadius: 8, border: '1px solid #fecaca',
                      background: '#fef2f2', color: '#ef4444',
                      cursor: 'pointer', display: 'flex', alignItems: 'center'
                    }}
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
