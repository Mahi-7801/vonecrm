import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FiSend, FiRefreshCw, FiUsers, FiFilter, FiFileText, FiClock, FiCalendar } from 'react-icons/fi';
import useSubscriptionGuard from '../hooks/useSubscriptionGuard';
import PaywallOverlay from '../components/PaywallOverlay';
import './Broadcast.css';

export default function Broadcast() {
  const { hasSubscription, loading: subLoading } = useSubscriptionGuard();
  const [localTemplates, setLocalTemplates] = useState([]);
  const [metaTemplates, setMetaTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [flows, setFlows] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [tagFilter, setTagFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [templateSource, setTemplateSource] = useState('all');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [scheduledBroadcasts, setScheduledBroadcasts] = useState([]);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');

  useEffect(() => {
    fetchAllData();
    fetchHistory();
    fetchScheduled();
    const interval = setInterval(fetchAllData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [localRes, metaRes, contactRes, flowRes] = await Promise.all([
        api.get('/templates').catch(() => ({ data: [] })),
        api.get('/templates/meta').catch(() => ({ data: [] })),
        api.get('/contacts').catch(() => ({ data: [] })),
        api.get('/flows').catch(() => ({ data: [] }))
      ]);
      setLocalTemplates(localRes.data);
      setMetaTemplates(metaRes.data);
      setContacts(contactRes.data);
      setFlows(flowRes.data || []);
    } catch (err) {
      console.error('Fetch data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduled = async () => {
    try {
      const res = await api.get('/broadcast/scheduled');
      setScheduledBroadcasts(res.data);
    } catch (err) {}
  };

  const scheduleBroadcast = async () => {
    if (!selectedTemplate || !scheduleTime) return alert('Select template and schedule time');
    const template = allTemplates.find(t => String(t.id) === String(selectedTemplate));
    if (!template) return alert('Template not found');

    // Convert datetime-local format (2026-07-24T15:30) to MySQL format (2026-07-24 15:30:00)
    const mysqlDateTime = scheduleTime.replace('T', ' ') + ':00';

    try {
      await api.post('/broadcast/schedule', {
        template_name: template.name,
        template_id: template.source === 'meta' ? null : parseInt(selectedTemplate),
        contact_ids: selectedContacts.length > 0 ? selectedContacts : undefined,
        scheduled_at: mysqlDateTime
      });
      setResult({ total: selectedContacts.length || contacts.length, sent: 0, scheduled: true });
      setScheduleMode(false);
      setScheduleTime('');
      fetchScheduled();
    } catch (err) {
      alert('Failed to schedule: ' + (err.response?.data?.error || err.message));
    }
  };

  const cancelScheduled = async (id) => {
    try {
      await api.delete(`/broadcast/scheduled/${id}`);
      fetchScheduled();
    } catch (err) {}
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/broadcast/history');
      setHistory(res.data);
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Use Meta templates as the primary source (fetched in real-time from Meta API)
  const allTemplates = metaTemplates.map(t => ({
    id: 'meta_' + t.id,
    name: t.name,
    category: t.category,
    status: t.status?.toLowerCase() || 'approved',
    source: 'meta',
    body: t.components?.find(c => c.type === 'BODY')?.text || ''
  }));

  const toggleContact = (id) => {
    setSelectedContacts(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts.map(c => c.id));
    }
  };

  const [jobProgress, setJobProgress] = useState(null);

  const handleSend = async () => {
    if (!selectedTemplate) return alert('Please select a template');
    if (selectedContacts.length === 0 && !tagFilter) return alert('Select contacts or enter a tag filter');

    const template = allTemplates.find(t => String(t.id) === String(selectedTemplate));
    if (!template) return alert('Template not found');

    // Warn if template is not approved
    const status = template.status?.toLowerCase();
    if (status !== 'approved' && status !== 'active') {
      if (!window.confirm(`Template "${template.name}" is ${status || 'unknown'}. It may fail to send. Continue anyway?`)) {
        return;
      }
    }

    setSending(true);
    setResult(null);
    setJobProgress(null);
    try {
      const res = await api.post('/broadcast/send', {
        template_id: template.source === 'meta' ? null : parseInt(selectedTemplate),
        template_name: template.source === 'meta' ? template.name : undefined,
        contact_ids: selectedContacts.length > 0 ? selectedContacts : undefined,
        tag_filter: tagFilter || undefined
      });

      if (res.data.job_id) {
        const jobId = res.data.job_id;
        const total = res.data.total_contacts || selectedContacts.length || contacts.length;
        setJobProgress({ jobId, total, sent: 0, failed: 0, status: 'processing', percent: 0 });

        // Poll job status every 2 seconds (Ticket 07)
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await api.get(`/broadcast/job/${jobId}`);
            const data = statusRes.data;
            const sent = data.sent || 0;
            const failed = data.failed || 0;
            const tot = data.total || total;
            const pct = Math.min(100, Math.round(((sent + failed) / (tot || 1)) * 100));

            setJobProgress({
              jobId,
              total: tot,
              sent,
              failed,
              status: data.status,
              percent: pct
            });

            if (data.status === 'completed' || data.status === 'failed') {
              clearInterval(pollInterval);
              setSending(false);
              fetchHistory();
            }
          } catch (e) {
            console.error('Polling job status error:', e);
          }
        }, 2000);
      } else {
        setResult(res.data);
        setSending(false);
        fetchHistory();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Broadcast failed');
      setSending(false);
    }
  };

  if (!subLoading && !hasSubscription) return <PaywallOverlay toolName="Broadcast Campaigns" />;
  if (loading) return <div className="loading">Loading broadcast...</div>;

  const statusBadge = (status) => {
    const cls = { approved: 'badge-success', active: 'badge-success', pending: 'badge-warning', rejected: 'badge-danger' };
    const label = status === 'active' ? 'approved' : status;
    return <span className={`badge ${cls[status] || 'badge-secondary'}`}>{label}</span>;
  };

  return (
    <div className="broadcast-page">
      <div className="page-header">
        <h1>Broadcast Campaigns 🚀</h1>
        <button className="btn btn-secondary btn-sm" onClick={fetchAllData} disabled={sending}>
          <FiRefreshCw /> Refresh Data
        </button>
      </div>

      {/* AI Agent Status Alert */}
      {(() => {
        const activeFlows = flows.filter(f => f.active);
        if (activeFlows.length > 0) {
          return (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
              background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', borderRadius: 12,
              border: '1px solid #6ee7b7', marginBottom: 20
            }}>
              <FiUsers size={18} color="#16a34a" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#065f46' }}>
                  AI Auto-Reply Active — {activeFlows.length} flow{activeFlows.length > 1 ? 's' : ''} running
                </div>
                <div style={{ fontSize: '0.78rem', color: '#047857' }}>
                  New messages from users will be auto-replied. Broadcasts are independent of auto-reply.
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      <div className="page-body">
      {/* Info Banner */}
      <div className="broadcast-banner">
        <div className="broadcast-banner-icon">
          <FiSend />
        </div>
        <div className="broadcast-banner-content">
          <strong>Bulk Messaging Ready 🚀</strong>
          <p>Select an approved Meta message template and recipients to launch or schedule bulk WhatsApp campaigns.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="broadcast-stats">
        <div className="broadcast-stat">
          <FiFileText className="broadcast-stat-icon" />
          <div className="broadcast-stat-info">
            <span className="broadcast-stat-value">{allTemplates.length}</span>
            <span className="broadcast-stat-label">Total Templates</span>
          </div>
        </div>
        <div className="broadcast-stat">
          <FiFileText className="broadcast-stat-icon meta" />
          <div className="broadcast-stat-info">
            <span className="broadcast-stat-value">{metaTemplates.length}</span>
            <span className="broadcast-stat-label">Meta Templates</span>
          </div>
        </div>
        <div className="broadcast-stat">
          <FiUsers className="broadcast-stat-icon contacts" />
          <div className="broadcast-stat-info">
            <span className="broadcast-stat-value">{contacts.length}</span>
            <span className="broadcast-stat-label">Contacts</span>
          </div>
        </div>
      </div>

      <div className="broadcast-grid">
        {/* Template Selection */}
        <div className="card broadcast-panel">
          <div className="broadcast-panel-header">
            <h3>Select Template</h3>
            <div className="broadcast-filter-group">
              {['all', 'meta'].map(source => (
                <button
                  key={source}
                  className={`broadcast-filter-btn ${templateSource === source ? 'active' : ''}`}
                  onClick={() => setTemplateSource(source)}
                >
                  {source.charAt(0).toUpperCase() + source.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {allTemplates.length === 0 ? (
            <div className="broadcast-empty">
              <FiFileText />
              <p>No templates available. Create a template first.</p>
            </div>
          ) : (
            <div className="broadcast-list">
              {allTemplates.map(t => (
                <label
                  key={t.id}
                  className={`broadcast-item ${selectedTemplate === String(t.id) ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="template"
                    checked={selectedTemplate === String(t.id)}
                    onChange={() => setSelectedTemplate(String(t.id))}
                  />
                  <div className="broadcast-item-content">
                    <div className="broadcast-item-name">{t.name}</div>
                    <div className="broadcast-item-meta">
                      <span>{t.category}</span>
                      {statusBadge(t.status)}
                      <span className="broadcast-source-badge meta">
                        Meta
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="broadcast-tag-filter">
            <label><FiFilter /> Or filter contacts by tag</label>
            <input
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              placeholder="e.g. vip, customer, lead"
            />
          </div>
        </div>

        {/* Contact Selection */}
        <div className="card broadcast-panel">
          <div className="broadcast-panel-header">
            <h3>
              <FiUsers /> Contacts
              <span className="broadcast-contact-count">{selectedContacts.length}/{contacts.length}</span>
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={selectAll}>
              {selectedContacts.length === contacts.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {contacts.length === 0 ? (
            <div className="broadcast-empty">
              <FiUsers />
              <p>No contacts available. Add contacts first.</p>
            </div>
          ) : (
            <div className="broadcast-list">
              {contacts.map(c => (
                <label
                  key={c.id}
                  className={`broadcast-item ${selectedContacts.includes(c.id) ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedContacts.includes(c.id)}
                    onChange={() => toggleContact(c.id)}
                  />
                  <div className="broadcast-item-content">
                    <div className="broadcast-item-name">{c.name || 'Unknown'}</div>
                    <div className="broadcast-item-phone">{c.phone}</div>
                  </div>
                  {(() => {
                    let tags = c.tags;
                    if (typeof tags === 'string') {
                      try { tags = JSON.parse(tags); } catch(e) { tags = []; }
                    }
                    if (!Array.isArray(tags)) tags = [];
                    return tags.length > 0 && (
                      <div className="broadcast-item-tags">
                        {tags.slice(0, 2).map((tag, i) => (
                          <span key={i} className="broadcast-tag">{tag}</span>
                        ))}
                      </div>
                    );
                  })()}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Launch / Schedule Dispatch Area */}
      <div className="card" style={{ marginTop: 24, padding: 24, background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiSend color="var(--primary)" /> Launch Campaign Dispatch
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Choose whether to transmit messages immediately or set a future schedule.
            </p>
          </div>

          {/* Mode Selector Switch */}
          <div style={{ display: 'flex', background: 'var(--bg)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
            <button
              onClick={() => setScheduleMode(false)}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: !scheduleMode ? 'var(--primary)' : 'transparent',
                color: !scheduleMode ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
              }}
            >
              <FiSend size={14} /> Send Now
            </button>
            <button
              onClick={() => setScheduleMode(true)}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: scheduleMode ? 'var(--primary)' : 'transparent',
                color: scheduleMode ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
              }}
            >
              <FiClock size={14} /> Schedule for Later
            </button>
          </div>
        </div>

        {/* Schedule Time Input Box */}
        {scheduleMode && (
          <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <FiCalendar size={20} color="var(--primary)" />
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                Select Future Date & Time for Dispatch
              </label>
              <input
                type="datetime-local"
                value={scheduleTime}
                onChange={e => setScheduleTime(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--card)',
                  color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600
                }}
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        {scheduleMode ? (
          <button
            className="btn btn-primary"
            onClick={scheduleBroadcast}
            disabled={!selectedTemplate || !scheduleTime}
            style={{ width: '100%', padding: '14px 24px', fontSize: '1rem', fontWeight: 700, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <FiClock size={18} /> Schedule Campaign Dispatch
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={sending || !selectedTemplate}
            style={{ width: '100%', padding: '14px 24px', fontSize: '1rem', fontWeight: 700, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {sending ? (
              <>
                <span className="broadcast-spinner"></span>
                Transmitting Campaign...
              </>
            ) : (
              <>
                <FiSend size={18} />
                Send Immediately to {selectedContacts.length || 'All'} Selected Recipients
              </>
            )}
          </button>
        )}
      </div>

      {/* Scheduled Broadcasts */}
      {scheduledBroadcasts.filter(s => s.status === 'pending' || s.status === 'scheduled').length > 0 && (
        <div className="card" style={{ marginTop: 16, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Scheduled Broadcasts</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {scheduledBroadcasts.filter(s => s.status === 'pending' || s.status === 'scheduled').map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg)', borderRadius: 8 }}>
                <div>
                  <span style={{ fontWeight: 500 }}>{s.template_name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 8 }}>→ {new Date(s.scheduled_at).toLocaleString()}</span>
                </div>
                <button onClick={() => cancelScheduled(s.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Broadcast Progress Bar (Ticket 07) */}
      {jobProgress && (
        <div className="card broadcast-result" style={{ marginTop: 20, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              🚀 Campaign Progress ({jobProgress.status === 'completed' ? 'Completed' : 'Processing...'})
            </h3>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>{jobProgress.percent}%</span>
          </div>
          <div style={{ width: '100%', height: 12, background: 'var(--bg)', borderRadius: 6, overflow: 'hidden', marginBottom: 16, border: '1px solid var(--border)' }}>
            <div style={{
              width: `${jobProgress.percent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #3b82f6, #10b981)',
              transition: 'width 0.4s ease-in-out'
            }} />
          </div>
          <div className="broadcast-result-stats">
            <div className="broadcast-result-item">
              <span className="broadcast-result-value">{jobProgress.total}</span>
              <span className="broadcast-result-label">Total</span>
            </div>
            <div className="broadcast-result-item success">
              <span className="broadcast-result-value">{jobProgress.sent}</span>
              <span className="broadcast-result-label">Sent</span>
            </div>
            <div className="broadcast-result-item danger">
              <span className="broadcast-result-value">{jobProgress.failed}</span>
              <span className="broadcast-result-label">Failed</span>
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="card broadcast-result">
          <h3>Broadcast Result</h3>
          <div className="broadcast-result-stats">
            <div className="broadcast-result-item">
              <span className="broadcast-result-value">{result.total || result.total_contacts}</span>
              <span className="broadcast-result-label">Total</span>
            </div>
            <div className="broadcast-result-item success">
              <span className="broadcast-result-value">{result.sent || 0}</span>
              <span className="broadcast-result-label">Sent</span>
            </div>
            <div className="broadcast-result-item danger">
              <span className="broadcast-result-value">{result.failed || 0}</span>
              <span className="broadcast-result-label">Failed</span>
            </div>
          </div>
          {result.error && (
            <div className="broadcast-result-error">
              {result.error}
              {result.sandbox_errors > 0 && (
                <a href="/settings" className="broadcast-result-link">Complete App Review in Settings →</a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Broadcast History */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiClock /> Broadcast History
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={fetchHistory} disabled={historyLoading}>
            <FiRefreshCw /> Refresh
          </button>
        </div>
        {historyLoading ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Loading history...</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <FiClock size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
            <p>No broadcast history yet. Send your first broadcast above.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Phone</th>
                  <th>Template</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Sent At</th>
                </tr>
              </thead>
              <tbody>
                {history.map(msg => (
                  <tr key={msg.id}>
                    <td>{msg.contact_name || 'Unknown'}</td>
                    <td>{msg.contact_phone}</td>
                    <td>{msg.template_name || (msg.body?.startsWith('Template: ') ? msg.body.replace('Template: ', '') : 'AI Reply')}</td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                        fontSize: '0.75rem', fontWeight: 600,
                        background: msg.template_category === 'marketing' ? '#fce4ec' : msg.template_category === 'message' ? '#f3e5f5' : '#e3f2fd',
                        color: msg.template_category === 'marketing' ? '#c62828' : msg.template_category === 'message' ? '#6a1b9a' : '#1565c0'
                      }}>
                        {msg.template_category === 'message' ? 'AI' : (msg.template_category || '-')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${msg.status === 'sent' ? 'badge-success' : msg.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>
                        {msg.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {new Date(msg.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
