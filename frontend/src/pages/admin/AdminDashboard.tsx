import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { getUserStatsAPI, initials, formatDate, type AppUser } from '../../services/usersApi';
import {
  LayoutDashboard, Calendar, Users, ScrollText, Settings, UserCircle,
  Activity, Users as UsersIcon, BookOpen, Shield, ChevronRight, TrendingUp, Clock, Zap, CheckCircle, MessageSquare, Bell
} from 'lucide-react';

export const ADMIN_NAV = [
  { path: '/admin', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { path: '/admin/academic-year', label: 'Academic Year', icon: <Calendar size={18} /> },
  { path: '/admin/users', label: 'Users', icon: <Users size={18} /> },
  { path: '/admin/chat', label: 'Chat', icon: <MessageSquare size={18} /> },
  { path: '/admin/records', label: 'Audit Logs', icon: <ScrollText size={18} /> },
  { path: '/admin/notifications', label: 'Notifications', icon: <Bell size={18} /> },
  { path: '/admin/settings', label: 'Settings', icon: <Settings size={18} /> },
  { path: '/admin/profile', label: 'My Profile', icon: <UserCircle size={18} /> },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, teachers: 0, students: 0, admins: 0, activeStories: 0 });
  const [recentUsers, setRecentUsers] = useState<AppUser[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getUserStatsAPI();
        if (cancelled) return;
        setStats({
          totalUsers: Number(data.stats.totalUsers || 0),
          teachers: Number(data.stats.teachers || 0),
          students: Number(data.stats.students || 0),
          admins: Number(data.stats.admins || 0),
          activeStories: Number(data.stats.activeStories || 0),
        });
        setRecentUsers(data.recentUsers || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const STATS = [
    { label: 'Total Users', value: String(stats.totalUsers), sub: `${stats.students} students`, color: '#6366F1', bg: 'rgba(99,102,241,0.12)', glow: 'rgba(99,102,241,0.25)', icon: <UsersIcon size={22} /> },
    { label: 'Active Stories', value: String(stats.activeStories), sub: 'Published campaigns', color: '#10B981', bg: 'rgba(16,185,129,0.12)', glow: 'rgba(16,185,129,0.25)', icon: <BookOpen size={22} /> },
    { label: 'Teachers', value: String(stats.teachers), sub: `${stats.admins} admins`, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', glow: 'rgba(139,92,246,0.25)', icon: <Shield size={22} /> },
    { label: 'System', value: 'Online', sub: 'Auth + API ready', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', glow: 'rgba(245,158,11,0.25)', icon: <Activity size={22} /> },
  ];

  const OVERVIEW = [
    { label: 'Students', value: String(stats.students), icon: <TrendingUp size={18} />, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
    { label: 'Teachers', value: String(stats.teachers), icon: <Clock size={18} />, color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
    { label: 'Admins', value: String(stats.admins), icon: <Zap size={18} />, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    { label: 'Published Stories', value: String(stats.activeStories), icon: <CheckCircle size={18} />, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  ];

  return (
    <DashboardLayout navItems={ADMIN_NAV} role="admin" userName={user?.name || 'Admin'} sectionLabel="Administration">
      <div className="db-hero-banner" style={{
        background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 50%, #8B5CF6 100%)',
        boxShadow: '0 20px 60px rgba(79,70,229,0.3)',
      }}>
        <div style={{ position:'absolute', top:-40, left:-20, width:150, height:150, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />
        <div className="db-hero-banner-content">
          <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.7)', letterSpacing:1, textTransform:'uppercase', marginBottom:8 }}>
            System Administration
          </div>
          <h2 style={{ fontSize:28, fontWeight:900, color:'#fff', margin:0, letterSpacing:'-0.5px' }}>
            Welcome back, {user?.name?.split(' ')[0] || 'Admin'} 👋
          </h2>
          <p style={{ fontSize:15, color:'rgba(255,255,255,0.85)', marginTop:8, marginBottom:0 }}>
            Live platform overview from your registered users and stories.
          </p>
        </div>
        <div className="db-hero-banner-chip" style={{
          background:'rgba(255,255,255,0.15)', backdropFilter:'blur(16px)',
          border:'1px solid rgba(255,255,255,0.3)', borderRadius:50, padding:'10px 20px',
          color:'#fff', fontWeight:700, fontSize:14,
        }}>
          <Activity size={16} style={{ color:'#6EE7B7' }} />
          {loading ? 'Loading…' : 'All Systems Healthy'}
        </div>
      </div>

      <div className="db-dashboard-stats-grid">
        {STATS.map(s => (
          <div key={s.label} style={{
            background: 'var(--db-card)', backdropFilter: 'var(--db-glass-blur)', WebkitBackdropFilter: 'var(--db-glass-blur)',
            border: '1px solid var(--db-border)', borderRadius: 20, padding: '22px 20px',
            boxShadow: 'var(--db-glass-shadow)', display: 'flex', alignItems: 'center', gap: 16, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, borderRadius:'20px 0 0 20px', background:s.color }} />
            <div style={{ width:50, height:50, borderRadius:15, background:s.bg, color:s.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--db-muted)', marginBottom:4, textTransform:'uppercase', letterSpacing:0.5 }}>{s.label}</div>
              <div style={{ fontSize:26, fontWeight:900, color:'var(--db-text)', letterSpacing:'-0.5px', lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:12, fontWeight:600, color:s.color, marginTop:4 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="db-dashboard-main-grid">
        <div className="db-card">
          <div className="db-card-head">
            <span className="db-card-title">Recent Users</span>
            <Link to="/admin/users" className="db-card-link">View All <ChevronRight size={14} /></Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentUsers.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--db-muted)', fontWeight: 600 }}>
                {loading ? 'Loading users…' : 'No users yet. New signups will appear here.'}
              </div>
            )}
            {recentUsers.map(u => (
              <Link key={u.id} to={`/admin/users/${u.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 14, background: 'var(--db-hover)', textDecoration: 'none', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${u.color || '#6366F1'}22`, color: u.color || '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>
                    {initials(u.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--db-text)', marginBottom: 2 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--db-muted)' }}>Joined {formatDate(u.createdAt)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ padding: '4px 10px', borderRadius: 50, fontSize: 11, fontWeight: 700, background: `${u.color || '#6366F1'}15`, color: u.color || '#6366F1' }}>
                    {u.roleLabel || u.role}
                  </span>
                  <span style={{ padding: '4px 10px', borderRadius: 50, fontSize: 11, fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
                    {u.status || 'active'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-head"><span className="db-card-title">Quick Overview</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {OVERVIEW.map(o => (
              <div key={o.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16, border: '1px solid var(--db-border)', background: 'var(--db-hover)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: o.bg, color: o.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{o.icon}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--db-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{o.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--db-text)', marginTop: 2 }}>{o.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
