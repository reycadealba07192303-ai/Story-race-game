import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { TEACHER_NAV } from './TeacherClasses';
import { useAuth } from '../../context/AuthContext';
import { getUserStatsAPI, initials, type AppUser } from '../../services/usersApi';
import {
  Users, BookOpen, TrendingUp, Flame, ChevronRight,
  Clock, Star, Zap, Target
} from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  excellent:  { label: 'Excellent',  color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  'on-track': { label: 'On Track',   color: '#6366F1', bg: 'rgba(99,102,241,0.12)' },
  'needs-help': { label: 'Needs Help', color: '#EC4899', bg: 'rgba(236,72,153,0.12)' },
};

function studentStatus(xp: number) {
  if (xp >= 1500) return 'excellent';
  if (xp >= 500) return 'on-track';
  return 'needs-help';
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ studentCount: 0, averageXp: 0, assignments: 0, topStreak: 0, topStreakName: '—' });
  const [students, setStudents] = useState<AppUser[]>([]);
  const [assignments, setAssignments] = useState<{ id: string; title: string; levels: number; createdAt: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getUserStatsAPI();
        if (cancelled) return;
        setStats({
          studentCount: Number(data.stats.studentCount || 0),
          averageXp: Number(data.stats.averageXp || 0),
          assignments: Number(data.stats.assignments || 0),
          topStreak: Number(data.stats.topStreak || 0),
          topStreakName: String(data.stats.topStreakName || '—'),
        });
        setStudents(data.students || []);
        setAssignments(data.assignments || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const STATS = [
    { label: 'My Students', value: String(stats.studentCount), sub: user?.section && user.section !== 'NA' ? user.section : 'Assigned sections', color: '#EC4899', bg: 'rgba(236,72,153,0.12)', icon: <Users size={22} /> },
    { label: 'Avg. XP', value: String(stats.averageXp), sub: 'Across students', color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: <TrendingUp size={22} /> },
    { label: 'Stories', value: String(stats.assignments), sub: 'Published campaigns', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: <BookOpen size={22} /> },
    { label: 'Top Streak', value: `${stats.topStreak} days`, sub: stats.topStreakName, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: <Flame size={22} /> },
  ];

  return (
    <DashboardLayout navItems={TEACHER_NAV} role="teacher" userName={user?.name || 'Teacher'} sectionLabel="Classroom">
      <div className="db-hero-banner" style={{
        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',
        boxShadow: '0 20px 60px rgba(99,102,241,0.35)',
      }}>
        <div className="db-hero-banner-content">
          <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.7)', letterSpacing:1, textTransform:'uppercase', marginBottom:8 }}>Welcome back</div>
          <h2 style={{ fontSize:28, fontWeight:900, color:'#fff', margin:0, letterSpacing:'-0.5px' }}>
            Good day, {user?.name?.split(' ')[0] || 'Teacher'}! 📚
          </h2>
          <p style={{ fontSize:15, color:'rgba(255,255,255,0.8)', marginTop:8, marginBottom:0 }}>
            {loading ? 'Loading your classroom…' : 'Live student and story data from your account.'}
          </p>
        </div>
        <div className="db-hero-banner-chip" style={{
          background:'rgba(255,255,255,0.18)', backdropFilter:'blur(12px)',
          border:'1px solid rgba(255,255,255,0.3)', borderRadius:50, padding:'10px 20px',
          color:'#fff', fontWeight:700, fontSize:14,
        }}>
          <Clock size={16} /> {stats.assignments} published stories
        </div>
      </div>

      <div className="db-dashboard-stats-grid">
        {STATS.map(s => (
          <div key={s.label} style={{
            background: 'var(--db-card)', border: '1px solid var(--db-border)', borderRadius: 20, padding: '22px 20px',
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

      <div className="db-dashboard-main-grid db-dashboard-main-grid--teacher">
        <div className="db-card" style={{ height: '100%' }}>
          <div className="db-card-head">
            <div>
              <div className="db-card-title">Student Progress</div>
              <div style={{ fontSize:12, color:'var(--db-muted)', marginTop:2 }}>{user?.section && user.section !== 'NA' ? user.section : 'Your students'}</div>
            </div>
            <Link to="/teacher/classes" className="db-card-link">View All <ChevronRight size={14} /></Link>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {students.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--db-muted)', fontWeight: 600 }}>
                No students assigned yet. Create a section and have students join with the code.
              </div>
            )}
            {students.map((s, i) => {
              const status = studentStatus(s.xp || 0);
              const sc = statusConfig[status];
              const score = Math.min(100, Math.round(((s.xp || 0) / 20)));
              return (
                <div key={s.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 14px', borderRadius:14, background:'var(--db-hover)', flexWrap:'wrap' }}>
                  <div style={{ width:24, textAlign:'center', fontSize:12, fontWeight:800, color:'var(--db-muted)' }}>#{i+1}</div>
                  <div style={{ width:38, height:38, borderRadius:'50%', background:`linear-gradient(135deg,${sc.color}99,${sc.color}55)`, color:sc.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800 }}>{initials(s.name)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:'var(--db-text)', marginBottom:4 }}>{s.name}</div>
                    <div style={{ height:5, borderRadius:999, background:'var(--db-border)', overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:999, width:`${score}%`, background: score>=90 ? '#10B981' : score>=75 ? '#F59E0B' : '#EC4899' }} />
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontWeight:800, fontSize:15, color:'var(--db-text)' }}>{score}%</div>
                    <div style={{ fontSize:11, fontWeight:600, color:'var(--db-yellow)' }}><Zap size={10} style={{ display:'inline', marginRight:2 }} />{(s.xp || 0).toLocaleString()} XP</div>
                  </div>
                  <div style={{ padding:'4px 10px', borderRadius:50, fontSize:11, fontWeight:700, background:sc.bg, color:sc.color }}>{sc.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="db-card" style={{ height: '100%' }}>
          <div className="db-card-head">
            <div>
              <div className="db-card-title">Published Stories</div>
              <div style={{ fontSize:12, color:'var(--db-muted)', marginTop:2 }}>From Story Maker</div>
            </div>
            <Target size={18} color="var(--db-muted)" />
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {assignments.length === 0 && (
              <div style={{ padding: 16, color: 'var(--db-muted)', fontWeight: 600, textAlign: 'center' }}>
                No published stories yet. Build one in Story Maker.
              </div>
            )}
            {assignments.map((a, idx) => (
              <div key={a.id} style={{ padding:'16px', borderRadius:16, border:'1px solid var(--db-border)', background:'var(--db-hover)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:'var(--db-text)' }}>{a.title}</div>
                    <div style={{ fontSize:12, color:'var(--db-muted)', marginTop:2 }}>{a.levels} levels</div>
                  </div>
                  <div style={{ fontWeight:800, fontSize:18, color: ['#EC4899','#6366F1','#10B981'][idx % 3] }}>{a.levels}</div>
                </div>
              </div>
            ))}
            {students[0] && (
              <div style={{ padding:'14px 16px', borderRadius:14, background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.15)', display:'flex', gap:10, alignItems:'center' }}>
                <Star size={16} color="#6366F1" />
                <span style={{ fontSize:13, color:'var(--db-text)', fontWeight:600 }}>
                  <strong style={{ color:'#6366F1' }}>{students[0].name}</strong> currently leads with {(students[0].xp || 0).toLocaleString()} XP.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
