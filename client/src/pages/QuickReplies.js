import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  FiPlus, FiTrash2, FiEdit, FiZap, FiCopy, FiCheck,
  FiMessageSquare, FiSend, FiClock, FiUsers, FiStar,
  FiHeadphones, FiDollarSign, FiPackage, FiGlobe, FiShield
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import useSubscriptionGuard from '../hooks/useSubscriptionGuard';
import PaywallOverlay from '../components/PaywallOverlay';
// Pre-built quick reply templates
const PRESET_REPLIES = [
  { shortcut: '/thanks', message: 'Thank you for contacting us! We appreciate your time. How can we help you further?', category: 'greeting', icon: '🙏' },
  { shortcut: '/welcome', message: 'Welcome to V ONE DIGITALS! We are a full-service digital agency offering web development, digital marketing, and branding services. How can we assist you today?', category: 'greeting', icon: '👋' },
  { shortcut: '/pricing', message: 'Thank you for your interest in our services! Our pricing depends on your specific requirements. Could you share more details about your project so we can provide an accurate quote?', category: 'sales', icon: '💰' },
  { shortcut: '/quote', message: 'We would be happy to provide a custom quote for your project. Please share:\n1. Project type (website, app, marketing)\n2. Timeline\n3. Budget range\n\nOur team will get back to you within 24 hours with a detailed proposal.', category: 'sales', icon: '📋' },
  { shortcut: '/demo', message: 'We would love to show you a demo! Our team can arrange a personalized walkthrough of our services. When would be a convenient time for you?', category: 'sales', icon: '🎯' },
  { shortcut: '/support', message: 'Our support team has received your request and is looking into it. We will get back to you within 24 hours with a resolution. Thank you for your patience!', category: 'support', icon: '🎧' },
  { shortcut: '/hours', message: 'Our business hours are:\nMonday - Friday: 9:00 AM - 6:00 PM IST\nSaturday: 10:00 AM - 2:00 PM IST\nSunday: Closed\n\nFor urgent queries, please email us at support@vonedigitals.com', category: 'general', icon: '🕐' },
  { shortcut: '/contact', message: 'You can reach us at:\n📞 Phone: +91 9966192921\n📧 Email: vonedigitals@gmail.com\n🌐 Website: vonedigitals.com\n📍 Address: 3rd Floor, 40-15/2-19, Brindavan Colony, Vijayawada, AP 520010', category: 'general', icon: '📞' },
  { shortcut: '/bye', message: 'Thank you for chatting with us! If you need any further assistance, feel free to reach out anytime. Have a great day! 😊', category: 'greeting', icon: '👋' },
  { shortcut: '/hold', message: 'Thank you for waiting. Our team is currently reviewing your request. We will update you shortly. Please stay with us!', category: 'support', icon: '⏳' },
  { shortcut: '/payment', message: 'Payment can be made via:\n🏦 Bank Transfer\n💳 Razorpay (Card/UPI/Netbanking)\n📱 UPI\n\nOnce payment is confirmed, we will proceed immediately.', category: 'general', icon: '💳' },
  { shortcut: '/refund', message: 'We understand your concern. Our refund policy allows for a full refund within 7 days of purchase if the service has not been utilized. Please share your order ID and we will process it within 48 hours.', category: 'support', icon: '💸' },
];

const categoryConfig = {
  greeting: { label: 'Greeting', color: '#10b981', bg: '#ecfdf5', icon: <FiMessageSquare size={12} /> },
  support: { label: 'Support', color: '#0ea5e9', bg: '#e0f2fe', icon: <FiHeadphones size={12} /> },
  sales: { label: 'Sales', color: '#f59e0b', bg: '#fef3c7', icon: <FiDollarSign size={12} /> },
  general: { label: 'General', color: '#8b5cf6', bg: '#f3e8ff', icon: <FiGlobe size={12} /> },
};

