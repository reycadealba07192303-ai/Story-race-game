import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Sparkles, BookOpen, Trophy, TrendingUp, Users } from 'lucide-react';
import '../auth.css';
import { useAuth, getRoleHomePath } from '../context/AuthContext';
import { signupAPI, getAuthErrorMessage, getSignupSectionsAPI } from '../services/authApi';

export default function SignUp() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [section, setSection] = useState('NA');
  const [sections, setSections] = useState<{ id: string; name: string; academicYear?: string }[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSignupSectionsAPI()
      .then((data) => {
        if (!cancelled) setSections(data.sections || []);
      })
      .catch(() => {
        if (!cancelled) setSections([]);
      });
    return () => { cancelled = true; };
  }, []);

  if (!loading && user) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const data = await signupAPI({
        name,
        email,
        password,
        role,
        section: role === 'student' && section === 'NA' ? 'NA' : undefined,
        sectionId: role === 'student' && section !== 'NA' ? section : null,
      });
      // Do not auto-login — user must verify email first
      navigate('/signin', {
        replace: true,
        state: {
          verifyEmail: data.email || email,
          message: data.message || 'Account created! Check your email for a verification link.',
        },
      });
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Could not create account.'));
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
            <h1>Your Reading<br />Adventure Starts Here.</h1>
            <p>Create your free account and dive into interactive story-based learning designed specifically for Grade 8 students.</p>
          </div>

          <div className="auth-perks-list">
            <div className="auth-perk-item">
              <div className="perk-icon-wrapper" style={{ color: '#FF2B7A', background: 'rgba(255,43,122,0.1)' }}>
                <BookOpen size={20} />
              </div>
              <div className="perk-info">
                <h4>Access 120+ Stories</h4>
                <p>Curated reading materials for Grade 8</p>
              </div>
            </div>

            <div className="auth-perk-item">
              <div className="perk-icon-wrapper" style={{ color: '#FFB300', background: 'rgba(255,179,0,0.1)' }}>
                <Trophy size={20} />
              </div>
              <div className="perk-info">
                <h4>Gamified Learning</h4>
                <p>Earn XP and climb the leaderboards</p>
              </div>
            </div>

            <div className="auth-perk-item">
              <div className="perk-icon-wrapper" style={{ color: '#00B87C', background: 'rgba(0,184,124,0.1)' }}>
                <TrendingUp size={20} />
              </div>
              <div className="perk-info">
                <h4>Track Comprehension</h4>
                <p>Monitor your growth and reading skills</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrapper">
          <div className="auth-badge">
            <Sparkles size={14} />
            <span>Free Forever for Students!</span>
          </div>
          <h2 className="auth-form-title">Create Account</h2>
          <p className="auth-form-sub">Join the reading race today.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="auth-alert auth-alert-error">{error}</div>}

            <div className="auth-field-group">
              <div className="auth-field">
                <label>Full Name</label>
                <div className="auth-input-wrapper">
                  <User size={18} className="auth-input-icon" />
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
              </div>

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
            </div>

            <div className="auth-field-group">
              <div className="auth-field">
                <label>Password</label>
                <div className="auth-input-wrapper">
                  <Lock size={18} className="auth-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Strong password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label>Confirm Password</label>
                <div className="auth-input-wrapper">
                  <Lock size={18} className="auth-input-icon" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repeat password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button type="button" className="auth-eye-btn" onClick={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="auth-field-group">
              <div className="auth-field">
                <label>Role</label>
                <div className="auth-input-wrapper">
                  <Users size={18} className="auth-input-icon" />
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as 'student' | 'teacher' | 'admin')}
                    className="auth-select"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              {role === 'student' && (
                <div className="auth-field">
                  <label>Section (Grade 8)</label>
                  <div className="auth-input-wrapper">
                    <Users size={18} className="auth-input-icon" />
                    <select
                      value={section}
                      onChange={e => setSection(e.target.value)}
                      className="auth-select"
                    >
                      <option value="NA">N/A</option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="auth-submit-btn" disabled={submitting}>
              {submitting ? 'Creating Account...' : 'Create My Account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/signin">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
