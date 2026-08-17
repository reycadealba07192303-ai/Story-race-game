import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { ADMIN_NAV } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import {
  addSectionStudentsAPI,
  createSectionAPI,
  deleteSectionAPI,
  getAcademicYearAPI,
  getSectionsAPI,
  getUsersAPI,
  updateSectionAPI,
  type AcademicYear,
  type AppUser,
  type Section,
} from '../../services/usersApi';
import { useDialog } from '../../components/DialogProvider';
import {
  ArrowLeft, Plus, Pencil, Trash2, Folder, Users, RefreshCw, X, Copy, Check,
  MoreVertical, UserPlus, UserCog, QrCode, ChevronRight, Clock, Calendar,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const COLORS = ['#6366F1', '#10B981', '#EC4899', '#F59E0B', '#8B5CF6', '#06B6D4'];

const emptySectionForm = {
  name: '',
  teacherId: '' as string,
  color: COLORS[0],
};

type MenuPos = { top: number; right: number };

export default function AdminAcademicYearDetail() {
  const { yearId } = useParams<{ yearId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { alert, confirm } = useDialog();
  const menuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [year, setYear] = useState<AcademicYear | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [teachers, setTeachers] = useState<AppUser[]>([]);
  const [students, setStudents] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Section | null>(null);
  const [form, setForm] = useState(emptySectionForm);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const [assignSection, setAssignSection] = useState<Section | null>(null);
  const [assignTeacherId, setAssignTeacherId] = useState('');
  const [addStudentsSection, setAddStudentsSection] = useState<Section | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const [qrSection, setQrSection] = useState<Section | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = async () => {
    if (!yearId) return;
    setLoading(true);
    try {
      const [yearData, sectionData, teacherData, studentData] = await Promise.all([
        getAcademicYearAPI(yearId),
        getSectionsAPI({ academicYearId: yearId }),
        getUsersAPI({ role: 'teacher' }),
        getUsersAPI({ role: 'student' }),
      ]);
      setYear(yearData.academicYear);
      setSections(sectionData.sections || []);
      setTeachers(teacherData.users || []);
      setStudents(studentData.users || []);
    } catch (err) {
      console.error(err);
      setYear(null);
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [yearId]);

  const closeMenu = () => {
    setMenuOpenId(null);
    setMenuPos(null);
  };

  const openMenu = (sectionId: string) => {
    if (menuOpenId === sectionId) {
      closeMenu();
      return;
    }
    const btn = menuButtonRefs.current[sectionId];
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    });
    setMenuOpenId(sectionId);
  };

  useEffect(() => {
    if (!menuOpenId) return;
    const onClick = () => closeMenu();
    const onScroll = () => closeMenu();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('mousedown', onClick);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpenId]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptySectionForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (section: Section) => {
    closeMenu();
    setEditing(section);
    setForm({
      name: section.name,
      teacherId: section.teacherId || '',
      color: section.color || COLORS[0],
    });
    setError('');
    setModalOpen(true);
  };

  const openQr = (section: Section) => {
    closeMenu();
    setQrSection(section);
  };

  const openAssignTeacher = (section: Section) => {
    closeMenu();
    setAssignSection(section);
    setAssignTeacherId(section.teacherId || '');
    setError('');
  };

  const openAddStudents = (section: Section) => {
    closeMenu();
    setAddStudentsSection(section);
    setSelectedStudentIds([]);
    setError('');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearId || !form.name.trim()) {
      setError('Section name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await updateSectionAPI(editing.id, {
          name: form.name.trim(),
          teacherId: form.teacherId || null,
          color: form.color,
          academicYearId: yearId,
        });
      } else {
        await createSectionAPI({
          name: form.name.trim(),
          academicYearId: yearId,
          teacherId: form.teacherId || null,
          color: form.color,
        });
      }
      setModalOpen(false);
      await load();
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(message || 'Could not save section.');
    } finally {
      setSaving(false);
    }
  };

  const saveAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignSection) return;
    setSaving(true);
    setError('');
    try {
      await updateSectionAPI(assignSection.id, {
        teacherId: assignTeacherId || null,
      });
      setAssignSection(null);
      await load();
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(message || 'Could not assign teacher.');
    } finally {
      setSaving(false);
    }
  };

  const saveAddStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addStudentsSection) return;
    if (selectedStudentIds.length === 0) {
      setError('Select at least one student.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await addSectionStudentsAPI(addStudentsSection.id, selectedStudentIds);
      setAddStudentsSection(null);
      await load();
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(message || 'Could not add students.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (section: Section) => {
    closeMenu();
    const ok = await confirm({
      title: 'Delete section?',
      message: `Delete section "${section.name}"? Students in this section will be unassigned.`,
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteSectionAPI(section.id);
      await load();
    } catch (err) {
      console.error(err);
      await alert({ title: 'Delete failed', message: 'Could not delete section.', variant: 'danger' });
    }
  };

  const regenerate = async (section: Section) => {
    closeMenu();
    const ok = await confirm({
      title: 'Generate new join code?',
      message: 'The old code will stop working.',
      variant: 'warning',
      confirmLabel: 'Generate',
    });
    if (!ok) return;
    try {
      await updateSectionAPI(section.id, { regenerateCode: true });
      await load();
    } catch (err) {
      console.error(err);
      await alert({ title: 'Update failed', message: 'Could not regenerate code.', variant: 'danger' });
    }
  };

  const copyCode = async (section: Section) => {
    await navigator.clipboard.writeText(section.code);
    setCopiedId(section.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const availableStudents = students.filter((s) => {
    if (!addStudentsSection) return true;
    return String(s.sectionId || '') !== String(addStudentsSection.id);
  });

  if (!loading && !year) {
    return (
      <DashboardLayout navItems={ADMIN_NAV} role="admin" userName={user?.name || 'Admin'} sectionLabel="Administration">
        <div className="db-card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--db-muted)', fontWeight: 600 }}>Academic year not found.</p>
          <button type="button" className="db-btn primary" style={{ marginTop: 12 }} onClick={() => navigate('/admin/academic-year')}>
            Back to Academic Years
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={ADMIN_NAV} role="admin" userName={user?.name || 'Admin'} sectionLabel="Administration">
      <div style={{ marginBottom: 18 }}>
        <Link
          to="/admin/academic-year"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--db-muted)', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}
        >
          <ArrowLeft size={16} /> Back to Academic Years
        </Link>
      </div>

      <div style={{
        borderRadius: 24, padding: '28px 32px', marginBottom: 24,
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #DB2777 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        boxShadow: '0 20px 50px rgba(124,58,237,0.28)',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
            {year?.status === 'archived' ? 'Archived Year' : 'Active Year'}
          </div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px' }}>
            {loading ? 'Loading…' : (year?.label || `A.Y. ${year?.name}`)}
          </h2>
          <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
            Manage sections for {year?.name}. Use the menu to assign teachers or add students.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="db-btn" style={{
          background: '#fff', color: '#7C3AED', border: 'none', fontWeight: 800, borderRadius: 14, padding: '12px 18px',
        }}>
          <Plus size={16} /> Add Section
        </button>
      </div>

      <div className="db-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--db-border)' }}>
          <span className="db-card-title" style={{ margin: 0 }}>Sections ({sections.length})</span>
        </div>

        <div className="db-table-scroll">
          <table className="db-table" style={{ width: '100%', tableLayout: 'fixed', minWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ padding: '14px 24px', width: '28%' }}>Section Name</th>
                <th style={{ padding: '14px 16px', width: '22%' }}>Join Code</th>
                <th style={{ padding: '14px 16px', width: '20%' }}>Teacher</th>
                <th style={{ padding: '14px 16px', width: '12%' }}>Students</th>
                <th style={{ padding: '14px 24px', width: '18%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 28, color: 'var(--db-muted)' }}>Loading sections…</td>
                </tr>
              )}
              {!loading && sections.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--db-muted)', fontWeight: 600 }}>
                    No sections yet. Click “Add Section” to create one.
                  </td>
                </tr>
              )}
              {sections.map((sec) => (
                <tr key={sec.id}>
                  <td style={{ padding: '16px 24px' }}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, cursor: 'pointer' }}
                      onClick={() => navigate(`/admin/sections/${sec.id}`)}
                      title="View students"
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: `${sec.color}22`, color: sec.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Folder size={16} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 800, color: 'var(--db-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sec.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--db-muted)', marginTop: 2 }}>{sec.academicYear}</div>
                      </div>
                      <ChevronRight size={14} color="var(--db-muted)" style={{ flexShrink: 0 }} />
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '6px 10px', borderRadius: 10,
                      background: 'var(--db-hover)', border: '1px solid var(--db-border)',
                    }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, letterSpacing: 1.5, color: sec.color, fontSize: 13 }}>
                        {sec.code}
                      </span>
                      <button type="button" className="db-icon-btn" title="Copy code" onClick={() => copyCode(sec)} style={{ width: 26, height: 26, flexShrink: 0 }}>
                        {copiedId === sec.id ? <Check size={11} /> : <Copy size={11} />}
                      </button>
                      <button type="button" className="db-icon-btn" title="Show QR Code" onClick={() => openQr(sec)} style={{ width: 26, height: 26, flexShrink: 0 }}>
                        <QrCode size={11} />
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--db-text)', fontWeight: 600 }}>
                    {sec.teacherName || <span style={{ color: 'var(--db-muted)', fontWeight: 500 }}>Unassigned</span>}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--db-muted)', fontWeight: 700 }}>
                      <Users size={14} />
                      {sec.students ?? 0}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="db-icon-btn"
                        title="More actions"
                        ref={(el) => { menuButtonRefs.current[sec.id] = el; }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          openMenu(sec.id);
                        }}
                        style={{
                          width: 34, height: 34, flexShrink: 0,
                          borderColor: menuOpenId === sec.id ? 'var(--db-accent)' : undefined,
                          color: menuOpenId === sec.id ? 'var(--db-accent)' : undefined,
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {menuOpenId && menuPos && (() => {
        const sec = sections.find((s) => s.id === menuOpenId);
        if (!sec) return null;
        const menuItemStyle: React.CSSProperties = {
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          border: 'none',
          background: 'transparent',
          color: 'var(--db-text)',
          fontWeight: 700,
          fontSize: 13,
          borderRadius: 10,
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
        };
        return createPortal(
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: menuPos.top,
              right: menuPos.right,
              zIndex: 2000,
              minWidth: 200,
              padding: 8,
              background: 'var(--db-card)',
              border: '1px solid var(--db-border)',
              borderRadius: 14,
              boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
            }}
          >
            <button
              type="button"
              style={menuItemStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--db-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              onClick={() => openAssignTeacher(sec)}
            >
              <UserCog size={15} color="#6366F1" /> Assign Teacher
            </button>
            <button
              type="button"
              style={menuItemStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--db-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              onClick={() => openAddStudents(sec)}
            >
              <UserPlus size={15} color="#10B981" /> Add Students
            </button>
            <button
              type="button"
              style={menuItemStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--db-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              onClick={() => openQr(sec)}
            >
              <QrCode size={15} color="#8B5CF6" /> Show QR Code
            </button>
            <div style={{ height: 1, background: 'var(--db-border)', margin: '6px 4px' }} />
            <button
              type="button"
              style={menuItemStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--db-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              onClick={() => regenerate(sec)}
            >
              <RefreshCw size={15} /> Regenerate Code
            </button>
            <button
              type="button"
              style={menuItemStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--db-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              onClick={() => openEdit(sec)}
            >
              <Pencil size={15} /> Edit Section
            </button>
            <button
              type="button"
              style={{ ...menuItemStyle, color: '#EF4444' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              onClick={() => remove(sec)}
            >
              <Trash2 size={15} /> Delete
            </button>
          </div>,
          document.body
        );
      })()}

      {/* Create / Edit Section Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={() => setModalOpen(false)}>
          <form
            onSubmit={save}
            onClick={(e) => e.stopPropagation()}
            className="db-card"
            style={{ width: '100%', maxWidth: 480, padding: 28, margin: 0 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--db-text)' }}>
                {editing ? 'Edit Section' : 'Create Section'}
              </h3>
              <button type="button" className="db-icon-btn" onClick={() => setModalOpen(false)}><X size={16} /></button>
            </div>

            {error && (
              <div style={{
                marginBottom: 14, padding: '10px 12px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)',
              }}>{error}</div>
            )}

            <div className="db-form-group" style={{ marginBottom: 14 }}>
              <label className="db-form-label">Section Name</label>
              <input
                className="db-form-input"
                placeholder="e.g. Grade 8 - Section A"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="db-form-group" style={{ marginBottom: 14 }}>
              <label className="db-form-label">Assign Teacher (optional)</label>
              <select
                className="db-form-input"
                value={form.teacherId}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
              >
                <option value="">Unassigned</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                ))}
              </select>
            </div>

            <div className="db-form-group" style={{ marginBottom: 20 }}>
              <label className="db-form-label">Accent Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    style={{
                      width: 32, height: 32, borderRadius: 10, background: c,
                      border: form.color === c ? '3px solid #fff' : '3px solid transparent',
                      boxShadow: form.color === c ? `0 0 0 2px ${c}` : 'none', cursor: 'pointer',
                    }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="db-btn ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="db-btn primary" disabled={saving}>
                <Plus size={15} />
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Section'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assign Teacher Modal */}
      {assignSection && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={() => setAssignSection(null)}>
          <form
            onSubmit={saveAssignTeacher}
            onClick={(e) => e.stopPropagation()}
            className="db-card"
            style={{ width: '100%', maxWidth: 440, padding: 28, margin: 0 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--db-text)' }}>Assign Teacher</h3>
              <button type="button" className="db-icon-btn" onClick={() => setAssignSection(null)}><X size={16} /></button>
            </div>
            <p style={{ margin: '0 0 16px', color: 'var(--db-muted)', fontSize: 13 }}>
              Section: <strong style={{ color: 'var(--db-text)' }}>{assignSection.name}</strong>
            </p>
            {error && (
              <div style={{
                marginBottom: 14, padding: '10px 12px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                background: 'rgba(239,68,68,0.12)', color: '#EF4444',
              }}>{error}</div>
            )}
            <div className="db-form-group" style={{ marginBottom: 20 }}>
              <label className="db-form-label">Teacher</label>
              <select
                className="db-form-input"
                value={assignTeacherId}
                onChange={(e) => setAssignTeacherId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                ))}
              </select>
              {teachers.length === 0 && (
                <p style={{ marginTop: 8, fontSize: 12, color: 'var(--db-muted)' }}>
                  No teachers found. Create a teacher account first.
                </p>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="db-btn ghost" onClick={() => setAssignSection(null)}>Cancel</button>
              <button type="submit" className="db-btn primary" disabled={saving}>
                <UserCog size={15} /> {saving ? 'Saving…' : 'Save Teacher'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Students Modal */}
      {addStudentsSection && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={() => setAddStudentsSection(null)}>
          <form
            onSubmit={saveAddStudents}
            onClick={(e) => e.stopPropagation()}
            className="db-card"
            style={{ width: '100%', maxWidth: 520, padding: 28, margin: 0, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--db-text)' }}>Add Students</h3>
              <button type="button" className="db-icon-btn" onClick={() => setAddStudentsSection(null)}><X size={16} /></button>
            </div>
            <p style={{ margin: '0 0 16px', color: 'var(--db-muted)', fontSize: 13 }}>
              Add students to <strong style={{ color: 'var(--db-text)' }}>{addStudentsSection.name}</strong>
            </p>
            {error && (
              <div style={{
                marginBottom: 14, padding: '10px 12px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                background: 'rgba(239,68,68,0.12)', color: '#EF4444',
              }}>{error}</div>
            )}

            <div style={{
              flex: 1, overflowY: 'auto', border: '1px solid var(--db-border)', borderRadius: 14,
              padding: 8, marginBottom: 16, minHeight: 180, maxHeight: 320,
            }}>
              {availableStudents.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--db-muted)', fontWeight: 600 }}>
                  No available students to add.
                </div>
              ) : (
                availableStudents.map((s) => {
                  const checked = selectedStudentIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                        background: checked ? 'rgba(99,102,241,0.1)' : 'transparent',
                        marginBottom: 4,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStudent(s.id)}
                        style={{ width: 16, height: 16 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, color: 'var(--db-text)', fontSize: 14 }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--db-muted)' }}>
                          {s.email}
                          {s.section && s.section !== 'NA' ? ` · currently ${s.section}` : ''}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--db-muted)', fontWeight: 600 }}>
                {selectedStudentIds.length} selected
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="db-btn ghost" onClick={() => setAddStudentsSection(null)}>Cancel</button>
                <button type="submit" className="db-btn primary" disabled={saving || selectedStudentIds.length === 0}>
                  <UserPlus size={15} /> {saving ? 'Adding…' : 'Add Students'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
      {/* QR Code Modal */}
      {qrSection && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setQrSection(null)}>
          <div onClick={(e) => e.stopPropagation()} className="db-card" style={{ width: '100%', maxWidth: 400, padding: 32, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--db-text)' }}>QR Code</h3>
              <button type="button" className="db-icon-btn" onClick={() => setQrSection(null)}><X size={16} /></button>
            </div>
            <p style={{ margin: '0 0 20px', color: 'var(--db-muted)', fontSize: 13 }}>
              Students can scan this to join <strong style={{ color: 'var(--db-text)' }}>{qrSection.name}</strong>
            </p>
            <div style={{ display: 'inline-block', padding: 20, background: '#fff', borderRadius: 18 }}>
              <QRCodeSVG value={qrSection.code} size={200} level="H" />
            </div>
            <div style={{ marginTop: 16 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 28, letterSpacing: 4, color: qrSection.color }}>{qrSection.code}</span>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ padding: '8px 14px', borderRadius: 10, background: 'var(--db-hover)', border: '1px solid var(--db-border)', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--db-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Generated</div>
                <div style={{ fontWeight: 800, fontSize: 12, color: 'var(--db-text)' }}>
                  {qrSection.codeCreatedAt ? new Date(qrSection.codeCreatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </div>
              </div>
              {(() => {
                const expired = qrSection.codeExpiresAt ? new Date() > new Date(qrSection.codeExpiresAt) : false;
                return (
                  <div style={{ padding: '8px 14px', borderRadius: 10, textAlign: 'center', background: expired ? 'rgba(239,68,68,0.08)' : 'var(--db-hover)', border: `1px solid ${expired ? 'rgba(239,68,68,0.25)' : 'var(--db-border)'}` }}>
                    <div style={{ fontSize: 9, color: expired ? '#EF4444' : 'var(--db-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{expired ? 'Expired' : 'Expires'}</div>
                    <div style={{ fontWeight: 800, fontSize: 12, color: expired ? '#EF4444' : 'var(--db-text)' }}>
                      {qrSection.codeExpiresAt ? new Date(qrSection.codeExpiresAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                    </div>
                  </div>
                );
              })()}
            </div>
            <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--db-muted)' }}>
              Share this code or QR image with students.
            </p>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
