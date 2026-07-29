import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { FiCreditCard, FiDollarSign, FiTrendingUp, FiClock, FiCheck, FiRefreshCw, FiZap, FiFileText } from 'react-icons/fi';
import { SkeletonStats } from '../components/Skeleton';

export default function Billing() {
  const [searchParams] = useSearchParams();
  const queryTab = searchParams.get('tab');
  const [usage, setUsage] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [activeTab, setActiveTab] = useState(queryTab || 'wallet');

  useEffect(() => {
    if (queryTab) setActiveTab(queryTab);
  }, [queryTab]);

  const presets = [100, 500, 1000, 2000, 5000];

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usageRes, paymentRes] = await Promise.all([
        api.get('/billing/usage'),
        api.get('/billing/payments')
      ]);
      setUsage(usageRes.data);
      setPayments(paymentRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const refreshBilling = async () => {
    const [usageRes, paymentRes] = await Promise.all([
      api.get('/billing/usage'),
      api.get('/billing/payments')
    ]);
    setUsage(usageRes.data);
    setPayments(paymentRes.data);
  };

  const handlePay = async (amount) => {
    const payAmt = amount || parseFloat(payAmount);
    if (!payAmt || payAmt <= 0) return alert('Enter a valid amount');

    setPaying(true);
    try {
      const orderRes = await api.post('/billing/create-order', { amount: payAmt });
      const { order_id, amount: orderAmount, currency, key_id, test_mode } = orderRes.data;

      if (test_mode) {
        await api.post('/billing/verify-payment', { test_mode: true });
        alert('Payment simulated (test mode). Balance added.');
        setPayAmount('');
        setSelectedPreset(null);
        await refreshBilling();
        setPaying(false);
        return;
      }

      const options = {
        key: key_id,
        amount: orderAmount,
        currency: currency,
        name: 'VONE DIGITALS CRM',
        description: `Add ₹${payAmt} balance`,
        order_id: order_id,
        handler: async function (response) {
          try {
            await api.post('/billing/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            alert('Payment successful! Balance added.');
            setPayAmount('');
            setSelectedPreset(null);
            await refreshBilling();
          } catch (err) {
            alert('Payment verification failed. Contact support.');
          } finally {
            setPaying(false);
          }
        },
        prefill: { name: 'VONE DIGITALS User', email: '' },
        theme: { color: '#dc2626' },
        modal: { ondismiss: function () { setPaying(false); } }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert(err.response?.data?.error || 'Payment failed');
      setPaying(false);
    }
  };

  if (loading) return <SkeletonStats />;

  return (
    <div style={{ padding: '24px 32px 40px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: '0 0 4px' }}>
            Billing & Wallet 💳
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
            Manage wallet balance, top up credits via Razorpay, and view past transaction invoices.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={refreshBilling} style={{ gap: 6 }}>
          <FiRefreshCw size={14} /> Refresh Balance
        </button>
      </div>

      {/* 3 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '22px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <FiDollarSign size={20} />
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981', background: '#d1fae5', padding: '3px 8px', borderRadius: 20 }}>
              Available
            </span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 4 }}>
            ₹{parseFloat(usage?.balance || 0).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Current Wallet Balance</div>
        </div>

        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '22px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9' }}>
              <FiTrendingUp size={20} />
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0ea5e9', background: '#e0f2fe', padding: '3px 8px', borderRadius: 20 }}>
              Total Volume
            </span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 4 }}>
            ₹{parseFloat(usage?.total_usage || 0).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Messaging Cost</div>
        </div>

        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '22px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <FiCreditCard size={20} />
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b', background: '#fef3c7', padding: '3px 8px', borderRadius: 20 }}>
              Mode
            </span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1, textTransform: 'capitalize', marginBottom: 4 }}>
            {usage?.credit_mode || 'Postpaid'}
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Billing Account Type</div>
        </div>
      </div>

      {/* Top Up & Payment History Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Quick Add Balance */}
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiZap color="var(--primary)" /> Top Up Wallet Balance
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select a quick amount or enter a custom balance</p>

          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 8, display: 'block', fontWeight: 600 }}>Quick Presets</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {presets.map(amount => (
                <button
                  key={amount}
                  className={`btn btn-sm ${selectedPreset === amount ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => { setSelectedPreset(amount); setPayAmount(amount.toString()); }}
                  style={{ minWidth: 80, fontWeight: 700 }}
                >
                  +₹{amount}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Or Enter Custom Amount (₹)</label>
            <input
              type="number"
              value={payAmount}
              onChange={(e) => { setPayAmount(e.target.value); setSelectedPreset(null); }}
              placeholder="Enter amount (e.g. 500)"
              min="1"
              style={{ fontSize: '1.05rem', padding: '12px 16px' }}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={() => handlePay()}
            disabled={paying || !payAmount}
            style={{ width: '100%', padding: '14px', fontSize: '0.95rem', fontWeight: 700 }}
          >
            {paying ? 'Processing Razorpay...' : `Pay ₹${payAmount || '0'} Now →`}
          </button>
        </div>

        {/* Transaction History */}
        <div style={{ background: 'var(--card)', borderRadius: 16, padding: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiClock color="var(--primary)" /> Payment & Deposit History
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Recent wallet top ups</p>

          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {payments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <FiCreditCard size={36} style={{ opacity: 0.2, marginBottom: 10 }} />
                <p style={{ fontSize: '0.85rem' }}>No payment records yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {payments.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', background: 'var(--bg)', borderRadius: 12,
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: p.method === 'razorpay' ? '#d1fae5' : '#dbeafe',
                        color: p.method === 'razorpay' ? '#10b981' : '#0ea5e9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {p.method === 'razorpay' ? <FiCheck size={18} /> : <FiDollarSign size={18} />}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>
                          {p.method === 'razorpay' ? 'Razorpay Online Top Up' : 'Manual Credit Deposit'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(p.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1rem' }}>
                          +₹{parseFloat(p.amount).toFixed(2)}
                        </div>
                        <a
                          href={`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/billing/invoice/${p.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}
                        >
                          <FiFileText size={12} /> Tax Invoice PDF
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
