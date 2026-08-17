import React, { useState, useRef } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { TEACHER_NAV } from './TeacherClasses';
import { useAuth } from '../../context/AuthContext';
import { updateUserAPI, initials } from '../../services/usersApi';
import { forgotPasswordAPI } from '../../services/authApi';
import { Save, Mail, Camera, Shield, Link as LinkIcon, Activity } from 'lucide-react';
import { PROFILE_FONT, profileSectionTitle, profileFieldLabel, profileCardSubtitle } from '../../styles/profileStyles';

export default function TeacherProfile() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentAvatar = avatarPreview || user?.avatar || '';

  const save = async () => {
    if (!user) return;
    setSaving(true); setMessage('');
    try { await updateUserAPI(user.id, { name }); await refreshUser(); setMessage('Profile updated successfully!'); }
    catch (err) { console.error(err); setMessage('Could not update profile.'); }
    finally { setSaving(false); }
  };

  const handleReset = async () => {
    if (!user?.email) return;
    setResetting(true);
    try { await forgotPasswordAPI(user.email); setResetSent(true); setTimeout(() => setResetSent(false), 4000); }
    catch (err) { console.error(err); setMessage('Could not send reset email.'); }
    finally { setResetting(false); }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { setMessage('Please select an image file.'); return; }
    if (file.size > 2 * 1024 * 1024) { setMessage('Image must be under 2MB.'); return; }
    setUploadingAvatar(true); setMessage('');
    try {
      const base64 = await resizeImage(file, 256);
      setAvatarPreview(base64);
      await updateUserAPI(user.id, { avatar: base64 });
      await refreshUser();
      setMessage('Avatar updated!');
    } catch (err) { console.error(err); setMessage('Could not upload avatar.'); setAvatarPreview(null); }
    finally { setUploadingAvatar(false); }
  };

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  
  const heatmap = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    if (day > currentDay) return 0; // Future days
    const seed = day * (user?.id?.length || 7) * 31;
    const val = seed % 100;
    if (val > 80) return 3;
    if (val > 50) return 2;
    if (val > 25) return 1;
    return 0;
  });

  const isSuccess = message.includes('updated') || message.includes('Avatar') || message.includes('success');

  return (
    <DashboardLayout navItems={TEACHER_NAV} role="teacher" userName={user?.name || 'Teacher'} sectionLabel="Classroom">

      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <div className="db-profile-hero-banner" style={{
        background: 'linear-gradient(135deg, #0EA5E9 0%, #6366F1 55%, #8B5CF6 100%)',
        boxShadow: '0 20px 60px rgba(99,102,241,0.3)',
      }}>
        {/* Top decorative stripe */}
        <div style={{ height: 6, background: 'linear-gradient(90deg, #FCD34D, #F59E0B, #FCD34D)', opacity: 0.7 }} />

        <div className="db-profile-hero-inner">
          {/* Left: avatar + info */}
          <div className="db-profile-hero-main">
            {/* Avatar */}
            <div style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }} onClick={() => fileInputRef.current?.click()}>
              <div style={{
                width: 88, height: 88, borderRadius: '50%',
                background: currentAvatar ? `url(${currentAvatar}) center/cover no-repeat` : 'rgba(255,255,255,0.25)',
                border: '3px solid rgba(255,255,255,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 30, fontWeight: 900, color: '#fff',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}>
                {!currentAvatar && initials(user?.name || 'TC')}
              </div>
              <div style={{
                position: 'absolute', bottom: 2, right: 2,
                width: 26, height: 26, borderRadius: '50%',
                background: '#fff', color: '#6366F1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}>
                {uploadingAvatar
                  ? <div style={{ width: 12, height: 12, border: '2px solid #6366F1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : <Camera size={12} />}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
            </div>

            {/* Name / email / role badge */}
            <div>
              <div className="db-profile-hero-name">{user?.name || 'Teacher'}</div>
              <div className="db-profile-hero-email">
                <Mail size={12} /> {user?.email}
              </div>
              <div className="db-profile-hero-tags">
                <span style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 50, letterSpacing: 0.5 }}>
                  👩‍🏫 Teacher
                </span>
              </div>
            </div>
          </div>

          {/* Right: streak */}
          <div className="db-profile-hero-stat">
            <div className="db-profile-hero-stat-label">Day Streak</div>
            <div className="db-profile-hero-stat-value">
              {user?.streak || 0}
              <span style={{ fontSize: 44, filter: 'drop-shadow(0 2px 8px rgba(239,68,68,0.6))' }}>🔥</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body Grid ───────────────────────────────────────────── */}
      <div className="db-profile-page-grid" style={{ alignItems: 'stretch' }}>

        {/* LEFT: Information Card */}
        <div className="db-profile-card">
          {/* Card header */}
          <div className="db-profile-card-header">
            <div style={{ ...profileSectionTitle, paddingBottom: 16, borderBottom: '1px solid var(--db-border)' }}>
              Personal Information
            </div>
          </div>

          <div className="db-profile-card-body">
            {/* Name */}
            <div>
              <label style={profileFieldLabel}>Full Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12,
                  border: '1.5px solid var(--db-border)', background: 'var(--db-body)',
                  fontSize: 15, fontWeight: 600, color: 'var(--db-text)', outline: 'none',
                  fontFamily: PROFILE_FONT,
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#6366F1'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--db-border)'}
              />
            </div>

            {/* Email */}
            <div>
              <label style={profileFieldLabel}>Email Address</label>
              <input
                value={user?.email || ''}
                disabled
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12,
                  border: '1.5px solid var(--db-border)', background: 'var(--db-hover)',
                  fontSize: 15, fontWeight: 500, color: 'var(--db-muted)', outline: 'none', cursor: 'not-allowed',
                  fontFamily: PROFILE_FONT,
                }}
              />
            </div>

            {/* Section */}
            <div>
              <label style={profileFieldLabel}>Section Handled</label>
              <input
                value={user?.section || 'Not assigned'}
                disabled
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12,
                  border: '1.5px solid var(--db-border)', background: 'var(--db-hover)',
                  fontSize: 15, fontWeight: 500, color: 'var(--db-muted)', outline: 'none', cursor: 'not-allowed',
                  fontFamily: PROFILE_FONT,
                }}
              />
            </div>

            {/* Feedback + Save */}
            <div className="db-profile-save-row">
              <button
                onClick={save}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: saving ? 'var(--db-hover)' : 'linear-gradient(135deg, #6366F1, #4F46E5)',
                  color: saving ? 'var(--db-muted)' : '#fff',
                  border: 'none', borderRadius: 12, padding: '12px 24px',
                  fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: PROFILE_FONT,
                  boxShadow: saving ? 'none' : '0 4px 16px rgba(99,102,241,0.35)',
                  transition: 'all 0.2s',
                }}
              >
                <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
              {message && (
                <span style={{ fontSize: 13, fontWeight: 600, color: isSuccess ? '#10B981' : '#EF4444', fontFamily: PROFILE_FONT }}>
                  {isSuccess ? '✓' : '⚠'} {message}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Security + Activity stacked */}
        <div className="db-profile-sidebar">

          {/* Security Card */}
          <div className="db-profile-card db-profile-card--padded">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Shield size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={profileSectionTitle}>Security</div>
                <div style={profileCardSubtitle}>Reset your password</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--db-muted)', lineHeight: 1.6, marginBottom: 16, fontFamily: PROFILE_FONT, fontWeight: 600 }}>
              We'll send a secure link to <strong style={{ color: 'var(--db-text)', fontFamily: PROFILE_FONT }}>{user?.email}</strong>
            </p>
            <button
              onClick={handleReset}
              disabled={resetSent || resetting}
              style={{
                width: '100%', padding: '11px 16px', borderRadius: 12,
                background: resetSent ? 'rgba(16,185,129,0.1)' : 'var(--db-hover)',
                color: resetSent ? '#10B981' : 'var(--db-text)',
                border: `1.5px solid ${resetSent ? 'rgba(16,185,129,0.3)' : 'var(--db-border)'}`,
                fontSize: 13, fontWeight: 700, cursor: resetSent ? 'default' : 'pointer',
                fontFamily: PROFILE_FONT,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
            >
              {resetSent ? <><Mail size={14} /> Link Sent!</> : <><LinkIcon size={14} /> {resetting ? 'Sending…' : 'Send Reset Link'}</>}
            </button>
          </div>

          {/* Activity Heatmap Card */}
          <div className="db-profile-card db-profile-card--padded">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Activity size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={profileSectionTitle}>Activity</div>
                <div style={profileCardSubtitle}>This month ({daysInMonth} days)</div>
              </div>
            </div>

            <div className="db-profile-heatmap">
              {heatmap.map((v, i) => (
                <div key={i} style={{
                  aspectRatio: '1', borderRadius: 5,
                  background: v === 0 ? 'var(--db-hover)' : v === 1 ? 'rgba(16,185,129,0.25)' : v === 2 ? 'rgba(16,185,129,0.6)' : '#10B981',
                  border: v === 0 ? '1px solid var(--db-border)' : 'none',
                  transition: 'transform 0.15s',
                  cursor: 'default',
                }} title={`Activity: ${v}`} />
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, fontSize: 11, color: 'var(--db-muted)', fontWeight: 600, fontFamily: PROFILE_FONT, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              <span>Less</span>
              {[0, 1, 2, 3].map(v => (
                <div key={v} style={{ width: 12, height: 12, borderRadius: 3, background: v === 0 ? 'var(--db-hover)' : v === 1 ? 'rgba(16,185,129,0.25)' : v === 2 ? 'rgba(16,185,129,0.6)' : '#10B981', border: v === 0 ? '1px solid var(--db-border)' : 'none' }} />
              ))}
              <span>More</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}

function resizeImage(file: File, maxDim: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > h) { if (w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; } }
        else { if (h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; } }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no canvas ctx'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
