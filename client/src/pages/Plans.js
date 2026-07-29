import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useDataSync, triggerDataSync } from '../services/dataSync';
import { FiCheck, FiZap, FiStar, FiShield, FiSend, FiUsers, FiMessageSquare, FiClock, FiHeadphones, FiGlobe, FiDatabase, FiBarChart2 } from 'react-icons/fi';

const planIcons = {
  basic: <FiSend size={28} />,
  professional: <FiZap size={28} />,
  enterprise: <FiStar size={28} />
};

const planColors = {
  basic: { gradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', accent: '#dc2626', light: '#2a080c' },
  professional: { gradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', accent: '#dc2626', light: '#2a080c' },
  enterprise: { gradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', accent: '#dc2626', light: '#2a080c' }
};

const planFeatures = {
  basic: [
    { icon: <FiMessageSquare size={14} />, text: '1,000 messages/month' },
    { icon: <FiUsers size={14} />, text: '500 contacts' },
    { icon: <FiSend size={14} />, text: 'WhatsApp template messages' },
    { icon: <FiMessageSquare size={14} />, text: 'Live chat inbox' },
    { icon: <FiUsers size={14} />, text: 'Contact labels & groups' },
    { icon: <FiShield size={14} />, text: '1 WhatsApp number' },
    { icon: <FiHeadphones size={14} />, text: 'Email support' },
  ],
  professional: [
    { icon: <FiMessageSquare size={14} />, text: '10,000 messages/month' },
    { icon: <FiUsers size={14} />, text: '5,000 contacts' },
    { icon: <FiSend size={14} />, text: 'Template + text + media messages' },
    { icon: <FiDatabase size={14} />, text: 'Bulk broadcast campaigns' },
    { icon: <FiClock size={14} />, text: 'Drip sequences & scheduled msgs' },
    { icon: <FiZap size={14} />, text: 'Flow Builder automation' },
    { icon: <FiZap size={14} />, text: 'AI auto-reply (Groq powered)' },
    { icon: <FiMessageSquare size={14} />, text: 'Quick replies' },
    { icon: <FiBarChart2 size={14} />, text: 'Analytics & daily reports' },
    { icon: <FiShield size={14} />, text: '2 WhatsApp numbers' },
    { icon: <FiHeadphones size={14} />, text: 'Priority support' },
  ],
  enterprise: [
    { icon: <FiMessageSquare size={14} />, text: 'Unlimited messages' },
    { icon: <FiUsers size={14} />, text: 'Unlimited contacts' },
    { icon: <FiSend size={14} />, text: 'All message types (text, media, interactive)' },
    { icon: <FiDatabase size={14} />, text: 'Bulk broadcast + campaign analytics' },
    { icon: <FiClock size={14} />, text: 'Full drip & scheduled automation' },
    { icon: <FiZap size={14} />, text: 'Advanced Flow Builder + conditions' },
    { icon: <FiZap size={14} />, text: 'AI agents with custom prompts' },
    { icon: <FiMessageSquare size={14} />, text: 'Quick replies + canned responses' },
    { icon: <FiGlobe size={14} />, text: 'Facebook page integration' },
    { icon: <FiBarChart2 size={14} />, text: 'Advanced analytics & ROI tracking' },
    { icon: <FiUsers size={14} />, text: 'Team members & agent roles' },
    { icon: <FiShield size={14} />, text: '5 WhatsApp numbers' },
    { icon: <FiGlobe size={14} />, text: 'Webhook & API access' },
    { icon: <FiHeadphones size={14} />, text: 'Dedicated account manager' },
  ]
};

export default function Plans() {
  const { user, checkAuth } = useAuth();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [message, setMessage] = useState('');

  const fetchPlansData = useCallback(() => {
    Promise.all([
      api.get('/plans'),
      api.get('/plans/my-subscription')
    ]).then(([planRes, subRes]) => {
      setPlans(planRes.data);
      setSubscription(subRes.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useDataSync(fetchPlansData, 5000, 'plans');

  const handlePurchase = async (plan) => {
    setPurchasing(plan.id);
    setMessage('');
    try {
      const orderRes = await api.post(`/plans/${plan.id}/create-order`);
      const { order_id, amount, currency, key_id, test_mode } = orderRes.data;

      if (test_mode) {
        const verifyRes = await api.post('/plans/verify-payment', {
          plan_id: plan.id,
          razorpay_order_id: order_id,
          razorpay_payment_id: `pay_test_${Date.now()}`,
          test_mode: true
        });
        setMessage(verifyRes.data.message);
        await checkAuth();
        const subRes = await api.get('/plans/my-subscription');
        setSubscription(subRes.data);
        setPurchasing(null);
        return;
      }

      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: 'VONE DIGITALS CRM',
        description: `Subscribe to ${plan.name}`,
        order_id: order_id,
        handler: async function (response) {
          try {
            const verifyRes = await api.post('/plans/verify-payment', {
              plan_id: plan.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            setMessage(verifyRes.data.message);
            await checkAuth();
            const subRes = await api.get('/plans/my-subscription');
            setSubscription(subRes.data);
          } catch (err) {
            setMessage(err.response?.data?.error || 'Payment verification failed');
          } finally {
            setPurchasing(null);
          }
        },
        prefill: {
          name: user?.email?.split('@')[0] || '',
          email: user?.email || ''
        },
        theme: { color: '#25D366' },
        modal: { ondismiss: () => setPurchasing(null) }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to create order');
      setPurchasing(null);
    }
  };

  if (loading) return <div className="loading">Loading plans...</div>;

  const getPlanKey = (name) => {
    const n = name.toLowerCase();
    if (n.includes('basic') || n.includes('starter')) return 'basic';
    if (n.includes('pro') || n.includes('growth')) return 'professional';
    return 'enterprise';
  };

  const getPlanColor = (key) => planColors[key] || planColors.professional;
  const getPlanFeatures = (key) => planFeatures[key] || planFeatures.professional;

  return (
    <div style={{ padding: '24px 32px 40px', maxWidth: 1200, margin: '0 auto' }}>

      {/* Hero Header */}
      <div style={{
        textAlign: 'center', marginBottom: 40, padding: '40px 20px',
        background: 'linear-gradient(135deg, rgba(37,211,102,0.08) 0%, rgba(18,140,126,0.05) 100%)',
        borderRadius: 20, border: '1px solid rgba(37,211,102,0.15)'
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Choose Your Plan
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
          Scale your WhatsApp marketing with the right plan for your business
        </p>
      </div>

      {/* Active Subscription Banner */}
      {subscription && (
        <div style={{
          marginBottom: 32, padding: '20px 24px', borderRadius: 16,
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          border: '1px solid #6ee7b7', display: 'flex', alignItems: 'center', gap: 16
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <FiShield size={24} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#065f46' }}>
              Active: {subscription.plan_name}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#047857', marginTop: 2 }}>
              Expires: {new Date(subscription.expires_at).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}
              {subscription.max_messages > 0 && ` • ${subscription.max_messages.toLocaleString()} messages/month`}
              {subscription.max_messages === -1 && ' • Unlimited messages'}
            </div>
          </div>
        </div>
      )}

      {/* Message Toast */}
      {message && (
        <div style={{
          padding: '18px 24px', borderRadius: 14, marginBottom: 24,
          background: message.toLowerCase().includes('subscribed') || message.toLowerCase().includes('activated')
            ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)'
            : 'linear-gradient(135deg, #fef2f2, #fee2e2)',
          color: message.toLowerCase().includes('subscribed') || message.toLowerCase().includes('activated') ? '#065f46' : '#991b1b',
          fontWeight: 600, fontSize: '0.9rem',
          border: `1px solid ${
            message.toLowerCase().includes('subscribed') || message.toLowerCase().includes('activated') ? '#6ee7b7' : '#fca5a5'
          }`,
          display: 'flex', alignItems: 'flex-start', gap: 12
        }}>
          <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>
            {message.toLowerCase().includes('subscribed') || message.toLowerCase().includes('activated') ? '✅' : '⚠️'}
          </span>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>{message}</div>
            {(message.toLowerCase().includes('subscribed') || message.toLowerCase().includes('activated')) && (
              <div style={{ fontSize: '0.82rem', fontWeight: 500, opacity: 0.85, marginTop: 4 }}>
                📧 A payment confirmation receipt has been sent to your email address.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, alignItems: 'start' }}>
        {plans.map((plan, index) => {
          const key = getPlanKey(plan.name);
          const color = getPlanColor(key);
          const features = getPlanFeatures(key);
          const isActive = subscription && subscription.plan_id === plan.id;
          const isPopular = index === 1;
          const formattedPrice = parseFloat(plan.price) % 1 === 0 ? parseInt(plan.price) : parseFloat(plan.price).toFixed(2);

          return (
            <div key={plan.id} style={{
              background: 'var(--card)', borderRadius: 20, border: isActive ? `2px solid ${color.accent}` : '1px solid var(--border)',
              overflow: 'hidden', transition: 'all 0.3s ease', position: 'relative',
              transform: isPopular ? 'scale(1.02)' : 'scale(1)',
              boxShadow: isPopular ? `0 20px 60px ${color.accent}20` : 'var(--shadow-xs)'
            }}>
              {/* Popular Badge */}
              {isPopular && (
                <div style={{
                  background: color.gradient, color: 'white', textAlign: 'center',
                  padding: '8px 0', fontSize: '0.75rem', fontWeight: 800,
                  letterSpacing: '0.1em', textTransform: 'uppercase'
                }}>
                  Most Popular
                </div>
              )}

              {/* Current Plan Badge */}
              {isActive && (
                <div style={{
                  position: 'absolute', top: isPopular ? 40 : 16, right: 16,
                  background: color.accent, color: 'white', padding: '4px 12px',
                  borderRadius: 20, fontSize: '0.7rem', fontWeight: 700
                }}>
                  Current Plan
                </div>
              )}

              {/* Card Header */}
              <div style={{ padding: '24px 20px 16px', textAlign: 'center' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 16, margin: '0 auto 14px',
                  background: color.light, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: color.accent
                }}>
                  {planIcons[key] || <FiZap size={26} />}
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 4px' }}>
                  {plan.name}
                </h2>
                {plan.description && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 16px' }}>
                    {plan.description}
                  </p>
                )}

                {/* Price */}
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, whiteSpace: 'nowrap', flexWrap: 'nowrap' }}>
                  <span style={{ fontSize: 'clamp(1.6rem, 6vw, 2.2rem)', fontWeight: 900, color: color.accent, lineHeight: 1, whiteSpace: 'nowrap' }}>₹{formattedPrice}</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>/{plan.duration_days} days</span>
                </div>
              </div>

              {/* Features */}
              <div style={{ padding: '0 24px 24px' }}>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                  {features.map((feature, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 0', borderBottom: i < features.length - 1 ? '1px solid var(--border)' : 'none'
                    }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 6,
                        background: color.light, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: color.accent, flexShrink: 0
                      }}>
                        {feature.icon}
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buy Button */}
              <div style={{ padding: '0 24px 28px' }}>
                <button
                  onClick={() => handlePurchase(plan)}
                  disabled={purchasing === plan.id || isActive}
                  style={{
                    width: '100%', padding: '14px 0', borderRadius: 12,
                    border: 'none', cursor: isActive ? 'default' : 'pointer',
                    background: isActive ? 'var(--bg)' : color.gradient,
                    color: isActive ? 'var(--text-muted)' : 'white',
                    fontWeight: 800, fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? 'none' : `0 4px 16px ${color.accent}40`,
                    opacity: purchasing === plan.id ? 0.7 : 1
                  }}
                  onMouseEnter={e => { if (!isActive && purchasing !== plan.id) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${color.accent}50`; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 4px 16px ${color.accent}40`; } }}
                >
                  {isActive ? '✓ Active Plan' : purchasing === plan.id ? 'Processing...' : `Get Started — ₹${plan.price}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust Section */}
      <div style={{ marginTop: 48, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
          {[
            { icon: <FiShield size={20} />, label: 'Secure Payment' },
            { icon: <FiHeadphones size={20} />, label: '24/7 Support' },
            { icon: <FiClock size={20} />, label: 'Instant Activation' },
            { icon: <FiGlobe size={20} />, label: 'Cancel Anytime' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
              <span style={{ color: '#25d366' }}>{item.icon}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
