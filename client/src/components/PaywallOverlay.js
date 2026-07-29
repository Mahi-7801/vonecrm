import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * PaywallOverlay
 * Full-screen overlay shown when user tries to access a tool without a paid plan.
 * Shows lock animation, plan benefits, and CTA to Plans page.
 */
export default function PaywallOverlay({ toolName = 'this tool' }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const features = [
    { emoji: '📢', label: 'Broadcast Campaigns' },
    { emoji: '⚡', label: 'Flow Builder' },
    { emoji: '📋', label: 'WhatsApp Templates' },
    { emoji: '👥', label: 'Contacts Management' },
    { emoji: '💬', label: 'Live Inbox' },
    { emoji: '📅', label: 'Drip Sequences' },
    { emoji: '🤖', label: 'AI Agents' },
    { emoji: '📊', label: 'Analytics' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.35s ease',
      }}
    >
      <div
        style={{
          background: 'var(--card, #121218)',
          border: '1px solid rgba(220,38,38,0.3)',
          borderRadius: 24,
          maxWidth: 520,
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 30px rgba(220,38,38,0.2)',
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)',
          transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          position: 'relative',
        }}
      >
        {/* Gradient Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #09090d 0%, #1a0507 50%, #2d080c 100%)',
            padding: '28px 24px 20px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Close (X) Button */}
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              fontSize: 16,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220, 38, 38, 0.8)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; }}
            title="Close and return to Dashboard"
          >
            ✕
          </button>

          {/* Animated glow rings */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 160, height: 160,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(220,38,38,0.25) 0%, transparent 70%)',
            animation: 'pulse 2s ease-in-out infinite',
          }} />

          {/* Lock Icon */}
          <div
            style={{
              width: 64, height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #dc2626, #991b1b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
              boxShadow: '0 8px 32px rgba(220,38,38,0.5)',
              fontSize: 28,
              position: 'relative', zIndex: 1,
            }}
          >
            🔒
          </div>

          <h2
            style={{
              color: '#ffffff',
              fontSize: '1.35rem',
              fontWeight: 800,
              margin: '0 0 6px',
              letterSpacing: '-0.02em',
              position: 'relative', zIndex: 1,
            }}
          >
            Subscription Required
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.84rem', margin: 0, position: 'relative', zIndex: 1 }}>
            You need an active plan to access <strong style={{ color: '#f87171' }}>{toolName}</strong>
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 18px 20px' }}>
          <p style={{ color: 'var(--text-muted, #a1a1aa)', fontSize: '0.82rem', margin: '0 0 14px', textAlign: 'center' }}>
            Purchase a plan to unlock all tools instantly:
          </p>

          {/* Features Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 6,
              marginBottom: 16,
            }}
          >
            {features.map((f, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#0a0a0e',
                  border: '1px solid #27272a',
                  borderRadius: 8,
                  padding: '7px 9px',
                  minWidth: 0
                }}
              >
                <span style={{ fontSize: 14, flexShrink: 0 }}>{f.emoji}</span>
                <span style={{ color: '#ffffff', fontSize: '0.74rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.label}</span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <button
            onClick={() => navigate('/plans')}
            style={{
              width: '100%',
              padding: '13px 16px',
              background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 12,
              fontSize: '0.92rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 6px 24px rgba(220,38,38,0.4)',
              transition: 'all 0.2s ease',
              marginBottom: 12,
              letterSpacing: '0.01em',
              whiteSpace: 'normal',
              lineHeight: 1.3,
              display: 'block',
              textAlign: 'center'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 32px rgba(220,38,38,0.6)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(220,38,38,0.4)';
            }}
          >
            🚀 View Plans &amp; Subscribe
          </button>

          <p style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '0.75rem', textAlign: 'center', margin: '0 0 14px' }}>
            ⚡ Instant activation after payment • 🔒 Secure Razorpay checkout
          </p>

          {/* 7-Day Replacement / Money-Back Guarantee Policy */}
          <div style={{
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: '#fca5a5',
            fontSize: '0.78rem',
            fontWeight: 600,
            textAlign: 'center'
          }}>
            <span>🛡️</span> 7-Day Replacement &amp; Money-Back Policy Applied
          </div>
        </div>
      </div>

      {/* Inline keyframe for pulse */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%,-50%) scale(1.2); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
