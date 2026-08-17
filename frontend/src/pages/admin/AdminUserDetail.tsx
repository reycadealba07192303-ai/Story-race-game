import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { ADMIN_NAV } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { deleteUserAPI, getUserAPI, initials, formatDate, type AppUser } from '../../services/usersApi';
import { getAuditLogsAPI, type AuditLog } from '../../services/auditApi';
import { useDialog } from '../../components/DialogProvider';
import { ArrowLeft, UserCircle, Shield, Calendar, MapPin, Trophy, Clock, CheckCircle, Activity } from 'lucide-react';

export default function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const { user: me } = useAuth();
  const { alert, confirm } = useDialog();
  const [user, setUser] = useState<AppUser | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getUserAPI(userId);
        if (!cancelled) {
          setUser(data.user);
          // Fetch their audit logs using their exact email
          const auditData = await getAuditLogsAPI({ search: data.user.email, limit: 10 });
          if (!cancelled) {
            // Filter strictly to ensure they are the actor
            setLogs(auditData.logs.filter(l => l.actorEmail === data.user.email));
          }
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('User not found.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const handleDelete = async () => {
    if (!user) return;
    const ok = await confirm({
      title: 'Delete user?',
      message: `Delete ${user.name}? This cannot be undone.`,
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteUserAPI(user.id);
      window.location.href = '/admin/users';
    } catch (err) {
      console.error(err);
      await alert({ title: 'Delete failed', message: 'Could not delete user.', variant: 'danger' });
    }
  };

  return (
    <DashboardLayout navItems={ADMIN_NAV} role="admin" userName={me?.name || 'Admin'} sectionLabel="Administration">
      <div style={{ marginBottom: '20px' }}>
        <Link to="/admin/users" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--db-muted)', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Users
        </Link>
      </div>

      {loading && <div className="db-card" style={{ padding: 32, textAlign: 'center', color: 'var(--db-muted)' }}>Loading user…</div>}
      {error && <div className="db-card" style={{ padding: 32, textAlign: 'center', color: '#EF4444' }}>{error}</div>}

      {user && (
        <>
          <div className="db-profile-hero">
            <div className="db-profile-avatar-large">{initials(user.name)}</div>
            <div className="db-profile-hero-info">
              <h2>{user.name}</h2>
              <p>{user.email}</p>
              <div className="db-profile-hero-tags">
                <span className="db-profile-hero-tag"><Shield size={12} style={{ display: 'inline', marginRight: 4 }} />{user.roleLabel || user.role}</span>
                <span className="db-profile-hero-tag"><MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />{user.section || 'NA'}</span>
              </div>
            </div>
          </div>

          <div className="db-dashboard-detail-grid--wide">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="db-card">
                <div className="db-card-head"><span className="db-card-title">Account Details</span></div>
                <div className="db-list" style={{ gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px solid var(--db-border)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--db-muted)' }}><Calendar size={14} style={{ display: 'inline', marginRight: 4 }}/> Created At</span>
                    <span style={{ fontWeight: 600 }}>{formatDate(user.createdAt)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px solid var(--db-border)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--db-muted)' }}><UserCircle size={14} style={{ display: 'inline', marginRight: 4 }}/> Status</span>
                    <span className="db-tag green">{user.status || 'active'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--db-muted)' }}><CheckCircle size={14} style={{ display: 'inline', marginRight: 4 }}/> Firebase UID</span>
                    <span style={{ fontWeight: 600, fontSize: 11 }}>{user.firebaseUid.slice(0, 12)}…</span>
                  </div>
                </div>
              </div>

              <div className="db-card">
                <div className="db-card-head"><span className="db-card-title">Performance</span></div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1, background: 'var(--db-bg)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                    <Trophy size={24} color="#F59E0B" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '24px', fontWeight: 800 }}>{user.xp || 0}</div>
                    <div style={{ fontSize: '12px', color: 'var(--db-muted)' }}>Total XP</div>
                  </div>
                  <div style={{ flex: 1, background: 'var(--db-bg)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                    <Clock size={24} color="var(--db-accent)" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '24px', fontWeight: 800 }}>{user.streak || 0}</div>
                    <div style={{ fontSize: '12px', color: 'var(--db-muted)' }}>Day Streak</div>
                  </div>
                </div>
              </div>

              {String(me?.id) !== String(user.id) && (
                <button type="button" className="db-btn" onClick={handleDelete} style={{ background: '#EF4444', color: '#fff', border: 'none' }}>
                  Delete User
                </button>
              )}
            </div>

            <div className="db-card">
              <div className="db-card-head" style={{ paddingBottom: 16 }}>
                <span className="db-card-title">Recent Activity</span>
              </div>
              <div style={{ padding: '0 24px 24px 24px', maxHeight: 420, overflowY: 'auto' }}>
                {logs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--db-muted)', fontSize: 14 }}>
                    <Activity size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                    No recent activities recorded for this user.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {logs.map(log => (
                      <div key={log.id} style={{ display: 'flex', gap: 12, paddingBottom: 16, borderBottom: '1px solid var(--db-border)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--db-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--db-accent)' }}>
                          <Activity size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--db-text)', marginBottom: 4 }}>
                            {log.summary}
                          </div>
                          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--db-muted)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12}/> {new Date(log.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
