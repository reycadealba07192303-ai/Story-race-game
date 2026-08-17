import React, { useRef, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { STUDENT_NAV } from './StudentDashboard';
import { useAuth } from '../../context/AuthContext';
import { updateUserAPI, initials, joinSectionAPI } from '../../services/usersApi';
import { forgotPasswordAPI } from '../../services/authApi';
import { Save, Mail, GraduationCap, Shield, Link as LinkIcon, Camera, Activity } from 'lucide-react';
import { PROFILE_FONT, profileSectionTitle, profileFieldLabel, profileCardSubtitle } from '../../styles/profileStyles';
import JoinSectionPanel from '../../components/JoinSectionPanel';

export default function StudentProfile() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
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

  const handleJoinSection = async (code: string) => {
    setJoining(true);
    setJoinMessage('');
    try {
      await joinSectionAPI(code);
      await refreshUser();
      setJoinMessage('Joined section successfully!');
      setMessage('Joined section successfully!');
    } catch (err) {
      console.error(err);
      setJoinMessage('Invalid or expired join code.');
    } finally {
      setJoining(false);
    }
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
    if (day > currentDay) return 0;
    const seed = day * (user?.id?.length || 7) * 31;
    const val = seed % 100;
    if (val > 80) return 3;
    if (val > 50) return 2;
    if (val > 25) return 1;
    return 0;
  });

  const isSuccess = message.includes('updated') || message.includes('Joined') || message.includes('Avatar') || message.includes('success');

  return (
    <DashboardLayout navItems={STUDENT_NAV} role="student" userName={user?.name || 'Student'} sectionLabel="Learning">

      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <div className="db-profile-hero-banner" style={{
        background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 55%, #F59E0B 100%)',
        boxShadow: '0 20px 60px rgba(139,92,246,0.3)',
      }}>
        <div style={{ height: 6, background: 'linear-gradient(90deg, #FCD34D, #F59E0B, #FCD34D)', opacity: 0.7 }} />

        <div className="db-profile-hero-inner">
          <div className="db-profile-hero-main">
            <div style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }} onClick={() => fileInputRef.current?.click()}>
              <div style={{
                width: 88, height: 88, borderRadius: '50%',
                background: currentAvatar ? `url(${currentAvatar}) center/cover no-repeat` : 'rgba(255,255,255,0.25)',
                border: '3px solid rgba(255,255,255,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 30, fontWeight: 900, color: '#fff',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}>
                {!currentAvatar && initials(user?.name || 'ST')}
              </div>
              <div style={{
                position: 'absolute', bottom: 2, right: 2,
                width: 26, height: 26, borderRadius: '50%',
                background: '#fff', color: '#8B5CF6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}>
                {uploadingAvatar
                  ? <div style={{ width: 12, height: 12, border: '2px solid #8B5CF6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : <Camera size={12} />}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
            </div>

            <div>
              <div className="db-profile-hero-name">{user?.name || 'Student'}</div>
              <div className="db-profile-hero-email">
                <Mail size={12} /> {user?.email}
              </div>
              <div className="db-profile-hero-tags">
                <span style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 50, letterSpacing: 0.5 }}>
                  🎓 Student
                </span>
                {user?.section && user.section !== 'NA' && (
                  <span style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 50 }}>
                    📚 {user.section}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* XP display */}
          <div className="db-profile-hero-stat">
            <div className="db-profile-hero-stat-label">Total XP</div>
            <div className="db-profile-hero-stat-value">
              {(user?.xp || 0).toLocaleString()}
              <span style={{ fontSize: 40, filter: 'drop-shadow(0 2px 8px rgba(250,204,21,0.6))' }}>⚡</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body Grid ───────────────────────────────────────────── */}
      <div className="db-profile-page-grid" style={{ alignItems: 'stretch' }}>

        {/* LEFT: Information */}
        <div className="db-profile-card">
          <div className="db-profile-card-header">
            <div style={{ ...profileSectionTitle, paddingBottom: 16, borderBottom: '1px solid var(--db-border)' }}>
              Personal Information
            </div>
          </div>

          <div className="db-profile-card-body">
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
                onFocus={(e) => e.currentTarget.style.borderColor = '#8B5CF6'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--db-border)'}
              />
            </div>

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

            <div>
              <label style={profileFieldLabel}>Current Section</label>
              <input
                value={user?.section && user.section !== 'NA' ? user.section : 'No section yet'}
                disabled
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12,
                  border: '1.5px solid var(--db-border)', background: 'var(--db-hover)',
                  fontSize: 15, fontWeight: 500, color: 'var(--db-muted)', outline: 'none', cursor: 'not-allowed',
                  fontFamily: PROFILE_FONT,
                }}
              />
            </div>

            <div className="db-profile-save-row">
              <button
                onClick={save}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: saving ? 'var(--db-hover)' : 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                  color: saving ? 'var(--db-muted)' : '#fff',
                  border: 'none', borderRadius: 12, padding: '12px 24px',
                  fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: PROFILE_FONT,
                  boxShadow: saving ? 'none' : '0 4px 16px rgba(139,92,246,0.35)',
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

        {/* RIGHT: Security + Join Section */}
        <div className="db-profile-sidebar">

          {/* Security */}
          <div className="db-profile-card db-profile-card--padded" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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

          {/* Activity Heatmap */}
          <div className="db-profile-card db-profile-card--padded" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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

          {/* Join Section */}
          <div className="db-profile-card db-profile-card--padded" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GraduationCap size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={profileSectionTitle}>Join a Section</div>
                <div style={profileCardSubtitle}>Scan QR or enter join code</div>
              </div>
            </div>

            <JoinSectionPanel
              onJoin={handleJoinSection}
              joining={joining}
              message={joinMessage}
            />
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
