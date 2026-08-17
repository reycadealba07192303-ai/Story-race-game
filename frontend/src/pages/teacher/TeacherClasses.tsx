import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { getSectionsAPI, type Section } from '../../services/usersApi';
import {
  LayoutDashboard, Users, MessageSquare, UserCircle, ChevronRight, Bell,
  BookOpen, Copy, Check, School, QrCode,
} from 'lucide-react';

export const TEACHER_NAV = [
  { path: '/teacher', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { path: '/teacher/classes', label: 'Handled Classes', icon: <Users size={18} /> },
  { path: '/teacher/stories', label: 'Story Maker', icon: <BookOpen size={18} /> },
  { path: '/teacher/chat', label: 'Chat', icon: <MessageSquare size={18} /> },
  { path: '/teacher/notifications', label: 'Notifications', icon: <Bell size={18} /> },
  { path: '/teacher/profile', label: 'My Profile', icon: <UserCircle size={18} /> },
];

export default function TeacherClasses() {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getSectionsAPI();
        if (!cancelled) setSections(data.sections);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const copyCode = async (section: Section, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(section.code);
      setCopiedId(section.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout navItems={TEACHER_NAV} role="teacher" userName={user?.name || 'Teacher'} sectionLabel="Classroom">
      <div className="db-card" style={{
        position: 'relative',
        padding: '32px 30px',
        marginBottom: 28,
        overflow: 'hidden',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        gap: 16, 
        flexWrap: 'wrap'
      }}>
        <div style={{
          position: 'absolute', right: -40, top: -50, width: 220, height: 220, borderRadius: '50%',
          background: 'var(--db-accent)', opacity: 0.05, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', right: 80, bottom: -70, width: 160, height: 160, borderRadius: '50%',
          background: 'var(--db-blue)', opacity: 0.05, pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 12, fontWeight: 800, color: 'var(--db-accent)',
            letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10,
          }}>
            <School size={14} /> Your classroom
          </div>
          <h2 style={{ margin: 0, color: 'var(--db-text)', fontSize: 30, fontWeight: 900, letterSpacing: '-0.6px' }}>
            Handled Classes
          </h2>
          <p style={{ margin: '10px 0 0', color: 'var(--db-muted)', fontSize: 15, maxWidth: 420, lineHeight: 1.5 }}>
            Open a section to manage students, post announcements, and share join codes.
          </p>
        </div>
        <div style={{
          position: 'relative',
          padding: '12px 18px', borderRadius: 16,
          background: 'var(--db-hover)',
          border: '1px solid var(--db-border)',
          color: 'var(--db-text)', fontWeight: 800, fontSize: 14,
        }}>
          {loading ? '…' : `${sections.length} section${sections.length === 1 ? '' : 's'}`}
        </div>
      </div>

      {loading && (
        <div className="db-card" style={{ padding: 48, textAlign: 'center', color: 'var(--db-muted)', fontWeight: 600 }}>
          Loading classes…
        </div>
      )}

      {!loading && sections.length === 0 && (
        <div className="db-card" style={{ padding: 52, textAlign: 'center', borderRadius: 22 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 18px',
            background: 'linear-gradient(135deg, rgba(15,118,110,0.14), rgba(56,189,248,0.16))',
            color: '#0F766E',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <School size={30} />
          </div>
          <h3 style={{ margin: 0, color: 'var(--db-text)', fontSize: 20, fontWeight: 900 }}>No sections yet</h3>
          <p style={{ color: 'var(--db-muted)', marginTop: 10, fontSize: 14, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
            Ask an admin to create a section and assign you as the teacher.
          </p>
        </div>
      )}

      {!loading && sections.length > 0 && (
        <div className="db-card" style={{ borderRadius: 24, overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--db-border)', background: 'var(--db-hover)' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--db-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Your Sections</span>
          </div>
          <div>
            {sections.map((section, index) => {
              const color = section.color || '#0F766E';
              const isLast = index === sections.length - 1;
              return (
                <div
                  key={section.id}
                  className="db-list-row"
                  onClick={() => window.location.href = `/teacher/classes/${section.id}`}
                  style={{
                    padding: '18px 24px',
                    borderBottom: isLast ? 'none' : '1px solid var(--db-border)',
                    transition: 'background 0.2s', cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--db-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                    background: `linear-gradient(135deg, ${color}22, ${color}10)`, color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: 16, letterSpacing: '-0.3px',
                    border: `1px solid ${color}22`
                  }}>
                    {section.name.slice(0, 2).toUpperCase()}
                  </div>
                  
                  <div style={{ flex: '1 1 200px' }}>
                    <div style={{ fontWeight: 800, color: 'var(--db-text)', fontSize: 16 }}>{section.name}</div>
                    <div style={{ color: 'var(--db-muted)', fontWeight: 600, fontSize: 12, marginTop: 4 }}>
                      Academic Year: {section.academicYear}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--db-hover)', padding: '6px 12px', borderRadius: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--db-muted)', textTransform: 'uppercase' }}>Students</span>
                      <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--db-text)', marginTop: 2 }}>{section.students ?? 0}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--db-hover)', padding: '6px 12px', borderRadius: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--db-muted)', textTransform: 'uppercase' }}>Stories</span>
                      <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--db-text)', marginTop: 2 }}>{section.assignments ?? 0}</span>
                    </div>
                  </div>

                  <div style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', borderRadius: 12,
                      background: `${color}10`, border: `1px solid ${color}28`,
                    }}>
                      <code style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 800, fontSize: 13, letterSpacing: 1.5, color }}>
                        {section.code}
                      </code>
                      <button
                        type="button"
                        title="Copy join code"
                        onClick={(e) => copyCode(section, e)}
                        style={{
                          width: 26, height: 26, borderRadius: 8, cursor: 'pointer', flexShrink: 0,
                          background: 'transparent', border: 'none', color: copiedId === section.id ? '#10B981' : color,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                        }}
                      >
                        {copiedId === section.id ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ flexShrink: 0, marginLeft: 8 }}>
                    <div className="db-btn primary" style={{ padding: '10px 16px', fontSize: 13, borderRadius: 10, background: color, border: 'none', color: '#fff', boxShadow: `0 4px 14px ${color}40` }}>
                      Manage
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
