import React, { useEffect, useRef, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { ADMIN_NAV } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { getAuditLogsAPI, type AuditLog } from '../../services/auditApi';
import { formatDate } from '../../services/usersApi';
import { ScrollText, Search, RefreshCw } from 'lucide-react';

const ROLE_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Admin', value: 'admin' },
  { label: 'Teacher', value: 'teacher' },
  { label: 'Student', value: 'student' },
];

const CATEGORIES = [
  { label: 'All categories', value: 'all' },
  { label: 'Auth', value: 'auth' },
  { label: 'User', value: 'user' },
  { label: 'Section', value: 'section' },
  { label: 'Academic Year', value: 'academic_year' },
  { label: 'Campaign', value: 'campaign' },
  { label: 'Progress', value: 'progress' },
  { label: 'Settings', value: 'settings' },
];

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  admin: { bg: 'rgba(99,102,241,0.12)', color: '#6366F1' },
  teacher: { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
  student: { bg: 'rgba(59,130,246,0.12)', color: '#2563EB' },
  guest: { bg: 'rgba(148,163,184,0.15)', color: '#64748B' },
  system: { bg: 'rgba(148,163,184,0.15)', color: '#64748B' },
};

const ACTION_LABELS: Record<string, string> = {
  'auth.signup': 'Signed up',
  'auth.signin': 'Signed in',
  'auth.password_reset_requested': 'Requested a password reset',
  'user.updated': 'Updated a user',
  'user.deleted': 'Deleted a user',
  'progress.campaign_completed': 'Completed a story',
  'progress.level_completed': 'Completed a level',
  'settings.updated': 'Updated system settings',
  'settings.cache_cleared': 'Cleared system cache',
  'settings.factory_reset': 'Performed a factory reset',
  'academic_year.created': 'Created an academic year',
  'academic_year.updated': 'Updated an academic year',
  'academic_year.deleted': 'Deleted an academic year',
  'section.created': 'Created a section',
  'section.updated': 'Updated a section',
  'section.deleted': 'Deleted a section',
  'section.code_regenerated': 'Regenerated a join code',
  'section.joined': 'Joined a section',
  'section.student_removed': 'Removed a student from a section',
  'section.students_added': 'Added students to a section',
  'section.announcement_created': 'Posted an announcement',
  'section.announcement_deleted': 'Deleted an announcement',
  'campaign.created': 'Created a campaign',
  'campaign.generated': 'Generated a campaign',
  'campaign.saved': 'Saved a campaign',
  'campaign.updated': 'Updated a campaign',
  'campaign.published': 'Published a campaign',
  'campaign.deleted': 'Deleted a campaign',
};

