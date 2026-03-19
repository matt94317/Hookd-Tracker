import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import styles from './SettingsPage.module.css';

const PREF_KEY = 'hookd_settings';

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; }
  catch { return {}; }
}

function Toggle({ checked, onChange }) {
  return (
    <label className={styles.toggle}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className={styles.slider} />
    </label>
  );
}

export default function SettingsPage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    logout();
    navigate('/login');
  }

  const [prefs, setPrefs] = useState(() => ({
    autoSync: false,
    weeklyReports: false,
    viralAlerts: false,
    ...loadPrefs(),
  }));

  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  function setPref(key, val) {
    setPrefs(prev => {
      const next = { ...prev, [key]: val };
      localStorage.setItem(PREF_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function handleManualSync() {
    setSyncing(true);
    setSyncMsg('');
    try {
      const accounts = await apiFetch('/accounts', {}, token);
      let count = 0;
      for (const acct of accounts) {
        if (acct.token_expires_at) {
          try {
            await apiFetch(`/accounts/${acct.id}/fetch-posts`, { method: 'POST' }, token);
            count++;
          } catch {}
        }
      }
      setSyncMsg(
        count > 0
          ? `Synced ${count} account${count !== 1 ? 's' : ''} successfully.`
          : 'No connected accounts to sync.'
      );
    } catch {
      setSyncMsg('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <AppLayout>
      <div className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Manage your app preferences</p>
      </div>

      {/* Auto Sync */}
      <div className={styles.card}>
        <div className={`${styles.iconWrap} ${styles.iconPurple}`}>&#9889;</div>
        <div className={styles.cardBody}>
          <div className={styles.cardRow}>
            <div>
              <div className={styles.cardTitle}>Automatic Sync</div>
              <div className={styles.cardDesc}>
                Automatically fetch new posts and update metrics for all tracked accounts
              </div>
            </div>
            <Toggle checked={prefs.autoSync} onChange={v => setPref('autoSync', v)} />
          </div>
          <button className={styles.primaryBtn} onClick={handleManualSync} disabled={syncing}>
            {syncing ? 'Syncing\u2026' : 'Run Manual Sync Now'}
          </button>
          {syncMsg && <p className={styles.syncMsg}>{syncMsg}</p>}
        </div>
      </div>

      {/* Notifications */}
      <div className={styles.card}>
        <div className={`${styles.iconWrap} ${styles.iconBell}`}>&#128276;</div>
        <div className={styles.cardBody}>
          <div className={styles.cardTitle} style={{ marginBottom: 16 }}>Notifications</div>
          <div className={styles.notifRow}>
            <div>
              <div className={styles.notifLabel}>Weekly Reports</div>
              <div className={styles.notifDesc}>Receive weekly performance summaries</div>
            </div>
            <Toggle checked={prefs.weeklyReports} onChange={v => setPref('weeklyReports', v)} />
          </div>
          <div className={styles.notifRow}>
            <div>
              <div className={styles.notifLabel}>Viral Alerts</div>
              <div className={styles.notifDesc}>Get notified when posts go viral</div>
            </div>
            <Toggle checked={prefs.viralAlerts} onChange={v => setPref('viralAlerts', v)} />
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <div className={styles.card}>
        <div className={`${styles.iconWrap} ${styles.iconRed}`}>&#128682;</div>
        <div className={styles.cardBody}>
          <div className={styles.cardRow}>
            <div>
              <div className={styles.cardTitle}>Sign Out</div>
              <div className={styles.cardDesc}>Sign out of your account on this device</div>
            </div>
            <button className={styles.signOutBtn} onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
