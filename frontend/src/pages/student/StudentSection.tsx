import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { STUDENT_NAV } from './StudentDashboard';
import { useAuth } from '../../context/AuthContext';
import {
  getSectionAPI,
  joinSectionAPI,
  getSectionAnnouncementsAPI,
  getMyProgressAPI,
  initials,
  formatDate,
  type SectionAnnouncement,
} from '../../services/usersApi';
import { getPublishedCampaignsAPI } from '../../services/api';
import { getCampaignTheme } from '../../themes/campaignThemes';
import {
  Users, BookOpen, GraduationCap, Loader, Star, Play, Lock, Megaphone,
  CheckCircle2, Clock, X, Zap, Target, Flame
} from 'lucide-react';
import JoinSectionPanel from '../../components/JoinSectionPanel';
import { campaignMatchesSection } from '../../utils/sectionMatching';

interface Campaign {
  _id: string;
  title: string;
  numLevels: number;
  targetSection: string;
  templateId: string;
  levels: { levelNumber: number }[];
  published?: boolean;
}

export default function StudentSection() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [sectionInfo, setSectionInfo] = useState<{
    id?: string;
    name: string;
    teacherName?: string | null;
    students?: number;
    color?: string;
  } | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [announcements, setAnnouncements] = useState<SectionAnnouncement[]>([]);
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState('');
  const [progressMap, setProgressMap] = useState<Record<string, { done: number; stars: number }>>({});
  const [showJoinModal, setShowJoinModal] = useState(false);
  const autoJoinTried = useRef(false);

  const hasSection = Boolean(user?.sectionId) || Boolean(user?.section && user.section !== 'NA');

  const tryJoin = async (code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    setJoining(true);
    setMessage('');
    try {
      await joinSectionAPI(normalized);
      await refreshUser();
      setMessage('Joined section successfully!');
      setShowJoinModal(false);
      setSearchParams({}, { replace: true });
    } catch {
      setMessage('Invalid or expired join code. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [campRes, progRes] = await Promise.all([
        getPublishedCampaignsAPI(),
        getMyProgressAPI().catch(() => ({ progress: [] as never[] })),
      ]);

      const all: Campaign[] = campRes.campaigns ?? [];
      const sectionName = user?.section;
      const filtered = all.filter((c) => campaignMatchesSection(c.targetSection, sectionName));
      setCampaigns(filtered);

      const map: Record<string, { done: number; stars: number }> = {};
      for (const p of progRes.progress || []) {
        const levels = p.levels || [];
        map[String(p.campaignId)] = {
          done: levels.filter((l) => l.completed).length,
          stars: levels.reduce((s, l) => s + (l.stars || 0), 0),
        };
      }
      setProgressMap(map);

      if (user?.sectionId) {
        try {
          const sec = await getSectionAPI(user.sectionId);
          setSectionInfo({
            id: sec.section.id,
            name: sec.section.name,
            teacherName: sec.section.teacherName,
            students: sec.students?.length ?? sec.section.students,
            color: sec.section.color,
          });
          const ann = await getSectionAnnouncementsAPI(user.sectionId).catch(() => ({ announcements: [] }));
          setAnnouncements(ann.announcements || []);
        } catch {
          setSectionInfo({ name: user.section || 'My Section' });
          setAnnouncements([]);
        }
      } else if (hasSection) {
        setSectionInfo({ name: user?.section || 'My Section' });
        setAnnouncements([]);
      } else {
        setSectionInfo(null);
        setAnnouncements([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.sectionId, user?.section]);

  useEffect(() => {
    const codeFromLink = searchParams.get('code')?.trim().toUpperCase();
    if (!codeFromLink) return;
    if (hasSection || autoJoinTried.current || joining) return;
    autoJoinTried.current = true;
    void tryJoin(codeFromLink);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, hasSection]);

  // Compute summary stats
  const totalStories = campaigns.length;
  const completedStories = campaigns.filter(c => {
    const total = c.levels?.length || c.numLevels || 0;
    const prog = progressMap[c._id];
    return prog && prog.done >= total && total > 0;
  }).length;
  
  const xp = user?.xp || 0;
  const level = Math.floor(xp / 100) + 1;
  const xpToNext = (level * 100) - xp;
  const streak = user?.streak || 0;

  // ─── No Section → Join Screen ─────────────────────────────────────
  if (!hasSection) {
    return (
      <DashboardLayout navItems={STUDENT_NAV} role="student" userName={user?.name || 'Student'} sectionLabel="Learning">
        <div style={{ maxWidth: 520, width: '100%', margin: '60px auto', textAlign: 'center', padding: '0 16px', boxSizing: 'border-box' }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20, margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 16px 40px rgba(99,102,241,0.3)',
          }}>
            <GraduationCap size={36} color="#fff" />
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--db-text)', margin: '0 0 8px' }}>Join Your Class</h2>
          <p style={{ color: 'var(--db-muted)', fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
            Scan your teacher&apos;s QR code or enter the join code.<br />
            You&apos;ll see announcements, stories, and your classmates.
          </p>
          <div style={{ textAlign: 'left' }}>
            <JoinSectionPanel
              onJoin={tryJoin}
              joining={joining}
              message={message}
              placeholder="e.g. ABC123"
            />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ─── Has Section → Main View ──────────────────────────────────────
  return (
    <DashboardLayout navItems={STUDENT_NAV} role="student" userName={user?.name || 'Student'} sectionLabel="Learning">
      {/* Header row */}
      <div className="db-section-header">
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--db-text)', margin: 0 }}>My Section</h2>
          <p style={{ color: 'var(--db-muted)', fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>
            {sectionInfo?.name || user?.section}
            {sectionInfo?.teacherName && <> · <GraduationCap size={13} style={{ verticalAlign: -2 }} /> {sectionInfo.teacherName}</>}
            {typeof sectionInfo?.students === 'number' && <> · <Users size={13} style={{ verticalAlign: -2 }} /> {sectionInfo.students} students</>}
          </p>
        </div>
        <div className="db-section-header-actions">
          <button
            type="button"
            className="db-btn ghost"
            onClick={() => setShowJoinModal(true)}
            style={{
              border: '2px solid var(--db-border)', borderRadius: 14,
              padding: '12px 24px', fontWeight: 800, fontSize: 14,
              color: 'var(--db-text)', background: 'var(--db-card)',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10,
              transition: 'all 0.2s',
            }}
          >
            <GraduationCap size={18} strokeWidth={2.5} /> Join Section
          </button>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="db-dashboard-stats-grid">
        
        {/* TOTAL XP */}
        <div className="db-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: '#F59E0B' }} />
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: 'rgba(245,158,11,0.15)', color: '#F59E0B',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Zap size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--db-muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Total XP</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--db-text)', lineHeight: 1.2 }}>{xp}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', marginTop: 2 }}>From reading & quizzes</div>
          </div>
        </div>

        {/* CURRENT LEVEL */}
        <div className="db-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: '#EC4899' }} />
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: 'rgba(236,72,153,0.15)', color: '#EC4899',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Star size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--db-muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Current Level</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--db-text)', lineHeight: 1.2 }}>Lv. {level}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#EC4899', marginTop: 2 }}>{xpToNext} XP to next</div>
          </div>
        </div>

        {/* STORIES */}
        <div className="db-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: '#10B981' }} />
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: 'rgba(16,185,129,0.15)', color: '#10B981',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Target size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--db-muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Stories</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--db-text)', lineHeight: 1.2 }}>{completedStories}/{totalStories}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#10B981', marginTop: 2 }}>Published available</div>
          </div>
        </div>

        {/* READING STREAK */}
        <div className="db-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: '#8B5CF6' }} />
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: 'rgba(139,92,246,0.15)', color: '#8B5CF6',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Flame size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--db-muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Reading Streak</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--db-text)', lineHeight: 1.2 }}>{streak} days</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8B5CF6', marginTop: 2 }}>Keep it going!</div>
          </div>
        </div>

      </div>

      {/* Two-column layout: Stories (left) + Announcements (right) */}
      <div className="db-dashboard-main-grid">
        {/* ─── Story Board List ─────────────────────────────────────── */}
        <div className="db-card db-section-panel">
          <div style={{
            padding: '18px 22px', borderBottom: '1px solid var(--db-border)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <BookOpen size={17} color="#6366F1" />
            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--db-text)' }}>Story Board</span>
            <span style={{
              marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: 'var(--db-muted)',
              background: 'var(--db-hover)', padding: '4px 10px', borderRadius: 20,
            }}>
              {campaigns.length} {campaigns.length === 1 ? 'story' : 'stories'}
            </span>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--db-muted)', gap: 10 }}>
              <Loader size={18} className="spin-anim" /> Loading stories…
            </div>
          ) : campaigns.length === 0 ? (
            <div style={{ padding: '60px 28px', textAlign: 'center', color: 'var(--db-muted)' }}>
              <Lock size={36} style={{ opacity: 0.25, marginBottom: 12 }} />
              <p style={{ fontWeight: 700, margin: 0 }}>No published stories yet</p>
              <p style={{ fontSize: 13, marginTop: 6 }}>Stories from your teacher will appear here.</p>
            </div>
          ) : (
            <div style={{ maxHeight: 600, overflowY: 'auto' }}>
              {campaigns.map((c, idx) => {
                const theme = getCampaignTheme(c.templateId);
                const total = c.levels?.length || c.numLevels || 0;
                const prog = progressMap[c._id] || { done: 0, stars: 0 };
                const pct = total ? Math.round((prog.done / total) * 100) : 0;
                const isComplete = prog.done >= total && total > 0;
                const status = prog.done === 0 ? 'Start' : isComplete ? 'Review' : 'Continue';

                return (
                  <div
                    key={c._id}
                    className="db-section-story-row"
                    style={{
                      borderBottom: idx < campaigns.length - 1 ? '1px solid var(--db-border)' : 'none',
                    }}
                    onClick={() => navigate(`/student/stories?campaign=${c._id}`)}
                  >
                    {/* Theme emoji badge */}
                    <div style={{
                      width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                      background: theme.preview,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}>
                      {theme.emoji}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className="db-section-story-title" style={{ fontWeight: 800, fontSize: 14, color: 'var(--db-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.title}
                        </span>
                        {isComplete && (
                          <span style={{
                            fontSize: 10, fontWeight: 800, color: '#10B981',
                            background: 'rgba(16,185,129,0.1)', padding: '2px 8px',
                            borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 3,
                            flexShrink: 0,
                          }}>
                            <CheckCircle2 size={10} /> Done
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--db-muted)', marginBottom: 8 }}>
                        {theme.name} · {total} levels
                      </div>
                      {/* Progress bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 5, background: 'rgba(148,163,184,0.15)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 99,
                            width: `${pct}%`,
                            background: isComplete
                              ? 'linear-gradient(90deg, #10B981, #34D399)'
                              : 'linear-gradient(90deg, #6366F1, #8B5CF6)',
                            transition: 'width 0.4s ease',
                          }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--db-muted)', fontWeight: 700, flexShrink: 0, minWidth: 32 }}>{pct}%</span>
                      </div>
                    </div>

                    {/* Stars + Action */}
                    <div className="db-section-story-actions">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 800, color: '#EAB308', fontSize: 13 }}>
                        <Star size={14} fill="#FDE047" color="#EAB308" /> {prog.stars}
                      </span>
                      <button
                        type="button"
                        className="db-btn primary"
                        style={{
                          padding: '7px 16px', fontSize: 12,
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: isComplete ? 'linear-gradient(135deg, #10B981, #059669)' : undefined,
                        }}
                        onClick={(e) => { e.stopPropagation(); navigate(`/student/stories?campaign=${c._id}`); }}
                      >
                        <Play size={12} /> {status}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Announcements ───────────────────────────────────────── */}
        <div className="db-card db-section-panel">
          <div style={{
            padding: '18px 22px', borderBottom: '1px solid var(--db-border)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Megaphone size={17} color="#F59E0B" />
            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--db-text)' }}>Announcements</span>
            {announcements.length > 0 && (
              <span style={{
                marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#F59E0B',
                background: 'rgba(245,158,11,0.1)', padding: '4px 10px', borderRadius: 20,
              }}>
                {announcements.length}
              </span>
            )}
          </div>

          {announcements.length === 0 ? (
            <div style={{ padding: '60px 28px', textAlign: 'center', color: 'var(--db-muted)' }}>
              <Megaphone size={32} style={{ opacity: 0.2, marginBottom: 10 }} />
              <p style={{ fontWeight: 700, margin: 0, fontSize: 14 }}>No announcements yet</p>
              <p style={{ fontSize: 12, marginTop: 6 }}>Your teacher's posts will appear here.</p>
            </div>
          ) : (
            <div style={{ maxHeight: 600, overflowY: 'auto' }}>
              {announcements.map((a, idx) => (
                <div
                  key={a.id}
                  style={{
                    padding: '16px 22px',
                    borderBottom: idx < announcements.length - 1 ? '1px solid var(--db-border)' : 'none',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--db-text)', marginBottom: 4 }}>
                    {a.title}
                  </div>
                  <div style={{
                    fontSize: 11, color: 'var(--db-muted)', marginBottom: 10,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span>{a.authorName}</span>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <Clock size={11} />
                    <span>{formatDate(a.createdAt)}</span>
                  </div>
                  <div style={{
                    fontSize: 13, color: 'var(--db-text)', lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {a.body}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Join Section Modal ────────────────────────────────────── */}
      {showJoinModal && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000, backdropFilter: 'blur(4px)' }}
            onClick={() => setShowJoinModal(false)}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 2001, width: 400, maxWidth: '90vw',
            background: 'var(--db-card)', borderRadius: 20,
            border: '1px solid var(--db-border)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
            padding: '28px 28px 24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--db-text)' }}>Join / Switch Section</h3>
              <button
                type="button" className="db-icon-btn"
                onClick={() => setShowJoinModal(false)}
                style={{ width: 30, height: 30 }}
              >
                <X size={15} />
              </button>
            </div>
            <p style={{ color: 'var(--db-muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
              Scan QR or enter the join code from your teacher. Current section: <strong style={{ color: 'var(--db-text)' }}>{sectionInfo?.name || user?.section || 'NA'}</strong>
            </p>
            <JoinSectionPanel
              onJoin={tryJoin}
              joining={joining}
              message={message}
              placeholder="e.g. ABC123"
            />
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-anim { animation: spin 1s linear infinite; }
      `}</style>
    </DashboardLayout>
  );
}