function capitalizeFirst(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function describeAction(log: AuditLog) {
  const mapped = ACTION_LABELS[log.action];
  let title = mapped;
  if (!title) {
    let fallback = log.summary || log.action;
    if (log.actorName && fallback.toLowerCase().startsWith(log.actorName.toLowerCase())) {
      fallback = fallback.slice(log.actorName.length).trim();
    }
    title = capitalizeFirst(fallback);
  }

  const detail = log.targetName
    && log.targetName !== log.actorEmail
    && log.targetName !== log.actorName
    ? log.targetName
    : undefined;

  return { title, detail };
}

export default function AdminRecords() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;
  const filtersRef = useRef({ role, category, search, page });

  useEffect(() => {
    filtersRef.current = { role, category, search, page };
  }, [role, category, search, page]);

  const load = async (opts?: { page?: number; silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const data = await getAuditLogsAPI({
        role,
        category,
        search: search.trim() || undefined,
        page: opts?.page ?? page,
        limit,
      });
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
      if (!opts?.silent) {
        setLogs([]);
        setTotal(0);
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await getAuditLogsAPI({
          role,
          category,
          search: search.trim() || undefined,
          page: 1,
          limit,
        });
        if (cancelled) return;
        setPage(1);
        setLogs(data.logs);
        setTotal(data.total);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setLogs([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [role, category, search]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (document.hidden) return;
      const f = filtersRef.current;
      try {
        const data = await getAuditLogsAPI({
          role: f.role,
          category: f.category,
          search: f.search.trim() || undefined,
          page: f.page,
          limit,
        });
        if (cancelled) return;
        setLogs((prev) => {
          if (
            prev.length === data.logs.length
            && prev[0]?.id === data.logs[0]?.id
            && prev[0]?.summary === data.logs[0]?.summary
            && prev[prev.length - 1]?.id === data.logs[data.logs.length - 1]?.id
          ) {
            return prev;
          }
          return data.logs;
        });
        setTotal(data.total);
      } catch {
        // keep the current list on background errors
      }
    };
    const id = setInterval(tick, 4000);
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const goPage = async (next: number) => {
    const p = Math.min(Math.max(next, 1), totalPages);
    setPage(p);
    await load({ page: p });
  };

  return (
    <DashboardLayout navItems={ADMIN_NAV} role="admin" userName={user?.name || 'Admin'} sectionLabel="Administration">
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg, #0EA5E9, #0284C7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 24px rgba(14,165,233,0.3)' }}>
            <ScrollText size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--db-text)', letterSpacing: '-0.5px', margin: 0 }}>
              Audit Logs
            </h2>
            <p style={{ color: 'var(--db-muted)', fontSize: 14, marginTop: 4 }}>
              Track actions by admins, teachers, and students.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="db-btn"
          onClick={() => load()}
          style={{
            height: 42,
            padding: '0 16px',
            borderRadius: 12,
            border: '1px solid var(--db-border)',
            background: 'var(--db-card)',
            color: 'var(--db-text)',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="db-card" style={{ padding: '24px 28px' }}>
        <div className="db-toolbar" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--db-hover)', padding: 6, borderRadius: 14, border: '1px solid var(--db-border)', flexWrap: 'wrap' }}>
            {ROLE_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setRole(tab.value)}
                style={{
                  background: role === tab.value ? 'var(--db-card)' : 'transparent',
                  color: role === tab.value ? 'var(--db-text)' : 'var(--db-muted)',
                  border: role === tab.value ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                  padding: '8px 18px',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: role === tab.value ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                height: 42,
                borderRadius: 12,
                border: '1px solid var(--db-border)',
                background: 'var(--db-hover)',
                color: 'var(--db-text)',
                padding: '0 14px',
                fontWeight: 600,
                fontSize: 13,
                fontFamily: 'Outfit',
                outline: 'none',
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--db-hover)', padding: '0 16px', borderRadius: 12, border: '1px solid var(--db-border)', flex: '1 1 220px', maxWidth: 320, height: 42 }}>
              <Search size={16} color="var(--db-muted)" style={{ marginRight: 10 }} />
              <input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--db-text)', fontSize: 14, fontWeight: 500, fontFamily: 'Outfit' }}
              />
            </div>
          </div>
        </div>

        <div className="db-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--db-border)' }}>
                {['When', 'Actor', 'Role', 'Action'].map((h) => (
                  <th key={h} style={{ padding: '12px 10px', fontSize: 12, fontWeight: 800, color: 'var(--db-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ padding: 40, textAlign: 'center', color: 'var(--db-muted)', fontWeight: 600 }}>
                    Loading audit logs…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 40, textAlign: 'center', color: 'var(--db-muted)', fontWeight: 600 }}>
                    No audit logs yet. Actions will appear here as users use the system.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const roleStyle = ROLE_COLORS[log.actorRole] || ROLE_COLORS.guest;
                  const action = describeAction(log);
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--db-border)' }}>
                      <td style={{ padding: '14px 10px', fontSize: 13, color: 'var(--db-muted)', whiteSpace: 'nowrap' }}>
                        {formatDate(log.createdAt)}
                      </td>
                      <td style={{ padding: '14px 10px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--db-text)', fontSize: 14 }}>{log.actorName}</div>
                        <div style={{ fontSize: 12, color: 'var(--db-muted)', marginTop: 2 }}>{log.actorEmail || '—'}</div>
                      </td>
                      <td style={{ padding: '14px 10px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 800,
                          textTransform: 'capitalize',
                          background: roleStyle.bg,
                          color: roleStyle.color,
                        }}>
                          {log.actorRole}
                        </span>
                      </td>
                      <td style={{ padding: '14px 10px', fontSize: 14, color: 'var(--db-text)', fontWeight: 600, maxWidth: 420 }}>
                        {action.title}
                        {action.detail ? (
                          <div style={{ fontSize: 12, color: 'var(--db-muted)', marginTop: 3, fontWeight: 500 }}>
                            {action.detail}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--db-muted)', fontWeight: 600 }}>
            {total} log{total === 1 ? '' : 's'} · page {page} of {totalPages}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => goPage(page - 1)}
              style={{
                height: 36,
                padding: '0 14px',
                borderRadius: 10,
                border: '1px solid var(--db-border)',
                background: 'var(--db-hover)',
                color: 'var(--db-text)',
                fontWeight: 700,
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.5 : 1,
              }}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => goPage(page + 1)}
              style={{
                height: 36,
                padding: '0 14px',
                borderRadius: 10,
                border: '1px solid var(--db-border)',
                background: 'var(--db-hover)',
                color: 'var(--db-text)',
                fontWeight: 700,
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages ? 0.5 : 1,
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
