import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import styles from './SettingsPage.module.css';

const PREF_KEY = 'hookd_settings';

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: '$150',
    period: '/mo',
    features: ['5 creators', '3 campaigns', 'Basic analytics'],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$270',
    period: '/mo',
    features: ['20 creators', '10 campaigns', 'Advanced analytics', 'Priority support'],
  },
];

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
  const { token, logout, user } = useAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    logout();
    navigate('/login');
  }

  // ── Billing ──────────────────────────────────────────────────────────────
  const [subscription, setSubscription] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingMsg, setBillingMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') === 'success') setBillingMsg('Subscription activated! Welcome aboard.');
    if (params.get('billing') === 'cancel') setBillingMsg('Checkout cancelled. No charges were made.');
  }, []);

  useEffect(() => {
    if (user?.role !== 'company' && user?.role !== 'admin') return;
    apiFetch('/payments/subscription', {}, token)
      .then(d => setSubscription(d.subscription))
      .catch(() => {});
  }, [token, user]);

  async function handleSubscribe(plan) {
    setBillingLoading(true);
    setBillingMsg('');
    try {
      const { checkout_url } = await apiFetch('/payments/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      }, token);
      window.location.href = checkout_url;
    } catch (err) {
      setBillingMsg(err.message || 'Failed to start checkout.');
      setBillingLoading(false);
    }
  }

  async function handleManageBilling() {
    setBillingLoading(true);
    setBillingMsg('');
    try {
      const { portal_url } = await apiFetch('/payments/create-portal-session', {
        method: 'POST',
      }, token);
      window.location.href = portal_url;
    } catch (err) {
      setBillingMsg(err.message || 'Failed to open billing portal.');
      setBillingLoading(false);
    }
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

      {/* Billing — visible to company/admin only */}
      {(user?.role === 'company' || user?.role === 'admin') && (
        <div className={styles.card}>
          <div className={`${styles.iconWrap} ${styles.iconBlue}`}>💳</div>
          <div className={styles.cardBody}>
            <div className={styles.cardTitle} style={{ marginBottom: 12 }}>Billing &amp; Subscription</div>

            {billingMsg && (
              <p className={`${styles.syncMsg} ${billingMsg.includes('activated') ? styles.billingSuccess : styles.billingError}`}>
                {billingMsg}
              </p>
            )}

            {subscription ? (
              <div className={styles.currentPlan}>
                <div className={styles.planBadgeRow}>
                  <span className={styles.planBadge}>{subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}</span>
                  <span className={`${styles.planStatus} ${subscription.status === 'active' ? styles.statusActive : styles.statusInactive}`}>
                    {subscription.status}
                  </span>
                </div>
                {subscription.current_period_end && (
                  <p className={styles.cardDesc} style={{ marginTop: 6 }}>
                    Renews {new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
                <button
                  className={styles.primaryBtn}
                  style={{ marginTop: 16 }}
                  onClick={handleManageBilling}
                  disabled={billingLoading}
                >
                  {billingLoading ? 'Loading…' : 'Manage Billing'}
                </button>
              </div>
            ) : (
              <div className={styles.planGrid}>
                {PLANS.map(plan => (
                  <div key={plan.key} className={styles.planCard}>
                    <div className={styles.planName}>{plan.name}</div>
                    <div className={styles.planPrice}>
                      {plan.price}<span className={styles.planPeriod}>{plan.period}</span>
                    </div>
                    <ul className={styles.planFeatures}>
                      {plan.features.map(f => <li key={f}>{f}</li>)}
                    </ul>
                    <button
                      className={styles.primaryBtn}
                      style={{ width: '100%' }}
                      onClick={() => handleSubscribe(plan.key)}
                      disabled={billingLoading}
                    >
                      {billingLoading ? 'Loading…' : `Subscribe`}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
