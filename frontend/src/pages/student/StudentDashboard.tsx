import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { getUserStatsAPI, initials, joinSectionAPI, type AppUser } from '../../services/usersApi';
import { useDialog } from '../../components/DialogProvider';
import {
  LayoutDashboard, Trophy, UserCircle, BookOpen,
  Zap, Target, Star, Flame, ChevronRight, MessageSquare, Bell, Award, Users
} from 'lucide-react';
import JoinSectionPanel from '../../components/JoinSectionPanel';

export const STUDENT_NAV = [
  { path: '/student', label: 'My Dashboard', icon: <LayoutDashboard size={18} /> },
  { path: '/student/section', label: 'My Section', icon: <Users size={18} /> },
  { path: '/student/leaderboard', label: 'Leaderboard', icon: <Trophy size={18} /> },
  { path: '/student/awards', label: 'Awards', icon: <Award size={18} /> },
  { path: '/student/chat', label: 'Chat', icon: <MessageSquare size={18} /> },
  { path: '/student/notifications', label: 'Notifications', icon: <Bell size={18} /> },
  { path: '/student/profile', label: 'My Profile', icon: <UserCircle size={18} /> },
];

export default function StudentDashboard() {
  const { user, refreshUser } = useAuth();
  const { alert } = useDialog();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [stats, setStats] = useState({ xp: 0, level: 1, streak: 0, storiesDone: 0, storiesTotal: 0 });
  const [stories, setStories] = useState<{ id: string; title: string; description?: string; levels: number; theme?: string }[]>([]);
  const [leaderboard, setLeaderboard] = useState<(AppUser & { rank: number; isMe?: boolean })[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getUserStatsAPI();
      setStats({
        xp: Number(data.stats.xp || 0),
        level: Number(data.stats.level || 1),
        streak: Number(data.stats.streak || 0),
        storiesDone: Number(data.stats.storiesDone || 0),
        storiesTotal: Number(data.stats.storiesTotal || 0),
      });
      setStories(data.stories || []);
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleJoinSection = async (code: string) => {
    setJoining(true);
    setJoinMessage('');
    try {
      await joinSectionAPI(code);
      await refreshUser();
      setJoinMessage('Joined section successfully!');
      await load();
    } catch (err) {
      console.error(err);
      setJoinMessage('Invalid or expired join code.');
      await alert({ title: 'Join failed', message: 'Invalid join code.', variant: 'danger' });
    } finally {
      setJoining(false);
    }
  };

  const STATS = [
    { label: 'Total XP', value: stats.xp.toLocaleString(), sub: 'From reading & quizzes', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: <Zap size={22} /> },
    { label: 'Current Level', value: `Lv. ${stats.level}`, sub: `${100 - (stats.xp % 100)} XP to next`, color: '#EC4899', bg: 'rgba(236,72,153,0.12)', icon: <Star size={22} /> },
    { label: 'Stories', value: `${stats.storiesDone} / ${stats.storiesTotal}`, sub: 'Published available', color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: <Target size={22} /> },
    { label: 'Reading Streak', value: `${stats.streak} days`, sub: stats.streak ? 'Keep it going!' : 'Start a streak', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: <Flame size={22} /> },
  ];

  return (
    <DashboardLayout navItems={STUDENT_NAV} role="student" userName={user?.name || 'Student'} sectionLabel="Learning">
      <div className="db-hero-banner" style={{
        background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 50%, #6366F1 100%)',
        boxShadow: '0 20px 60px rgba(236,72,153,0.3)',
      }}>
        <div className="db-hero-banner-content">
          <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.7)', letterSpacing:1, textTransform:'uppercase', marginBottom:8 }}>Welcome back</div>
          <h2 style={{ fontSize:28, fontWeight:900, color:'#fff', margin:0, letterSpacing:'-0.5px' }}>
            Let's race today, {user?.name?.split(' ')[0] || 'Student'}! 🚀
          </h2>
          <p style={{ fontSize:15, color:'rgba(255,255,255,0.85)', marginTop:8, marginBottom:0 }}>
            {user?.section && user.section !== 'NA' ? `Section: ${user.section}` : 'Join a class section with your teacher’s code.'}
          </p>
        </div>
        <div className="db-hero-banner-chip" style={{
          background:'rgba(255,255,255,0.18)', backdropFilter:'blur(12px)',
          border:'1px solid rgba(255,255,255,0.3)', borderRadius:50, padding:'10px 20px',
          color:'#fff', fontWeight:700, fontSize:14,
        }}>
          <Zap size={16} style={{ color:'#FDE68A' }} /> {stats.xp.toLocaleString()} XP Total
        </div>
      </div>

      {(!user?.section || user.section === 'NA') && (
        <div className="db-card" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Join a Section</div>
          <div style={{ color: 'var(--db-muted)', fontSize: 13, marginBottom: 16 }}>Scan QR or enter the join code from your teacher.</div>
          <JoinSectionPanel
            onJoin={handleJoinSection}
            joining={joining}
            message={joinMessage}
            compact
          />
        </div>
      )}

      <div className="db-dashboard-stats-grid">
        {STATS.map(s => (
          <div key={s.label} style={{
            background:'var(--db-card)', border:'1px solid var(--db-border)', borderRadius:20, padding:'22px 20px',
            boxShadow:'var(--db-glass-shadow)', display:'flex', alignItems:'center', gap:16, position:'relative', overflow:'hidden',
          }}>
            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, borderRadius:'20px 0 0 20px', background:s.color }} />
            <div style={{ width:50, height:50, borderRadius:15, background:s.bg, color:s.color, display:'flex', alignItems:'center', justifyContent:'center' }}>{s.icon}</div>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--db-muted)', marginBottom:4, textTransform:'uppercase', letterSpacing:0.5 }}>{s.label}</div>
              <div style={{ fontSize:26, fontWeight:900, color:'var(--db-text)', letterSpacing:'-0.5px', lineHeight:1 }}>{loading ? '…' : s.value}</div>
              <div style={{ fontSize:12, fontWeight:600, color:s.color, marginTop:4 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="db-dashboard-main-grid">
        <div className="db-card">
          <div className="db-card-head">
            <span className="db-card-title">Available Stories</span>
            <Link to="/student/section" className="db-card-link">Explore <ChevronRight size={14} /></Link>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {stories.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--db-muted)', fontWeight: 600 }}>
                No published stories yet.
              </div>
            )}
            {stories.map((s, idx) => {
              const color = ['#10B981', '#6366F1', '#EC4899'][idx % 3];
              return (
                <Link key={s.id} to={`/student/stories?campaign=${s.id}`} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:16, border:'1px solid var(--db-border)', background:'var(--db-hover)', textDecoration: 'none' }}>
                  <div style={{ width:44, height:44, borderRadius:14, background:`${color}18`, color, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <BookOpen size={20} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:'var(--db-text)' }}>{s.title}</div>
                    <div style={{ fontSize:12, color:'var(--db-muted)', marginTop:4 }}>{s.levels} levels{s.theme ? ` · ${s.theme}` : ''}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-head">
            <span className="db-card-title">Leaderboard</span>
            <Link to="/student/leaderboard" className="db-card-link">Full list <ChevronRight size={14} /></Link>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {leaderboard.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--db-muted)', fontWeight: 600 }}>
                Leaderboard fills up as students earn XP.
              </div>
            )}
            {leaderboard.slice(0, 5).map((p) => (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:12, background: p.isMe ? 'rgba(99,102,241,0.08)' : 'var(--db-hover)', flexWrap:'wrap' }}>
                <div style={{ width:24, fontWeight:800, color:'var(--db-muted)' }}>#{p.rank}</div>
                <div style={{ width:34, height:34, borderRadius:'50%', background:'rgba(99,102,241,0.15)', color:'#6366F1', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12 }}>{initials(p.name)}</div>
                <div style={{ flex:1, fontWeight:700, color:'var(--db-text)' }}>{p.isMe ? 'You' : p.name}</div>
                <div style={{ fontWeight:800, color:'#F59E0B' }}>{(p.xp || 0).toLocaleString()} XP</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