export default function QuickReplies() {
  const { hasSubscription, loading: subLoading } = useSubscriptionGuard();
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ shortcut: '', message: '', category: 'general' });
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [copiedId, setCopiedId] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [waNumbers, setWaNumbers] = useState([]);

  useEffect(() => { fetchReplies(); }, []);

  const fetchReplies = async () => {
    try {
      const [replyRes, contactRes, waRes] = await Promise.all([
        api.get('/canned-responses'),
        api.get('/contacts').catch(() => ({ data: [] })),
        api.get('/whatsapp/numbers').catch(() => ({ data: [] }))
      ]);
      setReplies(replyRes.data);
      setContacts(contactRes.data);
      setWaNumbers(waRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.shortcut || !form.message) return toast.error('Shortcut and message required');
    try {
      if (editing) {
        await api.put(`/canned-responses/${editing.id}`, form);
        toast.success('Quick reply updated');
      } else {
        await api.post('/canned-responses', form);
        toast.success('Quick reply created');
      }
      setForm({ shortcut: '', message: '', category: 'general' });
      setEditing(null);
      setShowForm(false);
      fetchReplies();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this quick reply?')) return;
    try {
      await api.delete(`/canned-responses/${id}`);
      toast.success('Deleted');
      fetchReplies();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleEdit = (reply) => {
    setEditing(reply);
    setForm({ shortcut: reply.shortcut, message: reply.message, category: reply.category || 'general' });
    setShowForm(true);
  };

  const usePreset = async (preset) => {
    try {
      await api.post('/canned-responses', {
        shortcut: preset.shortcut,
        message: preset.message,
        category: preset.category
      });
      toast.success(`Added "${preset.shortcut}" to your quick replies`);
      fetchReplies();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add');
    }
  };

  const copyMessage = (reply) => {
    navigator.clipboard.writeText(reply.message);
    setCopiedId(reply.id);
    toast.success('Message copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = replies.filter(r => {
    const matchesSearch = r.shortcut?.toLowerCase().includes(search.toLowerCase()) ||
                         r.message?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const presetNotAdded = PRESET_REPLIES.filter(p => !replies.find(r => r.shortcut === p.shortcut));

  if (!subLoading && !hasSubscription) return <PaywallOverlay toolName="Quick Replies" />;
  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div style={{ padding: '24px 32px 40px', maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            Quick Replies
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
            Pre-built messages for fast responses — type the shortcut in chat to use
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm({ shortcut: '', message: '', category: 'general' }); setShowForm(true); }}
          style={{
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #25d366, #128c7e)',
            color: 'white', fontWeight: 700, fontSize: '0.85rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
          }}
        >
          <FiPlus size={16} /> New Quick Reply
        </button>
      </div>

      {/* Connected Numbers & Contacts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiSend size={16} color="#16a34a" />
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>{waNumbers.filter(n => n.verified).length}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Connected Numbers</div>
            </div>
          </div>
          {waNumbers.filter(n => n.verified).map(n => (
            <div key={n.id} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} />
              {n.display_phone_number || n.phone_number_id}
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiUsers size={16} color="#6366f1" />
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>{contacts.length}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Contacts</div>
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {contacts.length > 0 ? 'Use quick replies in chat with these contacts' : 'Add contacts to start chatting'}
          </div>
        </div>

        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiZap size={16} color="#f59e0b" />
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>{replies.length}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quick Replies</div>
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Type shortcut in chat to use instantly
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {Object.entries(categoryConfig).map(([key, config]) => (
          <div key={key} style={{
            background: config.bg, borderRadius: 12, padding: '14px 16px',
            border: `1px solid ${config.color}20`, cursor: 'pointer',
            transition: 'all 0.2s',
            outline: filterCategory === key ? `2px solid ${config.color}` : 'none'
          }} onClick={() => setFilterCategory(filterCategory === key ? 'all' : key)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: config.color }}>{config.icon}</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: config.color }}>{config.label}</span>
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
              {replies.filter(r => r.category === key).length}
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div style={{
          background: 'var(--card)', borderRadius: 16, padding: '24px',
          border: '1px solid var(--border)', marginBottom: 24
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700 }}>
            {editing ? 'Edit Quick Reply' : 'New Quick Reply'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 140px', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Shortcut</label>
              <input
                value={form.shortcut}
                onChange={e => setForm({ ...form, shortcut: e.target.value })}
                placeholder="/thanks"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'monospace', fontWeight: 600 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Message</label>
              <textarea
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                rows={3}
                placeholder="Enter your quick reply message..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Category</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
              >
                <option value="general">General</option>
                <option value="greeting">Greeting</option>
                <option value="support">Support</option>
                <option value="sales">Sales</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSubmit} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #25d366, #128c7e)', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
              {editing ? 'Update' : 'Create'}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pre-Built Templates to Add */}
      {presetNotAdded.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiStar size={16} color="#f59e0b" /> Pre-Built Templates — Add to Your Library
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
            {presetNotAdded.map((preset, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)',
                transition: 'all 0.2s'
              }}>
                <span style={{ fontSize: '1.3rem' }}>{preset.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem', color: 'var(--primary)' }}>{preset.shortcut}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {preset.message.substring(0, 60)}...
                  </div>
                </div>
                <button
                  onClick={() => usePreset(preset)}
                  style={{
                    padding: '5px 10px', borderRadius: 6, border: 'none',
                    background: '#dcfce7', color: '#16a34a', fontWeight: 700,
                    fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0
                  }}
                >
                  <FiPlus size={12} /> Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search quick replies..."
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: '0.88rem' }}
        />
      </div>

      {/* My Quick Replies */}
      <div style={{
        background: 'var(--card)', borderRadius: 16, padding: '20px',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 14px' }}>
          My Quick Replies ({filtered.length})
        </h3>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <FiZap size={36} style={{ opacity: 0.2, marginBottom: 10 }} />
            <p style={{ fontSize: '0.9rem' }}>{search ? 'No matching replies' : 'No quick replies yet'}</p>
            <p style={{ fontSize: '0.8rem' }}>{search ? 'Try a different search' : 'Add from pre-built templates above or create your own'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(r => {
              const catConfig = categoryConfig[r.category] || categoryConfig.general;
              return (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)',
                  transition: 'all 0.2s'
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: catConfig.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <span style={{ color: catConfig.color, fontWeight: 800, fontSize: '0.75rem' }}>
                      {r.shortcut?.replace('/', '')?.substring(0, 3).toUpperCase()}
                    </span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)' }}>{r.shortcut}</span>
                      <span style={{
                        padding: '1px 6px', borderRadius: 4, fontSize: '0.62rem', fontWeight: 700,
                        background: catConfig.bg, color: catConfig.color, textTransform: 'capitalize'
                      }}>
                        {r.category}
                      </span>
                      {r.is_preset && (
                        <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: '0.62rem', fontWeight: 700, background: '#fef3c7', color: '#d97706' }}>
                          Pre-Built
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.message}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => copyMessage(r)}
                      title="Copy message"
                      style={{
                        padding: '6px 8px', borderRadius: 6, border: 'none',
                        background: copiedId === r.id ? '#dcfce7' : 'var(--card)',
                        color: copiedId === r.id ? '#16a34a' : 'var(--text-muted)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center'
                      }}
                    >
                      {copiedId === r.id ? <FiCheck size={14} /> : <FiCopy size={14} />}
                    </button>
                    <button
                      onClick={() => handleEdit(r)}
                      title="Edit"
                      style={{ padding: '6px 8px', borderRadius: 6, border: 'none', background: 'var(--card)', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <FiEdit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      title="Delete"
                      style={{ padding: '6px 8px', borderRadius: 6, border: 'none', background: 'var(--card)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
