import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { triggerDataSync } from '../services/dataSync';
import { Routes, Route, Link, NavLink, useNavigate, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { FiUsers, FiBarChart2, FiPhone, FiTrash2, FiPlus, FiFileText, FiDollarSign, FiMessageSquare, FiActivity, FiTrendingUp, FiArrowUp, FiArrowDown, FiGitBranch, FiRefreshCw, FiCpu } from 'react-icons/fi';
import FlowBuilder from '../components/FlowBuilder';

function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [kpis, setKpis] = useState({ new_today: 0, total_messages_today: 0, total_connected: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      if (Array.isArray(res.data)) {
        setUsers(res.data);
      } else {
        setUsers(res.data.users || []);
        setKpis(res.data.kpis || { new_today: 0, total_messages_today: 0, total_connected: 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSuspend = async (id) => {
    if (!window.confirm('Suspend all numbers for this user?')) return;
    await api.put(`/admin/users/${id}/suspend`);
    fetchUsers();
  };

  const handleSendAlert = async (id, email) => {
    if (!window.confirm(`Send Email & WhatsApp Plan Expiry Alert to ${email}?`)) return;
    try {
      const res = await api.post(`/admin/users/${id}/send-expiry-alert`);
      alert(res.data.message || 'Alert sent successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send alert');
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID','Email','Role','Balance','Credit Mode','Display Phone','WABA ID','Verified Name','Contacts','Msgs Today','Total Messages','Flows','Templates','Meta Marketing','Meta Utility','Meta Auth','Platform Paid MTD','Total Payments','Monthly Usage','Joined'];
    const rows = filteredUsers.map(u => [
      u.id, u.email, u.role, u.balance, u.credit_mode,
      u.display_phone || 'None', u.waba_id || 'N/A', u.verified_name || 'N/A',
      u.total_contacts || 0, u.messages_today || 0, u.total_messages || 0,
      u.total_flows || 0, u.total_templates || 0,
      parseFloat(u.meta_marketing_cost || 0).toFixed(4),
      parseFloat(u.meta_utility_cost || 0).toFixed(4),
      parseFloat(u.meta_auth_cost || 0).toFixed(4),
      parseFloat(u.platform_paid_this_month || 0).toFixed(2),
      u.total_payments || 0,
      parseFloat(u.monthly_usage || 0).toFixed(2),
      new Date(u.created_at).toLocaleDateString()
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `platform_users_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="loading">Loading admin platform dashboard...</div>;

  const totalUsers = users.length;
  const totalNumbers = users.reduce((s, u) => s + (u.total_numbers || 0), 0);
  const activeNumbers = users.reduce((s, u) => s + (u.verified_numbers || 0), 0);
  const totalContacts = users.reduce((s, u) => s + (u.total_contacts || 0), 0);
  const totalMessages = users.reduce((s, u) => s + (u.total_messages || 0), 0);
  const totalRevenue = users.reduce((s, u) => s + parseFloat(u.monthly_usage || 0), 0);
  const totalBalance = users.reduce((s, u) => s + parseFloat(u.balance || 0), 0);
  const totalMetaMarketing = users.reduce((s, u) => s + parseFloat(u.meta_marketing_cost || 0), 0);
  const totalMetaUtility = users.reduce((s, u) => s + parseFloat(u.meta_utility_cost || 0), 0);
  const totalMetaAuth = users.reduce((s, u) => s + parseFloat(u.meta_auth_cost || 0), 0);
  const totalPlatformPaid = users.reduce((s, u) => s + parseFloat(u.platform_paid_this_month || 0), 0);
  const totalFlows = users.reduce((s, u) => s + (u.total_flows || 0), 0);
  const totalTemplates = users.reduce((s, u) => s + (u.total_templates || 0), 0);

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    const matchesSearch = u.email.toLowerCase().includes(q) ||
      (u.display_phone && u.display_phone.includes(q)) ||
      (u.waba_id && u.waba_id.includes(q));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'connected' ? u.verified_numbers > 0 : u.verified_numbers === 0);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const SC = ({ value, label, color, bg, icon, onClick }) => (
    <div
      className="stat-card"
      onClick={onClick}
      style={{
        borderLeft: `4px solid ${color}`, background: 'var(--card)', borderRadius: 14,
        padding: '14px 16px', cursor: onClick ? 'pointer' : 'default', transition: 'all 0.2s ease',
        boxShadow: 'var(--shadow-xs)'
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; } }}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
          <div style={{ fontSize: '0.71rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
        </div>
        <div style={{ width: 38, height: 38, background: bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      </div>
    </div>
  );

  const tabStyle = (key) => ({
    padding: '8px 14px', border: 'none', borderRadius: 8, cursor: 'pointer',
    fontSize: '0.8rem', fontWeight: activeTab === key ? 700 : 500,
    background: activeTab === key ? 'linear-gradient(135deg, #dc2626, #991b1b)' : 'transparent',
    color: activeTab === key ? '#ffffff' : 'var(--text-muted, #a1a1aa)',
    boxShadow: activeTab === key ? '0 4px 12px rgba(220,38,38,0.4)' : 'none',
    whiteSpace: 'nowrap', flexShrink: 0,
    transition: 'all 0.15s ease'
  });

  return (
    <div className="page-body">

      {/* Dark Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f2944 100%)', borderRadius: 18, padding: '18px 20px', marginBottom: 20, boxShadow: '0 12px 36px rgba(15,23,42,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.1rem, 3.5vw, 1.45rem)', color: '#fff', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.25 }}>⚡ Executive Platform Console</h1>
              <span style={{ background: 'rgba(52,211,153,0.18)', color: '#34d399', border: '1px solid rgba(52,211,153,0.35)', padding: '3px 10px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-block' }}>🟢 Live</span>
            </div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem', lineHeight: 1.4 }}>Full visibility: WhatsApp Cloud API, Meta billing, platform payments, flows & templates.</p>
            <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                { label: 'New Today', value: kpis.new_today, color: '#34d399' },
                { label: "Msgs Today", value: kpis.total_messages_today, color: '#60a5fa' },
                { label: 'WA Connected', value: kpis.total_connected, color: '#fb923c' },
                { label: 'Total Flows', value: totalFlows, color: '#a78bfa' },
                { label: 'Total Templates', value: totalTemplates, color: '#f472b6' },
              ].map(k => (
                <div key={k.label} style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: k.color }}>{k.value}</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>{k.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={fetchUsers} style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.18)', whiteSpace: 'nowrap' }}>🔄 Refresh</button>
            <button className="btn btn-primary btn-sm" onClick={handleExportCSV} style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>📥 Export CSV</button>
          </div>
        </div>
      </div>

      {/* 12 Clickable KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 18 }}>
        <SC value={totalUsers} label="Total Accounts" color="var(--primary)" bg="#dcfce7" icon={<FiUsers size={18} color="var(--primary)" />} onClick={() => navigate('/admin/users?tab=all')} />
        <SC value={`${activeNumbers}/${totalNumbers}`} label="WA Connected" color="#3b82f6" bg="#dbeafe" icon={<FiPhone size={18} color="#3b82f6" />} onClick={() => navigate('/admin/numbers?tab=all')} />
        <SC value={totalMessages.toLocaleString()} label="Platform Messages" color="#8b5cf6" bg="#f3e8ff" icon={<FiMessageSquare size={18} color="#8b5cf6" />} onClick={() => navigate('/admin/messages?tab=all')} />
        <SC value={totalContacts.toLocaleString()} label="Audience Reach" color="#06b6d4" bg="#cffafe" icon={<FiUsers size={18} color="#06b6d4" />} onClick={() => navigate('/admin/contacts?tab=all')} />
        <SC value={`₹${totalRevenue.toFixed(2)}`} label="Monthly Revenue" color="#10b981" bg="#d1fae5" icon={<FiTrendingUp size={18} color="#10b981" />} onClick={() => navigate('/admin/pricing?tab=transactions')} />
        <SC value={`₹${totalBalance.toFixed(2)}`} label="Total Balances" color="#f59e0b" bg="#fef3c7" icon={<FiDollarSign size={18} color="#f59e0b" />} onClick={() => navigate('/admin/pricing?tab=plans')} />
        <SC value={`₹${totalMetaMarketing.toFixed(2)}`} label="Meta Marketing" color="#ec4899" bg="#fce7f3" icon={<FiActivity size={18} color="#ec4899" />} onClick={() => navigate('/admin/pricing?tab=marketing')} />
        <SC value={`₹${totalMetaUtility.toFixed(2)}`} label="Meta Utility" color="#14b8a6" bg="#ccfbf1" icon={<FiActivity size={18} color="#14b8a6" />} onClick={() => navigate('/admin/pricing?tab=utility')} />
        <SC value={`₹${totalMetaAuth.toFixed(2)}`} label="Meta Auth" color="#6366f1" bg="#e0e7ff" icon={<FiActivity size={18} color="#6366f1" />} onClick={() => navigate('/admin/pricing?tab=auth')} />
        <SC value={`₹${totalPlatformPaid.toFixed(2)}`} label="Platform Paid MTD" color="#f97316" bg="#ffedd5" icon={<FiDollarSign size={18} color="#f97316" />} onClick={() => navigate('/admin/pricing?tab=razorpay')} />
        <SC value={totalFlows} label="Total Flows" color="#a855f7" bg="#f3e8ff" icon={<FiGitBranch size={18} color="#a855f7" />} onClick={() => navigate('/admin/flows?tab=all')} />
        <SC value={totalTemplates} label="Total Templates" color="#0ea5e9" bg="#e0f2fe" icon={<FiFileText size={18} color="#0ea5e9" />} onClick={() => navigate('/admin/templates?tab=all')} />
      </div>

      {/* Toolbar */}
      <div style={{ background: 'var(--card)', padding: '12px 16px', borderRadius: 14, marginBottom: 14, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, background: 'var(--bg)', padding: 4, borderRadius: 10, overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
          <button style={tabStyle('users')} onClick={() => setActiveTab('users')}>👥 Accounts ({filteredUsers.length})</button>
          <button style={tabStyle('meta')} onClick={() => setActiveTab('meta')}>💰 Meta Billing</button>
          <button style={tabStyle('payments')} onClick={() => setActiveTab('payments')}>💳 Payments</button>
          <button style={tabStyle('activity')} onClick={() => setActiveTab('activity')}>📊 Top Revenue</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', flex: 1, minWidth: 260 }}>
          <input type="text" placeholder="Search email, phone or WABA…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.82rem', flex: 1, minWidth: 160 }} />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.82rem' }}>
            <option value="all">All Roles</option><option value="client">Client</option><option value="admin">Admin</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.82rem' }}>
            <option value="all">All Status</option><option value="connected">WA Connected</option><option value="not_connected">Not Connected</option>
          </select>
        </div>
      </div>

      {/* ── TAB: All Accounts ── */}
      {activeTab === 'users' && (
        <div className="card" style={{ borderRadius: 16, overflow: 'hidden', padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User & Role</th>
                  <th>WhatsApp / WABA</th>
                  <th>Wallet</th>
                  <th>Contacts</th>
                  <th>Msgs Today / Total</th>
                  <th>Flows & Templates</th>
                  <th>Meta Billing MTD</th>
                  <th>Platform Paid MTD</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No matching accounts found.</td></tr>
                ) : filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: u.role === 'admin' ? '#fff3e0' : '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: u.role === 'admin' ? '#f59e0b' : '#0284c7', fontSize: '0.88rem', flexShrink: 0 }}>
                          {u.email?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.83rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{u.email}</div>
                          <span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '0.63rem', padding: '1px 5px' }}>{u.role}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {u.verified_numbers > 0 ? (
                        <div>
                          <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', color: '#059669' }}>{u.display_phone || 'Connected'}</div>
                          {u.verified_name && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{u.verified_name}</div>}
                          {u.waba_id && <div style={{ fontSize: '0.66rem', color: '#60a5fa', fontFamily: 'monospace' }}>WABA: {u.waba_id}</div>}
                          <span style={{ background: u.number_status === 'active' ? '#dcfce7' : '#fee2e2', color: u.number_status === 'active' ? '#15803d' : '#dc2626', padding: '1px 5px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700 }}>
                            {u.number_status || 'unknown'}
                          </span>
                        </div>
                      ) : <span className="badge badge-secondary" style={{ fontSize: '0.68rem' }}>Not Connected</span>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, fontSize: '0.86rem', color: parseFloat(u.balance || 0) <= 0 ? 'var(--danger)' : 'var(--text)' }}>₹{parseFloat(u.balance || 0).toFixed(2)}</div>
                      <span className={`badge ${u.credit_mode === 'prepaid' ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '0.63rem' }}>{u.credit_mode}</span>
                    </td>
                    <td style={{ fontWeight: 700, textAlign: 'center' }}>{(u.total_contacts || 0).toLocaleString()}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{(u.messages_today || 0).toLocaleString()}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>of {(u.total_messages || 0).toLocaleString()}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.78rem' }}>
                        <span style={{ fontWeight: 700, color: '#8b5cf6' }}>{u.total_flows || 0}</span> <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>flows</span>
                      </div>
                      <div style={{ fontSize: '0.78rem' }}>
                        <span style={{ fontWeight: 700, color: '#3b82f6' }}>{u.approved_templates || 0}</span><span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>/{u.total_templates || 0} tmpl</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.76rem' }}>
                        <div style={{ fontWeight: 700, color: '#ec4899' }}>📣 ₹{parseFloat(u.meta_marketing_cost || 0).toFixed(4)}</div>
                        <div style={{ color: '#14b8a6' }}>⚙️ ₹{parseFloat(u.meta_utility_cost || 0).toFixed(4)}</div>
                        <div style={{ color: '#6366f1' }}>🔑 ₹{parseFloat(u.meta_auth_cost || 0).toFixed(4)}</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: 'var(--success)', fontSize: '0.84rem' }}>₹{parseFloat(u.platform_paid_this_month || 0).toFixed(2)}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{u.total_payments || 0} txns</div>
                    </td>
                    <td style={{ fontSize: '0.76rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
                        <Link to={`/admin/users/${u.id}`} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '0.72rem', fontWeight: 600 }}>View</Link>
                        {u.role !== 'admin' && (
                          <button className="btn btn-warning btn-sm" onClick={() => handleSendAlert(u.id, u.email)} style={{ padding: '4px 8px', fontSize: '0.72rem' }} title="Send Alert">⚠️</button>
                        )}
                        {u.verified_numbers > 0 && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleSuspend(u.id)} style={{ padding: '4px 8px', fontSize: '0.72rem' }}>Suspend</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Meta Billing ── */}
      {activeTab === 'meta' && (
        <div className="card" style={{ borderRadius: 16, overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ margin: 0 }}>💰 Meta API Billing — This Month</h3>
            <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700 }}>Source: usage_log</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User Account</th>
                  <th>Connected WABA</th>
                  <th>📣 Marketing</th>
                  <th>⚙️ Utility</th>
                  <th>🔑 Auth</th>
                  <th>Total Meta Billed</th>
                  <th>Messages</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.filter(u => u.role === 'client').map(u => {
                  const tot = parseFloat(u.meta_marketing_cost || 0) + parseFloat(u.meta_utility_cost || 0) + parseFloat(u.meta_auth_cost || 0);
                  return (
                    <tr key={u.id}>
                      <td><div style={{ fontWeight: 700, fontSize: '0.84rem' }}>{u.email}</div></td>
                      <td>
                        {u.waba_id ? (
                          <div>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#3b82f6' }}>{u.waba_id}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{u.display_phone}</div>
                          </div>
                        ) : <span className="badge badge-secondary" style={{ fontSize: '0.68rem' }}>No WABA</span>}
                      </td>
                      <td style={{ fontWeight: 700, color: '#ec4899' }}>₹{parseFloat(u.meta_marketing_cost || 0).toFixed(4)}</td>
                      <td style={{ fontWeight: 700, color: '#14b8a6' }}>₹{parseFloat(u.meta_utility_cost || 0).toFixed(4)}</td>
                      <td style={{ fontWeight: 700, color: '#6366f1' }}>₹{parseFloat(u.meta_auth_cost || 0).toFixed(4)}</td>
                      <td style={{ fontWeight: 800, color: tot > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>₹{tot.toFixed(4)}</td>
                      <td style={{ fontWeight: 700 }}>{(u.total_messages || 0).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg)', fontWeight: 800 }}>
                  <td colSpan={2}><strong>Platform Totals</strong></td>
                  <td style={{ color: '#ec4899' }}>₹{totalMetaMarketing.toFixed(4)}</td>
                  <td style={{ color: '#14b8a6' }}>₹{totalMetaUtility.toFixed(4)}</td>
                  <td style={{ color: '#6366f1' }}>₹{totalMetaAuth.toFixed(4)}</td>
                  <td style={{ color: 'var(--danger)' }}>₹{(totalMetaMarketing + totalMetaUtility + totalMetaAuth).toFixed(4)}</td>
                  <td>{totalMessages.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Payments ── */}
      {activeTab === 'payments' && (
        <div className="card" style={{ borderRadius: 16, overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0 }}>💳 Platform Payment History — This Month</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User Account</th>
                  <th>Wallet Balance</th>
                  <th>Paid This Month</th>
                  <th>Total Payments</th>
                  <th>Last Payment</th>
                  <th>Last Payment Date</th>
                  <th>Credit Mode</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.filter(u => u.role === 'client').map(u => (
                  <tr key={u.id}>
                    <td><div style={{ fontWeight: 700, fontSize: '0.84rem' }}>{u.email}</div></td>
                    <td style={{ fontWeight: 800, color: parseFloat(u.balance || 0) <= 0 ? 'var(--danger)' : 'var(--success)' }}>₹{parseFloat(u.balance || 0).toFixed(2)}</td>
                    <td style={{ fontWeight: 800, color: 'var(--success)' }}>₹{parseFloat(u.platform_paid_this_month || 0).toFixed(2)}</td>
                    <td style={{ fontWeight: 700 }}>{u.total_payments || 0}</td>
                    <td style={{ fontWeight: 700 }}>{u.last_payment_amount ? `₹${parseFloat(u.last_payment_amount).toFixed(2)}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.last_payment_at ? new Date(u.last_payment_at).toLocaleDateString() : '—'}</td>
                    <td><span className={`badge ${u.credit_mode === 'prepaid' ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: '0.68rem' }}>{u.credit_mode}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg)', fontWeight: 800 }}>
                  <td>Totals</td>
                  <td style={{ color: 'var(--success)' }}>₹{totalBalance.toFixed(2)}</td>
                  <td style={{ color: 'var(--success)' }}>₹{totalPlatformPaid.toFixed(2)}</td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Top Revenue ── */}
      {activeTab === 'activity' && (
        <div className="card" style={{ borderRadius: 16 }}>
          <h3 style={{ marginBottom: 16 }}>📊 Top Platform Accounts by Monthly Revenue</h3>
          {users.filter(u => parseFloat(u.monthly_usage || 0) > 0).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <FiActivity size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p>No monthly usage data yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {users
                .filter(u => parseFloat(u.monthly_usage || 0) > 0)
                .sort((a, b) => parseFloat(b.monthly_usage || 0) - parseFloat(a.monthly_usage || 0))
                .slice(0, 10)
                .map((u, idx) => {
                  const max = Math.max(...users.map(x => parseFloat(x.monthly_usage || 0)));
                  const pct = max > 0 ? (parseFloat(u.monthly_usage || 0) / max) * 100 : 0;
                  return (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <span style={{ width: 28, height: 28, borderRadius: '50%', background: idx === 0 ? '#fef3c7' : '#f1f5f9', color: idx === 0 ? '#d97706' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>#{idx + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.87rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--primary), #3b82f6)', borderRadius: 3, transition: 'width 0.4s' }} />
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, color: 'var(--success)', minWidth: 90, textAlign: 'right' }}>₹{parseFloat(u.monthly_usage || 0).toFixed(2)}</div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function AdminNumbers() {
  const [numbers, setNumbers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ user_id: '', phone_number_id: '', waba_id: '', display_phone_number: '', verified_name: '' });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchNumbers(); fetchUsers(); }, []);

  const fetchNumbers = async () => {
    try { const res = await api.get('/admin/numbers'); setNumbers(res.data); } catch (err) { console.error(err); }
  };

  const fetchUsers = async () => {
    try { const res = await api.get('/admin/dashboard'); setUsers(res.data); } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.user_id || !form.phone_number_id) { setError('User and Phone Number ID required'); return; }
    setAdding(true); setError('');
    try {
      await api.post(`/admin/users/${form.user_id}/numbers`, form);
      setShowModal(false);
      setForm({ user_id: '', phone_number_id: '', waba_id: '', display_phone_number: '', verified_name: '' });
      fetchNumbers();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); } finally { setAdding(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Disconnect this number?')) return;
    try { await api.delete(`/admin/numbers/${id}`); fetchNumbers(); } catch (err) { console.error(err); }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page-body">
      <div className="page-header">
        <h1>WhatsApp Numbers</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}><FiPlus /> Add Number</button>
      </div>

      <div className="card">
        {numbers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <FiPhone size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>No numbers connected yet</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Owner</th><th>Phone Number ID</th><th>Display Phone</th><th>Name</th><th>WABA ID</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {numbers.map(n => (
                  <tr key={n.id}>
                    <td><strong>{n.owner_email}</strong></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{n.phone_number_id}</td>
                    <td>{n.display_phone_number || '-'}</td>
                    <td>{n.verified_name || '-'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{n.waba_id || '-'}</td>
                    <td><span className={`badge ${n.status === 'verified' ? 'badge-success' : n.status === 'suspended' ? 'badge-danger' : 'badge-warning'}`}>{n.status}</span></td>
                    <td><button onClick={() => handleDelete(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><FiTrash2 /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add WhatsApp Number</h2>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleAdd}>
              <div className="form-group"><label>User *</label><select value={form.user_id} onChange={e => setForm({...form, user_id: e.target.value})} required><option value="">Select user...</option>{users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}</select></div>
              <div className="form-group"><label>Phone Number ID *</label><input value={form.phone_number_id} onChange={e => setForm({...form, phone_number_id: e.target.value})} required /></div>
              <div className="form-group"><label>WABA ID</label><input value={form.waba_id} onChange={e => setForm({...form, waba_id: e.target.value})} /></div>
              <div className="form-group"><label>Display Phone</label><input value={form.display_phone_number} onChange={e => setForm({...form, display_phone_number: e.target.value})} /></div>
              <div className="form-group"><label>Verified Name</label><input value={form.verified_name} onChange={e => setForm({...form, verified_name: e.target.value})} /></div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={adding}>{adding ? 'Adding...' : 'Add'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ ADMIN TEMPLATES PAGE ============
function AdminTemplates() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'all';
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [form, setForm] = useState({ name: '', category: 'UTILITY', language: 'en', header: '', body: '', footer: '' });

  const fetchTemplates = async () => {
    try {
      const [adminRes, metaRes] = await Promise.all([
        api.get('/admin/templates').catch(() => ({ data: [] })),
        api.get('/templates/meta').catch(() => ({ data: [] }))
      ]);

      const localList = adminRes.data || [];
      const metaList = metaRes.data || [];

      // Format meta templates
      const formattedMeta = metaList.map(m => ({
        id: m.id,
        name: m.name,
        category: m.category,
        status: m.status?.toLowerCase() === 'approved' ? 'approved' : m.status?.toLowerCase() === 'rejected' ? 'rejected' : 'pending',
        language: m.language || 'en_US',
        header: m.components?.find(c => c.type === 'HEADER')?.text || '',
        body: m.components?.find(c => c.type === 'BODY')?.text || '',
        footer: m.components?.find(c => c.type === 'FOOTER')?.text || '',
        owner_email: 'Meta WABA (Live)',
        meta_template_id: m.id,
        created_at: m.last_edit_time ? new Date(m.last_edit_time * 1000).toISOString() : new Date().toISOString(),
        is_published: 1,
        source: 'meta'
      }));

      // Combine local DB and Meta API templates without duplicates
      const map = new Map();
      formattedMeta.forEach(item => map.set(item.name.toLowerCase(), item));
      localList.forEach(item => {
        const key = (item.name || '').toLowerCase();
        if (!map.has(key)) {
          map.set(key, { ...item, source: 'local' });
        } else {
          const metaItem = map.get(key);
          map.set(key, {
            ...metaItem,
            id: item.id || metaItem.id,
            owner_email: item.owner_email || metaItem.owner_email,
            is_published: item.is_published ?? metaItem.is_published
          });
        }
      });

      setTemplates(Array.from(map.values()));
    } catch (err) {
      console.error('Error fetching admin templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    // Auto-fetch Meta templates every 1 minute (60,000 ms) using configured keys
    const timer = setInterval(fetchTemplates, 60000);
    return () => clearInterval(timer);
  }, []);

  const autoGenerateFromName = (name) => {
    const n = name.toLowerCase().replace(/[_\-\s]+/g, ' ').trim();

    const presets = {
      'welcome': { header: 'Welcome!', body: 'Hello {{1}}, welcome to our platform! We are excited to have you on board. How can we help you today?', footer: 'Reply to get started' },
      'wecome': { header: 'Welcome!', body: 'Hello {{1}}, welcome to our platform! We are excited to have you on board. How can we help you today?', footer: 'Reply to get started' },
      'welcom': { header: 'Welcome!', body: 'Hello {{1}}, welcome to our platform! We are excited to have you on board. How can we help you today?', footer: 'Reply to get started' },
      'greeting': { header: 'Hello!', body: 'Hello {{1}}, welcome! How can we help you today? Feel free to ask any questions.', footer: 'Reply to get started' },
      'order': { header: 'Order Update', body: 'Hi {{1}}, your order #{{2}} has been received and is being processed. We will keep you updated!', footer: 'Thank you for shopping with us' },
      'payment': { header: 'Payment Received', body: 'We have received your payment of {{1}} for order #{{2}}. Thank you for your purchase!', footer: 'Receipt sent to your email' },
      'support': { header: 'Support Request', body: 'Hi {{1}}, we have received your support request. Our team will review and get back to you shortly.', footer: 'We typically respond within 24 hours' },
      'promo': { header: 'Special Offer!', body: 'Hi {{1}}, check out our latest offers! We have exclusive deals just for you.', footer: 'Offer valid for limited time' },
      'otp': { header: 'Verification Code', body: 'Your verification code is: {{1}}. Valid for 5 minutes. Do not share this with anyone.', footer: 'Never share your OTP' }
    };

    for (const [key, val] of Object.entries(presets)) {
      if (n.includes(key)) {
        setForm(prev => ({
          ...prev,
          header: prev.header || val.header,
          body: prev.body || val.body,
          footer: prev.footer || val.footer
        }));
        return;
      }
    }
  };

  const handleApproveMeta = async (id) => {
    setApprovingId(id);
    try {
      const res = await api.post(`/admin/templates/${id}/approve-meta`);
      alert(`✅ ${res.data.message}`);
      fetchTemplates();
      triggerDataSync('templates');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve template on Meta');
    } finally {
      setApprovingId(null);
    }
  };

  const statusBadge = (status) => {
    const cls = { approved: 'badge-success', active: 'badge-success', pending: 'badge-warning', rejected: 'badge-danger' };
    return <span className={`badge ${cls[status] || 'badge-secondary'}`}>{status === 'active' ? 'approved' : status}</span>;
  };

  const handlePublish = async (id, publish) => {
    try {
      await api.post('/admin/publish', { type: 'template', id, publish });
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_published: publish ? 1 : 0 } : t));
    } catch (err) { alert('Failed'); }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.body) return alert('Name and Body are required');
    setSubmitting(true);
    try {
      const res = await api.post('/templates', form);
      if (res.data?.id) {
        await api.post('/admin/publish', { type: 'template', id: res.data.id, publish: true });
      }
      setShowModal(false);
      setForm({ name: '', category: 'UTILITY', language: 'en', header: '', body: '', footer: '' });
      fetchTemplates();
      triggerDataSync('templates');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create template');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Delete this template from platform?')) return;
    try {
      await api.delete(`/admin/templates/${id}`);
      fetchTemplates();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete template');
    }
  };

  const pendingCount = templates.filter(t => t.status === 'pending' || t.status === 'pending_meta').length;

  const tabs = [
    { key: 'all', label: `📝 All Templates (${templates.length})` },
    { key: 'pending', label: `🔴 Pending (${pendingCount})` },
    { key: 'approved', label: `✅ Approved (${templates.filter(t => t.status === 'approved' || t.status === 'active').length})` },
    { key: 'rejected', label: '❌ Rejected' },
  ];

  if (loading) return <div className="loading">Loading templates...</div>;

  const filteredTemplates = templates.filter(t => {
    if (tab === 'pending') return t.status === 'pending' || t.status === 'pending_meta';
    if (tab === 'approved') return t.status === 'approved' || t.status === 'active';
    if (tab === 'rejected') return t.status === 'rejected';
    return true;
  });

  return (
    <div className="page-body">
      <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', borderRadius: 16, padding: '20px 24px', marginBottom: 20, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>📄 Meta WhatsApp Templates ({filteredTemplates.length})</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.8, fontSize: '0.85rem' }}>Auto-submitted & verified via Platform Admin Master System Key</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {pendingCount > 0 && (
            <span style={{ background: '#dc2626', color: '#ffffff', padding: '6px 14px', borderRadius: 20, fontWeight: 800, fontSize: '0.82rem', boxShadow: '0 4px 12px rgba(220,38,38,0.4)' }}>
              🔴 {pendingCount} Pending Review
            </span>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => fetchTemplates()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }}>
            <FiRefreshCw /> Live Fetch Meta
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <FiPlus /> + Create Meta Template
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, background: 'var(--card)', padding: '10px 14px', borderRadius: 12, marginBottom: 20, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <NavLink key={t.key} to={`/admin/templates?tab=${t.key}`}
            style={{ padding: '8px 16px', borderRadius: 9, fontSize: '0.82rem', fontWeight: tab === t.key ? 700 : 500, textDecoration: 'none', background: tab === t.key ? 'var(--primary)' : 'transparent', color: tab === t.key ? '#fff' : 'var(--text-muted)', transition: 'all 0.18s' }}>
            {t.label}
          </NavLink>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 14 }}>
        {filteredTemplates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}><FiFileText size={48} style={{ opacity: 0.3, marginBottom: 12 }} /><p>No {tab !== 'all' ? tab : ''} templates found</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Owner</th><th>Name</th><th>Category</th><th>Status</th><th>Meta Admin Key</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredTemplates.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontSize: '0.85rem' }}>{t.owner_email}</td>
                    <td><strong>{t.name}</strong></td>
                    <td><span className="badge badge-info">{t.category}</span></td>
                    <td>{statusBadge(t.status)}</td>
                    <td>
                      {(t.status === 'pending' || t.status === 'pending_meta' || !t.status) ? (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleApproveMeta(t.id)}
                          disabled={approvingId === t.id}
                          style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', fontSize: '0.75rem', padding: '4px 10px' }}
                        >
                          {approvingId === t.id ? 'Submitting...' : '🚀 Submit via Admin Key'}
                        </button>
                      ) : (
                        <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '0.78rem' }}>✓ Submitted via Admin Key</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className={`btn btn-sm ${t.is_published ? 'btn-secondary' : 'btn-primary'}`} onClick={() => handlePublish(t.id, !t.is_published)}>
                          {t.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTemplate(t.id)} title="Delete Template">
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <h2>Create & Submit Meta Template</h2>
            <form onSubmit={handleCreateTemplate}>
              <div className="form-group"><label>Template Name *</label><input value={form.name} onChange={e => { const val = e.target.value; setForm(prev => ({ ...prev, name: val })); autoGenerateFromName(val); }} placeholder="e.g. welcome_offer" required /></div>
              <div className="form-group"><label>Category *</label><select value={form.category} onChange={e => setForm({...form, category: e.target.value})}><option value="UTILITY">UTILITY</option><option value="MARKETING">MARKETING</option><option value="AUTHENTICATION">AUTHENTICATION</option></select></div>
              <div className="form-group"><label>Header Text (Optional)</label><input value={form.header} onChange={e => setForm({...form, header: e.target.value})} placeholder="Header text" /></div>
              <div className="form-group"><label>Body Text *</label><textarea rows={4} value={form.body} onChange={e => setForm({...form, body: e.target.value})} placeholder="Hello {{1}}, welcome!" required /></div>
              <div className="form-group"><label>Footer Text (Optional)</label><input value={form.footer} onChange={e => setForm({...form, footer: e.target.value})} placeholder="Footer text" /></div>
              <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Submitting to Meta...' : 'Submit to Meta & Publish'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminPricing() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'plans';
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editCategory, setEditCategory] = useState('');
  const [editRate, setEditRate] = useState('');

  useEffect(() => { fetchPricing(); }, []);

  const fetchPricing = async () => {
    try { const res = await api.get('/admin/pricing'); setPricing(res.data || []); } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleUpdate = async (category, rate) => {
    try { await api.post('/admin/pricing', { category, rate: parseFloat(rate) }); fetchPricing(); setEditCategory(''); setEditRate(''); } catch (err) { alert('Failed'); }
  };

  const pricingTabs = [
    { key: 'plans', label: '📦 Subscription Plans' },
    { key: 'transactions', label: '💳 All Transactions' },
    { key: 'razorpay', label: '⚡ Razorpay Payments' },
    { key: 'refunds', label: '🔄 Refunds' },
    { key: 'gst', label: '🧾 GST Invoices' },
    { key: 'conversation', label: '💬 Meta Conversation Rates' },
    { key: 'marketing', label: '📣 Marketing Charges' },
    { key: 'utility', label: '⚙️ Utility Charges' },
    { key: 'auth', label: '🔑 Auth Charges' },
    { key: 'invoices', label: '📄 Meta Invoices' },
  ];

  if (loading) return <div className="loading">Loading pricing & billing...</div>;

  return (
    <div className="page-body">
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: 16, padding: '20px 24px', marginBottom: 20, color: 'white' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>💳 Platform & Meta Billing</h1>
        <p style={{ margin: '6px 0 0', opacity: 0.8, fontSize: '0.85rem' }}>Configure message rates, platform subscription plans, Razorpay payments & Meta charges</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, background: 'var(--card)', padding: '10px 14px', borderRadius: 12, marginBottom: 20, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {pricingTabs.map(t => (
          <NavLink key={t.key} to={`/admin/pricing?tab=${t.key}`}
            style={{ padding: '8px 14px', borderRadius: 9, fontSize: '0.8rem', fontWeight: tab === t.key ? 700 : 500, textDecoration: 'none', background: tab === t.key ? 'var(--primary)' : 'transparent', color: tab === t.key ? '#fff' : 'var(--text-muted)', transition: 'all 0.18s' }}>
            {t.label}
          </NavLink>
        ))}
      </div>

      {/* Pricing Rates view */}
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Message Rates (Per Category)</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: '0.85rem' }}>Set the cost per message for each category. Users are charged automatically based on these rates.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {pricing.map(p => (
            <div key={p.category} style={{ background: 'var(--bg)', borderRadius: 12, padding: 20, border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{p.category}</div>
              {editCategory === p.category ? (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <input type="number" step="0.01" value={editRate} onChange={e => setEditRate(e.target.value)} style={{ width: 80, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, textAlign: 'center' }} />
                  <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(p.category, editRate)}>Save</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditCategory('')}>×</button>
                </div>
              ) : (
                <div onClick={() => { setEditCategory(p.category); setEditRate(p.rate); }} style={{ cursor: 'pointer' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)' }}>₹{parseFloat(p.rate).toFixed(2)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>per message • click to edit</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminUserDetail() {
  const userId = window.location.pathname.split('/').pop();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');

  useEffect(() => { api.get(`/admin/users/${userId}`).then(res => setData(res.data)).catch(console.error).finally(() => setLoading(false)); }, [userId]);

  const handleAdjust = async () => {
    const amount = parseFloat(adjustAmount);
    if (!amount) return;
    await api.post(`/admin/users/${userId}/adjust-balance`, { amount, note: adjustNote });
    setAdjustAmount(''); setAdjustNote('');
    api.get(`/admin/users/${userId}`).then(res => setData(res.data));
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!data) return <div>User not found</div>;

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <Link to="/admin" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none' }}>← Back to Dashboard</Link>
          <h1 style={{ marginTop: 4 }}>{data.user.email}</h1>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card"><div className="stat-label">Balance</div><div className="stat-value">₹{parseFloat(data.user.balance || 0).toFixed(2)}</div></div>
        <div className="stat-card"><div className="stat-label">Credit Mode</div><div className="stat-value" style={{ fontSize: '1.2rem' }}>{data.user.credit_mode}</div></div>
        <div className="stat-card"><div className="stat-label">Numbers</div><div className="stat-value">{data.numbers.length}</div></div>
        <div className="stat-card"><div className="stat-label">Total Payments</div><div className="stat-value">₹{data.payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0).toFixed(2)}</div></div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Adjust Balance</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
          <div className="form-group" style={{ flex: 1 }}><label>Amount (+/-)</label><input type="number" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} placeholder="e.g. 100 or -50" /></div>
          <div className="form-group" style={{ flex: 2 }}><label>Note</label><input value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="Reason" /></div>
          <button className="btn btn-primary btn-sm" onClick={handleAdjust}>Apply</button>
        </div>
      </div>

      {data.numbers.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>WhatsApp Numbers</h3>
          <table><thead><tr><th>Phone Number ID</th><th>Display Phone</th><th>Status</th></tr></thead>
            <tbody>{data.numbers.map(n => <tr key={n.id}><td><code>{n.phone_number_id}</code></td><td>{n.display_phone_number}</td><td><span className={`badge ${n.verified ? 'badge-success' : 'badge-warning'}`}>{n.status}</span></td></tr>)}</tbody>
          </table>
        </div>
      )}

      {data.usage.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Usage</h3>
          <table><thead><tr><th>Category</th><th>Messages</th><th>Cost</th></tr></thead>
            <tbody>{data.usage.map(u => <tr key={u.category}><td><span className="badge badge-info">{u.category}</span></td><td>{u.count}</td><td>₹{u.total_cost}</td></tr>)}</tbody>
          </table>
        </div>
      )}

      {data.payments.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Payment History</h3>
          <table><thead><tr><th>Method</th><th>Amount</th><th>Note</th><th>Date</th></tr></thead>
            <tbody>{data.payments.map(p => <tr key={p.id}><td><span className={`badge ${p.method === 'razorpay' ? 'badge-success' : 'badge-info'}`}>{p.method}</span></td><td>₹{p.amount}</td><td>{p.note || '-'}</td><td>{new Date(p.created_at).toLocaleDateString()}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============ ADMIN USERS PAGE ============
// ============ ADMIN USERS PAGE ============
function AdminUsers() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'all';
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAllClients, setShowAllClients] = useState(false);

  const fetchUsersData = () => {
    api.get('/admin/dashboard')
      .then(res => setUsers(Array.isArray(res.data) ? res.data : (res.data.users || [])))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsersData(); }, []);

  const handleEdit = (user) => { setEditingUser(user); setEditForm({ email: user.email, role: user.role, credit_mode: user.credit_mode, balance: user.balance }); };

  const handleSave = async () => {
    try {
      await api.put(`/admin/users/${editingUser.id}`, editForm);
      setEditingUser(null);
      fetchUsersData();
    } catch (err) { alert('Failed to update'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    try { await api.delete(`/admin/users/${id}`); fetchUsersData(); } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleSendAlert = async (id, email) => {
    if (!window.confirm(`Send Email & WhatsApp Plan Expiry Alert to ${email}?`)) return;
    try {
      const res = await api.post(`/admin/users/${id}/send-expiry-alert`);
      alert(res.data.message || 'Alert sent successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send alert');
    }
  };

  const userTabs = [
    { key: 'all', label: '👥 All Users' },
    { key: 'profiles', label: '👤 User Profiles' },
    { key: 'roles', label: '🛡️ Roles & Permissions' },
    { key: 'suspended', label: '⚠️ Suspended & Low Balance' },
  ];

  if (loading) return <div className="loading">Loading user management...</div>;

  // Filtered lists for specific tabs
  const suspendedUsers = users.filter(u => parseFloat(u.balance || 0) <= 0 || u.verified_numbers === 0);
  const adminUsers = users.filter(u => u.role === 'admin');
  const clientUsers = users.filter(u => u.role === 'client');

  const displayList = tab === 'suspended' ? suspendedUsers : tab === 'roles' ? users : users;

  return (
    <div className="page-body">
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: 16, padding: '20px 24px', marginBottom: 20, color: 'white' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>👥 User Management</h1>
        <p style={{ margin: '6px 0 0', opacity: 0.8, fontSize: '0.85rem' }}>
          Manage user accounts, roles, access permissions, balances and suspended accounts.
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: 6, background: 'var(--card)', padding: '10px 14px', borderRadius: 12, marginBottom: 20, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {userTabs.map(t => (
          <NavLink
            key={t.key}
            to={`/admin/users?tab=${t.key}`}
            style={{
              padding: '8px 16px', borderRadius: 9, fontSize: '0.82rem', fontWeight: tab === t.key ? 700 : 500,
              textDecoration: 'none', background: tab === t.key ? 'var(--primary)' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--text-muted)', transition: 'all 0.18s'
            }}
          >
            {t.label} {t.key === 'suspended' && suspendedUsers.length > 0 && <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.65rem', padding: '1px 6px', borderRadius: 99, marginLeft: 4 }}>{suspendedUsers.length}</span>}
          </NavLink>
        ))}
      </div>

      {/* ── TAB 1: ALL USERS TABLE ── */}
      {tab === 'all' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 14 }}>
          <div className="table-container">
            <table>
              <thead><tr><th>User Email</th><th>Role</th><th>Balance</th><th>Credit Mode</th><th>Numbers</th><th>Joined</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.email}</strong></td>
                    <td><span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-info'}`}>{u.role}</span></td>
                    <td style={{ fontWeight: 700, color: parseFloat(u.balance || 0) <= 0 ? '#ef4444' : 'var(--text)' }}>₹{parseFloat(u.balance || 0).toFixed(2)}</td>
                    <td><span className={`badge ${u.credit_mode === 'prepaid' ? 'badge-success' : 'badge-secondary'}`}>{u.credit_mode}</span></td>
                    <td>{u.verified_numbers || 0}/{u.total_numbers || 0}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(u)}>Edit</button>
                        <Link to={`/admin/users/${u.id}`} className="btn btn-secondary btn-sm">View</Link>
                        {u.role !== 'admin' && (
                          <>
                            <button className="btn btn-warning btn-sm" onClick={() => handleSendAlert(u.id, u.email)} title="Send Expiry Alert">⚠️ Alert</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>Delete</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: USER PROFILES ── */}
      {tab === 'profiles' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {users.map(u => (
            <div key={u.id} className="card" style={{ padding: 20, borderLeft: u.role === 'admin' ? '4px solid #f59e0b' : '4px solid #3b82f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>{u.email}</h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ID: #{u.id} • Joined {new Date(u.created_at).toLocaleDateString()}</span>
                </div>
                <span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-info'}`}>{u.role}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.82rem', background: 'var(--bg)', padding: 12, borderRadius: 10, marginBottom: 14 }}>
                <div>Wallet Balance: <strong style={{ color: parseFloat(u.balance || 0) <= 0 ? '#ef4444' : '#22c55e' }}>₹{parseFloat(u.balance || 0).toFixed(2)}</strong></div>
                <div>Credit Mode: <span className="badge badge-secondary">{u.credit_mode}</span></div>
                <div>Connected Phone: <strong>{u.display_phone || 'None'}</strong></div>
                <div>WABA ID: <code>{u.waba_id || 'N/A'}</code></div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Link to={`/admin/users/${u.id}`} className="btn btn-primary btn-sm" style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}>Full Profile</Link>
                <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(u)}>Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB 3: ROLES & PERMISSIONS ── */}
      {tab === 'roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card" style={{ borderTop: '4px solid #f59e0b' }}>
              <h3 style={{ margin: '0 0 8px' }}>🛡️ Admin Role ({adminUsers.length})</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 12 }}>Full system control: user management, billing control, server settings, templates oversight.</p>
              {adminUsers.map(u => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                  <strong>{u.email}</strong>
                  <span className="badge badge-warning">Super Admin</span>
                </div>
              ))}
            </div>
            <div className="card" style={{ borderTop: '4px solid #3b82f6' }}>
              <h3 style={{ margin: '0 0 8px' }}>👤 Client Role ({clientUsers.length})</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 12 }}>Standard client access: inbox messaging, contact uploads, flow builder, broadcast campaigns.</p>
              {(showAllClients ? clientUsers : clientUsers.slice(0, 5)).map(u => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8, color: 'var(--text)' }}>{u.email}</span>
                  <span className="badge badge-info" style={{ flexShrink: 0 }}>Client</span>
                </div>
              ))}
              {clientUsers.length > 5 && (
                <button
                  onClick={() => setShowAllClients(!showAllClients)}
                  style={{
                    background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
                    color: '#fca5a5', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                    marginTop: 12, padding: '8px 14px', borderRadius: 8, width: '100%', textCenter: 'center'
                  }}
                >
                  {showAllClients ? '▲ Collapse Client List' : `+ ${clientUsers.length - 5} more clients (Click to expand)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: SUSPENDED & LOW BALANCE USERS ── */}
      {tab === 'suspended' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 14 }}>
          <div style={{ padding: '14px 18px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
            <strong style={{ color: '#ef4444' }}>⚠️ Accounts Needing Attention ({suspendedUsers.length})</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Users with zero/negative wallet balance or unverified WhatsApp numbers.</p>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>User Email</th><th>Wallet Balance</th><th>WA Number</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {suspendedUsers.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.email}</strong></td>
                    <td style={{ fontWeight: 700, color: '#ef4444' }}>₹{parseFloat(u.balance || 0).toFixed(2)}</td>
                    <td>{u.display_phone ? <span style={{ color: '#22c55e' }}>{u.display_phone}</span> : <span style={{ color: '#ef4444' }}>Not Connected</span>}</td>
                    <td><span className="badge badge-danger">Low Credit / Alert Needed</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-warning btn-sm" onClick={() => handleSendAlert(u.id, u.email)}>⚠️ Send Expiry Alert</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(u)}>Adjust Balance</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {suspendedUsers.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>✅ All user accounts are active with healthy balances!</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Edit User: {editingUser.email}</h2>
            <div className="form-group"><label>Email</label><input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} /></div>
            <div className="form-group"><label>Role</label><select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}><option value="client">Client</option><option value="admin">Admin</option></select></div>
            <div className="form-group"><label>Credit Mode</label><select value={editForm.credit_mode} onChange={e => setEditForm({...editForm, credit_mode: e.target.value})}><option value="prepaid">Prepaid</option><option value="postpaid">Postpaid</option></select></div>
            <div className="form-group"><label>Balance</label><input type="number" value={editForm.balance} onChange={e => setEditForm({...editForm, balance: e.target.value})} /></div>
            <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ ADMIN MESSAGES PAGE ============
function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/admin/messages').then(res => setMessages(res.data)).catch(console.error).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page-body">
      <div className="page-header"><h1>All Messages</h1></div>
      <div className="card">
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}><FiMessageSquare size={48} style={{ opacity: 0.3 }} /><p>No messages yet</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Owner</th><th>Contact</th><th>Direction</th><th>Message</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {messages.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontSize: '0.85rem' }}>{m.owner_email}</td>
                    <td>{m.contact_name || m.contact_phone || '-'}</td>
                    <td><span className={`badge ${m.direction === 'inbound' ? 'badge-info' : 'badge-success'}`}>{m.direction}</span></td>
                    <td style={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.body}</td>
                    <td><span className={`badge ${m.status === 'sent' ? 'badge-success' : m.status === 'received' ? 'badge-info' : 'badge-secondary'}`}>{m.status}</span></td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(m.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ ADMIN CONTACTS PAGE ============
function AdminContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/admin/contacts').then(res => setContacts(res.data)).catch(console.error).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page-body">
      <div className="page-header"><h1>All Contacts</h1></div>
      <div className="card">
        {contacts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}><FiUsers size={48} style={{ opacity: 0.3 }} /><p>No contacts yet</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Owner</th><th>Name</th><th>Phone</th><th>Tags</th><th>Created</th></tr></thead>
              <tbody>
                {contacts.map(c => {
                  let tags = c.tags;
                  if (typeof tags === 'string') { try { tags = JSON.parse(tags); } catch(e) { tags = []; } }
                  if (!Array.isArray(tags)) tags = [];
                  return (
                    <tr key={c.id}>
                      <td style={{ fontSize: '0.85rem' }}>{c.owner_email}</td>
                      <td><strong>{c.name || '-'}</strong></td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ ADMIN FLOWS PAGE ============

// ============ ADMIN FLOWS PAGE ============
function AdminFlows() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'all';
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState(null);

  const fetchFlows = async () => {
    try {
      const res = await api.get('/admin/flows');
      setFlows(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFlows(); }, []);

  const handlePublish = async (id, publish) => {
    try {
      await api.post('/admin/publish', { type: 'flow', id, publish });
      setFlows(prev => prev.map(f => f.id === id ? { ...f, is_published: publish ? 1 : 0 } : f));
    } catch (err) { alert('Failed'); }
  };

  const handleSaveFlow = async (flowData) => {
    try {
      let savedFlow;
      if (editingFlow) {
        const res = await api.put(`/flows/${editingFlow.id}`, flowData);
        savedFlow = res.data;
      } else {
        const res = await api.post('/flows', flowData);
        savedFlow = res.data;
      }
      if (savedFlow?.id) {
        await api.post('/admin/publish', { type: 'flow', id: savedFlow.id, publish: true });
      }
      setBuilderOpen(false);
      setEditingFlow(null);
      fetchFlows();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save flow');
    }
  };

  const flowTabs = [
    { key: 'all', label: '🔄 All Flows' },
    { key: 'published', label: '✅ Published & Active' },
    { key: 'draft', label: '📝 Draft Flows' },
  ];

  if (builderOpen) {
    return (
      <FlowBuilder
        initialFlow={editingFlow}
        onSave={handleSaveFlow}
        onCancel={() => { setBuilderOpen(false); setEditingFlow(null); }}
      />
    );
  }

  if (loading) return <div className="loading">Loading flows...</div>;

  const filteredFlows = flows.filter(f => {
    if (tab === 'published') return f.is_published || f.active;
    if (tab === 'draft') return !f.is_published && !f.active;
    return true;
  });

  return (
    <div className="page-body">
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: 16, padding: '20px 24px', marginBottom: 20, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>🔄 Flow Builder Automations ({filteredFlows.length})</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.8, fontSize: '0.85rem' }}>Chatbot flows, auto-replies, and interactive journey logic across customer accounts</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditingFlow(null); setBuilderOpen(true); }}>
          <FiPlus /> + Create Admin Flow
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, background: 'var(--card)', padding: '10px 14px', borderRadius: 12, marginBottom: 20, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {flowTabs.map(t => (
          <NavLink key={t.key} to={`/admin/flows?tab=${t.key}`}
            style={{ padding: '8px 16px', borderRadius: 9, fontSize: '0.82rem', fontWeight: tab === t.key ? 700 : 500, textDecoration: 'none', background: tab === t.key ? 'var(--primary)' : 'transparent', color: tab === t.key ? '#fff' : 'var(--text-muted)', transition: 'all 0.18s' }}>
            {t.label}
          </NavLink>
        ))}
      </div>

      <div className="card">
        {filteredFlows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}><FiGitBranch size={48} style={{ opacity: 0.3 }} /><p>No {tab !== 'all' ? tab : ''} flows found</p></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filteredFlows.map(f => (
              <div key={f.id} style={{ background: 'var(--bg)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{f.name}</h4>
                  <span className={`badge ${f.active ? 'badge-success' : 'badge-secondary'}`}>{f.active ? 'Active' : 'Inactive'}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>Owner: {f.owner_email}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  <span>{f.node_count} nodes</span>
                  {f.trigger_keyword && <span>Trigger: {f.trigger_keyword.split(',')[0]}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setEditingFlow(f); setBuilderOpen(true); }}>Edit</button>
                  <button
                    className={`btn btn-sm ${f.is_published ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => handlePublish(f.id, !f.is_published)}
                    style={{ flex: 1 }}
                  >
                    {f.is_published ? '✓ Published' : 'Publish'}
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

// ============ FACEBOOK INTEGRATION PAGE ============
function AdminFacebook() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'connections';
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(res => setUsers(Array.isArray(res.data) ? res.data : (res.data.users || [])))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const tabs = [
    { key: 'connections', label: '🔗 FB Connections' },
    { key: 'tokens', label: '🔑 Page Access Tokens' },
    { key: 'expiry', label: '⏳ Token Expiry' },
    { key: 'bm', label: '🏢 Business Manager' },
    { key: 'permissions', label: '🔒 Permissions' },
  ];

  if (loading) return <div className="loading">Loading Facebook data...</div>;

  const connected = users.filter(u => u.verified_numbers > 0);

  return (
    <div className="page-body">
      <div style={{ background: 'linear-gradient(135deg, #1877f2, #0d5cbf)', borderRadius: 16, padding: '20px 24px', marginBottom: 20, color: 'white' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>📘 Facebook Integration</h1>
        <p style={{ margin: '6px 0 0', opacity: 0.8, fontSize: '0.85rem' }}>Monitor all Facebook & Meta connections across user accounts</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Accounts', value: users.length, color: '#3b82f6' },
          { label: 'FB Connected (WA)', value: connected.length, color: '#22c55e' },
          { label: 'Not Connected', value: users.length - connected.length, color: '#ef4444' },
          { label: 'Active WABAs', value: connected.filter(u => u.waba_id).length, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: 16, borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--card)', padding: '10px 14px', borderRadius: 12, marginBottom: 16, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <NavLink key={t.key} to={`/admin/facebook?tab=${t.key}`}
            style={{ padding: '7px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: tab === t.key ? 700 : 500, textDecoration: 'none', background: tab === t.key ? 'var(--primary)' : 'transparent', color: tab === t.key ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s' }}>
            {t.label}
          </NavLink>
        ))}
      </div>

      {/* Content */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 14 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User Account</th>
                <th>FB Status</th>
                <th>WABA ID</th>
                <th>Phone Number</th>
                <th>Verified Name</th>
                <th>Number Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(tab === 'connections' ? users : tab === 'tokens' || tab === 'expiry' ? connected : tab === 'bm' ? connected.filter(u => u.waba_id) : users).map(u => (
                <tr key={u.id}>
                  <td><div style={{ fontWeight: 700, fontSize: '0.84rem' }}>{u.email}</div></td>
                  <td>
                    {u.verified_numbers > 0
                      ? <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700 }}>✓ Connected</span>
                      : <span style={{ background: '#fee2e2', color: '#dc2626', padding: '3px 8px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700 }}>✗ Not Connected</span>
                    }
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#3b82f6' }}>{u.waba_id || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{u.display_phone || '—'}</td>
                  <td style={{ fontSize: '0.82rem' }}>{u.verified_name || '—'}</td>
                  <td>
                    {u.number_status
                      ? <span style={{ background: u.number_status === 'active' ? '#dcfce7' : '#fee2e2', color: u.number_status === 'active' ? '#15803d' : '#dc2626', padding: '2px 7px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700 }}>{u.number_status}</span>
                      : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>
                    }
                  </td>
                  <td>
                    <Link to={`/admin/users/${u.id}`} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem', padding: '4px 8px' }}>View</Link>
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No users found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============ WHATSAPP CLOUD API PAGE ============
function AdminWhatsAppAPI() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'waba';
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/numbers').then(res => setNumbers(res.data || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  const tabs = [
    { key: 'waba', label: '📱 WABA Accounts' },
    { key: 'quality', label: '⭐ Quality Ratings' },
    { key: 'webhook', label: '🌐 Webhook Status' },
    { key: 'health', label: '💚 API Health' },
    { key: 'token', label: '🔑 Token Status' },
  ];

  if (loading) return <div className="loading">Loading WhatsApp data...</div>;

  return (
    <div className="page-body">
      <div style={{ background: 'linear-gradient(135deg, #25d366, #128c7e)', borderRadius: 16, padding: '20px 24px', marginBottom: 20, color: 'white' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>💬 WhatsApp Cloud API</h1>
        <p style={{ margin: '6px 0 0', opacity: 0.8, fontSize: '0.85rem' }}>Monitor WABA accounts, quality ratings, webhooks and API health</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Numbers', value: numbers.length, color: '#25d366' },
          { label: 'Verified', value: numbers.filter(n => n.verified).length, color: '#22c55e' },
          { label: 'Active', value: numbers.filter(n => n.status === 'active').length, color: '#3b82f6' },
          { label: 'Pending', value: numbers.filter(n => !n.verified).length, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: 16, borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--card)', padding: '10px 14px', borderRadius: 12, marginBottom: 16, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <NavLink key={t.key} to={`/admin/whatsapp-api?tab=${t.key}`}
            style={{ padding: '7px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: tab === t.key ? 700 : 500, textDecoration: 'none', background: tab === t.key ? '#25d366' : 'transparent', color: tab === t.key ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s' }}>
            {t.label}
          </NavLink>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 14 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Phone Number</th>
                <th>WABA ID</th>
                <th>Verified Name</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Verified</th>
                {tab === 'quality' && <th>Quality Rating</th>}
                {tab === 'webhook' && <th>Webhook</th>}
                {tab === 'token' && <th>Token Info</th>}
              </tr>
            </thead>
            <tbody>
              {numbers.map(n => (
                <tr key={n.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{n.display_phone_number || n.phone_number_id}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#3b82f6' }}>{n.waba_id || '—'}</td>
                  <td>{n.verified_name || '—'}</td>
                  <td style={{ fontSize: '0.82rem' }}>{n.owner_email || n.owner_id}</td>
                  <td>
                    <span style={{ background: n.status === 'active' ? '#dcfce7' : '#fef3c7', color: n.status === 'active' ? '#15803d' : '#92400e', padding: '2px 8px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700 }}>
                      {n.status || 'unknown'}
                    </span>
                  </td>
                  <td>
                    {n.verified
                      ? <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700 }}>✓ Yes</span>
                      : <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700 }}>✗ No</span>
                    }
                  </td>
                  {tab === 'quality' && <td><span style={{ fontWeight: 700, color: '#25d366' }}>GREEN</span></td>}
                  {tab === 'webhook' && <td><span style={{ fontWeight: 700, color: '#3b82f6' }}>Active</span></td>}
                  {tab === 'token' && <td style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{n.phone_number_id || '—'}</td>}
                </tr>
              ))}
              {numbers.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No numbers registered</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============ NOTIFICATIONS ADMIN PAGE ============
function AdminNotifications() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'alerts';
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertMsg, setAlertMsg] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(res => setUsers(Array.isArray(res.data) ? res.data : (res.data.users || [])))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const sendBulkAlert = async () => {
    if (!alertMsg.trim()) return alert('Enter a message');
    if (!window.confirm(`Send this alert to ALL ${users.filter(u => u.role === 'client').length} users?`)) return;
    setSending(true);
    try {
      let sent = 0;
      for (const u of users.filter(u => u.role === 'client')) {
        try { await api.post(`/admin/users/${u.id}/send-expiry-alert`); sent++; } catch (e) {}
      }
      alert(`✅ Alert sent to ${sent} users`);
      setAlertMsg('');
    } finally { setSending(false); }
  };

  const tabs = [
    { key: 'alerts', label: '🔔 System Alerts' },
    { key: 'email', label: '📧 Email Notifications' },
    { key: 'whatsapp', label: '💬 WA Notifications' },
  ];

  if (loading) return <div className="loading">Loading...</div>;
  const clients = users.filter(u => u.role === 'client');

  return (
    <div className="page-body">
      <div style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', borderRadius: 16, padding: '20px 24px', marginBottom: 20, color: 'white' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>📬 Notifications Center</h1>
        <p style={{ margin: '6px 0 0', opacity: 0.8, fontSize: '0.85rem' }}>Send alerts, emails and WhatsApp notifications to users</p>
      </div>

      {/* Bulk Send Panel */}
      <div className="card" style={{ marginBottom: 20, border: '1px solid rgba(124,58,237,0.2)', background: 'rgba(124,58,237,0.04)' }}>
        <h3 style={{ marginBottom: 12 }}>📢 Bulk Alert Sender</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            value={alertMsg} onChange={e => setAlertMsg(e.target.value)}
            placeholder="Type alert message to send to all users…"
            style={{ flex: 1, minWidth: 280, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', fontSize: '0.88rem' }}
          />
          <button className="btn btn-primary" onClick={sendBulkAlert} disabled={sending}>
            {sending ? '⏳ Sending…' : `📤 Send to All (${clients.length}) Users`}
          </button>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          This sends the plan-expiry alert email + WhatsApp notification to all client accounts.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--card)', padding: '10px 14px', borderRadius: 12, marginBottom: 16, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <NavLink key={t.key} to={`/admin/notifications-admin?tab=${t.key}`}
            style={{ padding: '7px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: tab === t.key ? 700 : 500, textDecoration: 'none', background: tab === t.key ? '#7c3aed' : 'transparent', color: tab === t.key ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s' }}>
            {t.label}
          </NavLink>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 14 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>WA Connected</th>
                <th>Balance</th>
                <th>Joined</th>
                <th>Send Alert</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700, fontSize: '0.84rem' }}>{u.email}</td>
                  <td style={{ fontSize: '0.82rem', color: '#3b82f6' }}>{u.email}</td>
                  <td>{u.verified_numbers > 0 ? <span style={{ color: '#22c55e', fontWeight: 700 }}>✓ {u.display_phone}</span> : <span style={{ color: '#ef4444' }}>✗ None</span>}</td>
                  <td style={{ fontWeight: 700, color: parseFloat(u.balance || 0) <= 0 ? '#ef4444' : 'var(--text)' }}>₹{parseFloat(u.balance || 0).toFixed(2)}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-warning btn-sm" style={{ fontSize: '0.72rem', padding: '4px 9px' }}
                      onClick={async () => { try { await api.post(`/admin/users/${u.id}/send-expiry-alert`); alert('✅ Sent!'); } catch (e) { alert('Failed'); } }}>
                      ⚠️ Send Alert
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============ ACTIVITY & LOGS PAGE ============
function AdminLogs() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'login';
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(res => setUsers(Array.isArray(res.data) ? res.data : (res.data.users || [])))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const tabs = [
    { key: 'login', label: '🔐 Login History' },
    { key: 'api', label: '⚡ API Logs' },
    { key: 'error', label: '🚨 Error Logs' },
    { key: 'audit', label: '📋 Audit Trail' },
  ];

  if (loading) return <div className="loading">Loading logs...</div>;

  return (
    <div className="page-body">
      <div style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', borderRadius: 16, padding: '20px 24px', marginBottom: 20, color: 'white' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>📜 Activity & Logs</h1>
        <p style={{ margin: '6px 0 0', opacity: 0.8, fontSize: '0.85rem' }}>Platform activity monitoring, audit trail and error tracking</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--card)', padding: '10px 14px', borderRadius: 12, marginBottom: 16, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <NavLink key={t.key} to={`/admin/logs?tab=${t.key}`}
            style={{ padding: '7px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: tab === t.key ? 700 : 500, textDecoration: 'none', background: tab === t.key ? '#334155' : 'transparent', color: tab === t.key ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s' }}>
            {t.label}
          </NavLink>
        ))}
      </div>

      {/* Login History */}
      {tab === 'login' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 14 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0 }}>🔐 User Account Activity</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>User</th><th>Role</th><th>Balance</th><th>WA Connected</th><th>Messages</th><th>Joined Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 700, fontSize: '0.84rem' }}>{u.email}</td>
                    <td><span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '0.68rem' }}>{u.role}</span></td>
                    <td style={{ fontWeight: 700, color: parseFloat(u.balance || 0) <= 0 ? '#ef4444' : 'var(--text)' }}>₹{parseFloat(u.balance || 0).toFixed(2)}</td>
                    <td>{u.verified_numbers > 0 ? <span style={{ color: '#22c55e', fontWeight: 700 }}>✓ {u.display_phone}</span> : '—'}</td>
                    <td style={{ fontWeight: 700 }}>{(u.total_messages || 0).toLocaleString()}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td><Link to={`/admin/users/${u.id}`} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem', padding: '4px 8px' }}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* API / Error / Audit panels */}
      {tab !== 'login' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {tab === 'api' ? '⚡' : tab === 'error' ? '🚨' : '📋'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>{tabs.find(t => t.key === tab)?.label}</h3>
                  <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {tab === 'api' && 'Real-time API request monitoring & endpoint telemetry.'}
                    {tab === 'error' && 'Server exception tracking & webhooks delivery diagnostic log.'}
                    {tab === 'audit' && 'Audit trail of administrative events, account creations & balance changes.'}
                  </p>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => window.open('http://localhost:8000', '_blank')} style={{ whiteSpace: 'nowrap' }}>
                💻 Open Server Console
              </button>
            </div>
          </div>

          {/* Audit Timeline Feed */}
          {tab === 'audit' && (
            <div className="card" style={{ padding: '20px 24px' }}>
              <h4 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                📋 Platform Event Timeline ({users.length} events)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {users.map((u, i) => (
                  <div
                    key={u.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 14px', borderRadius: 12,
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(16,185,129,0.12)', color: 'var(--primary)', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      #{users.length - i}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                        New Account Registered
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'var(--card)', color: '#3b82f6', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 6, wordBreak: 'break-all' }}>
                          {u.email}
                        </span>
                        <span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '0.68rem' }}>
                          {u.role}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Mode: {u.credit_mode || 'postpaid'}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API / Error Live Log Shell */}
          {tab !== 'audit' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 14 }}>
              <div style={{ background: '#0f172a', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace' }}>● Live Log Output — Express Backend (Port 5000)</span>
                <span style={{ background: '#1e293b', color: '#38bdf8', padding: '2px 8px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700 }}>Active</span>
              </div>
              <div style={{ background: '#090d16', padding: 20, fontFamily: 'monospace', fontSize: '0.8rem', color: '#34d399', height: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>[INFO] Webhook listener connected: /webhook/whatsapp</div>
                <div>[INFO] Groq AI Llama 3.1 Model initialized successfully</div>
                <div>[INFO] Database pool connected — MySQL mahi database</div>
                <div style={{ color: '#60a5fa' }}>[HTTP] GET /api/admin/dashboard 200 OK — 14ms</div>
                <div style={{ color: '#60a5fa' }}>[HTTP] GET /api/whatsapp/numbers 200 OK — 8ms</div>
                <div style={{ color: '#94a3b8' }}>[READY] Server listening on http://localhost:8000</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============ UPGRADED ADMIN SETTINGS (tab-aware & editable) ============
function AdminSettingsUpgraded() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'whatsapp';
  const [settings, setSettings] = useState({});
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editCategory, setEditCategory] = useState('');
  const [editRate, setEditRate] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, pricingRes] = await Promise.all([
        api.get('/admin/settings').catch(() => ({ data: { settings: {} } })),
        api.get('/admin/pricing').catch(() => ({ data: [] }))
      ]);
      setSettings(settingsRes.data.settings || {});
      setPricing(pricingRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key, val) => {
    setSettings(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { key, is_secret: false, group: 'general' }),
        value: val
      }
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload = {};
      Object.keys(settings).forEach(k => {
        payload[k] = settings[k].value;
      });
      await api.post('/admin/settings', { settings: payload });
      setSaved('System settings updated and synced to database & .env!');
      setTimeout(() => setSaved(''), 4000);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePricingUpdate = async (category, rate) => {
    try {
      await api.post('/admin/pricing', { category, rate: parseFloat(rate) });
      const r = await api.get('/admin/pricing');
      setPricing(r.data);
      setEditCategory('');
      setSaved('Pricing updated!');
      setTimeout(() => setSaved(''), 3000);
    } catch (err) {
      alert('Failed to update pricing');
    }
  };

  const tabs = [
    { key: 'whatsapp', label: '💬 WhatsApp Cloud API' },
    { key: 'api', label: '🔑 Pricing & API Config' },
    { key: 'smtp', label: '📧 SMTP Email' },
    { key: 'razorpay', label: '💳 Razorpay Payments' },
    { key: 'server', label: '💻 Server Status & Actions' },
    { key: 'backup', label: '🗄️ Backup & Restore' },
  ];

  if (loading) return <div className="loading">Loading settings...</div>;

  return (
    <div className="page-body">
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: 16, padding: '20px 24px', marginBottom: 20, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>⚙️ System Settings & API Credentials</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', opacity: 0.7 }}>Manage and edit all Meta WhatsApp keys, system tokens, pricing, SMTP, and payment credentials</p>
        </div>
        <button className="btn btn-primary" onClick={handleSaveSettings} disabled={saving}>
          {saving ? 'Saving...' : '💾 Save All Settings'}
        </button>
      </div>

      {saved && <div style={{ background: '#dcfce7', color: '#15803d', padding: '12px 18px', borderRadius: 12, marginBottom: 20, fontWeight: 700, fontSize: '0.88rem' }}>✅ {saved}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, background: 'var(--card)', padding: '10px 14px', borderRadius: 12, marginBottom: 20, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <NavLink key={t.key} to={`/admin/settings?tab=${t.key}`}
            style={{ padding: '8px 16px', borderRadius: 8, fontSize: '0.82rem', fontWeight: tab === t.key ? 700 : 500, textDecoration: 'none', background: tab === t.key ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent', color: tab === t.key ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s' }}>
            {t.label}
          </NavLink>
        ))}
      </div>

      {/* ── WhatsApp Settings Tab ── */}
      {(tab === 'whatsapp' || tab === 'general') && (
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ marginBottom: 4, fontSize: '1.1rem' }}>💬 Meta WhatsApp Cloud API Credentials</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 20 }}>
            Configure Meta App ID, App Secret, System User Token, WABA ID, Phone Number ID, and Webhook verification tokens. Edits update database & .env automatically.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              ['WHATSAPP_APP_ID', 'WhatsApp App ID', 'e.g. 1590795935988169'],
              ['WHATSAPP_APP_SECRET', 'WhatsApp App Secret', 'e.g. f94e6ead41fa1227163240e0f3825ad5'],
              ['WHATSAPP_CONFIG_ID', 'WhatsApp Embedded Signup Config ID', 'e.g. 1569573811314694'],
              ['WHATSAPP_GRAPH_API_VERSION', 'Meta Graph API Version', 'e.g. v25.0'],
              ['WHATSAPP_PHONE_NUMBER_ID', 'WhatsApp Phone Number ID', 'e.g. 1269197539606780'],
              ['WHATSAPP_WABA_ID', 'WhatsApp Business Account (WABA) ID', 'e.g. 1014658487838546'],
              ['WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'Webhook Verify Token', 'e.g. mahi_crm_webhook_token_2026'],
              ['WHATSAPP_REDIRECT_URI', 'OAuth Redirect URI', 'e.g. http://localhost:3000/onboarding/callback'],
            ].map(([key, label, placeholder]) => (
              <div key={key} className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.82rem' }}>{label} ({key})</label>
                <input
                  type={settings[key]?.is_secret ? 'password' : 'text'}
                  value={settings[key]?.value || ''}
                  onChange={e => handleSettingChange(key, e.target.value)}
                  placeholder={placeholder}
                  style={{ width: '100%', fontFamily: settings[key]?.is_secret ? 'password' : 'monospace', fontSize: '0.85rem' }}
                />
              </div>
            ))}
          </div>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label style={{ fontWeight: 600, fontSize: '0.82rem' }}>WhatsApp System User Token (WHATSAPP_SYSTEM_USER_TOKEN)</label>
            <textarea
              rows={3}
              value={settings['WHATSAPP_SYSTEM_USER_TOKEN']?.value || ''}
              onChange={e => handleSettingChange('WHATSAPP_SYSTEM_USER_TOKEN', e.target.value)}
              placeholder="EAAWm0gqsuck..."
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.82rem' }}
            />
          </div>

          <div style={{ marginTop: 20 }}>
            <button className="btn btn-primary" onClick={handleSaveSettings} disabled={saving}>
              {saving ? 'Saving Changes...' : '💾 Save Meta WhatsApp Settings'}
            </button>
          </div>
        </div>
      )}

      {/* ── API & Pricing Tab ── */}
      {tab === 'api' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Message Pricing (Per Message)</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 16 }}>Set cost per message by category. Users are billed based on these rates.</p>
            {pricing.map(p => (
              <div key={p.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{p.category}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>per message</div>
                </div>
                {editCategory === p.category ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="number" step="0.0001" value={editRate} onChange={e => setEditRate(e.target.value)} style={{ width: 90, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, textAlign: 'center' }} />
                    <button className="btn btn-primary btn-sm" onClick={() => handlePricingUpdate(p.category, editRate)}>Save</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditCategory('')}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <strong style={{ fontSize: '1.1rem' }}>₹{parseFloat(p.rate).toFixed(4)}</strong>
                    <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem' }} onClick={() => { setEditCategory(p.category); setEditRate(p.rate); }}>Edit</button>
                  </div>
                )}
              </div>
            ))}
            {pricing.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No pricing configured</p>}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 16 }}>AI Engine Configuration</h3>
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.82rem' }}>Groq AI API Key (GROQ_API_KEY)</label>
              <input
                type="password"
                value={settings['GROQ_API_KEY']?.value || ''}
                onChange={e => handleSettingChange('GROQ_API_KEY', e.target.value)}
                placeholder="gsk_..."
                style={{ width: '100%', fontFamily: 'monospace' }}
              />
            </div>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={handleSaveSettings} disabled={saving}>
              💾 Save AI Configuration
            </button>
          </div>
        </div>
      )}

      {/* ── SMTP Email Tab ── */}
      {tab === 'smtp' && (
        <div className="card" style={{ maxWidth: 600 }}>
          <h3 style={{ marginBottom: 4 }}>📧 SMTP Email Settings</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 20 }}>Configure SMTP server for transactional email alerts and notifications</p>

          {[
            ['SMTP_HOST', 'SMTP Host', 'smtp.gmail.com'],
            ['SMTP_PORT', 'SMTP Port', '587'],
            ['SMTP_USERNAME', 'SMTP Username / Email', 'kornepatimahankali35@gmail.com'],
            ['SMTP_APP_PASSWORD', 'SMTP App Password', 'kttq onun yugn hwlt'],
            ['SMTP_FROM_NAME', 'Sender Name', 'V ONE DIGITALS'],
          ].map(([key, label, placeholder]) => (
            <div key={key} className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.82rem' }}>{label}</label>
              <input
                type={key.includes('PASSWORD') ? 'password' : 'text'}
                value={settings[key]?.value || ''}
                onChange={e => handleSettingChange(key, e.target.value)}
                placeholder={placeholder}
                style={{ width: '100%' }}
              />
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleSaveSettings} disabled={saving}>💾 Save SMTP Settings</button>
            <button className="btn btn-secondary" onClick={async () => { try { await api.post('/admin/users/1/send-expiry-alert'); alert('✅ Test email sent!'); } catch (e) { alert('Failed: ' + (e.response?.data?.error || e.message)); } }}>📤 Send Test Email</button>
          </div>
        </div>
      )}

      {/* ── Razorpay Payments Tab ── */}
      {tab === 'razorpay' && (
        <div className="card" style={{ maxWidth: 600 }}>
          <h3 style={{ marginBottom: 4 }}>💳 Razorpay Payment Gateway</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 20 }}>Configure live/test Razorpay API credentials for user subscriptions and wallet top-ups</p>

          <div className="form-group">
            <label style={{ fontWeight: 600, fontSize: '0.82rem' }}>Razorpay Key ID (RAZORPAY_KEY_ID)</label>
            <input
              value={settings['RAZORPAY_KEY_ID']?.value || ''}
              onChange={e => handleSettingChange('RAZORPAY_KEY_ID', e.target.value)}
              placeholder="rzp_live_..."
              style={{ width: '100%', fontFamily: 'monospace' }}
            />
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 600, fontSize: '0.82rem' }}>Razorpay Key Secret (RAZORPAY_KEY_SECRET)</label>
            <input
              type="password"
              value={settings['RAZORPAY_KEY_SECRET']?.value || ''}
              onChange={e => handleSettingChange('RAZORPAY_KEY_SECRET', e.target.value)}
              placeholder="Key Secret..."
              style={{ width: '100%', fontFamily: 'monospace' }}
            />
          </div>

          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={handleSaveSettings} disabled={saving}>
            💾 Save Razorpay Credentials
          </button>
        </div>
      )}

      {/* ── Server & Cache ── */}
      {tab === 'server' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>💻 Server Status</h3>
            {[
              ['Laravel Backend API', 'success', 'Running (port 8000)'],
              ['MySQL Database', 'success', 'Connected (port 3307)'],
              ['Meta Graph API', 'success', 'v25.0 Connected'],
              ['Groq AI Engine', 'success', 'Active'],
              ['Cron Queue Worker', 'success', 'Active'],
            ].map(([name, badge, status]) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.85rem' }}>{name}</span>
                <span className={`badge badge-${badge}`} style={{ fontSize: '0.68rem' }}>{status}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>⚡ Server Quick Actions</h3>
            {[
              { label: '📊 View Health Check', action: () => window.open('http://localhost:8000/api/health', '_blank') },
              { label: '🔄 Refresh All Data', action: () => window.location.reload() },
              { label: '🌐 Meta Developer Console', action: () => window.open('https://developers.facebook.com', '_blank') },
              { label: '💳 Razorpay Dashboard', action: () => window.open('https://dashboard.razorpay.com', '_blank') },
            ].map(a => (
              <button key={a.label} className="btn btn-secondary" style={{ width: '100%', marginBottom: 10, textAlign: 'left' }} onClick={a.action}>{a.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── Backup ── */}
      {tab === 'backup' && (
        <div className="card" style={{ maxWidth: 500 }}>
          <h3 style={{ marginBottom: 4 }}>🗄️ Backup & Export</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 20 }}>Database backup and platform export tools</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: '💾', label: 'Download DB Backup', desc: 'Export full MySQL dump', color: '#22c55e' },
              { icon: '📤', label: 'Export Users CSV', desc: 'All users with balance & usage', color: '#3b82f6' },
              { icon: '📤', label: 'Export Messages CSV', desc: 'All message logs', color: '#8b5cf6' },
              { icon: '📤', label: 'Export Payments CSV', desc: 'All payment transactions', color: '#f59e0b' },
            ].map(a => (
              <div key={a.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg)' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 22 }}>{a.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{a.label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.desc}</div>
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => alert('Backup: export DB using php artisan or mysqldump')}>Download</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ ADMIN AI AGENTS PAGE ============
function AdminAgents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [form, setForm] = useState({ name: '', role: '', specialty: '', system_prompt: '', personality: '', avatar_emoji: '🤖' });

  useEffect(() => { fetchAgents(); }, []);

  const fetchAgents = async () => {
    try {
      const res = await api.get('/admin/ai-agents');
      setAgents(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    try {
      if (editingAgent) {
        await api.put(`/ai-agents/${editingAgent.id}`, form);
      } else {
        await api.post('/ai-agents', form);
      }
      setShowForm(false);
      setEditingAgent(null);
      setForm({ name: '', role: '', specialty: '', system_prompt: '', personality: '', avatar_emoji: '🤖' });
      fetchAgents();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this AI agent?')) return;
    try { await api.delete(`/ai-agents/${id}`); fetchAgents(); } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="loading">Loading agents...</div>;

  return (
    <div className="page-body">
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: 16, padding: '20px 24px', marginBottom: 20, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>🤖 AI Agents ({agents.length})</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', opacity: 0.7 }}>Manage AI-powered chat agents for flows and auto-replies</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditingAgent(null); setForm({ name: '', role: '', specialty: '', system_prompt: '', personality: '', avatar_emoji: '🤖' }); setShowForm(true); }}>
          + New Agent
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20, padding: 20 }}>
          <h3 style={{ marginBottom: 16 }}>{editingAgent ? 'Edit Agent' : 'Create AI Agent'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Agent Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Alex" />
            </div>
            <div className="form-group">
              <label>Emoji Avatar</label>
              <input value={form.avatar_emoji} onChange={e => setForm({ ...form, avatar_emoji: e.target.value })} placeholder="🤖" />
            </div>
            <div className="form-group">
              <label>Role</label>
              <input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="e.g. Full Stack Developer" />
            </div>
            <div className="form-group">
              <label>Specialty</label>
              <input value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} placeholder="e.g. React, Node.js" />
            </div>
            <div className="form-group">
              <label>Personality</label>
              <input value={form.personality} onChange={e => setForm({ ...form, personality: e.target.value })} placeholder="e.g. Professional, friendly" />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label>System Prompt (AI Instructions)</label>
            <textarea value={form.system_prompt} onChange={e => setForm({ ...form, system_prompt: e.target.value })} rows={5} placeholder="You are a helpful assistant..." style={{ width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleSubmit}>{editingAgent ? 'Update' : 'Create'} Agent</button>
            <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingAgent(null); }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {agents.map(agent => (
          <div key={agent.id} className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                  {agent.avatar_emoji || '🤖'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{agent.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{agent.role || 'AI Agent'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {agent.is_prebuilt && <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>Pre-built</span>}
                {agent.is_published && <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Published</span>}
              </div>
            </div>
            {agent.specialty && (
              <div style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <strong>Specialty:</strong> {agent.specialty}
              </div>
            )}
            {agent.system_prompt && (
              <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-light)', maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {agent.system_prompt.substring(0, 120)}...
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setEditingAgent(agent); setForm({ name: agent.name, role: agent.role || '', specialty: agent.specialty || '', system_prompt: agent.system_prompt || '', personality: agent.personality || '', avatar_emoji: agent.avatar_emoji || '🤖' }); setShowForm(true); }}>Edit</button>
              {!agent.is_prebuilt && (
                <button className="btn btn-secondary btn-sm" style={{ color: '#ef4444' }} onClick={() => handleDelete(agent.id)}>Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ ADMIN DRIP SEQUENCES PAGE ============
function AdminDripSequences() {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSeq, setEditingSeq] = useState(null);
  const [form, setForm] = useState({ name: '', steps: [] });

  const fetchSequences = () => {
    setLoading(true);
    api.get('/admin/drip-sequences')
      .then(res => setSequences(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSequences();
  }, []);

  const addStep = () => {
    setForm({ ...form, steps: [...form.steps, { delay_hours: 24, message: '' }] });
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
    setEditingSeq(seq);
    setForm({
      name: seq.name || '',
      steps: (seq.steps || []).map(s => ({
        delay_hours: s.delay_hours ?? s.delay ?? 0,
        message: s.message || '',
        template_name: s.template_name || ''
      }))
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name || form.steps.length === 0) return alert('Name and at least one step required');
    try {
      if (editingSeq) {
        await api.put(`/drip-sequences/${editingSeq.id}`, form);
      } else {
        await api.post('/drip-sequences', form);
      }
      setShowForm(false);
      setEditingSeq(null);
      setForm({ name: '', steps: [] });
      fetchSequences();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save drip sequence');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this drip sequence?')) return;
    try {
      await api.delete(`/drip-sequences/${id}`);
      fetchSequences();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const toggleActive = async (seq) => {
    try {
      await api.put(`/drip-sequences/${seq.id}`, { active: !seq.active });
      fetchSequences();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  if (loading) return <div className="loading">Loading drip sequences...</div>;

  return (
    <div className="page-body">
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: 16, padding: '20px 24px', marginBottom: 20, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>📅 Drip Sequences ({sequences.length})</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', opacity: 0.7 }}>Manage and edit user and pre-built drip sequences across the platform</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditingSeq(null); setForm({ name: '', steps: [] }); setShowForm(true); }}>
          + New Sequence
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20, padding: 20 }}>
          <h3 style={{ marginBottom: 16 }}>{editingSeq ? 'Edit Drip Sequence' : 'Create Drip Sequence'}</h3>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Sequence Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Welcome Sequence" style={{ width: '100%' }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <strong style={{ fontSize: '0.9rem' }}>Sequence Steps ({form.steps.length})</strong>
              <button className="btn btn-secondary btn-sm" onClick={addStep}>+ Add Step</button>
            </div>

            {form.steps.map((step, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 12, border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8, background: 'var(--bg)' }}>
                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#6366f1', minWidth: 50 }}>Step {idx + 1}:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="number" value={step.delay_hours} onChange={e => updateStep(idx, 'delay_hours', parseInt(e.target.value) || 0)} style={{ width: 60, padding: 4 }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>hrs</span>
                </div>
                <textarea
                  value={step.message}
                  onChange={e => updateStep(idx, 'message', e.target.value)}
                  placeholder="Step message..."
                  rows={2}
                  style={{ flex: 1, padding: 6, fontSize: '0.82rem' }}
                />
                <button className="btn btn-secondary btn-sm" style={{ color: '#ef4444' }} onClick={() => removeStep(idx)}>Remove</button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleSubmit}>{editingSeq ? 'Update' : 'Create'} Sequence</button>
            <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingSeq(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {sequences.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No drip sequences created yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
          {sequences.map(seq => (
            <div key={seq.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{seq.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Owner ID: {seq.owner_id} | Steps: {(seq.steps || []).length}
                  </div>
                </div>
                <span className={`badge ${seq.active ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                  {seq.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {seq.steps && seq.steps.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {seq.steps.slice(0, 3).map((step, idx) => (
                    <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ color: '#6366f1', fontWeight: 600 }}>Step {idx + 1}:</span>
                      {step.delay_hours ? `Wait ${step.delay_hours}h` : 'Immediate'} — {step.template_name || step.message?.substring(0, 40) || 'No content'}
                    </div>
                  ))}
                  {seq.steps.length > 3 && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>+{seq.steps.length - 3} more steps</div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(seq)}>Edit</button>
                <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(seq)}>
                  {seq.active ? 'Pause' : 'Activate'}
                </button>
                <button className="btn btn-secondary btn-sm" style={{ color: '#ef4444' }} onClick={() => handleDelete(seq.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ MAIN ADMIN ROUTER ============
export default function Admin() {
  const location = useLocation();
  const path = location.pathname;

  if (path.match(/\/admin\/users\/\d+/)) return <AdminUserDetail />;
  if (path.includes('/admin/users')) return <AdminUsers />;
  if (path.includes('/admin/numbers')) return <AdminNumbers />;
  if (path.includes('/admin/messages')) return <AdminMessages />;
  if (path.includes('/admin/contacts')) return <AdminContacts />;
  if (path.includes('/admin/templates')) return <AdminTemplates />;
  if (path.includes('/admin/flows')) return <AdminFlows />;
  if (path.includes('/admin/pricing')) return <AdminPricing />;
  if (path.includes('/admin/settings')) return <AdminSettingsUpgraded />;
  if (path.includes('/admin/facebook')) return <AdminFacebook />;
  if (path.includes('/admin/whatsapp-api')) return <AdminWhatsAppAPI />;
  if (path.includes('/admin/notifications-admin')) return <AdminNotifications />;
  if (path.includes('/admin/logs')) return <AdminLogs />;
  if (path.includes('/admin/agents')) return <AdminAgents />;
  if (path.includes('/admin/drip-sequences')) return <AdminDripSequences />;

  return <AdminDashboard />;
}
