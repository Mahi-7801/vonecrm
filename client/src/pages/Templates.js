import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useDataSync, triggerDataSync } from '../services/dataSync';
import { FiRefreshCw, FiEye, FiMessageSquare, FiPlus, FiSend } from 'react-icons/fi';
import useSubscriptionGuard from '../hooks/useSubscriptionGuard';
import PaywallOverlay from '../components/PaywallOverlay';

export default function Templates() {
  const { hasSubscription, loading: subLoading } = useSubscriptionGuard();
  const [searchParams] = useSearchParams();
  const queryTab = searchParams.get('tab');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metaTemplates, setMetaTemplates] = useState([]);
  const [showMetaOnly, setShowMetaOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState(queryTab || 'all');

  useEffect(() => {
    if (queryTab) setStatusFilter(queryTab);
  }, [queryTab]);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '', category: 'UTILITY', language: 'en_US', header: '', body: '', footer: ''
  });

  const fetchMetaTemplates = useCallback(async () => {
    try {
      setSyncing(true);
      const res = await api.get('/templates/meta');
      setMetaTemplates(res.data || []);
    } catch (err) {
      console.error('Fetch Meta templates error:', err);
    } finally {
      setSyncing(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await api.get('/templates');
      setTemplates(res.data || []);
    } catch (err) {
      console.error('Fetch templates error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchMetaTemplates();
    // Auto-fetch Meta templates every 1 minute (60,000 ms) using configured keys
    const interval = setInterval(() => {
      fetchMetaTemplates();
      fetchTemplates();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchTemplates, fetchMetaTemplates]);

  useDataSync(fetchTemplates, 5000, 'templates');

  // Auto-generate template content based on name
  const autoGenerateFromName = (name) => {
    const n = name.toLowerCase().replace(/[_\-\s]+/g, ' ').trim();

    const templates = {
      'order received': { header: 'Order Received', body: 'Thank you for your order! We have received your order and it is now being processed. We will notify you once it is shipped.', footer: 'Thank you for shopping with us!' },
      'order confirmed': { header: 'Order Confirmed', body: 'Your order has been confirmed! Order ID: {{1}}. We will start processing your order right away.', footer: 'Track your order in the app' },
      'order shipped': { header: 'Order Shipped', body: 'Great news! Your order #{{1}} has been shipped. Tracking number: {{2}}. Expected delivery in 3-5 business days.', footer: 'Thank you for your patience' },
      'order delivered': { header: 'Order Delivered', body: 'Your order #{{1}} has been delivered successfully. We hope you enjoy your purchase! Let us know if you have any feedback.', footer: 'Thank you for shopping with us!' },
      'payment received': { header: 'Payment Confirmed', body: 'We have received your payment of {{1}} for order #{{2}}. Your order will be processed shortly.', footer: 'Receipt sent to your email' },
      'welcome': { header: 'Welcome!', body: 'Hello {{1}}, welcome to our platform! We are excited to have you on board. Here is what you can do:\n\n- Browse our services\n- Get instant support\n- Track your orders\n\nHow can we help you today?', footer: 'Reply to this message to get started' },
      'greeting': { header: '', body: 'Hello {{1}}, welcome! How can we help you today? Feel free to ask any questions.', footer: '' },
      'thank you': { header: 'Thank You!', body: 'Thank you for reaching out to us, {{1}}! We appreciate your interest. Our team will get back to you shortly.', footer: 'We typically respond within 1 hour' },
      'follow up': { header: '', body: 'Hi {{1}}, just following up on our previous conversation. Are you still interested? Let us know how we can help!', footer: '' },
      'feedback': { header: 'We Value Your Feedback', body: 'Hi {{1}}, we hope you had a great experience! Could you take a moment to share your feedback? Your input helps us improve.', footer: 'Your feedback matters to us' },
      'appointment': { header: 'Appointment Confirmed', body: 'Hi {{1}}, your appointment has been confirmed for {{2}} at {{3}}. Please arrive 10 minutes early.', footer: 'Reply CANCEL to reschedule' },
      'support received': { header: 'Support Request', body: 'We have received your support request. Our team will review your inquiry and get back to you shortly. Reference: #{{1}}', footer: 'We typically respond within 24 hours' },
      'account created': { header: 'Account Created', body: 'Welcome to Mahi CRM! Your account has been created successfully. This message confirms your ability to send WhatsApp notifications.', footer: '' },
      'welcome message': { header: 'Welcome!', body: 'Welcome and congratulations! Your Mahi CRM account is now active and ready to send WhatsApp messages to your customers.', footer: 'Get started from the dashboard' },
      'promo': { header: 'Special Offer!', body: 'Hi {{1}}, check out our latest offers! We have exclusive deals just for you. Visit us today for amazing discounts.', footer: 'Offer valid for limited time' },
      'newsletter': { header: 'Weekly Newsletter', body: 'Hi {{1}}, here is your weekly update! Stay tuned for the latest news and updates from our team.', footer: 'Unsubscribe anytime' },
      'reminder': { header: 'Reminder', body: 'Hi {{1}}, this is a friendly reminder about your upcoming appointment/task on {{2}}. Please confirm your availability.', footer: 'Reply YES to confirm' },
      'invoice': { header: 'Invoice', body: 'Hi {{1}}, your invoice #{{2}} for {{3}} is ready. Please review the details and complete the payment at your earliest convenience.', footer: 'Thank you for your business' },
      'verification': { header: 'Verify Your Account', body: 'Your verification code is: {{1}}. This code will expire in 10 minutes. Do not share this code with anyone.', footer: 'If you did not request this, please ignore' },
      'otp': { header: 'Verification Code', body: 'Your one-time password is: {{1}}. Valid for 5 minutes. Do not share this with anyone.', footer: 'Never share your OTP' },
    };

    // Try exact match first
    for (const [key, value] of Object.entries(templates)) {
      if (n.includes(key)) {
        setCreateForm(prev => ({
          ...prev,
          header: prev.header || value.header,
          body: prev.body || value.body,
          footer: prev.footer || value.footer
        }));
        return;
      }
    }

    // Generic auto-fill based on words in the name
    if (n.includes('order')) {
      setCreateForm(prev => ({
        ...prev,
        header: prev.header || 'Order Update',
        body: prev.body || 'Hi {{1}}, your order #{{2}} has been updated. We will keep you informed about the status.',
        footer: prev.footer || 'Thank you for your order'
      }));
    } else if (n.includes('welcome') || n.includes('wecome') || n.includes('welcom') || n.includes('greet')) {
      setCreateForm(prev => ({
        ...prev,
        header: prev.header || 'Welcome!',
        body: prev.body || 'Hello {{1}}, welcome to our platform! We are excited to have you on board. How can we help you today?',
        footer: prev.footer || 'Reply to get started'
      }));
    } else if (n.includes('payment') || n.includes('billing')) {
      setCreateForm(prev => ({
        ...prev,
        header: prev.header || 'Payment Update',
        body: prev.body || 'Hi {{1}}, your payment of {{2}} has been processed successfully. Thank you for your purchase!',
        footer: prev.footer || 'Receipt sent to your email'
      }));
    } else if (n.includes('support') || n.includes('help')) {
      setCreateForm(prev => ({
        ...prev,
        header: prev.header || 'Support Request',
        body: prev.body || 'We have received your support request, {{1}}. Our team will review and get back to you shortly.',
        footer: prev.footer || 'We typically respond within 24 hours'
      }));
    } else if (n.includes('promo') || n.includes('offer') || n.includes('discount')) {
      setCreateForm(prev => ({
        ...prev,
        header: prev.header || 'Special Offer',
        body: prev.body || 'Hi {{1}}, check out our latest offers! We have exclusive deals just for you.',
        footer: prev.footer || 'Offer valid for limited time'
      }));
    }
  };

  const handleCreateMetaTemplate = async () => {
    if (!createForm.name.trim() || !createForm.body.trim()) {
      alert('Template Name and Body Text are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/templates', createForm);
      if (res.data.meta_submitted) {
        alert('🟢 Template submitted to Meta Graph API for verification!\nStatus: PENDING Approval from Meta Business Manager.');
      } else {
        alert(`⚠️ ${res.data.message}`);
      }
      setShowCreateModal(false);
      setCreateForm({ name: '', category: 'UTILITY', language: 'en_US', header: '', body: '', footer: '' });
      fetchTemplates();
      fetchMetaTemplates();
      triggerDataSync('templates');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit template to Meta');
    } finally {
      setSubmitting(false);
    }
  };

  // Combine real-time Meta API templates and local templates
  const allTemplates = React.useMemo(() => {
    const map = new Map();

    (metaTemplates || []).forEach(t => {
      map.set((t.name || '').toLowerCase(), {
        id: t.id,
        name: t.name,
        category: t.category,
        status: t.status?.toLowerCase() === 'approved' ? 'approved' : t.status?.toLowerCase() === 'rejected' ? 'rejected' : 'pending',
        language: t.language || 'en_US',
        body: t.components?.find(c => c.type === 'BODY')?.text || '',
        header: t.components?.find(c => c.type === 'HEADER')?.text || '',
        footer: t.components?.find(c => c.type === 'FOOTER')?.text || '',
        source: 'meta',
        last_edit_time: t.last_edit_time
      });
    });

    (templates || []).forEach(t => {
      const key = (t.name || '').toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: t.id,
          name: t.name,
          category: t.category,
          status: t.status || 'pending',
          language: t.language || 'en_US',
          body: t.body || '',
          header: t.header || '',
          footer: t.footer || '',
          source: 'local'
        });
      }
    });

    return Array.from(map.values());
  }, [templates, metaTemplates]);

  const statusColor = (status) => {
    const colors = {
      approved: { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
      active: { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
      pending: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
      rejected: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' }
    };
    return colors[status] || { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' };
  };

  const categoryColor = (cat) => {
    const colors = {
      marketing: { bg: '#fce4ec', text: '#c62828' },
      utility: { bg: '#e3f2fd', text: '#1565c0' },
      authentication: { bg: '#fff3e0', text: '#e65100' }
    };
    return colors[cat?.toLowerCase()] || { bg: '#f1f5f9', text: '#475569' };
  };

  if (!subLoading && !hasSubscription) return <PaywallOverlay toolName="WhatsApp Templates" />;
  if (loading) return <div className="loading">Loading templates...</div>;

  const approvedCount = allTemplates.filter(t => t.status === 'approved' || t.status === 'active').length;
  const pendingCount = allTemplates.filter(t => t.status === 'pending').length;
  const rejectedCount = allTemplates.filter(t => t.status === 'rejected').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="page-header">
        <div>
          <h1>Message Templates</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>Manage your WhatsApp message templates synced from Meta Business Manager</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
            <FiPlus /> Create Meta Template
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => { fetchMetaTemplates(); fetchTemplates(); }} disabled={syncing}>
            <FiRefreshCw className={syncing ? 'spin' : ''} /> {syncing ? 'Syncing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="page-body">
      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Total Templates</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: 'var(--text)' }}>{allTemplates.length}</div>
        </div>
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.75rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Approved</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#10b981' }}>{approvedCount}</div>
        </div>
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.75rem', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Pending</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#f59e0b' }}>{pendingCount}</div>
        </div>
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.75rem', color: '#f87171', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Rejected</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#ef4444' }}>{rejectedCount}</div>
        </div>
      </div>
      {/* Meta Templates Header */}
      <div style={{ marginBottom: 20 }}>
        <span style={{ padding: '10px 20px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)', borderBottom: '2px solid var(--primary)', marginBottom: -2 }}>
          Meta Templates <span style={{ marginLeft: 4, fontSize: '0.8rem', opacity: 0.7 }}>({metaTemplates.length})</span>
        </span>
      </div>
      {/* Template Cards */}
      {allTemplates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <FiMessageSquare size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
          <h3 style={{ marginBottom: 8 }}>No templates found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Templates will appear here after syncing from Meta Business Manager</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {allTemplates.map((tpl) => (
            <div key={tpl.id} style={{
              background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)',
              overflow: 'hidden', transition: 'all 0.2s', cursor: 'pointer'
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
              onClick={() => setPreviewTemplate(tpl)}
            >
              {/* Card Header */}
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text)' }}>{tpl.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 12, background: statusColor(tpl.status).bg }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor(tpl.status).dot }} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, color: statusColor(tpl.status).text, textTransform: 'capitalize' }}>
                    {tpl.status === 'active' ? 'Approved' : tpl.status}
                  </span>
                </div>
              </div>
              {/* Card Body */}
              <div style={{ padding: '10px 14px' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600, background: categoryColor(tpl.category).bg, color: categoryColor(tpl.category).text, textTransform: 'capitalize' }}>
                    {tpl.category}
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600, background: '#f1f5f9', color: '#475569' }}>
                    {tpl.language?.toUpperCase() || 'EN'}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {tpl.body || 'No preview available'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setPreviewTemplate(null)}>
          <div style={{ background: 'var(--card)', borderRadius: 20, padding: 32, maxWidth: 380, width: '90%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: 16, fontSize: '1.1rem', fontWeight: 700 }}>Template Preview</h2>
            {/* Phone mockup */}
            <div style={{
              background: '#ECE5DD', borderRadius: 20, padding: 12, maxWidth: 320, margin: '0 auto',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4c5a9\' fill-opacity=\'0.3\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
            }}>
              <div style={{ background: '#075E54', color: 'white', padding: '10px 14px', borderRadius: '12px 12px 0 0', fontWeight: 600, fontSize: '0.9rem', textAlign: 'center' }}>
                {previewTemplate.name}
              </div>
              {previewTemplate.header && (
                <div style={{ background: '#DCF8C6', padding: '10px 14px', marginTop: 8, borderRadius: 12, fontWeight: 600, fontSize: '0.85rem', color: '#303030' }}>
                  {previewTemplate.header}
                </div>
              )}
              <div style={{ background: '#DCF8C6', borderRadius: 12, padding: '10px 14px', marginTop: 8, boxShadow: '0 1px 1px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', color: '#303030' }}>
                  {previewTemplate.body}
                </div>
                {previewTemplate.footer && (
                  <div style={{ fontSize: '0.75rem', color: '#667781', marginTop: 8, fontStyle: 'italic' }}>
                    {previewTemplate.footer}
                  </div>
                )}
                <div style={{ textAlign: 'right', marginTop: 4 }}>
                  <span style={{ fontSize: '0.65rem', color: '#667781' }}>10:30 AM ✓✓</span>
                </div>
              </div>
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 600, background: categoryColor(previewTemplate.category).bg, color: categoryColor(previewTemplate.category).text }}>
                  {previewTemplate.category?.toUpperCase()}
                </span>
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setPreviewTemplate(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Meta Template Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowCreateModal(false)}>
          <div style={{ background: 'var(--card)', borderRadius: 16, padding: 28, maxWidth: 520, width: '92%', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiSend color="var(--primary)" /> Create & Push Meta Template
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Template will be submitted directly to Meta Graph API for verification.
            </p>

            <div style={{ display: 'grid', gap: 14 }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Template Name (lowercase, no spaces)</label>
                <input
                  value={createForm.name}
                  onChange={e => {
                    const name = e.target.value;
                    setCreateForm(prev => ({ ...prev, name }));
                    // Auto-generate content when name has 3+ characters
                    if (name.length >= 3) {
                      autoGenerateFromName(name);
                    }
                  }}
                  placeholder="e.g. order_confirmation_v1"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Category</label>
                  <select
                    value={createForm.category}
                    onChange={e => setCreateForm({ ...createForm, category: e.target.value })}
                  >
                    <option value="UTILITY">Utility</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="AUTHENTICATION">Authentication</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Language</label>
                  <select
                    value={createForm.language}
                    onChange={e => setCreateForm({ ...createForm, language: e.target.value })}
                  >
                    <option value="en_US">English (US)</option>
                    <option value="hi">Hindi</option>
                    <option value="es">Spanish</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Header (Optional)</label>
                <input
                  value={createForm.header}
                  onChange={e => setCreateForm({ ...createForm, header: e.target.value })}
                  placeholder="e.g. Order Confirmed!"
                />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Body Text (Required)</label>
                <textarea
                  rows={4}
                  value={createForm.body}
                  onChange={e => setCreateForm({ ...createForm, body: e.target.value })}
                  placeholder="Hi {{1}}, thank you for your order! Your tracking number is {{2}}."
                />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Footer (Optional)</label>
                <input
                  value={createForm.footer}
                  onChange={e => setCreateForm({ ...createForm, footer: e.target.value })}
                  placeholder="e.g. Reply STOP to unsubscribe"
                />
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)} disabled={submitting}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleCreateMetaTemplate} disabled={submitting}>
                {submitting ? 'Submitting to Meta...' : '🚀 Submit to Meta API'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
