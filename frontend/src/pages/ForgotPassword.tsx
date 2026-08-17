import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Sparkles, ArrowLeft, CheckCircle2, BookOpen, Shield } from 'lucide-react';
import '../auth.css';
import { forgotPasswordAPI, getAuthErrorMessage } from '../services/authApi';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await forgotPasswordAPI(email);
      setSent(true);
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Could not send reset email.'));
    } finally {
      setSubmitting(false);
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
            <h1>Reset Safely,<br />Get Back In Race.</h1>
            <p>We'll email you a secure link so you can set a new password and continue your story adventure.</p>
          </div>

          <div className="auth-perks-list">
            <div className="auth-perk-item">
              <div className="perk-icon-wrapper" style={{ color: '#FF2B7A', background: 'rgba(255,43,122,0.1)' }}>
                <Shield size={20} />
              </div>
              <div className="perk-info">
                <h4>Secure Reset Link</h4>
                <p>Powered by Firebase Authentication</p>
              </div>
            </div>
            <div className="auth-perk-item">
              <div className="perk-icon-wrapper" style={{ color: '#FFB300', background: 'rgba(255,179,0,0.1)' }}>
                <BookOpen size={20} />
              </div>
              <div className="perk-info">
                <h4>Pick Up Where You Left</h4>
                <p>Your progress stays tied to your account</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrapper">
          <div className="auth-badge">
            <Sparkles size={14} />
            <span>Account Recovery</span>
          </div>
          <h2 className="auth-form-title">Forgot Password</h2>
          <p className="auth-form-sub">
            Enter the same email you used to create your account. We'll send a Firebase reset link.
          </p>

          {sent ? (
            <div className="auth-success-panel">
              <div className="auth-success-icon">
                <CheckCircle2 size={28} />
              </div>
              <h3>Check your inbox</h3>
              <p>
                If an account exists for <strong>{email}</strong>, a password reset link is on the way.
                The link may take a minute to arrive.
              </p>
              <Link to="/signin" className="auth-submit-btn" style={{ display: 'inline-flex', justifyContent: 'center', textDecoration: 'none' }}>
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {error && <div className="auth-alert auth-alert-error">{error}</div>}

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

              <button type="submit" className="auth-submit-btn" disabled={submitting}>
                {submitting ? 'Sending Link...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <p className="auth-switch">
            <Link to="/signin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft size={16} /> Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
