import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { ADMIN_NAV } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { getSectionAPI, removeSectionStudentAPI, type Section, type AppUser, initials, formatDate } from '../../services/usersApi';
import { useDialog } from '../../components/DialogProvider';
import api from '../../services/api';
import {
  ArrowLeft, Users, Folder, Mail, Award, Search, ChevronRight, X, QrCode, Trash2,
  RefreshCw, Trophy, Clock, BookOpen, CheckCircle, Star, Calendar,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface StudentRow {
  id: string; name: string; email: string; xp: number; streak: number; status: string;
}

interface CampaignActivity {
  _id: string; title: string; targetSection: string; numLevels: number; templateId: string;
  published: boolean; createdAt: string;
}

export default function AdminSectionDetail() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { alert, confirm } = useDialog();

  const [section, setSection] = useState<Section | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [showQR, setShowQR] = useState(false);

  const load = async () => {
    if (!sectionId) return;
    setLoading(true);
    try {
      const data = await getSectionAPI(sectionId);
      setSection(data.section);
      setStudents(data.students || []);
      const campRes = await api.get('/campaigns');
      const allCampaigns = campRes.data?.campaigns || campRes.data || [];
      setCampaigns(allCampaigns.filter((c: CampaignActivity) =>
        c.published && (c.targetSection === data.section.name || c.targetSection === 'All')
      ));
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [sectionId]);

  const removeStudent = async (studentId: string) => {
    if (!sectionId) return;
    const ok = await confirm({
      title: 'Remove student?',
      message: 'Remove this student from the section?',
      variant: 'warning',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    try {
      await removeSectionStudentAPI(sectionId, studentId);
      setStudents(prev => prev.filter(s => s.id !== studentId));
      if (selectedStudent?.id === studentId) setSelectedStudent(null);
    } catch {
      await alert({ title: 'Remove failed', message: 'Could not remove student.', variant: 'danger' });
    }
  };

  const filtered = students.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
  );

  const isExpired = section?.codeExpiresAt ? new Date() > new Date(section.codeExpiresAt) : false;

  if (loading) {
    return (
      <DashboardLayout navItems={ADMIN_NAV} role="admin" userName={user?.name || 'Admin'} sectionLabel="Administration">
        <div className="db-card" style={{ padding: 40, textAlign: 'center', color: 'var(--db-muted)' }}>Loading section…</div>
      </DashboardLayout>
    );
  }

  if (!section) {
    return (
      <DashboardLayout navItems={ADMIN_NAV} role="admin" userName={user?.name || 'Admin'} sectionLabel="Administration">
        <div className="db-card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--db-muted)', fontWeight: 600 }}>Section not found.</p>
          <button type="button" className="db-btn primary" style={{ marginTop: 12 }} onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={ADMIN_NAV} role="admin" userName={user?.name || 'Admin'} sectionLabel="Administration">
      {/* Back button */}
      <div style={{ marginBottom: 18 }}>
        <button type="button" onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--db-muted)', background: 'none', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      {/* Hero banner */}
      <div style={{
        borderRadius: 24, padding: '28px 32px', marginBottom: 24,
        background: `linear-gradient(135deg, ${section.color}dd 0%, ${section.color}88 50%, ${section.color}44 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        boxShadow: `0 20px 50px ${section.color}44`,
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
            Section · {section.academicYear}
          </div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: 30, fontWeight: 900, letterSpacing: '-0.5px' }}>{section.name}</h2>
          <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
            {section.teacherName || 'No teacher assigned'} · {students.length} student{students.length !== 1 ? 's' : ''} · Code: <strong>{section.code}</strong>
          </p>
        </div>
        <button type="button" onClick={() => setShowQR(true)} className="db-btn" style={{ background: '#fff', color: section.color, border: 'none', fontWeight: 800, borderRadius: 14, padding: '12px 18px' }}>
          <QrCode size={16} /> Show QR Code
        </button>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Students', value: students.length, icon: <Users size={20} />, color: '#6366F1' },
          { label: 'Avg XP', value: students.length ? Math.round(students.reduce((s, st) => s + st.xp, 0) / students.length) : 0, icon: <Trophy size={20} />, color: '#F59E0B' },
          { label: 'Campaigns', value: campaigns.length, icon: <BookOpen size={20} />, color: '#10B981' },
          { label: 'Active', value: students.filter(s => s.status === 'active').length, icon: <CheckCircle size={20} />, color: '#06B6D4' },
        ].map(stat => (
          <div key={stat.label} className="db-card" style={{ padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `${stat.color}18`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--db-text)' }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: 'var(--db-muted)', fontWeight: 600 }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content: student list + detail */}
      <div className="db-dashboard-detail-grid" style={{ gridTemplateColumns: selectedStudent ? undefined : '1fr' }}>
        {/* Student list */}
        <div className="db-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--db-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="db-card-title" style={{ margin: 0, flex: 1 }}>Students</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--db-hover)', borderRadius: 10, padding: '6px 12px', border: '1px solid var(--db-border)', flex: '0 1 220px' }}>
              <Search size={13} color="var(--db-muted)" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--db-text)', fontSize: 12, fontFamily: 'inherit' }} />
              {search && <button type="button" className="db-icon-btn" onClick={() => setSearch('')} style={{ width: 20, height: 20 }}><X size={10} /></button>}
            </div>
          </div>
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--db-muted)', fontWeight: 600 }}>
                {search ? 'No matching students.' : 'No students in this section yet.'}
              </div>
            ) : filtered.map(s => {
              const active = selectedStudent?.id === s.id;
              return (
                <div key={s.id} onClick={() => setSelectedStudent(s)} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', cursor: 'pointer',
                  background: active ? `${section.color}12` : 'transparent',
                  borderLeft: active ? `3px solid ${section.color}` : '3px solid transparent',
                  borderBottom: '1px solid var(--db-border)', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--db-hover)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, background: `${section.color}22`, color: section.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, flexShrink: 0,
                  }}>{initials(s.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: 'var(--db-text)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--db-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.email}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#F59E0B' }}>{s.xp} XP</div>
                    <div style={{ fontSize: 10, color: 'var(--db-muted)' }}>Streak: {s.streak}</div>
                  </div>
                  <ChevronRight size={14} color="var(--db-muted)" style={{ flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Student detail panel */}
        {selectedStudent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Profile card */}
            <div className="db-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ height: 80, background: `linear-gradient(135deg, ${section.color}88, ${section.color}44)`, position: 'relative' }}>
                <button type="button" className="db-icon-btn" onClick={() => setSelectedStudent(null)} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.3)', color: '#fff' }}><X size={13} /></button>
                <div style={{
                  position: 'absolute', bottom: -24, left: 20,
                  width: 52, height: 52, borderRadius: 14, background: section.color,
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: 18, border: '3px solid var(--db-card)',
                }}>{initials(selectedStudent.name)}</div>
              </div>
              <div style={{ padding: '32px 20px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 900, color: 'var(--db-text)' }}>{selectedStudent.name}</h3>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--db-muted)' }}>{selectedStudent.email}</p>
                  </div>
                  <span style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: selectedStudent.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    color: selectedStudent.status === 'active' ? '#10B981' : '#EF4444',
                  }}>{selectedStudent.status}</span>
                </div>

                <div className="db-dashboard-triple-col" style={{ marginTop: 18 }}>
                  {[
                    { label: 'XP', value: selectedStudent.xp, icon: <Trophy size={16} />, color: '#F59E0B' },
                    { label: 'Streak', value: `${selectedStudent.streak}d`, icon: <Clock size={16} />, color: '#6366F1' },
                    { label: 'Section', value: section.name, icon: <Folder size={16} />, color: section.color },
                  ].map(item => (
                    <div key={item.label} style={{
                      padding: '14px 12px', borderRadius: 14, background: 'var(--db-hover)', border: '1px solid var(--db-border)', textAlign: 'center',
                    }}>
                      <div style={{ color: item.color, marginBottom: 6, display: 'flex', justifyContent: 'center' }}>{item.icon}</div>
                      <div style={{ fontWeight: 900, fontSize: 18, color: 'var(--db-text)' }}>{item.value}</div>
                      <div style={{ fontSize: 10, color: 'var(--db-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                  <Link to={`/admin/users/${selectedStudent.id}`} className="db-btn primary" style={{ flex: 1, textDecoration: 'none', textAlign: 'center', fontSize: 13 }}>
                    View Full Profile
                  </Link>
                  <button type="button" className="db-btn" onClick={() => removeStudent(selectedStudent.id)} style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', fontSize: 13 }}>
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              </div>
            </div>

            {/* Activity History */}
            <div className="db-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--db-border)' }}>
                <span className="db-card-title" style={{ margin: 0 }}>Activity History</span>
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {campaigns.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--db-muted)', fontSize: 13, fontWeight: 600 }}>
                    No campaigns published for this section yet.
                  </div>
                ) : campaigns.map(c => (
                  <div key={c._id} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                    borderBottom: '1px solid var(--db-border)',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.12)', color: '#6366F1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <BookOpen size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--db-text)' }}>{c.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--db-muted)', marginTop: 2 }}>
                        {c.numLevels} level{c.numLevels !== 1 ? 's' : ''} · {formatDate(c.createdAt)}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20,
                      background: 'rgba(16,185,129,0.1)', color: '#10B981', fontSize: 11, fontWeight: 700,
                    }}>
                      <Star size={11} /> Available
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowQR(false)}>
          <div onClick={e => e.stopPropagation()} className="db-card" style={{ width: '100%', maxWidth: 420, padding: 32, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--db-text)' }}>QR Code</h3>
              <button type="button" className="db-icon-btn" onClick={() => setShowQR(false)}><X size={16} /></button>
            </div>
            <p style={{ margin: '0 0 20px', color: 'var(--db-muted)', fontSize: 13 }}>
              Students can scan this to join <strong style={{ color: 'var(--db-text)' }}>{section.name}</strong>
            </p>
            <div style={{ display: 'inline-block', padding: 20, background: '#fff', borderRadius: 18 }}>
              <QRCodeSVG value={section.code} size={200} level="H" />
            </div>
            <div style={{ marginTop: 16 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 28, letterSpacing: 4, color: section.color }}>{section.code}</span>
            </div>

            {/* Date info */}
            <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ padding: '10px 16px', borderRadius: 12, background: 'var(--db-hover)', border: '1px solid var(--db-border)', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--db-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                  <Calendar size={10} style={{ display: 'inline', marginRight: 4 }} />Generated
                </div>
                <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--db-text)' }}>
                  {section.codeCreatedAt ? new Date(section.codeCreatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </div>
              </div>
              <div style={{
                padding: '10px 16px', borderRadius: 12, textAlign: 'center',
                background: isExpired ? 'rgba(239,68,68,0.08)' : 'var(--db-hover)',
                border: `1px solid ${isExpired ? 'rgba(239,68,68,0.25)' : 'var(--db-border)'}`,
              }}>
                <div style={{ fontSize: 10, color: isExpired ? '#EF4444' : 'var(--db-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                  <Clock size={10} style={{ display: 'inline', marginRight: 4 }} />{isExpired ? 'Expired' : 'Expires'}
                </div>
                <div style={{ fontWeight: 800, fontSize: 13, color: isExpired ? '#EF4444' : 'var(--db-text)' }}>
                  {section.codeExpiresAt ? new Date(section.codeExpiresAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                </div>
              </div>
            </div>
            {isExpired && (
              <p style={{ marginTop: 12, fontSize: 12, color: '#EF4444', fontWeight: 700 }}>
                This code has expired. Regenerate it from the section menu.
              </p>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
