import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { ADMIN_NAV } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import {
  createAcademicYearAPI,
  deleteAcademicYearAPI,
  getAcademicYearsAPI,
  updateAcademicYearAPI,
  formatDate,
  type AcademicYear,
} from '../../services/usersApi';
import { Calendar, Plus, Pencil, Trash2, ChevronRight, Archive, X } from 'lucide-react';
import { useDialog } from '../../components/DialogProvider';

const emptyForm = { name: '', label: '', description: '', status: 'active' as 'active' | 'archived' };

export default function AdminAcademicYear() {
  const { user } = useAuth();
  const { alert, confirm } = useDialog();
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicYear | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAcademicYearsAPI();
      setYears(data.academicYears || []);
    } catch (err) {
      console.error(err);
      setYears([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (year: AcademicYear, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditing(year);
    setForm({
      name: year.name,
      label: year.label || '',
      description: year.description || '',
      status: year.status || 'active',
    });
    setError('');
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Academic year is required (e.g. 2026-2027).');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await updateAcademicYearAPI(editing.id, form);
      } else {
        await createAcademicYearAPI(form);
      }
      setModalOpen(false);
      await load();
    } catch (err: unknown) {
      const ax = err as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };
      const status = ax.response?.status;
      const apiMessage = ax.response?.data?.message;
      if (status === 401) {
        setError('Session expired. Please sign in again as admin.');
      } else if (status === 403) {
        setError('Only admins can create academic years.');
      } else if (status === 404) {
        setError('Academic year API not found. Restart the backend (npm run dev).');
      } else {
        setError(apiMessage || ax.message || 'Could not save academic year.');
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (year: AcademicYear, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await confirm({
      title: 'Delete academic year?',
      message: `Delete A.Y. ${year.name}? All sections under it will also be deleted.`,
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteAcademicYearAPI(year.id);
      await load();
    } catch (err) {
      console.error(err);
      await alert({ title: 'Delete failed', message: 'Could not delete academic year.', variant: 'danger' });
    }
  };

  return (
    <DashboardLayout navItems={ADMIN_NAV} role="admin" userName={user?.name || 'Admin'} sectionLabel="Administration">
      <div style={{
        borderRadius: 24, padding: '28px 32px', marginBottom: 24,
        background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 55%, #7C3AED 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        boxShadow: '0 20px 50px rgba(79,70,229,0.28)',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
            Administration
          </div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px' }}>
            Academic Years
          </h2>
          <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
            Create a school year, then open it to manage sections.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="db-btn" style={{
          background: '#fff', color: '#4F46E5', border: 'none', fontWeight: 800, borderRadius: 14, padding: '12px 18px',
        }}>
          <Plus size={16} /> Create Academic Year
        </button>
      </div>

      {loading && (
        <div className="db-card" style={{ padding: 40, textAlign: 'center', color: 'var(--db-muted)', fontWeight: 600 }}>
          Loading academic years…
        </div>
      )}

      {!loading && years.length === 0 && (
        <div className="db-card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, margin: '0 auto 16px',
            background: 'rgba(99,102,241,0.12)', color: '#6366F1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Calendar size={28} />
          </div>
          <h3 style={{ margin: 0, color: 'var(--db-text)' }}>No academic years yet</h3>
          <p style={{ color: 'var(--db-muted)', marginTop: 8 }}>Create your first school year to start adding sections.</p>
          <button type="button" className="db-btn primary" onClick={openCreate} style={{ marginTop: 16 }}>
            <Plus size={16} /> Create Academic Year
          </button>
        </div>
      )}

      {!loading && years.length > 0 && (
        <div className="db-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 18 }}>
          <div className="db-table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
              <thead>
                <tr style={{ background: 'var(--db-hover)' }}>
                  {[
                    { label: 'Academic Year', align: 'left' as const },
                    { label: 'Status', align: 'left' as const },
                    { label: 'Sections', align: 'left' as const },
                    { label: 'Created', align: 'left' as const },
                    { label: 'Actions', align: 'right' as const },
                  ].map((col) => (
                    <th
                      key={col.label}
                      style={{
                        padding: '14px 20px',
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 0.8,
                        textTransform: 'uppercase',
                        color: 'var(--db-muted)',
                        textAlign: col.align,
                        borderBottom: '1px solid var(--db-border)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {years.map((year, idx) => {
                  const title = year.label?.trim() || `A.Y. ${year.name}`;
                  const subtitleParts: string[] = [];
                  if (year.name && year.name !== title && !title.includes(year.name)) {
                    subtitleParts.push(year.name);
                  }
                  if (
                    year.description?.trim() &&
                    year.description.trim() !== year.name &&
                    year.description.trim() !== title
                  ) {
                    subtitleParts.push(year.description.trim());
                  }

                  return (
                    <tr
                      key={year.id}
                      style={{
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(148,163,184,0.03)',
                        borderBottom: idx === years.length - 1 ? 'none' : '1px solid var(--db-border)',
                      }}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{
                            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                            background: year.status === 'active'
                              ? 'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(124,58,237,0.15))'
                              : 'rgba(148,163,184,0.15)',
                            color: year.status === 'active' ? '#818CF8' : '#94A3B8',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Calendar size={18} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--db-text)', letterSpacing: '-0.2px' }}>
                              {title}
                            </div>
                            {subtitleParts.length > 0 && (
                              <div style={{
                                fontSize: 12, color: 'var(--db-muted)', marginTop: 3,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360,
                              }}>
                                {subtitleParts.join(' · ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 800,
                          letterSpacing: 0.4, textTransform: 'uppercase',
                          background: year.status === 'active' ? 'rgba(16,185,129,0.14)' : 'rgba(148,163,184,0.14)',
                          color: year.status === 'active' ? '#34D399' : '#94A3B8',
                          border: year.status === 'active' ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(148,163,184,0.2)',
                        }}>
                          {year.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 700, fontSize: 14, color: 'var(--db-text)', whiteSpace: 'nowrap' }}>
                        {year.sectionCount ?? 0} {(year.sectionCount || 0) === 1 ? 'section' : 'sections'}
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--db-muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
                        {formatDate(year.createdAt)}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <button
                            type="button"
                            title="Edit"
                            onClick={(e) => openEdit(year, e)}
                            style={{
                              width: 36, height: 36, borderRadius: 10, cursor: 'pointer',
                              background: 'var(--db-hover)', border: '1px solid var(--db-border)',
                              color: 'var(--db-text)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={(e) => remove(year, e)}
                            style={{
                              width: 36, height: 36, borderRadius: 10, cursor: 'pointer',
                              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                              color: '#F87171', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                          <Link
                            to={`/admin/academic-year/${year.id}`}
                            style={{
                              textDecoration: 'none', padding: '9px 14px', borderRadius: 10, fontSize: 13, fontWeight: 800,
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              background: 'linear-gradient(135deg, #6366F1, #7C3AED)', color: '#fff',
                              boxShadow: '0 6px 16px rgba(99,102,241,0.28)',
                            }}
                          >
                            Open <ChevronRight size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                {editing ? 'Edit Academic Year' : 'Create Academic Year'}
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
              <label className="db-form-label">Year (required)</label>
              <input
                className="db-form-input"
                placeholder="e.g. 2026-2027"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="db-form-group" style={{ marginBottom: 14 }}>
              <label className="db-form-label">Display Label</label>
              <input
                className="db-form-input"
                placeholder="e.g. A.Y. 2026-2027"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
            <div className="db-form-group" style={{ marginBottom: 14 }}>
              <label className="db-form-label">Description</label>
              <textarea
                className="db-form-input"
                rows={3}
                placeholder="Optional notes"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div className="db-form-group" style={{ marginBottom: 20 }}>
              <label className="db-form-label">Status</label>
              <select
                className="db-form-input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'archived' })}
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="db-btn ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="db-btn primary" disabled={saving}>
                {editing ? <Archive size={15} /> : <Plus size={15} />}
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Year'}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
