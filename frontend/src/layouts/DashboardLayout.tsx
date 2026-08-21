import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun, LogOut, Bell, BookOpen, Award, Flame, Users, Info, Menu } from 'lucide-react';
import '../dashboard.css';
import { useAuth } from '../context/AuthContext';
import {
  getNotificationsAPI,
  markAllNotificationsReadAPI,
  markNotificationReadAPI,
  type AppNotification,
} from '../services/notificationsApi';

export interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
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
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function DashboardLayout({
  children,
  navItems,
  role,
  userName,
  sectionLabel = 'Menu',
}: DashboardLayoutProps) {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [showNotifs, setShowNotifs] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const notifRef = useRef<HTMLDivElement>(null);
  const displayName = user?.name || userName;

  const unreadCount = notifs.filter(n => !n.read).length;
  const notifHome =
    role === 'admin' ? '/admin/notifications'
      : role === 'teacher' ? '/teacher/notifications'
        : '/student/notifications';

  const loadNotifs = async () => {
    try {
      const data = await getNotificationsAPI();
      setNotifs(data.notifications || []);
    } catch {
      // ignore when logged out / API down
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/signin', { replace: true });
  };

  useEffect(() => {
    loadNotifs();
    const id = setInterval(loadNotifs, 45000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const markAllRead = async () => {
    await markAllNotificationsReadAPI().catch(() => {});
    setNotifs(notifs.map(n => ({ ...n, read: true })));
  };

  const openNotif = async (n: AppNotification) => {
    if (!n.read) {
      await markNotificationReadAPI(n.id).catch(() => {});
      setNotifs(prev => prev.map(x => (x.id === n.id ? { ...x, read: true } : x)));
    }
    setShowNotifs(false);
    if (n.link) navigate(n.link);
    else navigate(notifHome);
  };

  const roleHome = role === 'admin' ? '/admin' : role === 'teacher' ? '/teacher' : '/student';
  const currentPage = navItems.find(i => i.path === location.pathname)
    || navItems.find(i => i.path !== roleHome && location.pathname.startsWith(i.path));
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="db-wrap">
      {mobileNavOpen && <button type="button" className="db-sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}

      <aside className={`db-sidebar ${mobileNavOpen ? 'open' : ''}`}>
        <Link to="/" className="db-sidebar-logo">
          <img src="/story-race-logo.png" alt="Logo" />
          <span>STORY RACEGAME</span>
        </Link>

        <div className="db-sidebar-nav">
          <div className="db-sidebar-section">{sectionLabel}</div>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`db-nav-item ${location.pathname === item.path || (item.path !== roleHome && location.pathname.startsWith(item.path)) ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="db-sidebar-footer">
          <button type="button" onClick={handleSignOut} className="db-nav-item danger" style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="db-main">
        <header className="db-topbar">
          <div className="db-topbar-left">
            <button
              type="button"
              className="db-icon-btn db-mobile-nav-toggle"
              title="Open navigation"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu size={18} />
            </button>
            <h1>{currentPage?.label ?? 'Dashboard'}</h1>
          </div>
          <div className="db-topbar-right">

            {role !== 'admin' && (
              <div ref={notifRef} className="db-notif-wrap">
              <button
                className="db-icon-btn"
                title="Notifications"
                onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) loadNotifs(); }}
                style={{ borderColor: showNotifs ? 'var(--db-accent)' : '' }}
              >
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '7px', right: '7px',
                    width: '9px', height: '9px',
                    background: '#EF4444', borderRadius: '50%',
                    border: '2px solid var(--db-bg)',
                  }} />
                )}
              </button>

              {showNotifs && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  right: 0,
                  width: 'min(340px, calc(100vw - 24px))',
                  background: 'var(--db-card)',
                  border: '1px solid var(--db-border)',
                  borderRadius: 'var(--db-radius)',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
                  zIndex: 200,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--db-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--db-text)' }}>Notifications</span>
                      {unreadCount > 0 && (
                        <span style={{
                          background: 'var(--db-accent)', color: 'white',
                          fontSize: '11px', fontWeight: 800,
                          padding: '2px 8px', borderRadius: '50px',
                        }}>{unreadCount}</span>
                      )}
                    </div>
                    <button
                      onClick={markAllRead}
                      style={{ background: 'none', border: 'none', color: 'var(--db-accent)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Mark all read
                    </button>
                  </div>

                  <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {notifs.length === 0 ? (
                      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--db-muted)', fontSize: '14px' }}>
                        No notifications yet.
                      </div>
                    ) : notifs.slice(0, 8).map(n => {
                      const meta = typeMeta(n.type);
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => openNotif(n)}
                          style={{
                            width: '100%', textAlign: 'left', border: 'none',
                            padding: '14px 20px',
                            borderBottom: '1px solid var(--db-border)',
                            display: 'flex',
                            gap: '14px',
                            alignItems: 'flex-start',
                            background: !n.read ? 'rgba(99,102,241,0.04)' : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: meta.bg, color: meta.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            {meta.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', color: 'var(--db-text)', lineHeight: 1.5, fontWeight: 700 }}>{n.title}</div>
                            <div style={{ fontSize: '12px', color: 'var(--db-muted)', marginTop: 2 }}>{n.message}</div>
                            <div style={{ fontSize: '11px', color: 'var(--db-muted)', marginTop: '4px', fontWeight: 600 }}>{timeAgo(n.createdAt)}</div>
                          </div>
                          {!n.read && (
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--db-accent)', flexShrink: 0, marginTop: '4px' }} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ padding: '12px 20px', borderTop: '1px solid var(--db-border)', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => { setShowNotifs(false); navigate(notifHome); }}
                      style={{ background: 'none', border: 'none', color: 'var(--db-accent)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      View all notifications →
                    </button>
                  </div>
                </div>
              )}
            </div>
            )}


            <button className="db-icon-btn" onClick={() => setIsDark(!isDark)} title="Toggle theme">
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <div className="db-avatar-btn">
              <div className="db-avatar">{initials}</div>
              <div className="db-avatar-info">
                <span className="db-avatar-name">{displayName}</span>
                <span className="db-avatar-role">{role}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="db-body">
          {children}
        </div>
      </main>
    </div>
  );
}
