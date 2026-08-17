import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { TEACHER_NAV } from './TeacherClasses';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Plus, Clock, Image as ImageIcon, ChevronRight, Loader, Pencil, Trash2 } from 'lucide-react';
import { getCampaignsAPI, deleteCampaignAPI } from '../../services/api';
import { useDialog } from '../../components/DialogProvider';

interface Campaign {
  _id: string;
  title: string;
  published: boolean;
  numLevels: number;
  targetSection: string;
  templateId: string;
  createdAt: string;
  scheduledAt?: string;
  coverImage?: string | null;
  levels?: Array<{ customImage?: string }>;
}

export default function TeacherStoryDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { alert, confirm } = useDialog();
  const [stories, setStories] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getCampaignsAPI();
      setStories(data.campaigns || []);
    } catch (err) {
      console.error(err);
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const COLORS = ['#10B981', '#6366F1', '#EC4899', '#F59E0B', '#8B5CF6', '#06b6d4'];
  const getColor = (i: number) => COLORS[i % COLORS.length];

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
    return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) > 1 ? 's' : ''} ago`;
  };

  const openStory = (id: string) => {
    navigate(`/teacher/stories/${id}`);
  };

  const removeStory = async (story: Campaign, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Delete story?',
      message: `Delete "${story.title}"? This cannot be undone.`,
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteCampaignAPI(story._id);
      setStories((prev) => prev.filter((s) => s._id !== story._id));
    } catch {
      await alert({ title: 'Delete failed', message: 'Could not delete this story.', variant: 'danger' });
    }
  };

  return (
    <DashboardLayout navItems={TEACHER_NAV} role="teacher" userName={user?.name || 'Teacher'} sectionLabel="Story Maker">

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: 'var(--db-text)', letterSpacing: '-0.5px', margin: 0 }}>
            Story Maker
          </h2>
          <p style={{ color: 'var(--db-muted)', fontSize: 14, marginTop: 6 }}>
            Create and manage gamified interactive stories for your students.
          </p>
        </div>
        <button
          onClick={() => navigate('/teacher/stories/build')}
          className="db-btn primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: 'linear-gradient(135deg, #0F766E, #0EA5E9)', border: 'none', boxShadow: '0 8px 24px rgba(14,165,233,0.35)' }}
        >
          <Plus size={18} /> Create New Story
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, color: 'var(--db-muted)', gap: 12 }}>
          <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Loading stories...
        </div>
      ) : stories.length === 0 ? (
        <div style={{ background: 'var(--db-card)', border: '2px dashed var(--db-border)', borderRadius: 24, padding: '80px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 80, height: 80, background: 'rgba(14,165,233,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0EA5E9', marginBottom: 24 }}>
            <BookOpen size={40} />
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--db-text)', marginBottom: 8 }}>No Stories Yet</h3>
          <p style={{ color: 'var(--db-muted)', maxWidth: 400, margin: '0 auto 32px', lineHeight: 1.6 }}>
            Start building your first interactive gamified story!
          </p>
          <button onClick={() => navigate('/teacher/stories/build')} className="db-btn primary" style={{ padding: '14px 32px', fontSize: 16, borderRadius: 50 }}>
            Create New Story
          </button>
        </div>
      ) : (
        <div className="db-dashboard-auto-grid--wide">
          {stories.map((story, i) => {
            const color = getColor(i);
            const isPublished = story.published;
            return (
              <div
                key={story._id}
                role="button"
                tabIndex={0}
                onClick={() => openStory(story._id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openStory(story._id); }}
                style={{
                  background: 'var(--db-card)', borderRadius: 24, border: '1px solid var(--db-border)',
                  overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'transform 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ height: 160, background: `linear-gradient(135deg, ${color}22, ${color}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                  {(story.coverImage || story.levels?.[0]?.customImage) ? (
                    <img
                      src={story.coverImage || story.levels![0].customImage}
                      alt="cover"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                    />
                  ) : (
                    <ImageIcon size={48} color={color} opacity={0.5} />
                  )}
                  <div style={{ position: 'absolute', top: 16, right: 16, background: isPublished ? '#10B981' : '#F59E0B', color: 'white', padding: '4px 12px', borderRadius: 50, fontSize: 11, fontWeight: 800 }}>
                    {isPublished ? 'Published' : 'Draft'}
                  </div>
                </div>
                <div style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--db-text)', margin: '0 0 8px' }}>{story.title}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: 'var(--db-muted)', fontSize: 13, marginBottom: 20 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><BookOpen size={14} /> {story.numLevels} Levels</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={14} /> {timeAgo(story.createdAt)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--db-border)', paddingTop: 16, gap: 10 }}>
                    <div style={{ fontSize: 13, color: 'var(--db-muted)', fontWeight: 600, minWidth: 0 }}>
                      {story.targetSection ? `Shared with ${story.targetSection}` : 'Not assigned to any section'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        type="button"
                        title="Edit story"
                        onClick={(e) => { e.stopPropagation(); navigate(`/teacher/stories/build?id=${story._id}`); }}
                        style={{
                          width: 34, height: 34, borderRadius: 10, cursor: 'pointer',
                          background: 'var(--db-hover)', border: '1px solid var(--db-border)',
                          color: 'var(--db-text)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        title="Delete story"
                        onClick={(e) => removeStory(story, e)}
                        style={{
                          width: 34, height: 34, borderRadius: 10, cursor: 'pointer',
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                          color: '#EF4444', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                      <ChevronRight size={18} color="var(--db-muted)" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}
