import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import type { NavItem } from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import {
  getNotificationsAPI,
  markAllNotificationsReadAPI,
  markNotificationReadAPI,
  type AppNotification,
} from '../services/notificationsApi';
import { Bell, BookOpen, Award, Flame, Users, Info, Loader } from 'lucide-react';

interface NotificationsPageProps {
  navItems: NavItem[];
  role: string;
  userName: string;
  sectionLabel?: string;
}

function typeMeta(type: string) {
  if (type === 'story') return { icon: <BookOpen size={16} />, bg: 'rgba(16,185,129,0.12)', color: '#10B981' };
  if (type === 'award') return { icon: <Award size={16} />, bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' };
  if (type === 'streak') return { icon: <Flame size={16} />, bg: 'rgba(239,68,68,0.12)', color: '#EF4444' };
  if (type === 'section') return { icon: <Users size={16} />, bg: 'rgba(99,102,241,0.12)', color: '#6366F1' };
  return { icon: <Info size={16} />, bg: 'rgba(148,163,184,0.15)', color: '#64748B' };
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsPage({ navItems, role, userName, sectionLabel }: NotificationsPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AppNotification[]>([]);

  const load = async () => {
    try {
      const data = await getNotificationsAPI();
      setItems(data.notifications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markAll = async () => {
    await markAllNotificationsReadAPI();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const openItem = async (n: AppNotification) => {
    if (!n.read) {
      await markNotificationReadAPI(n.id).catch(() => {});
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    if (n.link) navigate(n.link);
  };

  return (
    <DashboardLayout navItems={navItems} role={role} userName={user?.name || userName} sectionLabel={sectionLabel}>
      <div className="db-greeting" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div className="db-greeting-text">
          <h2>Notifications 🔔</h2>
          <p>Story publishes, awards, streaks, and section updates.</p>
        </div>
        {items.some((n) => !n.read) && (
          <button type="button" className="db-btn ghost" onClick={markAll}>Mark all read</button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: 'var(--db-muted)', gap: 10 }}>
          <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="db-card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(99,102,241,0.12)', color: '#6366F1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Bell size={28} />
          </div>
          <h3 style={{ margin: 0, color: 'var(--db-text)' }}>No notifications yet</h3>
          <p style={{ color: 'var(--db-muted)', marginTop: 8 }}>When stories are published or awards unlock, they will show up here.</p>
        </div>
      ) : (
        <div className="db-card" style={{ padding: 0, overflow: 'hidden' }}>
          {items.map((n) => {
            const meta = typeMeta(n.type);
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => openItem(n)}
                style={{
                  width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                  padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'flex-start',
                  background: n.read ? 'transparent' : 'rgba(99,102,241,0.05)',
                  borderBottom: '1px solid var(--db-border)',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 12, background: meta.bg, color: meta.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {meta.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: 'var(--db-text)', fontSize: 14 }}>{n.title}</div>
                  <div style={{ color: 'var(--db-muted)', fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: 'var(--db-muted)', marginTop: 6, fontWeight: 600 }}>{timeAgo(n.createdAt)}</div>
                </div>
                {!n.read && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--db-accent)', marginTop: 6, flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}
