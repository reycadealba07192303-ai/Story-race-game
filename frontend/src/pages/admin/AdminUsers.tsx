import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { ADMIN_NAV } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import {
  getUsersAPI,
  updateUserAPI,
  deleteUserAPI,
  initials,
  formatDate,
  type AppUser,
} from '../../services/usersApi';
import { forgotPasswordAPI } from '../../services/authApi';
import {
  Search, Download, MoreVertical, Eye, Users, Trash2, Ban, CheckCircle, KeyRound,
} from 'lucide-react';
import { useDialog } from '../../components/DialogProvider';

const TAB_MAP: Record<string, string> = {
  All: 'all',
  Student: 'student',
  Teacher: 'teacher',
  Admin: 'admin',
};

export default function AdminUsers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { alert, confirm } = useDialog();
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const data = await getUsersAPI({
        role: TAB_MAP[activeTab],
        search: search.trim() || undefined,
      });
      setUsers(data.users);
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await getUsersAPI({
          role: TAB_MAP[activeTab],
          search: search.trim() || undefined,
        });
        if (!cancelled) setUsers(data.users);
      } catch (err) {
        console.error(err);
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeTab, search]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpenId(null);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const exportCsv = () => {
    const rows = [
      ['Name', 'Email', 'Role', 'Section', 'Status', 'Joined'],
      ...users.map((u) => [
        u.name,
        u.email,
        u.role,
        u.section || 'NA',
        u.status || 'active',
        formatDate(u.createdAt),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleStatus = async (u: AppUser) => {
    const next = u.status === 'disabled' ? 'active' : 'disabled';
    const label = next === 'disabled' ? 'disable' : 'activate';
    const ok = await confirm({
      title: next === 'disabled' ? 'Disable account?' : 'Activate account?',
      message: `Are you sure you want to ${label} ${u.name}?`,
      variant: next === 'disabled' ? 'warning' : 'info',
      confirmLabel: next === 'disabled' ? 'Disable' : 'Activate',
    });
    if (!ok) return;
    try {
      await updateUserAPI(u.id, { status: next });
      setMenuOpenId(null);
      await reload();
    } catch (err) {
      console.error(err);
      await alert({ title: 'Update failed', message: `Could not ${label} user.`, variant: 'danger' });
    }
  };

  const sendReset = async (u: AppUser) => {
    try {
      await forgotPasswordAPI(u.email);
      setMenuOpenId(null);
      await alert({ title: 'Reset link sent', message: `Password reset link sent to ${u.email}.`, variant: 'success' });
    } catch (err) {
      console.error(err);
      await alert({ title: 'Send failed', message: 'Could not send password reset email.', variant: 'danger' });
    }
  };

  const removeUser = async (u: AppUser) => {
    if (String(user?.id) === String(u.id)) {
      await alert({ title: 'Not allowed', message: 'You cannot delete your own account.', variant: 'warning' });
      return;
    }
    const ok = await confirm({
      title: 'Delete user?',
      message: `Delete ${u.name}? This cannot be undone.`,
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteUserAPI(u.id);
      setMenuOpenId(null);
      await reload();
    } catch (err) {
      console.error(err);
      await alert({ title: 'Delete failed', message: 'Could not delete user.', variant: 'danger' });
    }
  };

  return (
    <DashboardLayout navItems={ADMIN_NAV} role="admin" userName={user?.name || 'Admin'} sectionLabel="Administration">
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg, #3B82F6, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 24px rgba(99,102,241,0.3)' }}>
          <Users size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--db-text)', letterSpacing: '-0.5px', margin: 0 }}>
            User Management
          </h2>
          <p style={{ color: 'var(--db-muted)', fontSize: 14, marginTop: 4 }}>
            Live accounts from Firebase Auth + MongoDB.
          </p>
        </div>
      </div>

      <div className="db-card" style={{ padding: '24px 28px' }}>
        <div className="db-toolbar" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--db-hover)', padding: '6px', borderRadius: '14px', border: '1px solid var(--db-border)', flexWrap: 'wrap' }}>
            {['All', 'Student', 'Teacher', 'Admin'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? 'var(--db-card)' : 'transparent',
                  color: activeTab === tab ? 'var(--db-text)' : 'var(--db-muted)',
                  border: activeTab === tab ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                  padding: '8px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                  boxShadow: activeTab === tab ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--db-hover)', padding: '0 16px', borderRadius: '12px', border: '1px solid var(--db-border)', flex: '1 1 220px', maxWidth: 320, height: 42 }}>
              <Search size={16} color="var(--db-muted)" style={{ marginRight: '10px' }} />
              <input
                placeholder="Search users..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--db-text)', fontSize: '14px', fontWeight: 500, fontFamily: 'Outfit' }}
              />
            </div>
            <button type="button" className="db-btn primary" onClick={exportCsv} style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 8px 24px rgba(16,185,129,0.3)', height: 42, padding: '0 18px', borderRadius: 12, border: 'none' }}>
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>

        <div className="db-table-scroll" style={{ margin: '0 -28px' }}>
          <table className="db-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={{ background: 'var(--db-hover)' }}>
                <th style={{ padding: '16px 28px', textAlign: 'left', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--db-muted)', borderBottom: '1px solid var(--db-border)' }}>User Details</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--db-muted)', borderBottom: '1px solid var(--db-border)' }}>Role</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--db-muted)', borderBottom: '1px solid var(--db-border)' }}>Section/Scope</th>
                <th style={{ padding: '16px', textAlign: 'left', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--db-muted)', borderBottom: '1px solid var(--db-border)' }}>Date Joined</th>
                <th style={{ padding: '16px 28px', textAlign: 'right', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--db-muted)', borderBottom: '1px solid var(--db-border)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isOpen = menuOpenId === u.id;
                const isDisabled = u.status === 'disabled';
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--db-border)' }}>
                    <td style={{ padding: '16px 28px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${u.color || '#6366F1'}22`, color: u.color || '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>
                          {initials(u.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--db-text)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {u.name}
                            {isDisabled && (
                              <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(239,68,68,0.15)', color: '#F87171' }}>DISABLED</span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--db-muted)', marginTop: 2 }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 50, fontSize: 11, fontWeight: 800, background: `${u.color || '#6366F1'}15`, color: u.color || '#6366F1' }}>{u.roleLabel || u.role}</span>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--db-text)', fontWeight: 600, fontSize: 13 }}>{u.section || 'NA'}</td>
                    <td style={{ padding: '16px', color: 'var(--db-muted)', fontSize: 13, fontWeight: 500 }}>{formatDate(u.createdAt)}</td>
                    <td style={{ padding: '16px 28px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, position: 'relative' }} ref={isOpen ? menuRef : undefined}>
                        <Link
                          to={`/admin/users/${u.id}`}
                          className="db-icon-btn"
                          style={{ display: 'inline-flex', width: 36, height: 36, background: 'var(--db-hover)' }}
                          title="View Profile"
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          type="button"
                          className="db-icon-btn"
                          style={{
                            display: 'inline-flex', width: 36, height: 36, background: isOpen ? 'rgba(99,102,241,0.15)' : 'var(--db-hover)',
                            borderColor: isOpen ? 'rgba(99,102,241,0.45)' : undefined,
                            color: isOpen ? '#818CF8' : undefined,
                            cursor: 'pointer',
                          }}
                          title="More options"
                          aria-haspopup="menu"
                          aria-expanded={isOpen}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(isOpen ? null : u.id);
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>

                        {isOpen && (
                          <div
                            role="menu"
                            style={{
                              position: 'absolute',
                              top: 'calc(100% + 8px)',
                              right: 0,
                              width: 210,
                              background: 'var(--db-card)',
                              border: '1px solid var(--db-border)',
                              borderRadius: 14,
                              boxShadow: '0 16px 40px rgba(0,0,0,0.28)',
                              zIndex: 50,
                              overflow: 'hidden',
                              padding: 6,
                            }}
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => { setMenuOpenId(null); navigate(`/admin/users/${u.id}`); }}
                              style={menuItemStyle}
                            >
                              <Eye size={15} /> View profile
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => sendReset(u)}
                              style={menuItemStyle}
                            >
                              <KeyRound size={15} /> Send reset link
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => toggleStatus(u)}
                              style={menuItemStyle}
                            >
                              {isDisabled ? <CheckCircle size={15} /> : <Ban size={15} />}
                              {isDisabled ? 'Activate account' : 'Disable account'}
                            </button>
                            {String(user?.id) !== String(u.id) && (
                              <>
                                <div style={{ height: 1, background: 'var(--db-border)', margin: '4px 6px' }} />
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => removeUser(u)}
                                  style={{ ...menuItemStyle, color: '#F87171' }}
                                >
                                  <Trash2 size={15} /> Delete user
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && users.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--db-muted)', fontWeight: 600 }}>No users found.</td></tr>
              )}
              {loading && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--db-muted)', fontWeight: 600 }}>Loading users…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 12px',
  border: 'none',
  background: 'transparent',
  color: 'var(--db-text)',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  borderRadius: 10,
  textAlign: 'left',
  fontFamily: 'Outfit, sans-serif',
};
