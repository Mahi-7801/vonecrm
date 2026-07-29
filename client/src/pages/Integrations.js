import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FiZap, FiMessageSquare, FiSettings, FiTrash2, FiPlus, FiExternalLink } from 'react-icons/fi';
import { toast } from 'react-toastify';

export default function Integrations() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: 'telegram', name: '', config: {} });

  useEffect(() => { fetchIntegrations(); }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await api.get('/integrations');
      setIntegrations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.warning('Enter a name');
    try {
      await api.post('/integrations', form);
      toast.success('Integration created');
      setShowAdd(false);
      setForm({ type: 'telegram', name: '', config: {} });
      fetchIntegrations();
    } catch (err) {
      toast.error('Failed to create');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this integration?')) return;
    try {
      await api.delete(`/integrations/${id}`);
      toast.success('Deleted');
      fetchIntegrations();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleToggle = async (id, active) => {
    try {
      await api.put(`/integrations/${id}`, { active: !active });
      fetchIntegrations();
    } catch (err) {}
  };

  const [connectingTelegram, setConnectingTelegram] = useState(false);
  const [telegramToken, setTelegramToken] = useState('');

  const handleConnectTelegram = async () => {
    if (!telegramToken.trim()) return toast.warning('Please enter your Telegram Bot Token from @BotFather');
    setConnectingTelegram(true);
    try {
      const res = await api.post('/integrations/telegram/setup', { bot_token: telegramToken.trim() });
      toast.success(res.data.message || '✅ Telegram Bot connected!');
      fetchIntegrations();
      setShowAdd(false);
      setTelegramToken('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to connect Telegram Bot');
    } finally {
      setConnectingTelegram(false);
    }
  };

  const typeInfo = {
    n8n: { icon: <FiZap size={24} />, color: '#ea4b71', label: 'n8n Automation', desc: 'Connect with n8n workflow automation' },
    telegram: { icon: <FiMessageSquare size={24} />, color: '#0088cc', label: 'Telegram Bot', desc: 'Connect custom Telegram Bot for AI auto-replies & flows' },
    webhook: { icon: <FiExternalLink size={24} />, color: '#ff6b35', label: 'Webhook', desc: 'Custom webhook integration' }
  };

  if (loading) return <div className="loading">Loading integrations...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0 }}>🔌 Integrations & Bot Channels</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Connect Telegram Bots, n8n workflows & webhooks to VONE DIGITALS CRM AI Engine</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setForm({ type: 'telegram', name: 'Telegram Bot', config: {} }); setShowAdd(true); }}>
          <FiPlus /> Add Integration
        </button>
      </div>

      <div className="page-body">
        {/* Meta WhatsApp Webhook Settings Banner */}
        <div style={{ background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)', borderRadius: 16, padding: '20px 24px', color: 'white', marginBottom: 20, boxShadow: '0 8px 24px rgba(37,211,102,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                💬
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>Meta WhatsApp Webhook Configuration</h3>
                <p style={{ margin: '4px 0 0', opacity: 0.95, fontSize: '0.82rem' }}>Configure these credentials on Meta Developer Console (WhatsApp -&gt; Configuration):</p>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: 10, fontSize: '0.8rem' }}>
              <div style={{ opacity: 0.8, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Callback URL</div>
              <code style={{ color: '#fff', fontSize: '0.8rem', wordBreak: 'break-all' }}>https://honor-directive-republic-downloading.trycloudflare.com/api/whatsapp/webhook</code>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: 10, fontSize: '0.8rem' }}>
              <div style={{ opacity: 0.8, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Verify Token</div>
              <code style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}>mahi_crm_webhook_token_2026</code>
            </div>
          </div>
        </div>

        {/* Telegram Banner Card */}
        <div style={{ background: 'linear-gradient(135deg, #0088cc 0%, #005580 100%)', borderRadius: 16, padding: '20px 24px', color: 'white', marginBottom: 24, boxShadow: '0 8px 24px rgba(0,136,204,0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                ✈️
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem', fontWeight: 800 }}>Add Your Telegram Bot</h3>
                <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: '0.83rem' }}>Enter your Bot Token from @BotFather to link your custom bot with Groq Llama 3.1 AI & Flow Builder.</p>
              </div>
            </div>
            <button className="btn btn-light btn-sm" onClick={() => { setForm({ type: 'telegram', name: 'Telegram Bot', config: {} }); setShowAdd(true); }} style={{ background: 'white', color: '#0088cc', fontWeight: 800 }}>
              🚀 Add Custom Bot Token
            </button>
          </div>
        </div>

        {/* Available Integrations */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Available Integration Channels</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {Object.entries(typeInfo).map(([type, info]) => (
              <div key={type} className="card" style={{ padding: 24, cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => { setForm({ type, name: info.label, config: {} }); setShowAdd(true); }}
                onMouseEnter={e => e.currentTarget.style.borderColor = info.color}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ width: 48, height: 48, borderRadius: 12, background: info.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: info.color, marginBottom: 12 }}>{info.icon}</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>{info.label}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{info.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Active Integrations */}
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Active Integrations</h3>
          {integrations.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <FiZap size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>No active integrations configured yet. Click above to add your Telegram bot!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {integrations.map(int => {
                const info = typeInfo[int.type] || typeInfo.webhook;
                const conf = typeof int.config === 'string' ? JSON.parse(int.config) : (int.config || {});
                return (
                  <div key={int.id} className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: info.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: info.color, flexShrink: 0 }}>{info.icon}</div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{int.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {info.label} • Webhook: <code style={{ color: '#0088cc' }}>{conf.webhook_url || 'Active'}</code>
                      </div>
                    </div>
                    <button onClick={() => handleToggle(int.id, int.active)} style={{ padding: '4px 12px', borderRadius: 16, border: 'none', background: int.active ? '#dcfce7' : '#f1f5f9', color: int.active ? '#166534' : '#64748b', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                      {int.active ? '🟢 Connected' : '⚪ Disabled'}
                    </button>
                    <button onClick={() => handleDelete(int.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><FiTrash2 size={16} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Modal */}
        {showAdd && (
          <div className="modal-overlay" onClick={() => setShowAdd(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <h3 style={{ margin: '0 0 16px' }}>Configure {typeInfo[form.type]?.label || 'Integration'}</h3>
              
              {form.type === 'telegram' ? (
                <>
                  <div className="form-group">
                    <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>Telegram Bot Token (from @BotFather)</label>
                    <input
                      value={telegramToken}
                      onChange={e => setTelegramToken(e.target.value)}
                      placeholder="e.g. 123456789:ABCdefGHI..."
                      style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: '0.8rem', color: '#0369a1' }}>
                    <strong>⚡ Instructions:</strong> Get a bot token from <code>@BotFather</code> on Telegram, paste it above, and click Connect. The backend will validate the token, register the webhook, and link incoming Telegram messages with your Mahi CRM AI assistant & Flow Builder.
                  </div>
                  <div className="modal-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
                    <button className="btn btn-primary btn-sm" onClick={handleConnectTelegram} disabled={connectingTelegram}>
                      {connectingTelegram ? 'Connecting...' : '🚀 Save & Register Webhook'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Name</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. My Automation" />
                  </div>
                  {form.type === 'n8n' && (
                    <div className="form-group">
                      <label>Webhook URL (from n8n)</label>
                      <input value={form.config.webhook_url || ''} onChange={e => setForm({ ...form, config: { ...form.config, webhook_url: e.target.value } })} placeholder="https://your-n8n.com/webhook/..." />
                    </div>
                  )}
                  <div className="modal-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
                    <button className="btn btn-primary btn-sm" onClick={handleCreate}>Create</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
