import React, { useState, useEffect } from 'react';
import api from '../services/api';
import FlowBuilder from '../components/FlowBuilder';
import { SkeletonCards } from '../components/Skeleton';
import useSubscriptionGuard from '../hooks/useSubscriptionGuard';
import PaywallOverlay from '../components/PaywallOverlay';
import {
  FiPlus, FiEdit, FiTrash2, FiPlay, FiToggleLeft, FiToggleRight,
  FiZap, FiPhone, FiCheck, FiMessageSquare
} from 'react-icons/fi';

export default function Flows() {
  const { hasSubscription, loading: subLoading } = useSubscriptionGuard();
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingFlow, setEditingFlow] = useState(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState(null);

  // Show paywall AFTER all hooks are declared
  useEffect(() => {
    fetchFlows();
    fetchWhatsAppNumber();
  }, []);

  const fetchFlows = async () => {
    setLoading(true);
    try {
      const res = await api.get('/flows');
      setFlows(res.data);
    } catch (err) {
      console.error('Fetch flows error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWhatsAppNumber = async () => {
    try {
      const res = await api.get('/whatsapp/numbers');
      const verified = (res.data || []).find(n => n.verified);
      setWhatsappNumber(verified || null);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleActive = async (flow) => {
    try {
      const res = await api.put(`/flows/${flow.id}`, { active: !flow.active });
      setFlows(flows.map(f => f.id === flow.id ? res.data : f));
    } catch (err) {
      alert('Failed to toggle flow');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this flow?')) return;
    try {
      await api.delete(`/flows/${id}`);
      setFlows(flows.filter(f => f.id !== id));
    } catch (err) {
      alert('Failed to delete flow');
    }
  };

  const handleEdit = (flow) => {
    setEditingFlow(flow);
    setBuilderOpen(true);
  };

  const handleNew = () => {
    setEditingFlow(null);
    setBuilderOpen(true);
  };

  const handleSave = async (flowData) => {
    try {
      if (editingFlow) {
        const res = await api.put(`/flows/${editingFlow.id}`, flowData);
        setFlows(flows.map(f => f.id === editingFlow.id ? res.data : f));
      } else {
        const res = await api.post('/flows', flowData);
        setFlows([res.data, ...flows]);
      }
      setBuilderOpen(false);
      setEditingFlow(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save flow');
    }
  };

  const handleTest = async (flowId) => {
    const phone = prompt('Enter recipient phone number to test flow (e.g. 919876543210):');
    if (!phone) return;
    try {
      await api.post(`/flows/${flowId}/execute`, { phone });
      alert(`Flow execution triggered for ${phone}! Check inbox or phone.`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to execute flow');
    }
  };

  if (!subLoading && !hasSubscription) return <PaywallOverlay toolName="Flow Builder" />;
  if (loading) return <SkeletonCards count={6} />;

  return (
    <div className="page-body" style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header Bar */}
      <div className="page-header" style={{ marginBottom: 28, padding: 0, background: 'transparent', border: 'none' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Chatbot Automation Flows 🤖
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
            Build, test, and deploy automated WhatsApp keyword triggers and AI conversational bots.
          </p>
        </div>
        {!builderOpen && (
          <button className="btn btn-primary" onClick={handleNew} style={{ gap: 6, fontWeight: 700, padding: '10px 20px' }}>
            <FiPlus size={18} /> New Flow
          </button>
        )}
      </div>

      {/* WhatsApp Not Connected Banner */}
      {!whatsappNumber && !builderOpen && (
        <div style={{
          background: 'linear-gradient(135deg, #075E54 0%, #128C7E 100%)',
          color: 'white',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          boxShadow: '0 8px 24px rgba(18,140,126,0.25)',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiPhone size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Connect Your WhatsApp Business Number</h3>
              <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: '0.88rem' }}>
                Connect your Meta WhatsApp number to trigger these flows automatically whenever customers send keywords.
              </p>
            </div>
          </div>
          <a href="/settings" className="btn" style={{
            background: 'white',
            color: '#128C7E',
            padding: '10px 20px',
            borderRadius: 10,
            fontWeight: 800,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            whiteSpace: 'nowrap'
          }}>
            <FiPhone /> Connect Now
          </a>
        </div>
      )}

      {/* WhatsApp Connected Banner */}
      {whatsappNumber && !builderOpen && (
        <div style={{
          background: '#dcfce7',
          border: '1px solid #86efac',
          borderRadius: 14,
          padding: '16px 24px',
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: 'var(--shadow-xs)',
          flexWrap: 'wrap'
        }}>
          <div style={{ width: 32, height: 32, background: '#10b981', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <FiCheck size={18} />
          </div>
          <div>
            <strong style={{ color: '#14532d', fontSize: '0.95rem' }}>WhatsApp Connected Active: </strong>
            <span style={{ color: '#15803d', fontWeight: 700, marginLeft: 6, fontSize: '0.9rem' }}>
              {whatsappNumber.display_phone_number || whatsappNumber.phone_number_id}
            </span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: '#15803d', fontSize: '0.88rem', fontWeight: 700 }}>
            <FiMessageSquare /> All triggers live
          </div>
        </div>
      )}

      {builderOpen ? (
        <FlowBuilder
          initialFlow={editingFlow}
          onSave={handleSave}
          onCancel={() => { setBuilderOpen(false); setEditingFlow(null); }}
        />
      ) : flows.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px', borderRadius: 16 }}>
          <FiZap size={48} style={{ color: 'var(--text-muted)', marginBottom: 16, opacity: 0.4 }} />
          <h3 style={{ color: 'var(--text)', marginBottom: 8, fontSize: '1.2rem', fontWeight: 700 }}>No Chatbot Flows Found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.9rem' }}>Create your first visual automated chatbot flow using our drag-and-drop builder</p>
          <button className="btn btn-primary" onClick={handleNew} style={{ padding: '12px 24px', fontWeight: 700 }}>
            <FiPlus /> Create First Flow
          </button>
        </div>
      ) : (
        /* Spacious Grid Layout with 24px gaps */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          {flows.map((flow) => {
            const flowData = typeof flow.flow_json === 'string' ? JSON.parse(flow.flow_json) : flow.flow_json;
            const nodeCount = flowData?.nodes?.length || 0;
            const edgeCount = flowData?.edges?.length || 0;

            // Clean trigger keyword string with spaces after commas
            const formattedTriggers = (flow.trigger_keyword || '')
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
              .join(', ');

            return (
              <div
                key={flow.id}
                style={{
                  background: 'var(--card)',
                  borderRadius: 16,
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-xs)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.25s ease',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}
              >
                {/* Flow Top Content */}
                <div style={{ padding: '22px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 12 }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
                      {flow.name}
                    </h3>
                    <button
                      onClick={() => toggleActive(flow)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: flow.active ? '#10b981' : 'var(--text-muted)', flexShrink: 0 }}
                      title={flow.active ? 'Flow is Active' : 'Flow is Inactive'}
                    >
                      {flow.active ? <FiToggleRight size={26} /> : <FiToggleLeft size={26} />}
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 14, fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 14 }}>
                    <span>{nodeCount} nodes</span>
                    <span>•</span>
                    <span>{edgeCount} connections</span>
                  </div>

                  {formattedTriggers && (
                    <div style={{
                      fontSize: '0.8rem', fontWeight: 600,
                      color: '#0284c7', background: '#e0f2fe',
                      padding: '8px 12px', borderRadius: 10,
                      border: '1px solid #bae6fd', lineHeight: 1.4,
                      wordBreak: 'normal', overflowWrap: 'break-word'
                    }}>
                      ⚡ <strong>Trigger:</strong> {formattedTriggers}
                    </div>
                  )}
                </div>

                {/* Flow Bottom Action Bar */}
                <div style={{
                  padding: '14px 24px', background: 'var(--bg)',
                  borderTop: '1px solid var(--border)',
                  display: 'flex', gap: 8, alignItems: 'center'
                }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(flow)} style={{ flex: 1, gap: 6, fontWeight: 700 }}>
                    <FiEdit size={14} /> Edit
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleTest(flow.id)} title="Test Flow" style={{ gap: 4 }}>
                    <FiPlay size={14} /> Test
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(flow.id)} style={{ color: 'var(--danger)', gap: 4 }} title="Delete Flow">
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
