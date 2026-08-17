import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { STUDENT_NAV } from './StudentDashboard';
import { useAuth } from '../../context/AuthContext';
import { getLeaderboardAPI, initials, type AppUser } from '../../services/usersApi';
import { Trophy, Zap } from 'lucide-react';

export default function StudentLeaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<(AppUser & { rank: number; isMe?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getLeaderboardAPI();
        if (!cancelled) setRows(data.leaderboard);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const me = rows.find((r) => r.isMe) || null;
  const top3 = rows.slice(0, 3);
  const colors = ['#F59E0B', '#94A3B8', '#CD7F32', '#6366F1', '#EC4899', '#10B981', '#8B5CF6', '#3B82F6'];

  return (
    <DashboardLayout navItems={STUDENT_NAV} role="student" userName={user?.name || 'Student'} sectionLabel="Learning">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--db-text)', letterSpacing: '-0.5px', margin: 0 }}>
          Class Leaderboard 🏆
        </h2>
        <p style={{ color: 'var(--db-muted)', fontSize: 14, marginTop: 6 }}>
          {user?.section && user.section !== 'NA' ? `${user.section} rankings` : 'Join a section to compete with classmates.'}
        </p>
      </div>

      <div className="db-dashboard-split-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{
            borderRadius: 24, padding: '36px 24px', textAlign: 'center',
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',
            color: '#fff', boxShadow: '0 20px 60px rgba(99,102,241,0.3)',
          }}>
            <Trophy size={48} style={{ marginBottom: 16, opacity: 0.9 }} />
            <div style={{ fontSize: 14, opacity: 0.85, fontWeight: 600 }}>Your Current Rank</div>
            <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.1 }}>{me ? `#${me.rank}` : '—'}</div>
            <div style={{
              background: 'rgba(255,255,255,0.18)', padding: '10px 20px', borderRadius: 50,
              display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 18, fontSize: 14, fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.3)',
            }}>
              <Zap size={16} style={{ color: '#FDE68A' }} /> {(me?.xp ?? user?.xp ?? 0).toLocaleString()} XP
            </div>
          </div>

          <div className="db-card">
            <div className="db-card-head"><span className="db-card-title">Top 3 Players</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {top3.length === 0 && <div style={{ padding: 16, color: 'var(--db-muted)', fontWeight: 600 }}>{loading ? 'Loading…' : 'No rankings yet.'}</div>}
              {top3.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--db-hover)', borderRadius: 14 }}>
                  <div style={{ fontSize: 24, width: 32, textAlign: 'center' }}>{['🏆', '🥈', '🥉'][i]}</div>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${colors[i]}25`, color: colors[i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{initials(p.name)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--db-text)' }}>{p.isMe ? 'You' : p.name}</div>
                    <div style={{ fontSize: 12, color: '#F59E0B', fontWeight: 700 }}>{(p.xp || 0).toLocaleString()} XP</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="db-card" style={{ padding: '24px 0' }}>
          <div style={{ padding: '0 28px', marginBottom: 20 }}>
            <div className="db-card-title">{user?.section && user.section !== 'NA' ? `${user.section} Rankings` : 'Student Rankings'}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {rows.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--db-muted)', fontWeight: 600 }}>
                {loading ? 'Loading leaderboard…' : 'No students on the board yet.'}
              </div>
            )}
            {rows.map((p, i) => (
              <div key={p.id} className="db-list-row" style={{
                padding: '14px 28px',
                background: p.isMe ? 'rgba(99,102,241,0.08)' : 'transparent',
                borderBottom: '1px solid var(--db-border)',
              }}>
                <div style={{ width: 28, fontWeight: 900, color: 'var(--db-muted)' }}>#{p.rank}</div>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${colors[i % colors.length]}22`, color: colors[i % colors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{initials(p.name)}</div>
                <div style={{ flex: 1, fontWeight: 800, color: 'var(--db-text)' }}>{p.isMe ? `${p.name} (You)` : p.name}</div>
                <div style={{ fontWeight: 800, color: '#F59E0B' }}>{(p.xp || 0).toLocaleString()} XP</div>
                <div style={{ fontSize: 12, color: 'var(--db-muted)', fontWeight: 700 }}>Lv. {Math.floor((p.xp || 0) / 100) + 1}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
