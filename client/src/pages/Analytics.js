import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  FiMessageSquare, FiUsers, FiSend, FiTrendingUp, FiClock,
  FiCheck, FiBarChart2, FiDollarSign, FiActivity, FiArrowUpRight, FiZap,
  FiPhone, FiWifi, FiPackage
} from 'react-icons/fi';
import { SkeletonStats } from '../components/Skeleton';
import useSubscriptionGuard from '../hooks/useSubscriptionGuard';
import PaywallOverlay from '../components/PaywallOverlay';

export default function Analytics() {
  const { hasSubscription, loading: subLoading } = useSubscriptionGuard();
  const [stats, setStats] = useState(null);
  const [usage, setUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');

  useEffect(() => { fetchData(); }, [period]);

  const fetchData = async () => {
    try {
      const [usageRes, dashRes] = await Promise.all([
        api.get(`/billing/usage?period=${period}`),
        api.get('/dashboard')
      ]);
      setUsage(usageRes.data.breakdown || []);
      setStats(dashRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!subLoading && !hasSubscription) return <PaywallOverlay toolName="Analytics" />;
  if (loading) return <SkeletonStats />;

  const totalMessages = usage.reduce((sum, u) => sum + parseInt(u.count || 0), 0);
  const totalCost = usage.reduce((sum, u) => sum + parseFloat(u.total_cost || 0), 0);

  const kpis = [
    { label: 'Total Contacts', value: (stats?.total_contacts || 0).toLocaleString(), icon: <FiUsers size={20} />, color: '#6366f1', bg: '#eef2ff', tag: 'Database' },
    { label: 'Active Conversations', value: (stats?.active_chats || 0).toLocaleString(), icon: <FiMessageSquare size={20} />, color: '#0ea5e9', bg: '#e0f2fe', tag: 'Live inbox' },
    { label: 'Total Messages', value: totalMessages.toLocaleString(), icon: <FiSend size={20} />, color: '#10b981', bg: '#d1fae5', tag: 'Volume' },
    { label: 'Total Spend', value: `₹${totalCost.toFixed(2)}`, icon: <FiTrendingUp size={20} />, color: '#f59e0b', bg: '#fef3c7', tag: 'Cost' },
    { label: 'Wallet Balance', value: `₹${parseFloat(stats?.balance || 0).toFixed(2)}`, icon: <FiDollarSign size={20} />, color: '#8b5cf6', bg: '#f3e8ff', tag: stats?.credit_mode || 'postpaid' },
    { label: 'Verified Numbers', value: (stats?.verified_numbers || 0).toString(), icon: <FiPhone size={20} />, color: '#ec4899', bg: '#fdf2f8', tag: 'WA API' },
  ];

  return (
    <div style={{ padding: '24px 32px 40px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: '0 0 4px' }}>
            Analytics & Intelligence 📈
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
            Comprehensive performance metrics, messaging volume breakdown, and wallet utilization.
          </p>
        </div>

        {/* Time Period Filter Tabs */}
        <div style={{ display: 'flex', gap: 6, background: 'var(--card)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
          {['all', 'daily', 'weekly', 'monthly'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none',
                background: period === p ? 'var(--primary)' : 'transparent',
                color: period === p ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                transition: 'all 0.2s ease', textTransform: 'capitalize'
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {kpis.map((kpi, i) => (
          <div
            key={i}
            style={{
              background: 'var(--card)', borderRadius: 16, padding: '20px 22px',
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color }}>
                {kpi.icon}
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: kpi.color, background: kpi.bg, padding: '3px 8px', borderRadius: 20 }}>
                {kpi.tag}
              </span>
            </div>

            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 4 }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* Main Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Message Category Breakdown */}
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
            🏷️ Message Category Volume & Cost
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Usage distribution across Meta messaging categories</p>

          {usage.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <FiBarChart2 size={36} style={{ opacity: 0.2, marginBottom: 10 }} />
              <p style={{ fontSize: '0.85rem' }}>No usage data recorded yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {usage.map(u => {
                const maxCount = Math.max(...usage.map(x => parseInt(x.count || 0)));
                const percentage = maxCount > 0 ? (parseInt(u.count || 0) / maxCount) * 100 : 0;
                const colors = { marketing: '#ef4444', utility: '#6366f1', authentication: '#f59e0b', message: '#10b981' };
                const color = colors[u.category?.toLowerCase()] || '#6366f1';

                return (
                  <div key={u.category} style={{ padding: '14px 16px', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                      <span style={{ textTransform: 'capitalize', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>
                        {u.category}
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: color }}>
                        {u.count} msgs • ₹{parseFloat(u.total_cost || 0).toFixed(2)}
                      </span>
                    </div>
                    <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${percentage}%`, background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Performance Overview */}
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
            ⚡ System Health & Summary
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Account balance & activity breakdown</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Messages Sent', val: (totalMessages || stats?.messages_sent || 0).toLocaleString(), icon: <FiMessageSquare color="#10b981" /> },
              { label: 'Total Contacts In Database', val: (stats?.total_contacts || 0).toLocaleString(), icon: <FiUsers color="#6366f1" /> },
              { label: 'Active Customer Conversations', val: (stats?.active_chats || 0).toLocaleString(), icon: <FiCheck color="#0ea5e9" /> },
              { label: 'Monthly Usage Cost', val: `₹${parseFloat(stats?.monthly_usage || 0).toFixed(2)}`, icon: <FiClock color="#ef4444" /> },
              { label: 'Current Wallet Balance', val: `₹${parseFloat(stats?.balance || 0).toFixed(2)}`, icon: <FiTrendingUp color="#f59e0b" /> },
            ].map((row, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                  {row.icon} {row.label}
                </span>
                <strong style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)' }}>{row.val}</strong>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Daily Messages Chart + Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>

        {/* Daily Message Volume (Last 7 Days) */}
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
            📊 Daily Message Volume (Last 7 Days)
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Messages sent per day</p>

          {stats?.daily_messages?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(() => {
                const maxDaily = Math.max(...stats.daily_messages.map(d => d.count));
                return stats.daily_messages.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', minWidth: 70, textAlign: 'right' }}>
                      {new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </span>
                    <div style={{ flex: 1, height: 20, background: 'var(--bg)', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <div style={{
                        height: '100%', width: `${maxDaily > 0 ? (d.count / maxDaily) * 100 : 0}%`,
                        background: 'linear-gradient(90deg, #10b981, #059669)',
                        borderRadius: 6, transition: 'width 0.5s ease',
                        display: 'flex', alignItems: 'center', paddingLeft: 8
                      }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'white' }}>{d.count}</span>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <FiBarChart2 size={36} style={{ opacity: 0.2, marginBottom: 10 }} />
              <p style={{ fontSize: '0.85rem' }}>No daily data available yet</p>
            </div>
          )}
        </div>

        {/* Recent Messages Activity */}
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
            💬 Recent Messages
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Latest messaging activity</p>

          {stats?.recent_messages?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.recent_messages.slice(0, 8).map((msg, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)',
                  borderLeft: msg.direction === 'inbound' ? '3px solid #0ea5e9' : '3px solid #10b981'
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: msg.direction === 'inbound' ? '#e0f2fe' : '#d1fae5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    {msg.direction === 'inbound' ? <FiMessageSquare size={14} color="#0ea5e9" /> : <FiSend size={14} color="#10b981" />}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {msg.contact_name || msg.contact_phone || 'Unknown'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {msg.body?.substring(0, 50)}{msg.body?.length > 50 ? '...' : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      background: msg.status === 'sent' ? '#d1fae5' : msg.status === 'delivered' ? '#dbeafe' : msg.status === 'read' ? '#dcfce7' : '#fee2e2',
                      color: msg.status === 'sent' ? '#059669' : msg.status === 'delivered' ? '#2563eb' : msg.status === 'read' ? '#16a34a' : '#dc2626'
                    }}>
                      {msg.status || 'sent'}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {msg.direction === 'inbound' ? '↓ In' : '↑ Out'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <FiMessageSquare size={36} style={{ opacity: 0.2, marginBottom: 10 }} />
              <p style={{ fontSize: '0.85rem' }}>No messages yet</p>
            </div>
          )}
        </div>

      </div>

      {/* Message Category Cost Breakdown + Credit Mode */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>

        {/* Per-Category Cost Detail */}
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
            💰 Cost Per Category
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Detailed pricing breakdown by Meta category</p>

          {usage.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { cat: 'marketing', label: 'Marketing', color: '#ef4444', bg: '#fef2f2', rate: '₹0.90/msg' },
                { cat: 'utility', label: 'Utility', color: '#6366f1', bg: '#eef2ff', rate: '₹0.12/msg' },
                { cat: 'authentication', label: 'Authentication', color: '#f59e0b', bg: '#fffbeb', rate: '₹0.12/msg' },
                { cat: 'service', label: 'Service', color: '#10b981', bg: '#ecfdf5', rate: 'Free' },
                { cat: 'message', label: 'AI Reply', color: '#8b5cf6', bg: '#f5f3ff', rate: '₹0.05/msg' },
              ].map(item => {
                const data = usage.find(u => u.category?.toLowerCase() === item.cat);
                const count = data ? parseInt(data.count || 0) : 0;
                const cost = data ? parseFloat(data.total_cost || 0) : 0;
                return (
                  <div key={item.cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: item.bg, border: `1px solid ${item.color}20` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>{item.label}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{item.rate}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: item.color }}>{count}</div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>₹{cost.toFixed(2)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
              <FiDollarSign size={36} style={{ opacity: 0.2, marginBottom: 10 }} />
              <p style={{ fontSize: '0.85rem' }}>No cost data yet</p>
            </div>
          )}
        </div>

        {/* Account & API Status */}
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
            🔧 Account & API Status
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>WhatsApp integration health</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Credit Mode', val: stats?.credit_mode === 'prepaid' ? 'Prepaid (Wallet)' : 'Postpaid', icon: <FiPackage size={16} />, color: stats?.credit_mode === 'prepaid' ? '#f59e0b' : '#10b981' },
              { label: 'Wallet Balance', val: `₹${parseFloat(stats?.balance || 0).toFixed(2)}`, icon: <FiDollarSign size={16} />, color: '#8b5cf6' },
              { label: 'Monthly Spend', val: `₹${parseFloat(stats?.monthly_usage || 0).toFixed(2)}`, icon: <FiTrendingUp size={16} />, color: '#ef4444' },
              { label: 'WA Numbers Connected', val: (stats?.verified_numbers || 0).toString(), icon: <FiPhone size={16} />, color: '#25d366' },
              { label: 'Total Contacts', val: (stats?.total_contacts || 0).toLocaleString(), icon: <FiUsers size={16} />, color: '#6366f1' },
              { label: 'Active Chats', val: (stats?.active_chats || 0).toLocaleString(), icon: <FiMessageSquare size={16} />, color: '#0ea5e9' },
            ].map((row, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                  <span style={{ color: row.color }}>{row.icon}</span> {row.label}
                </span>
                <strong style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text)' }}>{row.val}</strong>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
