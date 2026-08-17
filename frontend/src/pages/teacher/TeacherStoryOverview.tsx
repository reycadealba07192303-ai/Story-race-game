import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { TEACHER_NAV } from './TeacherClasses';
import { useAuth } from '../../context/AuthContext';
import { getCampaignProgressAPI, deleteCampaignAPI, updateCampaignAPI } from '../../services/api';
import { useDialog } from '../../components/DialogProvider';
import {
  Users, Star, ArrowLeft, Pencil, Trash2, Loader,
  BarChart3, CheckCircle2, BookOpen, Globe, EyeOff,
} from 'lucide-react';

interface CampaignData {
  _id: string;
  title: string;
  description: string;
  numLevels: number;
  published: boolean;
  targetSection: string;
  createdAt: string;
  theme: string;
  coverImage?: string | null;
  levels?: Array<{ customImage?: string }>;
}

interface LeaderboardEntry {
  _id: string;
  name: string;
  avatar: string;
  section: string;
  totalStars: number;
  completedLevels: number;
  progressPercent: number;
  completed: boolean;
  started: boolean;
}

export default function TeacherStoryOverview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { alert, confirm } = useDialog();

  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchProgress = async () => {
      setLoading(true);
      try {
        const data = await getCampaignProgressAPI(id);
        setCampaign(data.campaign);
        setLeaderboard(data.leaderboard || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, [id]);

  const handleDelete = async () => {
    if (!campaign) return;
    const ok = await confirm({
      title: 'Delete Story?',
      message: `Delete "${campaign.title}"? All student progress will be lost.`,
      variant: 'danger',
      confirmLabel: 'Yes, Delete',
    });
    if (!ok) return;
    try {
      await deleteCampaignAPI(campaign._id);
      navigate('/teacher/stories');
    } catch {
      await alert({ title: 'Error', message: 'Failed to delete the story.', variant: 'danger' });
    }
  };

  const handleTogglePublish = async () => {
    if (!campaign) return;
    const action = campaign.published ? 'Unpublish' : 'Publish';
    const ok = await confirm({
      title: `${action} Story?`,
      message: campaign.published
        ? 'Students will no longer be able to see this story.'
        : 'This will make the story available to students.',
      variant: 'warning',
      confirmLabel: `Yes, ${action}`,
    });
    if (!ok) return;
    try {
      await updateCampaignAPI(campaign._id, { published: !campaign.published });
      setCampaign({ ...campaign, published: !campaign.published });
    } catch {
      await alert({ title: 'Error', message: 'Failed to update publishing status.', variant: 'danger' });
    }
  };

  if (loading) {
    return (
      <DashboardLayout navItems={TEACHER_NAV} role="teacher" userName={user?.name || 'Teacher'} sectionLabel="Story Overview">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--db-muted)', gap: 12 }}>
          <Loader size={28} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout navItems={TEACHER_NAV} role="teacher" userName={user?.name || 'Teacher'} sectionLabel="Story Overview">
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--db-muted)' }}>
          <p>Story not found.</p>
          <button onClick={() => navigate('/teacher/stories')} className="db-btn outline" style={{ marginTop: 16 }}>Go Back</button>
        </div>
      </DashboardLayout>
    );
  }

  const medal = ['🥇', '🥈', '🥉'];
  const coverSrc = campaign.coverImage || campaign.levels?.[0]?.customImage || null;

  return (
    <DashboardLayout navItems={TEACHER_NAV} role="teacher" userName={user?.name || 'Teacher'} sectionLabel="Story Overview">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          onClick={() => navigate('/teacher/stories')}
          style={{ background: 'var(--db-hover)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--db-text)', cursor: 'pointer' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--db-text)', margin: 0 }}>Story Overview</h2>
          <div style={{ fontSize: 13, color: 'var(--db-muted)', marginTop: 2 }}>{campaign.title}</div>
        </div>
      </div>

      {/* Grid — overview LEFT (big), leaderboard RIGHT (same height, narrower) */}
      <div className="db-dashboard-sidebar-grid">

        {/* ── LEFT: Story Overview ── */}
        <div style={{ background: 'var(--db-card)', borderRadius: 20, border: '1px solid var(--db-border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Cover banner */}
          <div style={{ height: 260, background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(236,72,153,0.2))', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', flexShrink: 0 }}>
            {coverSrc ? (
              <img src={coverSrc} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={72} color="#8B5CF6" opacity={0.18} />
              </div>
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 60%)' }} />
            <div style={{
              position: 'absolute', top: 16, right: 16,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: campaign.published ? 'rgba(16,185,129,0.9)' : 'rgba(245,158,11,0.9)',
              backdropFilter: 'blur(8px)', color: '#fff',
              borderRadius: 50, padding: '5px 14px', fontSize: 12, fontWeight: 800,
            }}>
              {campaign.published ? <Globe size={12} /> : <EyeOff size={12} />}
              {campaign.published ? 'Published' : 'Draft'}
            </div>
            <div style={{ position: 'relative', padding: '0 28px 24px', zIndex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.3, textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}>
                {campaign.title}
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: 28, flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Description — 3 lines max */}
            <p style={{
              color: 'var(--db-muted)', fontSize: 14, margin: 0, lineHeight: 1.7,
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {campaign.description || 'No description provided for this story.'}
            </p>

            {/* Stats row */}
            <div className="db-flex-stats">
              {[
                { label: 'Levels', value: String(campaign.numLevels), color: '#6366F1', bg: 'rgba(99,102,241,0.08)', icon: <BookOpen size={15} color="#6366F1" /> },
                { label: 'Section', value: campaign.targetSection || 'None', color: '#10B981', bg: 'rgba(16,185,129,0.08)', icon: <Users size={15} color="#10B981" /> },
                { label: 'Students', value: String(leaderboard.length), color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', icon: <BarChart3 size={15} color="#F59E0B" /> },
              ].map(stat => (
                <div key={stat.label} style={{ flex: 1, background: stat.bg, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  {stat.icon}
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--db-text)', lineHeight: 1 }}>{stat.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--db-muted)', marginTop: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons — pushed to bottom */}
            <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
              <button
                onClick={() => navigate(`/teacher/stories/build?id=${campaign._id}`)}
                className="db-btn primary"
                style={{ flex: 1, padding: '13px', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, fontWeight: 800 }}
              >
                <Pencil size={15} /> Edit Story & Quiz
              </button>
              <button
                onClick={handleTogglePublish}
                className="db-btn outline"
                style={{ padding: '13px 20px', borderRadius: 12, fontSize: 14, fontWeight: 700 }}
              >
                {campaign.published ? 'Unpublish' : 'Publish'}
              </button>
              <button
                onClick={handleDelete}
                title="Delete"
                style={{ padding: '13px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Leaderboard (same height as left, internal scroll) ── */}
        <div style={{ background: 'var(--db-card)', borderRadius: 20, border: '1px solid var(--db-border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--db-border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(139,92,246,0.1)', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--db-text)' }}>Leaderboard</div>
              <div style={{ fontSize: 11, color: 'var(--db-muted)' }}>{leaderboard.length} students</div>
            </div>
          </div>

          {leaderboard.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center', color: 'var(--db-muted)' }}>
              <Users size={36} opacity={0.25} style={{ marginBottom: 12 }} />
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>No students yet</div>
              <div style={{ fontSize: 12 }}>Students will appear here once they start playing.</div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {leaderboard.map((student, index) => (
                <div key={String(student._id)} style={{
                  display: 'flex', alignItems: 'center', padding: '12px 16px',
                  borderBottom: '1px solid var(--db-border)', gap: 10,
                  background: index === 0 && student.started ? 'rgba(245,158,11,0.04)' : 'transparent',
                  opacity: student.started ? 1 : 0.6,
                }}>
                  <div style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>
                    {student.started && index < 3 ? medal[index] : <span style={{ fontSize: 12, color: 'var(--db-muted)', fontWeight: 700 }}>—</span>}
                  </div>
                  <img
                    src={student.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(student.name)}`}
                    alt=""
                    style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--db-text)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {student.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--db-muted)', marginTop: 2 }}>{student.section}</div>
                    {student.started ? (
                      <div style={{ height: 4, borderRadius: 2, background: 'var(--db-hover)', overflow: 'hidden', marginTop: 5 }}>
                        <div style={{ height: '100%', width: `${student.progressPercent}%`, background: student.completed ? '#10B981' : 'linear-gradient(90deg, #6366F1, #8B5CF6)', borderRadius: 2, transition: 'width 0.5s' }} />
                      </div>
                    ) : (
                      <div style={{ marginTop: 4, display: 'inline-block', background: 'rgba(148,163,184,0.12)', color: 'var(--db-muted)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 50, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        Not Started
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    {student.started ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontWeight: 800, color: '#F59E0B', fontSize: 13 }}>
                          <Star size={12} fill="currentColor" /> {student.totalStars}
                        </div>
                        {student.completed && <CheckCircle2 size={13} color="#10B981" />}
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}
