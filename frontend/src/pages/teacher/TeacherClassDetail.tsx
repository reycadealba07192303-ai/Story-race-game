import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { TEACHER_NAV } from './TeacherClasses';
import { useAuth } from '../../context/AuthContext';
import {
  getSectionAPI,
  removeSectionStudentAPI,
  updateSectionAPI,
  getSectionAnnouncementsAPI,
  createSectionAnnouncementAPI,
  deleteSectionAnnouncementAPI,
  formatDate,
  type Section,
  type SectionAnnouncement,
} from '../../services/usersApi';
import {
  Megaphone, QrCode, ArrowLeft, Copy, Check, Users, Trash2, Send, Link2, RefreshCw,
} from 'lucide-react';
import { useDialog } from '../../components/DialogProvider';

type CopiedField = 'code' | 'link' | null;

export default function TeacherClassDetail() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const { user } = useAuth();
  const { alert, confirm } = useDialog();
  const [activeTab, setActiveTab] = useState('students');
  const [copied, setCopied] = useState<CopiedField>(null);
  const [section, setSection] = useState<Section | null>(null);
  const [students, setStudents] = useState<{ id: string; name: string; email: string; xp: number; streak: number; status: string }[]>([]);
  const [announcements, setAnnouncements] = useState<SectionAnnouncement[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

  const joinLink = useMemo(() => {
    if (!section?.code) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/student/section?code=${encodeURIComponent(section.code)}`;
  }, [section?.code]);

  const accent = section?.color || '#0F766E';
  const isExpired = section?.codeExpiresAt ? new Date() > new Date(section.codeExpiresAt) : false;

  const load = async () => {
    if (!sectionId) return;
    setLoading(true);
    try {
      const data = await getSectionAPI(sectionId);
      setSection(data.section);
      setStudents(data.students);
      const ann = await getSectionAnnouncementsAPI(sectionId).catch(() => ({ announcements: [] }));
      setAnnouncements(ann.announcements || []);
    } catch (err) {
      console.error(err);
      setSection(null);
      setStudents([]);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [sectionId]);

  const markCopied = (field: CopiedField) => {
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const copyCode = async () => {
    if (!section?.code) return;
    await navigator.clipboard.writeText(section.code);
    markCopied('code');
  };

  const copyLink = async () => {
    if (!joinLink) return;
    await navigator.clipboard.writeText(joinLink);
    markCopied('link');
  };

  const removeStudent = async (id: string) => {
    if (!sectionId) return;
    const ok = await confirm({
      title: 'Remove student?',
      message: 'Remove this student from the section?',
      variant: 'warning',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    try {
      await removeSectionStudentAPI(sectionId, id);
      await load();
    } catch (err) {
      console.error(err);
      await alert({ title: 'Remove failed', message: 'Could not remove student.', variant: 'danger' });
    }
  };

  const regenerateCode = async () => {
    if (!sectionId) return;
    const ok = await confirm({
      title: 'Generate new join code?',
      message: 'The old code and link will stop working.',
      variant: 'warning',
      confirmLabel: 'Generate',
    });
    if (!ok) return;
    try {
      const data = await updateSectionAPI(sectionId, { regenerateCode: true });
      setSection(data.section);
    } catch (err) {
      console.error(err);
      await alert({ title: 'Update failed', message: 'Could not regenerate code.', variant: 'danger' });
    }
  };

  const postAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionId || !title.trim() || !body.trim()) return;
    setPosting(true);
    try {
      const data = await createSectionAnnouncementAPI(sectionId, { title: title.trim(), body: body.trim() });
      setAnnouncements((prev) => [data.announcement, ...prev]);
      setTitle('');
      setBody('');
    } catch (err) {
      console.error(err);
      await alert({ title: 'Post failed', message: 'Could not post announcement.', variant: 'danger' });
    } finally {
      setPosting(false);
    }
  };

  const removeAnnouncement = async (id: string) => {
    if (!sectionId) return;
    const ok = await confirm({
      title: 'Delete announcement?',
      message: 'Delete this announcement?',
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteSectionAnnouncementAPI(sectionId, id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
      await alert({ title: 'Delete failed', message: 'Could not delete announcement.', variant: 'danger' });
    }
  };

  const tabs = [
    { id: 'students', label: 'Students', icon: <Users size={16} /> },
    { id: 'announcement', label: 'Announcements', icon: <Megaphone size={16} /> },
    { id: 'code', label: 'Join Code', icon: <QrCode size={16} /> },
  ];

  return (
    <DashboardLayout navItems={TEACHER_NAV} role="teacher" userName={user?.name || 'Teacher'} sectionLabel="Classroom">
      <div style={{ marginBottom: 18 }}>
        <Link
          to="/teacher/classes"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            color: 'var(--db-muted)', textDecoration: 'none', fontSize: 14, fontWeight: 700,
          }}
        >
          <ArrowLeft size={16} /> Back to Classes
        </Link>
      </div>

      <div style={{
        position: 'relative',
        borderRadius: 24,
        padding: '30px 28px',
        marginBottom: 12,
        overflow: 'hidden',
        background: `linear-gradient(125deg, ${accent} 0%, ${accent}cc 55%, #0F172A 140%)`,
        boxShadow: `0 18px 44px ${accent}40`,
      }}>
        <div style={{
          position: 'absolute', right: -30, top: -40, width: 180, height: 180, borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)', pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <div style={{
            fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.75)',
            letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8,
          }}>
            Handled class
          </div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: 30, fontWeight: 900, letterSpacing: '-0.5px' }}>
            {loading ? 'Loading…' : section?.name || 'Section not found'}
          </h2>
          <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,0.9)', fontSize: 14, maxWidth: 480 }}>
            Manage students, announcements, and share a join code, QR, or link.
          </p>
          {section && (
            <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
              <span style={{
                padding: '7px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.16)',
                border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontSize: 12, fontWeight: 800,
              }}>
                {students.length} student{students.length === 1 ? '' : 's'}
              </span>
              <span style={{
                padding: '7px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.16)',
                border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontSize: 12, fontWeight: 800,
              }}>
                A.Y. {section.academicYear}
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={{
        display: 'inline-flex', gap: 6, marginBottom: 12, padding: 6,
        background: 'var(--db-hover)', border: '1px solid var(--db-border)', borderRadius: 16,
        flexWrap: 'wrap',
      }}>
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', borderRadius: 12, cursor: 'pointer',
                border: active ? '1px solid transparent' : '1px solid transparent',
                background: active ? accent : 'transparent',
                color: active ? '#fff' : 'var(--db-muted)',
                fontWeight: 800, fontSize: 13,
                boxShadow: active ? `0 8px 20px ${accent}40` : 'none',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'students' && (
        <div className="db-card" style={{ borderRadius: 20, overflow: 'hidden' }}>
          <div className="db-card-head" style={{ padding: '16px 22px' }}>
            <span className="db-card-title">Enrolled Students ({students.length})</span>
          </div>
          {students.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center', color: 'var(--db-muted)', fontWeight: 600 }}>
              No students yet. Share the join code, QR, or link so they can enroll.
            </div>
          ) : (
            <table className="db-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>XP</th>
                  <th>Streak</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700 }}>{s.name}</td>
                    <td style={{ color: 'var(--db-muted)' }}>{s.email}</td>
                    <td>{s.xp}</td>
                    <td>{s.streak} days</td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="db-icon-btn" onClick={() => removeStudent(s.id)} style={{ color: '#EF4444' }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'announcement' && (
        <div style={{ display: 'grid', gap: 20 }}>
          <form className="db-card" style={{ padding: 24, borderRadius: 20 }} onSubmit={postAnnouncement}>
            <div className="db-card-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Megaphone size={18} /> Post Announcement
            </div>
            <div className="db-form-group" style={{ marginBottom: 12 }}>
              <label className="db-form-label">Title</label>
              <input
                className="db-form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Reminder for tomorrow's activity"
                required
              />
            </div>
            <div className="db-form-group" style={{ marginBottom: 16 }}>
              <label className="db-form-label">Message</label>
              <textarea
                className="db-form-input"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your announcement for the class…"
                rows={4}
                required
                style={{ resize: 'vertical', minHeight: 100 }}
              />
            </div>
            <button type="submit" className="db-btn primary" disabled={posting}>
              <Send size={14} /> {posting ? 'Posting…' : 'Post to Class'}
            </button>
          </form>

          <div className="db-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 20 }}>
            <div className="db-card-head" style={{ padding: '16px 20px' }}>
              <span className="db-card-title">Posted ({announcements.length})</span>
            </div>
            {announcements.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--db-muted)', fontWeight: 600 }}>
                No announcements yet. Post one above for your students.
              </div>
            ) : (
              announcements.map((a) => (
                <div key={a.id} style={{ padding: '18px 20px', borderTop: '1px solid var(--db-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--db-text)' }}>{a.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--db-muted)', marginTop: 4 }}>
                        {a.authorName} · {formatDate(a.createdAt)}
                      </div>
                      <div style={{ marginTop: 10, fontSize: 14, color: 'var(--db-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{a.body}</div>
                    </div>
                    <button type="button" className="db-icon-btn" onClick={() => removeAnnouncement(a.id)} style={{ color: '#EF4444' }} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'code' && section && (
        <div className="db-card" style={{ padding: 24, borderRadius: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <div className="db-card-title" style={{ margin: 0 }}>Share Join Access</div>
              <p style={{ margin: '4px 0 0', color: 'var(--db-muted)', fontSize: 13 }}>
                Students can use the code, scan the QR, or open the link.
              </p>
            </div>
            <button type="button" className="db-btn primary" onClick={regenerateCode} style={{ background: accent, boxShadow: `0 8px 20px ${accent}40` }}>
              <RefreshCw size={15} /> Generate New Code
            </button>
          </div>

          <div className="db-dashboard-sidebar-grid--fixed">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                padding: 24, borderRadius: 24,
                background: '#fff', border: '1px solid var(--db-border)',
                boxShadow: '0 10px 28px rgba(15,23,42,0.06)',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                width: '100%'
              }}>
                <QRCodeSVG value={joinLink || section.code} size={260} level="H" includeMargin={false} style={{ width: '100%', height: 'auto', maxWidth: 260 }} />
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--db-muted)', fontWeight: 700 }}>
                Scan to open join link
              </div>
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{
                padding: 18, borderRadius: 16,
                background: `${accent}10`, border: `1px solid ${accent}28`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--db-muted)', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 }}>
                  Join code
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: 34, fontWeight: 900, letterSpacing: 4, color: accent,
                  }}>
                    {section.code}
                  </div>
                  <button type="button" className="db-btn ghost" onClick={copyCode}>
                    {copied === 'code' ? <Check size={16} /> : <Copy size={16} />}
                    {copied === 'code' ? 'Copied' : 'Copy code'}
                  </button>
                </div>
              </div>

              <div style={{
                padding: 18, borderRadius: 16,
                background: 'var(--db-hover)', border: '1px solid var(--db-border)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--db-muted)', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Link2 size={12} /> Join link
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--db-text)',
                  wordBreak: 'break-all', lineHeight: 1.5, marginBottom: 12,
                }}>
                  {joinLink}
                </div>
                <button type="button" className="db-btn ghost" onClick={copyLink}>
                  {copied === 'link' ? <Check size={16} /> : <Copy size={16} />}
                  {copied === 'link' ? 'Link copied' : 'Copy link'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: 12,
                  background: 'var(--db-hover)', border: '1px solid var(--db-border)',
                  fontSize: 12, color: 'var(--db-muted)', fontWeight: 700,
                }}>
                  Generated:{' '}
                  <span style={{ color: 'var(--db-text)' }}>
                    {section.codeCreatedAt
                      ? new Date(section.codeCreatedAt).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })
                      : '—'}
                  </span>
                </div>
                <div style={{
                  padding: '10px 14px', borderRadius: 12,
                  background: isExpired ? 'rgba(239,68,68,0.08)' : 'var(--db-hover)',
                  border: `1px solid ${isExpired ? 'rgba(239,68,68,0.25)' : 'var(--db-border)'}`,
                  fontSize: 12, color: isExpired ? '#EF4444' : 'var(--db-muted)', fontWeight: 700,
                }}>
                  {isExpired ? 'Expired' : 'Expires'}:{' '}
                  <span style={{ color: isExpired ? '#EF4444' : 'var(--db-text)' }}>
                    {section.codeExpiresAt
                      ? new Date(section.codeExpiresAt).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })
                      : 'Never'}
                  </span>
                </div>
              </div>

              <p style={{ margin: 0, color: 'var(--db-muted)', fontSize: 13, lineHeight: 1.55 }}>
                Students open <strong style={{ color: 'var(--db-text)' }}>My Section</strong> after signing up,
                or use this link/QR to join <strong style={{ color: 'var(--db-text)' }}>{section.name}</strong>.
              </p>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
