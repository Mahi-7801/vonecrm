import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  FiMessageSquare, FiUsers, FiDollarSign, FiSmartphone,
  FiActivity, FiSend, FiUserPlus, FiInbox, FiArrowRight,
  FiTrendingUp, FiZap, FiMessageCircle, FiCheckCircle,
  FiHelpCircle, FiSettings, FiLayers, FiShield, FiPlusCircle, FiX,
  FiAlertTriangle
} from 'react-icons/fi';
import { SkeletonStats } from '../components/Skeleton';

import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [flows, setFlows] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSetupGuide, setShowSetupGuide] = useState(() => localStorage.getItem('hideSetupGuide') !== 'true');
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }
    fetchDashboard();
  }, [user]);

  const fetchDashboard = async () => {
    // 1. Fetch main stats and unblock loading instantly (<50ms)
    api.get('/dashboard')
      .then(res => {
        setStats(res.data);
      })
      .catch(err => console.error('Dashboard error:', err))
      .finally(() => setLoading(false));

    // 2. Fetch secondary status items in background asynchronously
    api.get('/plans/my-subscription').then(res => setSubscription(res.data)).catch(() => {});
    api.get('/flows').then(res => setFlows(res.data || [])).catch(() => {});
    api.get('/whatsapp/verification-status').then(res => setVerificationStatus(res.data)).catch(() => {});
  };

  const hideGuide = () => {
    setShowSetupGuide(false);
    localStorage.setItem('hideSetupGuide', 'true');
  };

  if (loading) return <SkeletonStats />;

  const dailyMessages = stats?.daily_messages || [];
  const recentMessages = stats?.recent_messages || [];
  const categories = stats?.message_categories || [];
  const verifiedNumbers = stats?.verified_numbers || 0;
  const totalContacts = stats?.total_contacts || 0;
  const maxMsg = Math.max(...dailyMessages.map(d => d.count), 1);

  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const found = dailyMessages.find(m => new Date(m.date).toISOString().split('T')[0] === dateStr);
    last7Days.push({ date: dateStr, day: d.toLocaleDateString('en', { weekday: 'short' }), count: found?.count || 0 });
  }

  const totalWeekMsgs = last7Days.reduce((s, d) => s + d.count, 0);

  // Setup completion calculation
  const setupSteps = [
    { title: 'Connect WhatsApp Number', done: verifiedNumbers > 0, link: '/onboarding', btn: 'Connect' },
    { title: 'Import Contacts', done: totalContacts > 0, link: '/contacts', btn: 'Add Contacts' },
    { title: 'Sync Message Templates', done: categories.length > 0, link: '/templates', btn: 'View Templates' },
    { title: 'Send First Broadcast', done: totalWeekMsgs > 0, link: '/broadcast', btn: 'Create Broadcast' }
  ];
  const completedSteps = setupSteps.filter(s => s.done).length;
  const progressPct = Math.round((completedSteps / setupSteps.length) * 100);

  const statCards = [
    {
      label: 'Active Contacts',
      sub: 'Total audience reach',
      value: totalContacts.toLocaleString(),
      icon: <FiUsers size={20} />,
      color: '#6366f1',
      bg: '#eef2ff',
      tag: 'Audience',
    },
    {
      label: 'Open Conversations',
      sub: 'Inbox active chats',
      value: (stats?.active_chats || 0).toLocaleString(),
      icon: <FiMessageSquare size={20} />,
      color: '#0ea5e9',
      bg: '#e0f2fe',
      tag: 'Live Chats',
    },
    {
      label: '7-Day Volume',
      sub: 'Messages sent & received',
      value: totalWeekMsgs.toLocaleString(),
      icon: <FiSend size={20} />,
      color: '#10b981',
      bg: '#d1fae5',
      tag: 'Activity',
    },
    {
      label: 'WhatsApp Status',
      sub: verifiedNumbers > 0 ? 'Meta API Operational' : 'Action Required',
      value: verifiedNumbers > 0 ? `${verifiedNumbers} Number` : 'Not Connected',
      icon: <FiSmartphone size={20} />,
      color: verifiedNumbers > 0 ? '#10b981' : '#f59e0b',
      bg: verifiedNumbers > 0 ? '#d1fae5' : '#fef3c7',
      tag: verifiedNumbers > 0 ? 'Connected' : 'Setup Now',
    },
    {
      label: 'Wallet Balance',
      sub: `Credit mode: ${stats?.credit_mode || 'postpaid'}`,
      value: `₹${parseFloat(stats?.balance || 0).toFixed(2)}`,
      icon: <FiDollarSign size={20} />,
      color: '#8b5cf6',
      bg: '#ede9fe',
      tag: 'Prepaid',
    },
    {
      label: 'Monthly Usage',
      sub: 'Current billing cycle',
      value: `₹${parseFloat(stats?.monthly_usage || 0).toFixed(2)}`,
      icon: <FiActivity size={20} />,
      color: '#ef4444',
      bg: '#fee2e2',
      tag: 'This Month',
    },
  ];

  return (
    <div className="page-body">

      {/* ── Top System Bar & Greeting ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>
              VONE DIGITALS CRM Control Center 🚀
            </h1>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px',
              borderRadius: 99, background: verifiedNumbers > 0 ? '#dcfce7' : '#fef3c7',
              color: verifiedNumbers > 0 ? '#1565c0' : '#92400e', fontSize: '0.75rem', fontWeight: 700,
              whiteSpace: 'nowrap', wordBreak: 'normal'
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: verifiedNumbers > 0 ? '#10b981' : '#f59e0b', flexShrink: 0 }} />
              {verifiedNumbers > 0 ? 'API Online' : 'Pending Setup'}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
            Automate customer chats, launch targeted broadcasts, and track delivery analytics in one place.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/broadcast')}
            className="btn btn-primary btn-sm"
            style={{ gap: 6, padding: '8px 16px', fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            <FiSend size={15} /> New Broadcast
          </button>
          <button
            onClick={() => navigate('/onboarding')}
            className="btn btn-secondary btn-sm"
            style={{ gap: 6, whiteSpace: 'nowrap' }}
          >
            <FiSettings size={15} /> Manage WhatsApp
          </button>
        </div>
      </div>

      {/* ── Interactive Setup Wizard (Unique Onboarding Banner) ── */}
      {showSetupGuide && progressPct < 100 && (
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 18, padding: '22px 26px', color: 'white', marginBottom: 24,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)', position: 'relative'
        }}>
          <button
            onClick={hideGuide}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Dismiss Setup Guide"
          >
            <FiX size={16} />
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', textTransform: 'uppercase', tracking: '0.08em', color: '#38bdf8', fontWeight: 700 }}>
                <FiShield size={16} /> Quick Setup Assistant
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '4px 0 0', color: '#ffffff' }}>
                Complete your CRM setup ({completedSteps} of 4 tasks finished)
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 140, height: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${progressPct}%`, height: '100%', background: '#10b981', borderRadius: 99, transition: 'width 0.5s ease' }} />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>{progressPct}%</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {setupSteps.map((step, idx) => (
              <div
                key={idx}
                style={{
                  background: step.done ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${step.done ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 12, padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ color: step.done ? '#10b981' : '#94a3b8', flexShrink: 0 }}>
                    {step.done ? <FiCheckCircle size={18} /> : <span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: '50%', border: '2px solid #94a3b8', textAlign: 'center', fontSize: '0.7rem', lineHeight: '14px', fontWeight: 700 }}>{idx + 1}</span>}
                  </div>
                  <span style={{ fontSize: '0.84rem', fontWeight: 600, color: step.done ? '#a7f3d0' : '#e2e8f0', textDecoration: step.done ? 'line-through' : 'none' }}>
                    {step.title}
                  </span>
                </div>
                {!step.done && (
                  <button
                    onClick={() => navigate(step.link)}
                    style={{
                      background: '#10b981', color: 'white', border: 'none', borderRadius: 6,
                      padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                      alignSelf: 'flex-start'
                    }}
                  >
                    {step.btn} →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI Agent Status Alert ── */}
      {(() => {
        const activeFlows = flows.filter(f => f.active);
        if (activeFlows.length > 0) {
          return (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
              background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', borderRadius: 12,
              border: '1px solid #6ee7b7', marginBottom: 20
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FiZap size={18} color="#16a34a" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#065f46' }}>
                  AI Agent Active — {activeFlows.length} flow{activeFlows.length > 1 ? 's' : ''} running
                </div>
                <div style={{ fontSize: '0.78rem', color: '#047857' }}>
                  Auto-reply is ON. When a user sends a message on WhatsApp, the AI responds automatically.
                </div>
              </div>
              <FiCheckCircle size={20} color="#16a34a" style={{ flexShrink: 0 }} />
            </div>
          );
        }
        return (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
            background: '#121218', borderRadius: 12, flexWrap: 'wrap',
            border: '1px solid #27272a', marginBottom: 20
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FiSettings size={18} color="#ef4444" />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>
                AI Agent Inactive
              </div>
              <div style={{ fontSize: '0.78rem', color: '#a1a1aa', wordBreak: 'normal' }}>
                No active flows. Create a flow and enable it to auto-reply to user messages.
              </div>
            </div>
            <button
              onClick={() => navigate('/flows')}
              style={{
                padding: '8px 14px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, #dc2626, #991b1b)', color: '#ffffff', fontWeight: 700, fontSize: '0.78rem',
                cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              Create Flow →
            </button>
          </div>
        );
      })()}

      {/* ── Business Verification Warning ── */}
      {verificationStatus && !verificationStatus.verified && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
          background: 'linear-gradient(135deg, #1c1917, #2a080c)', borderRadius: 14, flexWrap: 'wrap',
          border: '1px solid #7f1d1d', marginBottom: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FiAlertTriangle size={20} color="#f87171" />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
              Business Verification Incomplete
            </div>
            <div style={{ fontSize: '0.82rem', color: '#fca5a5', marginTop: 2, wordBreak: 'normal' }}>
              {verificationStatus.issues?.map((issue, i) => (
                <div key={i}>• {issue}</div>
              ))}
              {!verificationStatus.issues?.length && 'Complete business verification on Meta to unlock all features.'}
            </div>
          </div>
          <a
            href="https://business.facebook.com/settings/business-verification/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '10px 18px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #dc2626, #991b1b)', color: 'white', fontWeight: 800, fontSize: '0.82rem',
              cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
              boxShadow: '0 4px 14px rgba(220,38,38,0.4)'
            }}
          >
            Complete on Meta →
          </a>
        </div>
      )}

      {/* ── Stat Cards Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {statCards.map((card, i) => (
          <div
            key={i}
            style={{
              background: 'var(--card)', borderRadius: 16, padding: '20px 22px',
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)',
              transition: 'all 0.25s ease', position: 'relative', overflow: 'hidden'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color }}>
                {card.icon}
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: card.color, background: card.bg, padding: '3px 8px', borderRadius: 20 }}>
                {card.tag}
              </span>
            </div>

            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 4 }}>
              {card.value}
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
              {card.label}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Current Plan & Usage ── */}
      {subscription && (
        <div style={{
          background: 'var(--card)', borderRadius: 16, padding: '24px',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', marginBottom: 24
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
                📦 Your Plan: {subscription.plan_name}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Expires: {new Date(subscription.expires_at).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <button
              onClick={() => navigate('/plans')}
              style={{
                background: 'none', border: '1px solid var(--primary)', color: 'var(--primary)',
                padding: '6px 14px', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem',
                cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              Upgrade Plan
            </button>
          </div>

          {/* Usage Bars */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Messages Usage */}
            <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>Messages Used</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {totalWeekMsgs} / {subscription.max_messages === -1 ? '∞' : subscription.max_messages?.toLocaleString()}
                </span>
              </div>
              <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: subscription.max_messages === -1 ? '15%' : `${Math.min((totalWeekMsgs / (subscription.max_messages || 1)) * 100, 100)}%`,
                  background: 'linear-gradient(90deg, #10b981, #059669)',
                  borderRadius: 99, transition: 'width 0.5s ease'
                }} />
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                {subscription.max_messages === -1 ? 'Unlimited messages included' : `${subscription.max_messages - totalWeekMsgs} messages remaining this month`}
              </span>
            </div>

            {/* Contacts Usage */}
            <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>Contacts</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#6366f1' }}>
                  {totalContacts} / {subscription.max_contacts === -1 ? '∞' : subscription.max_contacts?.toLocaleString()}
                </span>
              </div>
              <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: subscription.max_contacts === -1 ? '15%' : `${Math.min((totalContacts / (subscription.max_contacts || 1)) * 100, 100)}%`,
                  background: 'linear-gradient(90deg, #6366f1, #4f46e5)',
                  borderRadius: 99, transition: 'width 0.5s ease'
                }} />
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                {subscription.max_contacts === -1 ? 'Unlimited contacts included' : `${subscription.max_contacts - totalContacts} contacts remaining`}
              </span>
            </div>
          </div>

          {/* Plan Features */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(() => {
              const features = {
                basic: ['Template messages', 'Live chat inbox', 'Contact labels', '1 WA number', 'Email support'],
                professional: ['Template + text + media', 'Bulk broadcast', 'Drip sequences', 'Flow Builder', 'AI auto-reply', 'Quick replies', 'Analytics', '2 WA numbers', 'Priority support'],
                enterprise: ['All message types', 'Bulk broadcast + analytics', 'Full automation', 'Advanced Flow Builder', 'AI agents', 'Canned responses', 'Facebook integration', 'Team & agents', '5 WA numbers', 'API access', 'Dedicated manager']
              };
              const planKey = (subscription.plan_name || '').toLowerCase().includes('basic') ? 'basic' :
                             (subscription.plan_name || '').toLowerCase().includes('pro') ? 'professional' : 'enterprise';
              return (features[planKey] || features.professional).map((f, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                  borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)',
                  fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)'
                }}>
                  <FiCheckCircle size={12} color="#10b981" /> {f}
                </span>
              ));
            })()}
          </div>
        </div>
      )}

      {/* ── Main Activity Hub (Charts & Categories) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 24 }}>

        {/* 7-Day Analytics Bar Chart */}
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
                📊 Messaging Volume (Last 7 Days)
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Real-time record of inbound & outbound customer messages
              </p>
            </div>
            <button
              onClick={() => navigate('/analytics')}
              style={{
                background: 'none', border: 'none', color: '#10b981', fontWeight: 700,
                fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: 4, whiteSpace: 'nowrap', wordBreak: 'normal', flexShrink: 0
              }}
            >
              Full Analytics <FiArrowRight size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 170, paddingBottom: 4 }}>
            {last7Days.map((d, i) => {
              const heightPct = Math.max((d.count / maxMsg) * 140, 6);
              const isToday = i === 6;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: '0.72rem', color: d.count > 0 ? 'var(--text)' : 'var(--text-muted)', fontWeight: 700, whiteSpace: 'nowrap', wordBreak: 'normal' }}>
                    {d.count > 0 ? d.count : ''}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      borderRadius: '8px 8px 0 0',
                      background: isToday
                        ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)'
                        : d.count > 0 ? 'linear-gradient(180deg, #34d399 0%, #10b981 100%)' : 'var(--border)',
                      height: `${heightPct}px`,
                      transition: 'height 0.4s ease',
                      boxShadow: d.count > 0 ? '0 4px 12px rgba(16,185,129,0.2)' : 'none',
                    }}
                    title={`${d.day}: ${d.count} messages`}
                  />
                  <span style={{ fontSize: '0.72rem', color: isToday ? '#10b981' : 'var(--text-muted)', fontWeight: isToday ? 700 : 500, whiteSpace: 'nowrap', wordBreak: 'normal', textOverflow: 'ellipsis' }}>
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Message Category Breakdown */}
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
            🏷️ Category Breakdown
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Meta message categorization</p>

          {categories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
              <FiMessageCircle size={36} style={{ opacity: 0.2, marginBottom: 10 }} />
              <p style={{ fontSize: '0.85rem' }}>No categorized messages yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {categories.map((cat, i) => {
                const total = categories.reduce((sum, c) => sum + c.count, 0);
                const pct = total > 0 ? Math.round((cat.count / total) * 100) : 0;
                const colors = { marketing: '#ef4444', utility: '#6366f1', authentication: '#f59e0b', message: '#10b981' };
                const color = colors[cat.category] || '#6366f1';
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>{cat.category}</span>
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>{cat.count} ({pct}%)</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Unique Feature Workspaces & Quick Launch Hub ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>

        {/* Feature Tools Hub */}
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
            ⚡ Feature Hub & Workflows
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {[
              { title: 'WhatsApp Broadcast', desc: 'Send bulk template campaigns', icon: <FiSend size={20} />, path: '/broadcast', color: '#10b981', bg: '#d1fae5' },
              { title: 'Chat Automation Flows', desc: 'Build automated bot replies', icon: <FiZap size={20} />, path: '/flows', color: '#6366f1', bg: '#eef2ff' },
              { title: 'Shared Live Inbox', desc: 'Chat with customers in real-time', icon: <FiInbox size={20} />, path: '/inbox', color: '#0ea5e9', bg: '#e0f2fe' },
              { title: 'Audience & Contacts', desc: 'Manage CRM contacts & labels', icon: <FiUserPlus size={20} />, path: '/contacts', color: '#f59e0b', bg: '#fef3c7' },
              { title: 'Meta Message Templates', desc: 'Create & sync WhatsApp templates', icon: <FiMessageSquare size={20} />, path: '/templates', color: '#8b5cf6', bg: '#ede9fe' },
              { title: 'Drip Sequences', desc: 'Schedule timed follow-up messages', icon: <FiLayers size={20} />, path: '/drip-sequences', color: '#ef4444', bg: '#fee2e2' },
            ].map((tool, idx) => (
              <div
                key={idx}
                onClick={() => navigate(tool.path)}
                style={{
                  display: 'flex', gap: 14, padding: '16px', borderRadius: 14,
                  border: '1px solid var(--border)', background: 'var(--card)',
                  cursor: 'pointer', transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = tool.color;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: tool.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tool.color, flexShrink: 0 }}>
                  {tool.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{tool.title}</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{tool.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Customer Activity Stream */}
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
              💬 Live Customer Feed
            </h3>
            <button onClick={() => navigate('/inbox')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', fontSize: '0.8rem', fontWeight: 700 }}>
              Open Inbox →
            </button>
          </div>

          {recentMessages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <FiInbox size={36} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p style={{ fontSize: '0.85rem' }}>No recent messages</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 310, overflowY: 'auto' }}>
              {recentMessages.slice(0, 7).map((msg, i) => (
                <div
                  key={i}
                  onClick={() => navigate('/inbox')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                    borderRadius: 12, cursor: 'pointer', background: 'var(--bg)', transition: 'transform 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateX(3px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = ''}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: msg.direction === 'inbound' ? '#dbeafe' : '#d1fae5',
                    color: msg.direction === 'inbound' ? '#1d4ed8' : '#047857',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.85rem', fontWeight: 700
                  }}>
                    {msg.direction === 'inbound' ? 'IN' : 'OUT'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {msg.contact_name || msg.contact_phone || 'Customer'}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {msg.body || 'Media message'}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
