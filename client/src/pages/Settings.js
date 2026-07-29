import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FiTrash2, FiUser, FiSmartphone, FiShield, FiSend,
  FiCreditCard, FiKey, FiCheckCircle, FiAlertTriangle, FiPlus,
  FiLink, FiFlag, FiRefreshCw, FiWifi, FiActivity, FiLock, FiMail, FiCamera, FiSettings
} from 'react-icons/fi';
import { SkeletonStats } from '../components/Skeleton';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryTab = searchParams.get('tab');
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [testPhone, setTestPhone] = useState('6301400137');
  const [testMessage, setTestMessage] = useState('Hello! This is a test message from VONE DIGITALS CRM.');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [activeTab, setActiveTab] = useState(queryTab || 'account');

  useEffect(() => {
    if (queryTab) setActiveTab(queryTab);
  }, [queryTab]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [numRes, subRes] = await Promise.all([
        api.get('/whatsapp/numbers'),
        api.get('/plans/my-subscription')
      ]);
      setNumbers(numRes.data);
      setSubscription(subRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (id) => {
    if (!window.confirm('Disconnect this WhatsApp number?')) return;
    try {
      await api.delete(`/whatsapp/numbers/${id}`);
      fetchAll();
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    setPasswordMsg('');
    try {
      await api.put('/auth/change-password', { current_password: currentPassword, new_password: newPassword });
      setPasswordMsg('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordMsg(err.response?.data?.error || 'Failed to change password');
    }
  };

  const handleTestSend = async () => {
    if (!testPhone.trim() || !testMessage.trim()) return;
    setTestLoading(true);
    setTestResult('');
    try {
      const phone = testPhone.replace(/\D/g, '');
      const fullPhone = phone.startsWith('91') ? phone : '91' + phone;

      let contactId;
      const existingContacts = await api.get('/contacts');
      const existing = existingContacts.data.find(c => c.phone === fullPhone);
      if (existing) {
        contactId = existing.id;
      } else {
        const newContact = await api.post('/contacts', { name: `Test ${fullPhone}`, phone: fullPhone });
        contactId = newContact.data.id;
      }

      await new Promise(r => setTimeout(r, 500));

      const res = await api.post('/messages/send', { contact_id: contactId, body: testMessage });
      if (res.data.status === 'failed') {
        const errCode = res.data.wa_error?.error?.code;
        const errMsg = res.data.wa_error?.error?.message || res.data.wa_error?.message || 'Unknown error';
        if (errCode === 131030) {
          setTestResult(`Failed: Recipient not in allowed list. Add ${fullPhone} to Meta Test Recipients.`);
        } else {
          setTestResult(`Failed: ${errMsg}`);
        }
      } else {
        const templateInfo = res.data.used_template ? ' (via template)' : '';
        setTestResult(`Message sent to ${fullPhone}${templateInfo}! Check WhatsApp.`);
      }
    } catch (err) {
      setTestResult(err.response?.data?.error || 'Failed to send message');
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) return <SkeletonStats />;

  const tabs = [
    { id: 'account', label: 'Account Profile', icon: <FiUser /> },
    { id: 'numbers', label: 'WhatsApp Numbers', icon: <FiSmartphone /> },
    { id: 'whatsapp', label: 'WA Connected Number', icon: <FiSmartphone /> },
    { id: 'facebook', label: 'FB Integration', icon: <FiLink /> },
    { id: 'test', label: 'Send Test Message', icon: <FiSend /> },
    { id: 'security', label: 'Security & Password', icon: <FiKey /> },
    { id: 'notifications', label: 'Notifications', icon: <FiMail /> },
    { id: 'profile', label: 'Profile & Branding', icon: <FiCamera /> },
  ];

  return (
    <div style={{ padding: '24px 32px 40px', maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: '0 0 4px' }}>
          System & Workspace Settings ⚙️
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
          Manage your WhatsApp Business account, security, subscription, and test messaging tools.
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 12, overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              borderRadius: 10, border: 'none',
              background: activeTab === tab.id ? 'linear-gradient(135deg, #dc2626, #991b1b)' : 'var(--card)',
              color: activeTab === tab.id ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
              boxShadow: activeTab === tab.id ? '0 4px 12px rgba(220,38,38,0.4)' : 'none',
              transition: 'all 0.2s ease', whiteSpace: 'nowrap', flexShrink: 0
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Account Profile */}
      {activeTab === 'account' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          <div style={{ background: 'var(--card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiUser color="#dc2626" /> Profile Details
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Email Address</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', marginTop: 2, wordBreak: 'break-all' }}>{user?.email}</div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Account Role</div>
                <div style={{ marginTop: 4 }}>
                  <span className={`badge ${user?.role === 'admin' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
                    {user?.role?.toUpperCase()}
                  </span>
                </div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Credit Mode & Wallet Balance</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>
                  ₹{parseFloat(user?.balance || 0).toFixed(2)} ({user?.credit_mode || 'postpaid'})
                </div>
              </div>
            </div>

            <button className="btn btn-danger btn-sm" style={{ marginTop: 20, width: '100%' }} onClick={logout}>
              Sign Out of Session
            </button>
          </div>

          {/* Subscription Status Card */}
          <div style={{ background: 'var(--card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiCreditCard color="#dc2626" /> Active Plan & Limits
            </h3>

            {subscription ? (
              <div style={{ background: '#1c1917', border: '1px solid #7f1d1d', borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ffffff', fontWeight: 800, fontSize: '1.05rem' }}>
                  <FiCheckCircle size={20} color="#dc2626" /> {subscription.plan_name}
                </div>
                <p style={{ margin: '8px 0 0', color: '#fca5a5', fontSize: '0.88rem' }}>
                  Expires: <strong>{new Date(subscription.expires_at).toLocaleDateString()}</strong>
                </p>
                <p style={{ margin: '4px 0 0', color: '#fca5a5', fontSize: '0.85rem' }}>
                  {subscription.max_messages === -1
                    ? '⚡ Unlimited messages — Bulk broadcast unlocked'
                    : `Messages quota: ${subscription.max_messages?.toLocaleString()}/month`}
                </p>
              </div>
            ) : (
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)', fontWeight: 800, fontSize: '1rem' }}>
                  <FiAlertTriangle size={18} color="#f59e0b" /> No Active Subscription Plan
                </div>
                <p style={{ margin: '8px 0 14px', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                  Subscribe to a plan to send unlimited bulk messages to non-test recipients and unlock full features.
                </p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/plans')}>
                  Explore Plans & Upgrades →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: WhatsApp Numbers */}
      {activeTab === 'numbers' && (
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
                📱 Connected WhatsApp Phone Numbers
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Registered Meta WABA Phone Numbers</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/onboarding')}>
              <FiPlus /> Connect Number
            </button>
          </div>
          {numbers.length > 0 ? (
            numbers.map(n => (
              <div key={n.id} style={{ background: 'var(--bg)', borderRadius: 12, padding: 16, border: '1px solid var(--border)', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <strong>Phone: {n.display_phone_number || n.phone_number_id}</strong>
                  <span className={`badge ${n.verified ? 'badge-success' : 'badge-warning'}`}>{n.verified ? 'Verified & Active' : 'Pending'}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                  <div>WABA ID: <code style={{ color: '#dc2626' }}>{n.waba_id || 'Embedded'}</code></div>
                  <div>Verified Name: <strong>{n.verified_name || 'Standard'}</strong></div>
                  <div>Quality Rating: <strong style={{ color: '#22c55e' }}>GREEN (High)</strong></div>
                  <div>Webhook Status: <strong style={{ color: '#3b82f6' }}>Connected & Live</strong></div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
              No WhatsApp number connected yet. Connect your number during onboarding or via WhatsApp settings.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Send Test Message */}
      {activeTab === 'test' && (
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border)', maxWidth: 600, boxShadow: 'var(--shadow-xs)' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiSend color="#dc2626" /> Send Instant WhatsApp Test Message
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Verify your API connectivity by sending a message directly to your phone</p>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Recipient Phone Number (with Country Code)</label>
            <input
              type="text"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="e.g. 916301400137"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Test Message Content</label>
            <textarea
              rows={3}
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Type test message content..."
            />
          </div>

          {testResult && (
            <div style={{
              padding: '12px 16px', borderRadius: 10, marginBottom: 16,
              background: testResult.startsWith('Message sent') ? '#ecfdf5' : '#fef2f2',
              color: testResult.startsWith('Message sent') ? '#065f46' : '#991b1b',
              border: `1px solid ${testResult.startsWith('Message sent') ? '#a7f3d0' : '#fecaca'}`,
              fontSize: '0.85rem', fontWeight: 600
            }}>
              {testResult}
            </div>
          )}

          <button className="btn btn-primary" onClick={handleTestSend} disabled={testLoading} style={{ width: '100%' }}>
            {testLoading ? 'Transmitting via Meta API...' : '🚀 Send Test Message Now'}
          </button>
        </div>
      )}

      {/* Tab 4: Security & Password */}
      {activeTab === 'security' && (
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border)', maxWidth: 500, boxShadow: 'var(--shadow-xs)' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiKey color="#dc2626" /> Change Account Password
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Keep your CRM credentials secure</p>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Current Password</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter current password" />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password (min 6 chars)" />
          </div>

          {passwordMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: passwordMsg.includes('success') ? '#ecfdf5' : '#fef2f2',
              color: passwordMsg.includes('success') ? '#065f46' : '#991b1b',
              fontSize: '0.85rem', fontWeight: 600
            }}>
              {passwordMsg}
            </div>
          )}

          <button className="btn btn-primary" onClick={handleChangePassword} disabled={!currentPassword || !newPassword} style={{ width: '100%' }}>
            Update Account Password
          </button>
        </div>
      )}

      {/* Tab: WhatsApp / Quality / Webhook / Token */}
      {(['whatsapp', 'quality', 'webhook', 'token'].includes(activeTab)) && (
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border)', maxWidth: 700 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 800, color: 'var(--text)' }}>
            📞 WhatsApp Business Status ({activeTab.toUpperCase()})
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 20 }}>
            Connected Cloud API Phone Number details & status
          </p>
          {numbers.length > 0 ? (
            numbers.map(n => (
              <div key={n.id} style={{ background: 'var(--bg)', borderRadius: 12, padding: 16, border: '1px solid var(--border)', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <strong>Phone: {n.display_phone_number || n.phone_number_id}</strong>
                  <span className={`badge ${n.verified ? 'badge-success' : 'badge-warning'}`}>{n.verified ? 'Verified & Active' : 'Pending'}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                  <div>WABA ID: <code style={{ color: '#dc2626' }}>{n.waba_id || 'Embedded'}</code></div>
                  <div>Verified Name: <strong>{n.verified_name || 'Standard'}</strong></div>
                  <div>Quality Rating: <strong style={{ color: '#22c55e' }}>GREEN (High)</strong></div>
                  <div>Webhook Status: <strong style={{ color: '#3b82f6' }}>Connected & Live</strong></div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
              No WhatsApp number connected yet. Connect your number during onboarding or via WhatsApp settings.
            </div>
          )}
        </div>
      )}

      {/* Tab: Facebook / BM / Permissions / FB Token */}
      {(['facebook', 'bm', 'permissions', 'fb_token'].includes(activeTab)) && (
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border)', maxWidth: 700 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)' }}>
            📘 Facebook & Meta Integration
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 20 }}>
            Meta Business Manager connection & Facebook App settings
          </p>
          <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 18, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>📘</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ fontSize: '0.92rem', color: '#ffffff', display: 'block', wordBreak: 'normal' }}>
                  Facebook Embedded Signup Connection
                </strong>
                <div style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: 700, marginTop: 2 }}>
                  ✓ Meta Access Token Active
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>Business Manager ID: <code style={{ background: '#121218', padding: '2px 8px', borderRadius: 4, color: '#fca5a5' }}>1269197539606780</code></div>
              <div>System User Permissions: <div style={{ background: '#121218', padding: '6px 10px', borderRadius: 6, color: '#ffffff', fontFamily: 'monospace', fontSize: '0.75rem', marginTop: 4, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>whatsapp_business_management, whatsapp_business_messaging</div></div>
              <div>Token Expiry: <span style={{ color: '#22c55e', fontWeight: 700 }}>Never (System Token)</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Notifications */}
      {activeTab === 'notifications' && (
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border)', maxWidth: 600 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
            🔔 Notification Preferences
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>Choose how you receive alerts and system updates</p>
          {['Email alerts on low balance', 'WhatsApp notifications on incoming customer chats', 'Daily broadcast performance digest', 'Plan expiration alerts'].map((pref, i) => (
            <div key={pref} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{pref}</span>
              <input type="checkbox" defaultChecked style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }} />
            </div>
          ))}
        </div>
      )}

      {/* Tab: Profile & Branding */}
      {activeTab === 'profile' && (
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border)', maxWidth: 600 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
            👤 Profile & Business Branding
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>Customize profile information and display brand logo</p>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Account Email</label>
            <input value={user?.email || ''} readOnly style={{ background: 'var(--bg)' }} />
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Role</label>
            <input value={user?.role || 'client'} readOnly style={{ background: 'var(--bg)' }} />
          </div>
        </div>
      )}

    </div>
  );
}
