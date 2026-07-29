import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiEye, FiEyeOff, FiMail, FiLock, FiMessageSquare } from 'react-icons/fi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">

        {/* Logo - Click to open Admin Login */}
        <div className="auth-logo" onClick={() => navigate('/admin/login')} style={{ cursor: 'pointer' }} title="Click for Admin Login">
          <div className="auth-logo-icon">
            <FiMessageSquare size={24} color="white" />
          </div>
        </div>
        <h1 onClick={() => navigate('/admin/login')} style={{ cursor: 'pointer' }}>VONE DIGITALS CRM</h1>
        <p className="subtitle">
          Sign in to your WhatsApp business automation suite
        </p>

        {error && (
          <div className="error-msg">
            <span style={{ fontSize: '1.1rem' }}>⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email address</label>
            <div className="input-wrapper">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{ paddingLeft: 16 }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="input-icon-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            <a href="#" className="forgot-link" onClick={(e) => e.preventDefault()}>
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ marginTop: 8, padding: '14px 24px', fontSize: '0.95rem', letterSpacing: '0.02em' }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Signing in...
              </>
            ) : 'Sign In'}
          </button>
        </form>

        {/* Feature trust badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          {['🔒 Secure', '⚡ Fast', '📱 Mobile Ready'].map(item => (
            <span key={item} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>{item}</span>
          ))}
        </div>

        <p className="auth-link">
          Don't have an account? <Link to="/signup">Create one free</Link>
        </p>
      </div>
    </div>
  );
}
