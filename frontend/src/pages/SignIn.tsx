import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Sparkles, Users, BookOpen } from 'lucide-react';
import '../auth.css';
import { useAuth, getRoleHomePath } from '../context/AuthContext';
import {
  signinAPI,
  resendVerificationAPI,
  getAuthErrorMessage,
  getAuthErrorCode,
} from '../services/authApi';

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, loading, setSession } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(() => {
    const state = location.state as { verifyEmail?: string } | null;
    return state?.verifyEmail || '';
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(() => {
    const state = location.state as { message?: string } | null;
    if (searchParams.get('verified') === '1') {
      return 'Email verified! You can sign in now.';
    }
    return state?.message || '';
  });
  const [needsVerify, setNeedsVerify] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  if (!loading && user) {
    const from = (location.state as { from?: string } | null)?.from;
    const safeFrom =
      from && typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
        ? from
        : null;
    const roleHome = getRoleHomePath(user.role);
    const dest =
      safeFrom && (user.role === 'student' ? safeFrom.startsWith('/student') : safeFrom.startsWith(`/${user.role}`))
        ? safeFrom
        : roleHome;
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setNeedsVerify(false);
    setSubmitting(true);
    try {
      const data = await signinAPI({ email, password });
      setSession(data.token, data.user);
      const from = (location.state as { from?: string } | null)?.from;
      const safeFrom =
        from && typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
          ? from
          : null;
      const roleHome = getRoleHomePath(data.user.role);
      const dest =
        safeFrom &&
        (data.user.role === 'student' ? safeFrom.startsWith('/student') : safeFrom.startsWith(`/${data.user.role}`))
          ? safeFrom
          : roleHome;
      navigate(dest, { replace: true });
    } catch (err) {
      const code = getAuthErrorCode(err);
      setError(getAuthErrorMessage(err, 'Could not sign in.'));
      if (code === 'EMAIL_NOT_VERIFIED') setNeedsVerify(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email || !password) {
      setError('Enter your email and password to resend the verification link.');
      return;
    }
    setResending(true);
    setError('');
    try {
      const data = await resendVerificationAPI(email, password);
      setInfo(data.message);
      if (data.alreadyVerified) setNeedsVerify(false);
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Could not resend verification email.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-overlay" />
        <div className="auth-left-card">
          <Link to="/" className="auth-logo">
            <img src="/774305900_27641489658835587_363435234290148032_n.jpg" alt="Story Race Game" className="auth-logo-img" />
            <span>STORY RACEGAME</span>
          </Link>

          <div className="auth-hero-text">
            <h1>Race Through Stories,<br />Level Up Your Mind.</h1>
            <p>Join thousands of Grade 8 students mastering reading comprehension through epic story adventures.</p>
          </div>

          <div className="auth-stats-grid">
            <div className="auth-stat-box">
              <div className="stat-icon-wrapper" style={{ color: '#FF2B7A', background: 'rgba(255,43,122,0.1)' }}>
                <Users size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-number">5K+</span>
                <span className="stat-label">Active Students</span>
              </div>
            </div>
            <div className="auth-stat-box">
              <div className="stat-icon-wrapper" style={{ color: '#FFB300', background: 'rgba(255,179,0,0.1)' }}>
                <BookOpen size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-number">120+</span>
                <span className="stat-label">Curated Stories</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrapper">
          <div className="auth-badge">
            <Sparkles size={14} />
            <span>Welcome Back, Reader!</span>
          </div>
          <h2 className="auth-form-title">Sign In</h2>
          <p className="auth-form-sub">Continue your reading adventure.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {info && <div className="auth-alert" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)' }}>{info}</div>}
            {error && <div className="auth-alert auth-alert-error">{error}</div>}

            {needsVerify && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="auth-submit-btn"
                style={{ background: 'transparent', color: 'var(--auth-accent, #6366F1)', border: '1px solid currentColor', marginBottom: 8 }}
              >
                {resending ? 'Sending link…' : 'Resend verification email'}
              </button>
            )}

            <div className="auth-field">
              <label>Email Address</label>
              <div className="auth-input-wrapper">
                <Mail size={18} className="auth-input-icon" />
                <input
                  type="email"
                  placeholder="you@school.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field">
              <label>Password</label>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="auth-field-footer">
                <Link to="/forgot-password" className="auth-forgot">Forgot password?</Link>
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={submitting}>
              {submitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account? <Link to="/signup">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
