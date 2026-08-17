import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { STUDENT_NAV } from './StudentDashboard';
import { useAuth } from '../../context/AuthContext';
import { getAwardsAPI, type AwardItem } from '../../services/usersApi';
import { downloadAwardCertificate } from '../../utils/awardCertificate';
import { Award, Download, Flame, Loader, Lock, Star, Zap } from 'lucide-react';
import { useDialog } from '../../components/DialogProvider';

export default function StudentAwards() {
  const { user } = useAuth();
  const { alert } = useDialog();
  const [loading, setLoading] = useState(true);
  const [awards, setAwards] = useState<AwardItem[]>([]);
  const [streak, setStreak] = useState(0);
  const [totals, setTotals] = useState({ storiesCompleted: 0, stars: 0, streak: 0, xp: 0 });
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    getAwardsAPI()
      .then((data) => {
        setAwards(data.awards || []);
        setStreak(data.streak || 0);
        setTotals(data.totals || { storiesCompleted: 0, stars: 0, streak: 0, xp: 0 });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const unlocked = awards.filter((a) => a.unlocked).length;

  const handleDownload = async (award: AwardItem) => {
    if (!award.unlocked) return;
    setDownloadingId(award.id);
    try {
      await downloadAwardCertificate({
        studentName: user?.name || 'Student',
        award: {
          id: award.id,
          title: award.title,
          description: award.description,
          color: award.color,
          icon: award.icon,
        },
      });
    } catch (err) {
      console.error(err);
      await alert({
        title: 'Download failed',
        message: 'Could not create the certificate PDF. Please try again.',
        variant: 'danger',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <DashboardLayout navItems={STUDENT_NAV} role="student" userName={user?.name || 'Student'} sectionLabel="Learning">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--db-text)', margin: 0 }}>Awards & Streaks</h2>
        <p style={{ color: 'var(--db-muted)', fontSize: 14, marginTop: 6 }}>
          Unlock badges by finishing stories, earning stars, and keeping your reading streak alive.
          Download a PDF certificate for every award you unlock.
        </p>
      </div>

      <div className="db-dashboard-stats-grid--3" style={{ marginBottom: 24 }}>
        <div className="db-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(239,68,68,0.12)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Flame size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--db-muted)', textTransform: 'uppercase' }}>Streak</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--db-text)' }}>{streak} days</div>
          </div>
        </div>
        <div className="db-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(245,158,11,0.12)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Star size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--db-muted)', textTransform: 'uppercase' }}>Stars</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--db-text)' }}>{totals.stars}</div>
          </div>
        </div>
        <div className="db-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(16,185,129,0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--db-muted)', textTransform: 'uppercase' }}>Unlocked</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--db-text)' }}>{unlocked}/{awards.length || 0}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: 'var(--db-muted)', gap: 10 }}>
          <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading awards…
        </div>
      ) : (
        <div className="db-dashboard-auto-grid">
          {awards.map((a) => (
            <div
              key={a.id}
              className="db-card"
              style={{
                padding: 22,
                opacity: a.unlocked ? 1 : 0.72,
                border: a.unlocked ? `1px solid ${a.color}55` : '1px solid var(--db-border)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {!a.unlocked && (
                <div style={{ position: 'absolute', top: 12, right: 12, color: 'var(--db-muted)' }}>
                  <Lock size={14} />
                </div>
              )}
              <div style={{
                width: 56, height: 56, borderRadius: 16, marginBottom: 14,
                background: `${a.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, filter: a.unlocked ? 'none' : 'grayscale(1)',
              }}>
                {a.icon}
              </div>
              <div style={{ fontWeight: 900, fontSize: 16, color: 'var(--db-text)', marginBottom: 6 }}>{a.title}</div>
              <div style={{ fontSize: 13, color: 'var(--db-muted)', lineHeight: 1.5, marginBottom: 12, flex: 1 }}>{a.description}</div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800,
                padding: '4px 10px', borderRadius: 50, alignSelf: 'flex-start',
                background: a.unlocked ? `${a.color}18` : 'var(--db-hover)',
                color: a.unlocked ? a.color : 'var(--db-muted)',
                marginBottom: a.unlocked ? 12 : 0,
              }}>
                {a.unlocked ? 'Unlocked' : `Need ${a.requirement.count} ${a.requirement.type}`}
              </div>

              {a.unlocked && (
                <button
                  type="button"
                  onClick={() => handleDownload(a)}
                  disabled={downloadingId === a.id}
                  style={{
                    width: '100%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: 'none',
                    cursor: downloadingId === a.id ? 'wait' : 'pointer',
                    fontWeight: 800,
                    fontSize: 13,
                    color: '#fff',
                    background: `linear-gradient(135deg, ${a.color}, ${a.color}cc)`,
                    boxShadow: `0 8px 18px ${a.color}33`,
                  }}
                >
                  <Download size={15} />
                  {downloadingId === a.id ? 'Preparing PDF…' : 'Download Certificate'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="db-card" style={{ marginTop: 24, padding: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Zap size={18} color="#F59E0B" />
        <span style={{ color: 'var(--db-muted)', fontSize: 14 }}>
          You have <strong style={{ color: 'var(--db-text)' }}>{(user?.xp || totals.xp || 0).toLocaleString()} XP</strong>.
          Complete levels daily to grow your streak and unlock more awards.
        </span>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}
