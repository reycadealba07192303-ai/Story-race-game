import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { ADMIN_NAV } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../components/DialogProvider';
import {
  getSettingsAPI,
  updateSettingsAPI,
  clearCacheAPI,
  factoryResetAPI,
} from '../../services/settingsApi';
import { Settings, ShieldAlert, Database, Save, Loader } from 'lucide-react';

export default function AdminSettings() {
  const { user } = useAuth();
  const { alert, confirm, prompt } = useDialog();
  const [maintenance, setMaintenance] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [cacheClearedAt, setCacheClearedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    getSettingsAPI()
      .then((data) => {
        setMaintenance(Boolean(data.settings.maintenanceMode));
        setAllowRegistration(data.settings.allowRegistration !== false);
        setCacheClearedAt(data.settings.cacheClearedAt || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const saveChanges = async () => {
    setSaving(true);
    try {
      const data = await updateSettingsAPI({
        maintenanceMode: maintenance,
        allowRegistration,
      });
      setMaintenance(Boolean(data.settings.maintenanceMode));
      setAllowRegistration(data.settings.allowRegistration !== false);
      await alert({
        title: 'Settings saved',
        message: 'General preferences were updated successfully.',
        variant: 'success',
      });
    } catch (err) {
      console.error(err);
      await alert({ title: 'Save failed', message: 'Could not save settings.', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    const ok = await confirm({
      title: 'Clear system cache?',
      message: 'This will force a refresh of cached data and story assets.',
      variant: 'warning',
      confirmLabel: 'Clear Cache',
    });
    if (!ok) return;

    setClearing(true);
    try {
      const data = await clearCacheAPI();
      setCacheClearedAt(data.settings.cacheClearedAt || new Date().toISOString());
      await alert({
        title: 'Cache cleared',
        message: data.message || 'System cache was cleared successfully.',
        variant: 'success',
      });
    } catch (err) {
      console.error(err);
      await alert({ title: 'Clear failed', message: 'Could not clear cache.', variant: 'danger' });
    } finally {
      setClearing(false);
    }
  };

  const handleFactoryReset = async () => {
    const ok = await confirm({
      title: 'Factory reset?',
      message: 'This will delete all users (except you), stories, sections, announcements, and progress. Type confirmation on the next step. This cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Continue',
    });
    if (!ok) return;

    const typed = await prompt({
      title: 'Type RESET to confirm',
      message: 'This permanently deletes system data. Type RESET below.',
      placeholder: 'RESET',
      confirmLabel: 'Continue',
      variant: 'danger',
    });
    if (typed === null) return;
    if (typed.trim() !== 'RESET') {
      await alert({
        title: 'Reset cancelled',
        message: 'You must type RESET exactly to confirm.',
        variant: 'warning',
      });
      return;
    }

    const finalOk = await confirm({
      title: 'Final confirmation',
      message: 'Really wipe the system now? Your admin account will be kept.',
      variant: 'danger',
      confirmLabel: 'Reset System',
    });
    if (!finalOk) return;

    setResetting(true);
    try {
      const data = await factoryResetAPI('RESET');
      await alert({
        title: 'Factory reset complete',
        message: `${data.message} Removed ${data.deletedUsers} other user account(s).`,
        variant: 'success',
      });
    } catch (err) {
      console.error(err);
      await alert({ title: 'Reset failed', message: 'Could not reset the system.', variant: 'danger' });
    } finally {
      setResetting(false);
    }
  };

  return (
    <DashboardLayout navItems={ADMIN_NAV} role="admin" userName={user?.name || 'Admin'} sectionLabel="Administration">
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 16,
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
        }}>
          <Settings size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--db-text)', margin: 0 }}>System Settings</h2>
          <p style={{ color: 'var(--db-muted)', fontSize: 14, marginTop: 4 }}>Configure platform rules and maintenance modes.</p>
        </div>
      </div>

      {loading ? (
        <div className="db-card" style={{ padding: 40, textAlign: 'center', color: 'var(--db-muted)', display: 'flex', justifyContent: 'center', gap: 10 }}>
          <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading settings…
        </div>
      ) : (
        <div className="db-dashboard-two-col">
          <div className="db-card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: 'var(--db-text)', marginBottom: 18 }}>General Preferences</div>

            <div className="db-toggle-row" style={{ paddingBottom: 16, borderBottom: '1px solid var(--db-border)', marginBottom: 16 }}>
              <div style={{ paddingRight: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--db-text)' }}>Maintenance Mode</div>
                <div style={{ fontSize: 13, color: 'var(--db-muted)', marginTop: 4 }}>Turn off the system for users. Admins can still log in.</div>
              </div>
              <button
                type="button"
                aria-label="Toggle maintenance mode"
                onClick={() => setMaintenance((v) => !v)}
                style={{
                  width: 46, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative',
                  background: maintenance ? '#EF4444' : 'var(--db-border)', transition: 'background 0.2s', flexShrink: 0,
                }}
              >
                <span style={{
                  width: 20, height: 20, background: '#fff', borderRadius: '50%', position: 'absolute', top: 3,
                  left: maintenance ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>

            <div className="db-toggle-row" style={{ paddingBottom: 16, borderBottom: '1px solid var(--db-border)', marginBottom: 18 }}>
              <div style={{ paddingRight: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--db-text)' }}>Allow New Registrations</div>
                <div style={{ fontSize: 13, color: 'var(--db-muted)', marginTop: 4 }}>Let new students and teachers sign up.</div>
              </div>
              <button
                type="button"
                aria-label="Toggle registrations"
                onClick={() => setAllowRegistration((v) => !v)}
                style={{
                  width: 46, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative',
                  background: allowRegistration ? '#10B981' : 'var(--db-border)', transition: 'background 0.2s', flexShrink: 0,
                }}
              >
                <span style={{
                  width: 20, height: 20, background: '#fff', borderRadius: '50%', position: 'absolute', top: 3,
                  left: allowRegistration ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>

            <button type="button" className="db-btn primary" onClick={saveChanges} disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
              <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>

          <div className="db-card" style={{ padding: 24, border: '1px solid rgba(239,68,68,0.28)' }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: '#EF4444', marginBottom: 18 }}>Danger Zone</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 16, borderBottom: '1px solid var(--db-border)', marginBottom: 16 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, background: 'rgba(148,163,184,0.12)', color: 'var(--db-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Database size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--db-text)' }}>Clear System Cache</div>
                <div style={{ fontSize: 13, color: 'var(--db-muted)', marginTop: 3 }}>Force refresh all cached data and story assets.</div>
                {cacheClearedAt && (
                  <div style={{ fontSize: 11, color: 'var(--db-muted)', marginTop: 6 }}>
                    Last cleared: {new Date(cacheClearedAt).toLocaleString()}
                  </div>
                )}
              </div>
              <button type="button" className="db-btn ghost" onClick={handleClearCache} disabled={clearing}>
                {clearing ? 'Clearing…' : 'Clear Cache'}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, background: 'rgba(239,68,68,0.12)', color: '#EF4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <ShieldAlert size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#EF4444' }}>Factory Reset</div>
                <div style={{ fontSize: 13, color: 'var(--db-muted)', marginTop: 3 }}>Delete all users, records, and progress. Irreversible.</div>
              </div>
              <button
                type="button"
                className="db-btn primary"
                onClick={handleFactoryReset}
                disabled={resetting}
                style={{ background: '#EF4444', boxShadow: 'none', border: 'none' }}
              >
                {resetting ? 'Resetting…' : 'Reset System'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
}
