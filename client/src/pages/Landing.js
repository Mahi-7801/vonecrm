import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiMessageSquare, FiUsers, FiSend, FiGitBranch, FiBarChart2, FiZap,
  FiCheck, FiArrowRight, FiShield, FiClock, FiSmartphone, FiGlobe,
  FiHeadphones, FiServer, FiChevronDown, FiChevronUp, FiMenu, FiX
} from 'react-icons/fi';
import './Landing.css';

// Animated counter hook
function useCounter(end, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setStarted(true);
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [started, end, duration]);

  return [count, ref];
}

function StatCounter({ end, suffix, label }) {
  const [count, ref] = useCounter(end);
  return (
    <div ref={ref}>
      <div style={{ fontSize: 'clamp(1.2rem, 5vw, 2.2rem)', fontWeight: 900, color: '#dc2626', lineHeight: 1.2 }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div style={{ fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)', color: '#9ca3af', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function WhatsAppMockup() {
  const messages = [
    { from: 'user', text: 'Hi! I need help with my order', time: '10:30 AM' },
    { from: 'bot', text: 'Hello! Welcome to VONE DIGITALS CRM\n\nHow can I help you today?', time: '10:30 AM' },
    { from: 'user', text: 'What services do you offer?', time: '10:31 AM' },
    { from: 'bot', text: 'We offer:\nFull Stack Development\nDigital Marketing\nBranding & Design\n\nWhich interests you?', time: '10:31 AM' },
    { from: 'user', text: 'Digital Marketing please!', time: '10:32 AM' },
    { from: 'bot', text: 'Great choice! We specialize in SEO, Google Ads, and Social Media Marketing.\n\nContact: +91 9966192921\nvonedigitals.com', time: '10:32 AM' },
  ];
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setVisible(v => (v < messages.length ? v + 1 : v)), 1200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="landing-mockup-box">
      <div style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', color: 'white', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', color: '#dc2626', flexShrink: 0 }}>V</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>VONE DIGITALS Bot</div>
          <div style={{ fontSize: '0.65rem', opacity: 0.85 }}>online</div>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', padding: 10, background: '#1a1a1a', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
        {messages.slice(0, visible).map((m, i) => (
          <div key={i} style={{ marginBottom: 6, display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start', animation: 'fadeInUp 0.3s ease-out' }}>
            <div style={{ maxWidth: '82%', padding: '6px 9px', borderRadius: 10, background: m.from === 'user' ? '#1e3a1e' : '#252525', borderBottomLeftRadius: m.from === 'bot' ? 4 : 10, borderBottomRightRadius: m.from === 'user' ? 4 : 10, boxShadow: '0 1px 2px rgba(0,0,0,0.3)', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
              <div style={{ fontSize: '0.74rem', lineHeight: 1.3, whiteSpace: 'pre-wrap', color: '#e5e5e5' }}>{m.text}</div>
              <div style={{ fontSize: '0.55rem', color: '#888', textAlign: 'right', marginTop: 1 }}>{m.time} {m.from === 'user' && '✓✓'}</div>
            </div>
          </div>
        ))}
        {visible < messages.length && (
          <div style={{ textAlign: 'center', padding: 4 }}>
            <span style={{ background: '#252525', padding: '3px 8px', borderRadius: 8, fontSize: '0.65rem', color: '#888' }}>typing...</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SecurityBadge({ icon, title, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#1a1a1a', borderRadius: 12, border: '1px solid #27272a' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(220,38,38,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#e5e5e5' }}>{title}</div>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{desc}</div>
      </div>
    </div>
  );
}

const FAQ = ({ question, answer }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid #27272a' }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', padding: '18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontWeight: 600, fontSize: '1rem', color: '#e5e5e5' }}>{question}</span>
        {open ? <FiChevronUp size={18} color="#9ca3af" /> : <FiChevronDown size={18} color="#9ca3af" />}
      </button>
      {open && <p style={{ paddingBottom: 18, color: '#9ca3af', fontSize: '0.95rem', lineHeight: 1.6 }}>{answer}</p>}
    </div>
  );
};

export default function Landing() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    { icon: <FiMessageSquare size={28} />, title: 'Smart Inbox', desc: 'WhatsApp-style real-time chat with media support, AI auto-replies, and agent assignment', color: '#dc2626' },
    { icon: <FiUsers size={28} />, title: 'Contact Management', desc: 'Import contacts via CSV, add labels, tags, custom fields, and manage your customer database', color: '#ef4444' },
    { icon: <FiSend size={28} />, title: 'Bulk Broadcasting', desc: 'Send template messages to thousands of contacts with scheduling, analytics, and delivery tracking', color: '#dc2626' },
    { icon: <FiGitBranch size={28} />, title: 'Chatbot Flows', desc: 'Visual drag-and-drop flow builder with AI responses, conditions, and interactive buttons', color: '#f87171' },
    { icon: <FiBarChart2 size={28} />, title: 'Analytics & Reports', desc: 'Track message delivery, engagement rates, usage costs, and campaign performance', color: '#b91c1c' },
    { icon: <FiZap size={28} />, title: 'Quick Replies & Drip', desc: 'Canned responses for instant support and automated drip sequences for nurturing leads', color: '#dc2626' },
    { icon: <FiShield size={28} />, title: 'Team Collaboration', desc: 'Assign agents to contacts, manage team access, and track who handles what', color: '#ef4444' },
    { icon: <FiSmartphone size={28} />, title: 'WhatsApp Business API', desc: 'Official Meta integration with template management, webhook support, and real-time sync', color: '#dc2626' },
    { icon: <FiClock size={28} />, title: 'Automation', desc: 'Trigger flows by keywords, auto-reply with AI, and schedule broadcasts for optimal timing', color: '#991b1b' },
    { icon: <FiGlobe size={28} />, title: 'n8n Workflow Integration', desc: 'Connect with n8n automation platform to build complex workflows with 400+ integrations', color: '#dc2626', comingSoon: true },
    { icon: <FiMessageSquare size={28} />, title: 'Telegram Bot Support', desc: 'Build and deploy Telegram chatbots alongside WhatsApp for multi-channel customer engagement', color: '#ef4444', comingSoon: true },
    { icon: <FiServer size={28} />, title: 'Webhook & API Access', desc: 'RESTful API and webhooks to integrate VONE DIGITALS CRM with your existing tools and systems', color: '#dc2626' }
  ];

  const pricing = [
    { name: 'Basic', price: '₹499', period: '/month', features: ['1,000 messages/month', '500 contacts', 'Basic templates', 'Email support', '1 team member'], popular: false },
    { name: 'Professional', price: '₹999', period: '/month', features: ['5,000 messages/month', '2,000 contacts', 'AI auto-reply', 'Chatbot flows', 'Priority support', '5 team members'], popular: true },
    { name: 'Enterprise', price: '₹2,999', period: '/month', features: ['Unlimited messages', 'Unlimited contacts', 'Advanced AI agents', 'Custom integrations', 'Dedicated support', 'Unlimited team members'], popular: false }
  ];

  const faqs = [
    { q: 'What is VONE DIGITALS CRM?', a: 'VONE DIGITALS CRM is a WhatsApp Business communication platform that helps businesses manage customer conversations, send bulk messages, build AI chatbots, and automate customer engagement — all from one dashboard.' },
    { q: 'How does the WhatsApp integration work?', a: 'We use the official WhatsApp Business API from Meta. You connect your WhatsApp Business account via Embedded Signup, and all messages flow through our platform in real-time.' },
    { q: 'Can I send bulk messages to my customers?', a: 'Yes! You can send template messages to thousands of contacts at once. Templates need to be approved by Meta first, but once approved, you can broadcast to your entire customer base.' },
    { q: 'What is the AI auto-reply feature?', a: 'Our AI auto-reply uses Groq AI (Llama 3.1) to automatically respond to customer messages. It can detect service keywords and provide relevant responses even when you\'re offline.' },
    { q: 'Is there a free trial?', a: 'Yes! You can start with our free trial to explore all features. No credit card required. Upgrade anytime to a paid plan.' },
    { q: 'How do I get Meta template approval?', a: 'Create a template in VONE DIGITALS CRM, and it\'s automatically submitted to Meta for approval. Approval usually takes 24-48 hours. Once approved, you can use it in broadcasts.' }
  ];

  const steps = [
    { num: '1', title: 'Connect WhatsApp', desc: 'Link your WhatsApp Business account with one-click Meta Embedded Signup' },
    { num: '2', title: 'Set Up Templates', desc: 'Create message templates and get them approved by Meta for bulk messaging' },
    { num: '3', title: 'Start Growing', desc: 'Send campaigns, build chatbots, and manage all customer conversations in one place' }
  ];

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-logo" onClick={() => navigate('/')}>
          <div className="landing-logo-icon">
            <FiMessageSquare size={20} />
          </div>
          <span style={{ color: '#ffffff' }}>VONE DIGITALS</span>
          <span style={{ color: '#dc2626' }}>CRM</span>
        </div>

        <button
          className="landing-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <FiX size={26} /> : <FiMenu size={26} />}
        </button>

        <div className={`landing-nav-links ${mobileMenuOpen ? 'open' : ''}`}>
          <a href="#features" className="landing-nav-link" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#pricing" className="landing-nav-link" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
          <a href="#faq" className="landing-nav-link" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
          <button
            onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
            style={{ padding: '10px 20px', border: 'none', background: 'none', color: '#e5e5e5', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
          >
            Login
          </button>
          <button
            onClick={() => { setMobileMenuOpen(false); navigate('/signup'); }}
            style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #dc2626, #991b1b)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 4px 16px rgba(220,38,38,0.4)' }}
          >
            Get Started Free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div>
          <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 20, background: 'rgba(220,38,38,0.1)', color: '#dc2626', fontWeight: 600, fontSize: '0.85rem', marginBottom: 20 }}>
            WhatsApp Business Platform
          </div>
          <h1 className="landing-hero-title">
            The Complete <span style={{ color: '#dc2626' }}>WhatsApp CRM</span> for Your Business
          </h1>
          <p className="landing-hero-subtitle">
            Manage conversations, send bulk messages, build AI chatbots, and grow your customer engagement — all from one powerful platform.
          </p>
          <div className="landing-hero-ctas">
            <button
              onClick={() => navigate('/signup')}
              style={{ padding: '14px 32px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #dc2626, #991b1b)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', boxShadow: '0 6px 20px rgba(220,38,38,0.4)', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              Start Free Trial <FiArrowRight size={18} />
            </button>
            <button
              onClick={() => navigate('/login')}
              style={{ padding: '14px 32px', borderRadius: 12, border: '2px solid #27272a', background: 'transparent', color: '#e5e5e5', fontWeight: 600, cursor: 'pointer', fontSize: '1rem' }}
            >
              View Demo
            </button>
          </div>
          <div className="landing-stats-row">
            <StatCounter end={10000} suffix="+" label="Messages Sent" />
            <StatCounter end={500} suffix="+" label="Active Users" />
            <StatCounter end={99} suffix="%" label="Uptime" />
          </div>
        </div>
        <div className="landing-mockup-wrapper">
          <WhatsAppMockup />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="landing-section">
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 12, color: '#ffffff' }}>Everything You Need</h2>
          <p style={{ fontSize: '1.1rem', color: '#9ca3af', maxWidth: 500, margin: '0 auto' }}>All the tools to manage your WhatsApp business communication in one place.</p>
        </div>
        <div className="landing-grid-3">
          {features.map((f, i) => (
            <div
              key={i}
              style={{ background: '#111111', borderRadius: 16, padding: 32, border: '1px solid #1f1f1f', transition: 'all 0.3s', cursor: 'default', position: 'relative' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(220,38,38,0.1)'; e.currentTarget.style.borderColor = '#dc262633'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#1f1f1f'; }}
            >
              {f.comingSoon && <div style={{ position: 'absolute', top: 12, right: 12, padding: '3px 10px', borderRadius: 8, background: 'rgba(220,38,38,0.15)', color: '#dc2626', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coming Soon</div>}
              <div style={{ width: 52, height: 52, borderRadius: 14, background: f.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: f.color }}>{f.icon}</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8, color: '#e5e5e5' }}>{f.title}</h3>
              <p style={{ fontSize: '0.9rem', color: '#9ca3af', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="landing-section">
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 12, color: '#ffffff' }}>How It Works</h2>
            <p style={{ fontSize: '1.1rem', color: '#9ca3af' }}>Get started in 3 simple steps</p>
          </div>
          <div className="landing-grid-3">
            {steps.map((s, i) => (
              <div key={i} style={{ textAlign: 'center', position: 'relative' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #dc2626, #991b1b)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontWeight: 800, fontSize: '1.5rem', boxShadow: '0 4px 20px rgba(220,38,38,0.4)' }}>{s.num}</div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8, color: '#e5e5e5' }}>{s.title}</h3>
                <p style={{ fontSize: '0.9rem', color: '#9ca3af', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Multi-Channel — WhatsApp + Telegram */}
      <section className="landing-section" style={{ background: '#0f0f0f' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 12, color: '#ffffff' }}>Multi-Channel Messaging</h2>
            <p style={{ fontSize: '1.1rem', color: '#9ca3af' }}>Reach your customers on WhatsApp AND Telegram from one dashboard</p>
          </div>
          <div className="landing-grid-2">
            {/* WhatsApp Card */}
            <div style={{ background: '#111111', borderRadius: 20, padding: 36, border: '1px solid #1f1f1f', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #dc2626, #991b1b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><FiMessageSquare size={24} /></div>
                <div><h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#e5e5e5' }}>WhatsApp Business</h3><p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Official API Integration</p></div>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {['Template messages & broadcasts', 'Interactive lists & buttons', 'Media sharing (images, docs, video)', 'Read receipts & delivery status', 'AI auto-reply & chatbots', 'Bulk messaging up to 100K contacts'].map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: '0.9rem', color: '#d4d4d4' }}><FiCheck size={16} color="#dc2626" /> {item}</li>
                ))}
              </ul>
            </div>
            {/* Telegram Card */}
            <div style={{ background: '#111111', borderRadius: 20, padding: 36, border: '1px solid #1f1f1f', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 16, right: 16, padding: '4px 12px', borderRadius: 8, background: 'rgba(220,38,38,0.15)', color: '#dc2626', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coming Soon</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#1f1f1f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}><FiSend size={24} /></div>
                <div><h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#e5e5e5' }}>Telegram Bot</h3><p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Bot API Integration</p></div>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {['Custom bot commands & menus', 'Inline keyboards & callbacks', 'Group & channel messaging', 'File & media sharing', 'AI-powered responses', 'Unlimited message capacity'].map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: '0.9rem', color: '#d4d4d4' }}><FiCheck size={16} color="#666" /> {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Trust */}
      <section className="landing-section">
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8, color: '#ffffff' }}>Enterprise-Grade Security</h2>
            <p style={{ color: '#9ca3af' }}>Your data is protected with industry-standard security measures</p>
          </div>
          <div className="landing-grid-4">
            <SecurityBadge icon={<FiShield size={20} />} title="End-to-End Encryption" desc="All messages encrypted" />
            <SecurityBadge icon={<FiClock size={20} />} title="Real-time Sync" desc="Instant message delivery" />
            <SecurityBadge icon={<FiServer size={20} />} title="99.9% Uptime" desc="Reliable infrastructure" />
            <SecurityBadge icon={<FiHeadphones size={20} />} title="24/7 Support" desc="Always here to help" />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="landing-section">
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 12, color: '#ffffff' }}>Simple, Transparent Pricing</h2>
            <p style={{ fontSize: '1.1rem', color: '#9ca3af' }}>Choose the plan that fits your business</p>
          </div>
          <div className="landing-grid-3">
            {pricing.map((plan, i) => (
              <div
                key={i}
                style={{
                  background: '#111111', borderRadius: 20, padding: 32, border: plan.popular ? '2px solid #dc2626' : '1px solid #1f1f1f',
                  position: 'relative', transition: 'all 0.3s',
                  boxShadow: plan.popular ? '0 8px 40px rgba(220,38,38,0.15)' : 'none'
                }}
              >
                {plan.popular && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #dc2626, #991b1b)', color: 'white', padding: '4px 16px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>Most Popular</div>}
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8, marginTop: plan.popular ? 8 : 0, color: '#e5e5e5' }}>{plan.name}</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff' }}>{plan.price}</span>
                  <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>{plan.period}</span>
                </div>
                <button
                  onClick={() => navigate('/signup')}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 10, border: 'none', marginBottom: 24, fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem',
                    background: plan.popular ? 'linear-gradient(135deg, #dc2626, #991b1b)' : '#1f1f1f',
                    color: 'white'
                  }}
                >
                  Get Started
                </button>
                {plan.features.map((f, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: j === 0 ? '1px solid #1f1f1f' : 'none' }}>
                    <FiCheck size={16} color="#dc2626" /> <span style={{ fontSize: '0.9rem', color: '#d4d4d4' }}>{f}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section style={{ padding: '80px 20px', maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ background: '#111111', borderRadius: 20, padding: '36px 24px', border: '1px solid #1f1f1f', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 16 }}>★★★★★</div>
          <p style={{ fontSize: '1.1rem', lineHeight: 1.7, color: '#d4d4d4', fontStyle: 'italic', marginBottom: 24 }}>"VONE DIGITALS CRM transformed how we handle customer communication. The WhatsApp integration and chatbot builder saved us hours every day. Our response time dropped from hours to minutes."</p>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#e5e5e5' }}>VONE Digitals</div>
          <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Digital Marketing Agency, Vijayawada</div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="landing-section" style={{ background: '#0f0f0f', borderTop: '1px solid #1f1f1f' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 12, color: '#ffffff' }}>Frequently Asked Questions</h2>
            <p style={{ fontSize: '1.1rem', color: '#9ca3af' }}>Everything you need to know</p>
          </div>
          <div>
            {faqs.map((faq, i) => <FAQ key={i} question={faq.q} answer={faq.a} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '60px 20px', textAlign: 'center', background: 'linear-gradient(135deg, #1a0000 0%, #991b1b 50%, #dc2626 100%)', color: 'white' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 16 }}>Ready to Transform Your Business?</h2>
        <p style={{ fontSize: '1.05rem', marginBottom: 32, opacity: 0.9, maxWidth: 500, margin: '0 auto 32px' }}>Join hundreds of businesses using VONE DIGITALS CRM to grow their customer engagement.</p>
        <button onClick={() => navigate('/signup')} style={{ padding: '16px 36px', borderRadius: 12, border: '2px solid white', background: 'white', color: '#991b1b', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>Start Free — No Credit Card Required</button>
      </section>

      {/* Footer */}
      <footer style={{ padding: '48px 20px 32px', background: '#050505', color: 'white' }}>
        <div className="landing-footer-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: '1.3rem', marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #dc2626, #991b1b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><FiMessageSquare size={20} /></div>
              VONE DIGITALS CRM
            </div>
            <p style={{ color: '#666', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: 300 }}>The complete WhatsApp Business platform for managing conversations, broadcasts, and customer engagement.</p>
          </div>
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.9rem', color: '#e5e5e5' }}>Product</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, color: '#666', fontSize: '0.85rem' }}>
              <span>Features</span><span>Pricing</span><span>Integrations</span><span>API Docs</span>
            </div>
          </div>
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.9rem', color: '#e5e5e5' }}>Company</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, color: '#666', fontSize: '0.85rem' }}>
              <span>About Us</span><span>Blog</span><span>Careers</span><span>Contact</span>
            </div>
          </div>
          <div>
            <h4 style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.9rem', color: '#e5e5e5' }}>Support</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, color: '#666', fontSize: '0.85rem' }}>
              <span>Help Center</span><span>Documentation</span><span>Status Page</span><span>Community</span>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: '0 auto', paddingTop: 24, display: 'flex', justifyContent: 'space-between', color: '#444', fontSize: '0.8rem', flexWrap: 'wrap', gap: 12 }}>
          <span>© 2026 V ONE DIGITALS. All rights reserved.</span>
          <span>Privacy Policy · Terms of Service</span>
        </div>
      </footer>
    </div>
  );
}
