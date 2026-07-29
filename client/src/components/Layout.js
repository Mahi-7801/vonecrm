import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  FiHome, FiMessageSquare, FiUsers, FiFileText,
  FiSend, FiGitBranch, FiCreditCard, FiSettings,
  FiDollarSign, FiUser, FiPhone, FiBarChart2, FiBell,
  FiZap, FiClock, FiLink, FiActivity, FiShield,
  FiMenu, FiX, FiMessageCircle, FiLayers,
  FiDatabase, FiGlobe, FiKey, FiRefreshCw,
  FiAlertTriangle, FiCpu, FiTrendingUp,
  FiChevronDown, FiLogOut,
  FiBook, FiFlag, FiWifi, FiPackage,
  FiAward, FiLock, FiMail, FiClipboard, FiSliders,
  FiCamera, FiTag, FiToggleRight, FiSearch
} from 'react-icons/fi';

// ─── Individual sidebar section (collapsible) ───────────────────────────────
function SideSection({ sectionId, title, emoji, items, defaultOpen, openSections, toggleSection, onNavClick, disabled }) {
  const location = useLocation();
  const isOpen = openSections.has(sectionId);
  const currentPath = location.pathname;
  const isAnyActive = items.some(item => {
    const itemPath = item.to.split('?')[0];
    return itemPath === currentPath || (itemPath !== '/admin' && itemPath !== '/' && currentPath.startsWith(itemPath));
  });

  return (
    <div style={{ marginBottom: 2, opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      {/* Section header button */}
      <button
        onClick={() => !disabled && toggleSection(sectionId)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 14px 6px 10px',
          background: isAnyActive ? 'rgba(220,38,38,0.12)' : 'none',
          border: 'none', borderLeft: isAnyActive ? '2px solid #dc2626' : '2px solid transparent',
          cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left', borderRadius: '0 6px 6px 0',
          transition: 'all 0.18s',
        }}
      >
        <span style={{ fontSize: 15 }}>{emoji}</span>
        <span style={{ flex: 1, fontSize: '0.67rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: isAnyActive ? '#fca5a5' : 'rgba(255,255,255,0.45)' }}>
          {title}
        </span>
        {disabled && (
          <span style={{ fontSize: '0.55rem', color: '#fbbf24', fontWeight: 700, background: 'rgba(251,191,36,0.15)', padding: '1px 5px', borderRadius: 4 }}>
            LOCKED
          </span>
        )}
        {!disabled && (
          <span style={{ color: 'rgba(255,255,255,0.3)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
            <FiChevronDown size={12} />
          </span>
        )}
      </button>

      {/* Section items */}
      {isOpen && !disabled && (
        <div style={{ paddingBottom: 4 }}>
          {items.map(item => (
            <NavLink
              key={item.to + item.label}
              to={item.to}
              end={item.end}
              onClick={onNavClick}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 12px 7px 30px',
                textDecoration: 'none',
                borderRadius: '0 8px 8px 0',
                marginRight: 10,
                marginBottom: 1,
                background: isActive ? 'linear-gradient(90deg, rgba(220,38,38,0.22), rgba(220,38,38,0.06))' : 'transparent',
                borderLeft: isActive ? '2px solid #dc2626' : '2px solid transparent',
                color: isActive ? '#f87171' : 'rgba(255,255,255,0.65)',
                transition: 'all 0.15s',
                fontSize: '0.8rem',
                fontWeight: isActive ? 700 : 400,
              })}
            >
              <span style={{ fontSize: 13, flexShrink: 0, opacity: 0.85 }}>{item.icon}</span>
              <span style={{ flex: 1, lineHeight: 1.3 }}>{item.label}</span>
              {item.badge != null && (
                <span style={{ background: '#dc2626', color: '#fff', fontSize: '0.58rem', fontWeight: 800, padding: '1px 5px', borderRadius: 99 }}>{item.badge}</span>
              )}
              {item.tag && (
                <span style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontSize: '0.55rem', fontWeight: 700, padding: '1px 5px', borderRadius: 99, letterSpacing: '0.03em' }}>{item.tag}</span>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Layout ────────────────────────────────────────────────────────────
export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') !== 'false');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationStatus, setVerificationStatus] = useState(null);
  const notifRef = useRef(null);
  const isAdmin = user?.role === 'admin';

  // Track which sections are open — key by sectionId
  const [openSections, setOpenSections] = useState(() => new Set(['overview', 'user_mgmt']));

  const toggleSection = (id) => setOpenSections(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── ADMIN SECTIONS ────────────────────────────────────────────────────────
  const adminSections = [
    {
      id: 'overview', emoji: '📊', title: 'Overview',
      items: [
        { to: '/admin', end: true, icon: <FiBarChart2 />, label: 'Super Dashboard' },
        { to: '/admin/users?tab=all', icon: <FiUsers />, label: 'Platform Users' },
        { to: '/admin/numbers?tab=all', icon: <FiPhone />, label: 'WA Numbers' },
      ]
    },
    {
      id: 'user_mgmt', emoji: '👥', title: 'User Management',
      items: [
        { to: '/admin/users?tab=all', icon: <FiUsers />, label: 'All Users' },
        { to: '/admin/users?tab=profiles', icon: <FiUser />, label: 'User Profiles' },
        { to: '/admin/users?tab=roles', icon: <FiShield />, label: 'Roles & Permissions' },
        { to: '/admin/users?tab=suspended', icon: <FiAlertTriangle />, label: 'Suspended Users' },
      ]
    },
    {
      id: 'facebook', emoji: '📘', title: 'Facebook Integration',
      items: [
        { to: '/admin/facebook?tab=connections', icon: <FiLink />, label: 'FB Connections', tag: 'Live' },
        { to: '/admin/facebook?tab=tokens', icon: <FiKey />, label: 'Page Access Tokens' },
        { to: '/admin/facebook?tab=expiry', icon: <FiRefreshCw />, label: 'Token Expiry Status' },
        { to: '/admin/facebook?tab=bm', icon: <FiFlag />, label: 'Business Manager' },
        { to: '/admin/facebook?tab=permissions', icon: <FiLock />, label: 'Permissions Review' },
      ]
    },
    {
      id: 'whatsapp', emoji: '💬', title: 'WhatsApp Cloud API',
      items: [
        { to: '/admin/whatsapp-api?tab=waba', icon: <FiPhone />, label: 'WABA Accounts' },
        { to: '/admin/whatsapp-api?tab=quality', icon: <FiActivity />, label: 'Quality Ratings' },
        { to: '/admin/whatsapp-api?tab=webhook', icon: <FiWifi />, label: 'Webhook Status', tag: 'Live' },
        { to: '/admin/whatsapp-api?tab=health', icon: <FiBarChart2 />, label: 'API Health' },
        { to: '/admin/whatsapp-api?tab=token', icon: <FiKey />, label: 'Token Status' },
      ]
    },
    {
      id: 'campaigns', emoji: '📢', title: 'Campaigns & Broadcast',
      items: [
        { to: '/admin/messages?tab=all', icon: <FiSend />, label: 'All Campaigns' },
        { to: '/admin/messages?tab=reports', icon: <FiBarChart2 />, label: 'Delivery Reports' },
        { to: '/admin/messages?tab=analytics', icon: <FiTrendingUp />, label: 'Campaign Analytics' },
      ]
    },
    {
      id: 'templates', emoji: '📝', title: 'Templates',
      items: [
        { to: '/admin/templates?tab=all', icon: <FiFileText />, label: 'All Templates' },
        { to: '/admin/templates?tab=pending', icon: <FiActivity />, label: 'Pending Approval' },
        { to: '/admin/templates?tab=approved', icon: <FiLayers />, label: 'Approved' },
        { to: '/admin/templates?tab=rejected', icon: <FiAlertTriangle />, label: 'Rejected' },
      ]
    },
    {
      id: 'flows', emoji: '🔄', title: 'Flow Builder',
      items: [
        { to: '/admin/flows?tab=all', icon: <FiGitBranch />, label: 'All Flows' },
        { to: '/admin/flows?tab=published', icon: <FiActivity />, label: 'Published Flows' },
        { to: '/admin/flows?tab=draft', icon: <FiClipboard />, label: 'Draft Flows' },
      ]
    },
    {
      id: 'agents', emoji: '🤖', title: 'AI Agents',
      items: [
        { to: '/admin/agents', icon: <FiCpu />, label: 'All Agents' },
      ]
    },
    {
      id: 'drip', emoji: '📅', title: 'Drip Sequences',
      items: [
        { to: '/admin/drip-sequences', icon: <FiClock />, label: 'All Sequences' },
      ]
    },
    {
      id: 'billing', emoji: '💳', title: 'Platform Billing',
      items: [
        { to: '/admin/pricing?tab=plans', icon: <FiPackage />, label: 'Subscription Plans' },
        { to: '/admin/pricing?tab=transactions', icon: <FiDollarSign />, label: 'All Transactions' },
        { to: '/admin/pricing?tab=razorpay', icon: <FiCreditCard />, label: 'Razorpay Payments' },
        { to: '/admin/pricing?tab=refunds', icon: <FiRefreshCw />, label: 'Refunds' },
        { to: '/admin/pricing?tab=gst', icon: <FiFileText />, label: 'GST Invoices' },
      ]
    },
    {
      id: 'meta_billing', emoji: '💰', title: 'Meta Billing',
      items: [
        { to: '/admin/pricing?tab=conversation', icon: <FiTrendingUp />, label: 'Conversation Charges', tag: 'API' },
        { to: '/admin/pricing?tab=marketing', icon: <FiSend />, label: 'Marketing Charges' },
        { to: '/admin/pricing?tab=utility', icon: <FiZap />, label: 'Utility Charges' },
        { to: '/admin/pricing?tab=auth', icon: <FiLock />, label: 'Auth Charges' },
        { to: '/admin/pricing?tab=invoices', icon: <FiBook />, label: 'Meta Invoices' },
      ]
    },
    {
      id: 'contacts', emoji: '📋', title: 'Contacts & CRM',
      items: [
        { to: '/admin/contacts?tab=all', icon: <FiUsers />, label: 'All Contacts' },
        { to: '/admin/contacts?tab=labels', icon: <FiTag />, label: 'Segments & Labels' },
        { to: '/admin/contacts?tab=optout', icon: <FiActivity />, label: 'Opt-out List' },
      ]
    },
    {
      id: 'notifications', emoji: '📬', title: 'Notifications',
      items: [
        { to: '/admin/notifications-admin?tab=alerts', icon: <FiBell />, label: 'System Alerts' },
        { to: '/admin/notifications-admin?tab=email', icon: <FiMail />, label: 'Email Notifications' },
        { to: '/admin/notifications-admin?tab=whatsapp', icon: <FiMessageSquare />, label: 'WA Notifications' },
      ]
    },
    {
      id: 'logs', emoji: '📜', title: 'Activity & Logs',
      items: [
        { to: '/admin/logs?tab=login', icon: <FiClipboard />, label: 'Login History' },
        { to: '/admin/logs?tab=api', icon: <FiActivity />, label: 'API Logs' },
        { to: '/admin/logs?tab=error', icon: <FiAlertTriangle />, label: 'Error Logs' },
        { to: '/admin/logs?tab=audit', icon: <FiDatabase />, label: 'Audit Trail' },
      ]
    },
    {
      id: 'settings', emoji: '⚙️', title: 'System Settings',
      items: [
        { to: '/admin/settings?tab=general', icon: <FiSettings />, label: 'General Settings' },
        { to: '/admin/settings?tab=api', icon: <FiSliders />, label: 'API Configuration' },
        { to: '/admin/settings?tab=smtp', icon: <FiMail />, label: 'SMTP Settings' },
        { to: '/admin/settings?tab=webhook', icon: <FiGlobe />, label: 'Webhook Settings' },
        { to: '/admin/settings?tab=server', icon: <FiCpu />, label: 'Server & Cache' },
        { to: '/admin/settings?tab=backup', icon: <FiDatabase />, label: 'Backup & Restore' },
        { to: '/admin/plans', icon: <FiAward />, label: 'Plans Manager' },
      ]
    },
  ];

  // ── USER SECTIONS ─────────────────────────────────────────────────────────
  const userSections = [
    {
      id: 'dashboard', emoji: '🏠', title: 'Dashboard',
      items: [
        { to: '/dashboard', end: true, icon: <FiHome />, label: 'Overview' },
        { to: '/inbox', icon: <FiMessageSquare />, label: 'Inbox', badge: unreadCount > 0 ? unreadCount : null },
      ]
    },
    {
      id: 'contacts', emoji: '👥', title: 'Contacts',
      items: [
        { to: '/contacts', icon: <FiUsers />, label: 'All Contacts' },
        { to: '/contacts', icon: <FiTag />, label: 'Labels & Groups' },
        { to: '/contacts', icon: <FiActivity />, label: 'Segments' },
      ]
    },
    {
      id: 'campaigns', emoji: '📢', title: 'Campaigns',
      items: [
        { to: '/broadcast', icon: <FiSend />, label: 'Broadcast' },
        { to: '/broadcast', icon: <FiBarChart2 />, label: 'Campaign Analytics' },
        { to: '/drip-sequences', icon: <FiClock />, label: 'Drip Sequences' },
      ]
    },
    {
      id: 'templates', emoji: '📝', title: 'Templates',
      items: [
        { to: '/templates', icon: <FiFileText />, label: 'My Templates' },
        { to: '/templates', icon: <FiActivity />, label: 'Pending / Rejected' },
        { to: '/templates', icon: <FiLayers />, label: 'Approved' },
      ]
    },
    {
      id: 'automation', emoji: '🤖', title: 'Automation',
      items: [
        { to: '/flows', icon: <FiGitBranch />, label: 'Flow Builder' },
        { to: '/quick-replies', icon: <FiZap />, label: 'Quick Replies' },
        { to: '/flows', icon: <FiToggleRight />, label: 'Auto Reply' },
        { to: '/drip-sequences', icon: <FiClock />, label: 'Scheduled Messages' },
      ]
    },
    {
      id: 'analytics', emoji: '📈', title: 'Analytics',
      items: [
        { to: '/analytics', icon: <FiBarChart2 />, label: 'Analytics' },
        { to: '/analytics', icon: <FiTrendingUp />, label: 'Campaign ROI' },
        { to: '/analytics', icon: <FiActivity />, label: 'Message Stats' },
      ]
    },
    {
      id: 'billing', emoji: '💳', title: 'Billing & Wallet',
      items: [
        { to: '/billing', icon: <FiCreditCard />, label: 'Wallet & Balance' },
        { to: '/billing', icon: <FiDollarSign />, label: 'Meta Billing' },
        { to: '/billing', icon: <FiFileText />, label: 'Payment History' },
        { to: '/plans', icon: <FiPackage />, label: 'Subscription Plans' },
      ]
    },
    {
      id: 'whatsapp', emoji: '📞', title: 'WhatsApp',
      items: [
        { to: '/settings', icon: <FiPhone />, label: 'Connected Number' },
        { to: '/settings', icon: <FiActivity />, label: 'Quality Rating' },
        { to: '/settings', icon: <FiWifi />, label: 'Webhook Status' },
        { to: '/settings', icon: <FiKey />, label: 'Token Status' },
      ]
    },
    {
      id: 'facebook', emoji: '📘', title: 'Facebook',
      items: [
        { to: '/settings', icon: <FiLink />, label: 'FB Connection' },
        { to: '/settings', icon: <FiFlag />, label: 'Business Manager' },
        { to: '/settings', icon: <FiKey />, label: 'Permissions' },
        { to: '/settings', icon: <FiRefreshCw />, label: 'Token Status' },
      ]
    },
    {
      id: 'team', emoji: '👨‍💼', title: 'Team & Agents',
      items: [
        { to: '/agents', icon: <FiUser />, label: 'Team Members' },
        { to: '/agents', icon: <FiShield />, label: 'Roles' },
        { to: '/agents', icon: <FiBarChart2 />, label: 'Performance' },
      ]
    },
    {
      id: 'settings', emoji: '⚙️', title: 'Settings',
      items: [
        { to: '/settings', icon: <FiSettings />, label: 'General Settings' },
        { to: '/settings', icon: <FiLock />, label: 'Security & 2FA' },
        { to: '/settings', icon: <FiMail />, label: 'Notifications' },
        { to: '/settings', icon: <FiCamera />, label: 'Profile & Branding' },
      ]
    },
  ];

  const isFullyVerified = verificationStatus?.verified && verificationStatus?.messaging_limit !== 'TIER_250';
  const toolsDisabled = !isAdmin && !isFullyVerified;

  const sections = isAdmin ? adminSections : userSections.map(s => ({
    ...s,
    disabled: toolsDisabled && !['overview', 'dashboard', 'settings', 'whatsapp', 'facebook'].includes(s.id),
    items: s.items.map(item => ({
      ...item,
      disabled: toolsDisabled && !['overview', 'dashboard', 'settings', 'whatsapp', 'facebook'].includes(s.id)
    }))
  }));

  // Filter sections by search
  const visibleSections = useMemo(() => {
    if (!searchTerm.trim()) return sections;
    const q = searchTerm.toLowerCase();
    return sections
      .map(s => ({
        ...s,
        items: s.items.filter(i => i.label.toLowerCase().includes(q))
      }))
      .filter(s => s.items.length > 0 || s.title.toLowerCase().includes(q));
  }, [searchTerm, sections]);

  useEffect(() => {
    if (!isAdmin) {
      fetchUnreadCount();
      fetchVerificationStatus();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread');
      setUnreadCount(res.data.count);
    } catch (err) {}
  };

  const fetchVerificationStatus = async () => {
    try {
      const res = await api.get('/whatsapp/verification-status');
      setVerificationStatus(res.data);
    } catch (err) {
      setVerificationStatus({ verified: false, messaging_limit: 'unknown' });
    }
  };


  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {}
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {}
  };

  const handleNavClick = () => setSidebarOpen(false);

  // Color theme for admin vs user
  const brandColor = isAdmin ? '#f59e0b' : '#dc2626';
  const brandBg = isAdmin ? 'rgba(245,158,11,0.12)' : 'rgba(220,38,38,0.12)';
  const brandBorder = isAdmin ? 'rgba(245,158,11,0.3)' : 'rgba(220,38,38,0.3)';

  return (
    <div className="layout">

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 99, backdropFilter: 'blur(4px)' }}
        />
      )}

      {/* ─── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}
        style={{
          display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(180deg, #07070a 0%, #0d0d12 100%)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* ── Logo / Brand ── */}
        <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 11,
              background: `linear-gradient(135deg, ${isAdmin ? '#f59e0b' : '#dc2626'}, ${isAdmin ? '#d97706' : '#991b1b'})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: `0 4px 14px ${isAdmin ? 'rgba(245,158,11,0.35)' : 'rgba(220,38,38,0.45)'}`
            }}>
              <FiMessageCircle color="white" size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '0.95rem', color: 'white', letterSpacing: '-0.02em' }}>VONE DIGITALS CRM</div>
              <div style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: brandColor }}>
                {isAdmin ? '⚡ Admin Console' : '✦ WhatsApp Suite'}
              </div>
            </div>
          </div>

          {/* User badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
            background: brandBg, border: `1px solid ${brandBorder}`, borderRadius: 10
          }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.78rem', color: '#fff', flexShrink: 0 }}>
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>
                {user?.email?.split('@')[0]}
              </div>
              <div style={{ fontSize: '0.6rem', fontWeight: 600, color: brandColor, textTransform: 'uppercase' }}>{user?.role}</div>
            </div>
            <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.6)', flexShrink: 0 }} />
          </div>
        </div>

        {/* ── Search ── */}
        <div style={{ padding: '10px 12px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '7px 10px' }}>
            <FiSearch size={12} color="rgba(255,255,255,0.3)" />
            <input
              placeholder="Search menu..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.65)', fontSize: '0.76rem', width: '100%' }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0, fontSize: 12 }}>✕</button>
            )}
          </div>
        </div>

        {/* ── Navigation Sections (scrollable) ── */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          {visibleSections.map(sec => (
            <SideSection
              key={sec.id}
              sectionId={sec.id}
              title={sec.title}
              emoji={sec.emoji}
              items={sec.items}
              openSections={openSections}
              toggleSection={toggleSection}
              onNavClick={handleNavClick}
              disabled={sec.disabled}
            />
          ))}
        </nav>

        {/* ── Footer ── */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <button
            onClick={logout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '9px 0', borderRadius: 10, border: '1px solid rgba(239,68,68,0.25)',
              background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer',
              fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
          >
            <FiLogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main className="main-content">

        {/* Topbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderBottom: '1px solid var(--border)',
          background: 'var(--card)', position: 'sticky', top: 0, zIndex: 100,
          backdropFilter: 'blur(8px)', gap: 8, flexWrap: 'nowrap'
        }}>
          {/* Left: hamburger + breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flexShrink: 1 }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', alignItems: 'center', flexShrink: 0 }}
              className="hamburger-btn"
            >
              {sidebarOpen ? <FiX size={18} /> : <FiMenu size={18} />}
            </button>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {isAdmin ? '⚡ Admin Console' : '✦ VONE DIGITALS CRM'}
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {location.pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Dashboard'}
              </div>
            </div>
          </div>

          {/* Right: notifications + role badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {/* Notification Bell Dropdown */}
            <div ref={notifRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => { if (!showNotifications) fetchNotifications(); setShowNotifications(p => !p); }}
                style={{
                  background: showNotifications ? 'rgba(37,211,102,0.1)' : 'none',
                  border: '1px solid var(--border)', cursor: 'pointer', padding: '6px 9px',
                  borderRadius: 8, position: 'relative', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', flexShrink: 0
                }}
              >
                <FiBell size={15} color={showNotifications ? 'var(--primary)' : 'currentColor'} />
                {unreadCount > 0 && (
                  <span style={{ background: '#ef4444', color: 'white', fontSize: '0.62rem', fontWeight: 800, padding: '1px 6px', borderRadius: 99 }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div style={{
                  position: 'absolute', top: '120%', right: 0, width: 310,
                  background: 'var(--card)', borderRadius: 16,
                  boxShadow: '0 16px 48px rgba(0,0,0,0.22)', border: '1px solid var(--border)',
                  zIndex: 99999, overflow: 'hidden'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                    <strong style={{ fontSize: '0.88rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                      🔔 Notifications
                      {unreadCount > 0 && <span style={{ background: '#ef4444', color: 'white', fontSize: '0.62rem', padding: '2px 7px', borderRadius: 99 }}>{unreadCount} new</span>}
                    </strong>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>Mark all read</button>
                    )}
                  </div>
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                        <FiBell size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
                        <p style={{ fontSize: '0.82rem', margin: 0, fontWeight: 600 }}>No notifications yet</p>
                        <p style={{ fontSize: '0.72rem', margin: '4px 0 0', opacity: 0.7 }}>Alerts for WABA status, billing & broadcasts will appear here</p>
                      </div>
                    ) : notifications.map(n => (
                      <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: n.is_read ? 'transparent' : 'rgba(37,211,102,0.06)', transition: 'background 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: n.is_read ? 'transparent' : '#ef4444', flexShrink: 0 }} />
                          <strong style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--text)' }}>{n.title}</strong>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)', paddingLeft: 16, lineHeight: 1.4 }}>{n.message}</p>
                        {n.created_at && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', paddingLeft: 16, marginTop: 4, opacity: 0.7 }}>
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{
              background: isAdmin ? 'rgba(245,158,11,0.1)' : 'rgba(37,211,102,0.1)',
              border: `1px solid ${isAdmin ? 'rgba(245,158,11,0.3)' : 'rgba(37,211,102,0.25)'}`,
              color: isAdmin ? '#f59e0b' : '#22c55e',
              padding: '4px 8px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 800,
              display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', flexShrink: 0
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
              {isAdmin ? 'Admin' : 'Client'}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
