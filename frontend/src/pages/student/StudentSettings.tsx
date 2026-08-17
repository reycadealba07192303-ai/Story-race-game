import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { STUDENT_NAV } from './StudentDashboard';
import { useAuth } from '../../context/AuthContext';
import { forgotPasswordAPI } from '../../services/authApi';
import { useDialog } from '../../components/DialogProvider';
import { Shield, Link as LinkIcon, Mail, Settings } from 'lucide-react';

export default function StudentSettings() {
  const { user } = useAuth();
  const { alert } = useDialog();
  const [resetSent, setResetSent] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (!user?.email) return;
    setResetting(true);
    try {
      await forgotPasswordAPI(user.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 4000);
    } catch (err) {
      console.error(err);
      await alert({ title: 'Send failed', message: 'Could not send reset email.', variant: 'danger' });
    } finally {
      setResetting(false);
    }
  };

  return (
    <DashboardLayout navItems={STUDENT_NAV} role="student" userName={user?.name || 'Student'} sectionLabel="Learning">
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 24px rgba(99,102,241,0.3)' }}>
          <Settings size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--db-text)', letterSpacing: '-0.5px', margin: 0 }}>
            Account Settings
          </h2>
          <p style={{ color: 'var(--db-muted)', fontSize: 14, marginTop: 4 }}>
            Manage your security preferences for {user?.email}.
          </p>
        </div>
      </div>

      <div className="db-card" style={{ padding: 32, maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(99,102,241,0.12)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--db-text)' }}>Security</div>
            <div style={{ fontSize: 13, color: 'var(--db-muted)' }}>Password & authentication</div>
          </div>
        </div>

        <div style={{ padding: '20px', borderRadius: 16, border: '1px solid var(--db-border)', background: 'var(--db-hover)' }}>
          <div className="db-toggle-row">
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--db-text)', marginBottom: 4 }}>Reset Password</div>
              <div style={{ fontSize: 13, color: 'var(--db-muted)' }}>Send a Firebase reset link to your email.</div>
            </div>
            <button
              type="button"
              className="db-btn ghost"
              onClick={handleReset}
              disabled={resetSent || resetting}
              style={{
                background: resetSent ? 'rgba(16,185,129,0.12)' : 'var(--db-hover)',
                color: resetSent ? '#10B981' : 'var(--db-text)',
                border: '1px solid var(--db-border)',
                padding: '10px 18px', borderRadius: 12,
                fontWeight: 700, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {resetSent ? <><Mail size={14} /> Sent!</> : <><LinkIcon size={14} /> {resetting ? 'Sending…' : 'Send Link'}</>}
            </button>
          </div>
        </div>

        <p style={{ marginTop: 20, color: 'var(--db-muted)', fontSize: 13 }}>
          Or go to <Link to="/forgot-password">Forgot Password</Link> while signed out.
        </p>
      </div>
    </DashboardLayout>
  );
}
