import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiMessageSquare, FiCheck, FiAlertTriangle, FiInfo, FiChevronRight } from 'react-icons/fi';

// ─── Manual Entry Form ───────────────────────────────────────────────────────
function ManualEntryForm({ onSuccess, onError }) {
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phoneNumberId.trim() || !wabaId.trim()) {
      onError('Phone Number ID and WABA ID are required.');
      return;
    }
    setSaving(true);
    setVerificationResult(null);
    try {
      const res = await api.post('/whatsapp/connect-direct', {
        phone_number_id: phoneNumberId.trim(),
        waba_id: wabaId.trim(),
        access_token: accessToken.trim() || undefined,
      });

      setVerificationResult(res.data);

      // Check for blocking errors (business verification, payment, etc.)
      const blockingIssues = res.data.issues?.filter(i =>
        i.type === 'error' && (
          i.message.includes('Business verification') ||
          i.message.includes('business_verification') ||
          i.message.includes('NOT_VERIFIED') ||
          i.message.includes('WABA account status')
        )
      ) || [];

      if (blockingIssues.length > 0) {
        // Has blocking errors — show results but DON'T proceed to dashboard
        onError(null);
      } else if (res.data.status === 'success') {
        onSuccess({ ...res.data, phone_number_id: phoneNumberId.trim(), waba_id: wabaId.trim() });
      } else if (res.data.status === 'warning') {
        // Connected with warnings — still allow proceeding
        onSuccess({ ...res.data, phone_number_id: phoneNumberId.trim(), waba_id: wabaId.trim() });
      } else {
        onError(null);
      }
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.fix_url) {
        setVerificationResult({
          status: 'error',
          message: errorData.error,
          details: errorData.details,
          issues: [{ type: 'error', message: errorData.error, details: errorData.details, fix_url: errorData.fix_url, fix_text: errorData.fix_text }]
        });
      } else {
        onError(errorData?.error || 'Failed to save WhatsApp number. Please check the IDs.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="manual-entry-section">
      <h3>📋 Manual Connection</h3>
      <p>Enter your WhatsApp Business details from Meta Business Manager.</p>

      {/* Where to find guide */}
      <button
        type="button"
        onClick={() => setShowGuide(!showGuide)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, padding: '0 0 12px 0' }}
      >
        <FiInfo size={14} />
        {showGuide ? 'Hide guide' : 'Where do I find these?'}
        <FiChevronRight size={14} style={{ transform: showGuide ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {showGuide && (
        <div style={{ background: '#f0f9ff', borderRadius: 10, padding: 14, marginBottom: 16, border: '1px solid #bae6fd', fontSize: '0.8rem', color: '#0369a1', lineHeight: 1.7 }}>
          <strong style={{ display: 'block', marginBottom: 6 }}>How to find your IDs:</strong>
          <ol style={{ paddingLeft: 18 }}>
            <li>Go to <strong>business.facebook.com</strong></li>
            <li>Open <strong>Business Settings → Accounts → WhatsApp Accounts</strong></li>
            <li>Copy your <strong>WhatsApp Business Account ID (WABA ID)</strong></li>
            <li>Click on the account → go to <strong>Phone Numbers</strong></li>
            <li>Copy the <strong>Phone Number ID</strong></li>
            <li>(Optional) Get an Access Token from <strong>Meta for Developers → Your App → WhatsApp → API Setup</strong></li>
          </ol>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>WhatsApp Phone Number ID <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            type="text"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
            placeholder="e.g. 1269197539606780"
            required
          />
        </div>
        <div className="form-group">
          <label>WhatsApp Business Account ID (WABA ID) <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            type="text"
            value={wabaId}
            onChange={(e) => setWabaId(e.target.value)}
            placeholder="e.g. 1014658487838546"
            required
          />
        </div>
        <div className="form-group">
          <label>Access Token <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 400 }}>(Optional — uses system token if blank)</span></label>
          <input
            type="text"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="EAAxxxxxxxx... (leave blank to use system token)"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving}
          style={{ padding: '13px 24px', fontSize: '0.95rem', width: '100%' }}
        >
          {saving ? (
            <>
              <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Verifying with Meta...
            </>
          ) : (
            <>
              <FiCheck size={16} />
              Verify & Connect
            </>
          )}
        </button>
      </form>

      {/* Verification Results */}
      {verificationResult && (
        <div style={{ marginTop: 20 }}>
          {/* Success/Warning Banner */}
          <div style={{
            padding: '14px 16px', borderRadius: 10, marginBottom: 12,
            background: verificationResult.status === 'success' ? '#dcfce7' : verificationResult.status === 'warning' ? '#fef3c7' : '#fee2e2',
            border: `1px solid ${verificationResult.status === 'success' ? '#86efac' : verificationResult.status === 'warning' ? '#fde68a' : '#fca5a5'}`,
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <span style={{ fontSize: '1.2rem' }}>
              {verificationResult.status === 'success' ? '✅' : verificationResult.status === 'warning' ? '⚠️' : '❌'}
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: verificationResult.status === 'success' ? '#166534' : verificationResult.status === 'warning' ? '#92400e' : '#991b1b' }}>
                {verificationResult.message}
              </div>
              {verificationResult.display_phone_number && (
                <div style={{ fontSize: '0.78rem', color: '#666', marginTop: 2 }}>
                  Number: {verificationResult.display_phone_number} ({verificationResult.verified_name})
                </div>
              )}
              {verificationResult.template_count !== undefined && (
                <div style={{ fontSize: '0.78rem', color: '#666', marginTop: 2 }}>
                  Templates: {verificationResult.approved_templates} approved / {verificationResult.template_count} total
                </div>
              )}
            </div>
          </div>

          {/* Issues List */}
          {verificationResult.issues?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {verificationResult.issues.map((issue, i) => (
                <div key={i} style={{
                  padding: '12px 14px', borderRadius: 8,
                  background: issue.type === 'error' ? '#fef2f2' : '#fffbeb',
                  border: `1px solid ${issue.type === 'error' ? '#fecaca' : '#fde68a'}`,
                  fontSize: '0.82rem'
                }}>
                  <div style={{ fontWeight: 700, color: issue.type === 'error' ? '#991b1b' : '#92400e', marginBottom: 4 }}>
                    {issue.type === 'error' ? '❌' : '⚠️'} {issue.message}
                  </div>
                  <div style={{ color: '#666', marginBottom: 8 }}>{issue.details}</div>
                  {issue.fix_url && (
                    <a
                      href={issue.fix_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '5px 12px', borderRadius: 6,
                        background: issue.type === 'error' ? '#dc2626' : '#d97706',
                        color: 'white', fontWeight: 700, fontSize: '0.75rem',
                        textDecoration: 'none'
                      }}
                    >
                      {issue.fix_text || 'Fix on Meta'} →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step Progress ─────────────────────────────────────────────────────────
function StepProgress({ currentStep }) {
  const steps = ['Connect', 'Verify', 'Done'];
  const activeIndex = currentStep === 'done' ? 2 : currentStep === 'verifying' || currentStep === 'verify-results' ? 1 : 0;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 32 }}>
      {steps.map((label, i) => {
        const done = i < activeIndex || currentStep === 'done';
        const active = i === activeIndex;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: done ? 'var(--primary)' : active ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))' : 'var(--border)',
                color: done || active ? '#fff' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.85rem',
                boxShadow: active ? '0 4px 16px rgba(37,211,102,0.35)' : 'none',
                transition: 'all 0.3s ease'
              }}>
                {done ? <FiCheck size={16} strokeWidth={3} /> : i + 1}
              </div>
              <span style={{ fontSize: '0.7rem', color: done || active ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: done || active ? 600 : 400 }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 60, height: 2, background: i < activeIndex ? 'var(--primary)' : 'var(--border)', margin: '0 8px', marginBottom: 22, transition: 'background 0.3s ease' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function Onboarding() {
  const [step, setStep] = useState('choose');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appInactive, setAppInactive] = useState(false);
  const [connectedNumbers, setConnectedNumbers] = useState([]);
  const [configId, setConfigId] = useState('1569573811314694');
  const [appId, setAppId] = useState(process.env.REACT_APP_WHATSAPP_APP_ID || '1590795935988169');
  const popupRef = useRef(null);
  const messageListenerRef = useRef(null);
  const receivedResponseRef = useRef(false);

  const { checkAuth } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for existing connected numbers
  useEffect(() => {
    api.get('/whatsapp/numbers')
      .then(res => {
        const verified = res.data.filter(n => n.verified);
        setConnectedNumbers(verified);
        if (verified.length > 0) setStep('done');
      })
      .catch(() => {});
  }, []);

  // Fetch config_id from backend with fallback
  useEffect(() => {
    api.get('/whatsapp/config-id')
      .then(res => {
        if (res.data.config_id) setConfigId(res.data.config_id);
        if (res.data.app_id) setAppId(res.data.app_id);
      })
      .catch(err => {
        console.warn('Config API warning:', err.response?.data?.error);
      });
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) handleCodeExchange(code);
  }, [searchParams]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (messageListenerRef.current) {
        window.removeEventListener('message', messageListenerRef.current);
      }
    };
  }, []);

  const handleCodeExchange = async (code) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/whatsapp/connect', { code });
      setConnectedNumbers(prev => [...prev, {
        phone_number_id: res.data.phone_number_id,
        waba_id: res.data.waba_id,
        verified: true,
        status: 'verified'
      }]);
      setStep('done');
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to connect WhatsApp';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle postMessage from Meta's Embedded Signup popup
  const handlePostMessage = useCallback(async (event) => {
    if (event.origin !== 'https://business.facebook.com' && event.origin !== 'https://www.facebook.com') {
      return;
    }

    try {
      const rawData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      console.log('Embedded Signup response:', JSON.stringify(rawData, null, 2));
      receivedResponseRef.current = true;

      // Detect app_not_active error from FB
      if (rawData.error_code === 'app_not_active' || rawData.type === 'error' || (rawData.error && rawData.error.type === 'app_not_active')) {
        setLoading(false);
        setError('Connection interrupted. Please use manual entry below.');
        return;
      }

      const payload = rawData.data || rawData;
      const code = payload.code;
      const phoneNumberId = payload.phone_number_id || payload.phoneNumberId;
      const wabaId = payload.waba_id || payload.wabaId;

      if (code) {
        await handleCodeExchange(code);
        return;
      }

      if (phoneNumberId) {
        setLoading(true);
        try {
          await api.post('/whatsapp/connect-direct', {
            phone_number_id: phoneNumberId,
            waba_id: wabaId
          });
          setConnectedNumbers(prev => [...prev, {
            phone_number_id: phoneNumberId,
            waba_id: wabaId,
            verified: true,
            status: 'verified'
          }]);
          setStep('done');
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to save number');
        } finally {
          setLoading(false);
        }
      }
    } catch (err) {
      // Not a JSON message
    }
  }, [handleCodeExchange]);

  // Open Embedded Signup popup
  const handleEmbeddedSignup = useCallback(() => {
    if (!configId || !appId) {
      setError('Facebook Connect is not configured. Please use manual entry below to connect your WhatsApp number.');
      setAppInactive(true);
      return;
    }

    setLoading(true);
    setError('');
    receivedResponseRef.current = false;

    if (messageListenerRef.current) {
      window.removeEventListener('message', messageListenerRef.current);
    }
    messageListenerRef.current = handlePostMessage;
    window.addEventListener('message', handlePostMessage);

    const extras = JSON.stringify({
      sessionInfoVersion: '3',
      version: 'v4',
      featureType: 'whatsapp_business_app_onboarding'
    });

    const redirectUri = `${window.location.origin}/onboarding/callback`;
    const graphVersion = process.env.REACT_APP_WHATSAPP_GRAPH_VERSION || 'v21.0';

    const url = `https://www.facebook.com/${graphVersion}/dialog/oauth?client_id=${appId}&config_id=${configId}&redirect_uri=${encodeURIComponent(redirectUri)}&extras=${encodeURIComponent(extras)}&display=popup&response_type=code&sdk=joey`;

    const width = 800;
    const height = 700;
    const left = (window.innerWidth - width) / 2 + window.screenX;
    const top = (window.innerHeight - height) / 2 + window.screenY;

    popupRef.current = window.open(url, 'wa_embedded_signup', `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`);

    // Timeout — if popup closed with no response, show manual entry
    const checkClosed = setInterval(() => {
      if (popupRef.current && popupRef.current.closed) {
        clearInterval(checkClosed);
        if (!receivedResponseRef.current && !connectedNumbers.length) {
          setLoading(false);
          setAppInactive(true);
          setError('Facebook Connect was cancelled or the app is not available. This can happen if the Facebook App is in development mode. Please use manual entry below to connect your WhatsApp number using your Phone Number ID and WABA ID from Meta Business Manager.');
        }
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(checkClosed);
      if (!receivedResponseRef.current && !connectedNumbers.length) {
        setLoading(false);
        setAppInactive(true);
        setError('Connection timed out. The Facebook App may not be active or the config_id may be invalid. Please use manual entry below.');
      }
    }, 60000);
  }, [configId, appId, handlePostMessage, connectedNumbers]);

  const handleManualSuccess = (data) => {
    setConnectedNumbers(prev => [...prev, {
      phone_number_id: data.phone_number_id,
      waba_id: data.waba_id,
      display_phone_number: data.display_phone_number,
      verified_name: data.verified_name,
      template_count: data.template_count,
      approved_templates: data.approved_templates,
      issues: data.issues || [],
      verified: true,
      status: data.status || 'success'
    }]);
    // Don't go to done yet — show verification results first
    setStep('verify-results');
    setError('');
  };

  const handleSkip = () => navigate('/');
  const handleFinish = async () => { await checkAuth(); navigate('/'); };

  // Loading state while connecting
  if (loading && step === 'choose') {
    return (
      <div className="onboarding-container">
        <div className="onboarding-card" style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', animation: 'spin 2s linear infinite' }}>
            <FiMessageSquare size={28} color="white" />
          </div>
          <h2 style={{ fontSize: '1.3rem', marginBottom: 8 }}>Connecting your account...</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Complete the steps in the Facebook popup.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 8 }}>
            If the popup keeps restarting, click "Edit settings" instead of "Continue".
          </p>
          <button className="btn btn-secondary" style={{ marginTop: 20 }} onClick={() => { setLoading(false); setAppInactive(true); }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-card" style={{ maxWidth: 560 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 18px rgba(37,211,102,0.3)' }}>
            <FiMessageSquare size={22} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 600, margin: 0 }}>VONE DIGITALS CRM</h2>
            <h1 style={{ fontSize: '1.4rem', margin: 0, WebkitTextFillColor: 'unset', background: 'none', color: '#ffffff' }}>WhatsApp Setup</h1>
          </div>
        </div>

        {/* Step Progress */}
        <StepProgress currentStep={step} />

        {/* General Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#991b1b', fontSize: '0.85rem', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <FiAlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            {error}
          </div>
        )}

        {/* ── STEP: choose ── */}
        {step === 'choose' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 6 }}>Connect Your WhatsApp</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Link your WhatsApp Business account to start sending messages.
              </p>
            </div>

            {/* Already Connected */}
            {connectedNumbers.length > 0 && (
              <div style={{ background: '#181820', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid #27272a' }}>
                <strong style={{ color: '#4ade80', fontSize: '0.875rem' }}>✅ Already Connected:</strong>
                {connectedNumbers.map((n, i) => (
                  <div key={i} style={{ marginTop: 4, color: '#86efac', fontSize: '0.85rem' }}>
                    📱 {n.phone_number_id}
                  </div>
                ))}
              </div>
            )}

            {/* Requirements checklist */}
            <div style={{ background: '#121218', borderRadius: 10, padding: 16, marginBottom: 20, border: '1px solid #27272a' }}>
              <strong style={{ color: '#ffffff', display: 'block', marginBottom: 10, fontSize: '0.875rem' }}>Before you begin:</strong>
              {[
                'WhatsApp Business phone number',
                'Facebook account with business access',
                'Business documents (for verification)',
                'Payment method attached on Meta WABA (Credit/Debit Card)',
              ].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FiCheck size={11} color="#22c55e" strokeWidth={3} />
                  </div>
                  <span style={{ fontSize: '0.82rem', color: '#a1a1aa' }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Facebook Connect Button */}
            {configId && (
              <button
                className="btn"
                style={{ width: '100%', marginBottom: 12, padding: '14px 20px', fontSize: '0.95rem', background: '#1877f2', color: 'white', borderRadius: 12, boxShadow: '0 4px 14px rgba(24,119,242,0.35)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                onClick={() => { handleEmbeddedSignup(); }}
                disabled={loading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Connect with Facebook
              </button>
            )}

            {/* Skip button */}
            <button className="btn btn-secondary" style={{ width: '100%', marginBottom: 12 }} onClick={handleSkip}>
              Skip for now
            </button>

            {/* Disclaimer */}
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', marginBottom: 16 }}>
              You don't need your own Meta Developer App.
              <br />The platform handles everything — you just connect your number.
            </p>

            {/* ── Manual Entry ── */}
            <ManualEntryForm
              onSuccess={handleManualSuccess}
              onError={(msg) => setError(msg)}
            />
          </div>
        )}

        {/* ── STEP: verify-results ── */}
        {step === 'verify-results' && connectedNumbers.length > 0 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <FiCheck size={28} color="white" strokeWidth={3} />
              </div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 4px' }}>Verification Complete</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Here's what we found after checking with Meta
              </p>
            </div>

            {connectedNumbers.map((num, idx) => {
              const hasErrors = num.issues?.some(i => i.type === 'error');
              const hasWarnings = num.issues?.some(i => i.type === 'warning');
              return (
                <div key={idx} style={{ marginBottom: 16 }}>
                  {/* Number Info */}
                  <div style={{
                    padding: '14px 16px', borderRadius: 10,
                    background: hasErrors ? '#fef2f2' : hasWarnings ? '#fffbeb' : '#f0fdf4',
                    border: `1px solid ${hasErrors ? '#fecaca' : hasWarnings ? '#fde68a' : '#bbf7d0'}`,
                    marginBottom: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.2rem' }}>{hasErrors ? '❌' : hasWarnings ? '⚠️' : '✅'}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
                          {num.display_phone_number || num.phone_number_id}
                        </div>
                        {num.verified_name && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{num.verified_name}</div>
                        )}
                        {num.template_count !== undefined && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            Templates: {num.approved_templates} approved / {num.template_count} total
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Issues */}
                  {num.issues?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {num.issues.map((issue, i) => (
                        <div key={i} style={{
                          padding: '12px 14px', borderRadius: 8,
                          background: issue.type === 'error' ? '#fef2f2' : '#fffbeb',
                          border: `1px solid ${issue.type === 'error' ? '#fecaca' : '#fde68a'}`,
                          fontSize: '0.82rem'
                        }}>
                          <div style={{ fontWeight: 700, color: issue.type === 'error' ? '#991b1b' : '#92400e', marginBottom: 4 }}>
                            {issue.type === 'error' ? '❌' : '⚠️'} {issue.message}
                          </div>
                          <div style={{ color: '#666', marginBottom: 8 }}>{issue.details}</div>
                          {issue.fix_url && (
                            <a
                              href={issue.fix_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '6px 14px', borderRadius: 6,
                                background: issue.type === 'error' ? '#dc2626' : '#d97706',
                                color: 'white', fontWeight: 700, fontSize: '0.78rem',
                                textDecoration: 'none'
                              }}
                            >
                              {issue.fix_text || 'Fix on Meta'} →
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {(() => {
                const hasBlockingErrors = connectedNumbers.some(num =>
                  num.issues?.some(i =>
                    i.type === 'error' && (
                      i.message.includes('Business verification') ||
                      i.message.includes('NOT_VERIFIED') ||
                      i.message.includes('WABA account status')
                    )
                  )
                );

                return (
                  <>
                    <button
                      onClick={handleFinish}
                      disabled={hasBlockingErrors}
                      style={{
                        width: '100%', padding: '14px', borderRadius: 10, border: 'none',
                        background: hasBlockingErrors ? '#94a3b8' : 'linear-gradient(135deg, #25d366, #128c7e)',
                        color: 'white', fontWeight: 800, fontSize: '1rem',
                        cursor: hasBlockingErrors ? 'not-allowed' : 'pointer',
                        boxShadow: hasBlockingErrors ? 'none' : '0 4px 16px rgba(37,211,102,0.3)',
                        opacity: hasBlockingErrors ? 0.7 : 1
                      }}
                    >
                      {hasBlockingErrors ? 'Complete Requirements First' : 'Go to Dashboard →'}
                    </button>
                    {hasBlockingErrors && (
                      <div style={{
                        padding: '10px 14px', borderRadius: 8,
                        background: '#fef2f2', border: '1px solid #fecaca',
                        fontSize: '0.8rem', color: '#991b1b', textAlign: 'center'
                      }}>
                        ⚠️ Complete the requirements above before proceeding. Your messages won't be delivered without business verification.
                      </div>
                    )}
                  </>
                );
              })()}
              <button
                onClick={() => setStep('choose')}
                style={{
                  width: '100%', padding: '10px', borderRadius: 10,
                  border: '1px solid var(--border)', background: 'var(--card)',
                  color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                ← Connect Another Number
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: done / congratulations ── */}
        {(step === 'done' || step === 'congratulations') && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            {/* Animated Celebration Icon */}
            <div style={{
              width: 84, height: 84, borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 16px 40px rgba(16,185,129,0.35)',
              animation: 'bounceIn 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
              fontSize: 40
            }}>
              🎉
            </div>

            <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Meta Connection Complete!
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: '0 0 24px' }}>
              All 4 Meta requirements verified successfully &amp; securely saved in database
            </p>

            {/* 4 Verified Steps Box */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              borderRadius: 16, border: '1px solid #16a34a',
              padding: '20px 24px', marginBottom: 28, textAlign: 'left',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                ✅ All 4 Steps Completed &amp; Database Saved:
              </div>

              {[
                { title: 'Step 1: WhatsApp Phone Number', desc: 'Connected & Registered on Cloud API' },
                { title: 'Step 2: Facebook Business Account', desc: 'WABA ID Linked & Webhook Subscribed' },
                { title: 'Step 3: Business Verification', desc: 'Meta Account Status Active & Verified' },
                { title: 'Step 4: Meta Credentials Saved', desc: 'Securely Stored in MySQL Database (AES-256)' },
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: idx < 3 ? 12 : 0 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: '#16a34a', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 13, flexShrink: 0, marginTop: 2
                  }}>
                    ✓
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>{item.title}</div>
                    <div style={{ fontSize: '0.78rem', color: '#86efac' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Platform Payment Callout */}
            <div style={{ background: '#121218', borderRadius: 14, border: '1px solid #27272a', padding: '16px 20px', marginBottom: 24, textAlign: 'left' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#4ade80', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🔒</span> Unlock Platform Tools &amp; Messaging
              </div>
              <div style={{ fontSize: '0.82rem', color: '#a1a1aa', lineHeight: 1.5 }}>
                Your Meta setup is verified and saved in database! To start using <strong>Broadcast, Flows, Inbox, Templates, &amp; Contacts</strong>, please choose a plan on our platform.
              </div>
            </div>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => navigate('/plans')}
                style={{
                  width: '100%', padding: '16px', borderRadius: 14, border: 'none',
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  color: 'white', fontWeight: 800, fontSize: '1.05rem',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(22,163,74,0.45)',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.01em'
                }}
              >
                💳 Pay Platform Plan &amp; Unlock Tools →
              </button>

              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  width: '100%', padding: '12px', borderRadius: 12,
                  border: '1px solid var(--border)', background: 'var(--card)',
                  color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
