import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { PLANS } from '../../utils/constants';
import styles from './SubscriptionPage.module.css';

const PLAN_LIMITS = {
  starter: { campaigns: 3, accounts: 5 },
  pro:     { campaigns: 10, accounts: 20 },
};

function UsageMeter({ label, current, limit }) {
  const pct = limit ? Math.min((current / limit) * 100, 100) : 0;
  const isAtLimit   = pct >= 100;
  const isNearLimit = pct >= 80 && !isAtLimit;

  return (
    <div className={styles.meter}>
      <div className={styles.meterHeader}>
        <span className={styles.meterLabel}>{label}</span>
        <span className={`${styles.meterCount} ${isAtLimit ? styles.meterAtLimit : isNearLimit ? styles.meterNearLimit : ''}`}>
          {current} / {limit}
        </span>
      </div>
      <div className={styles.meterTrack}>
        <div
          className={`${styles.meterFill} ${isAtLimit ? styles.fillRed : isNearLimit ? styles.fillOrange : styles.fillGreen}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const { token } = useAuth();
  const navigate   = useNavigate();

  const [subscription,  setSubscription]  = useState(null);
  const [usage,         setUsage]         = useState({ campaigns: 0, accounts: 0 });
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg,           setMsg]           = useState('');
  const [msgType,       setMsgType]       = useState('');   // 'success' | 'error'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') === 'success') { setMsg('Subscription activated! Welcome aboard.'); setMsgType('success'); }
    if (params.get('billing') === 'cancel')  { setMsg('Checkout cancelled. No charges were made.'); setMsgType('error'); }
  }, []);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiFetch('/payments/subscription', {}, token),
      apiFetch('/campaigns', {}, token).catch(() => []),
      apiFetch('/accounts', {}, token).catch(() => []),
    ])
      .then(([subData, campaigns, accounts]) => {
        setSubscription(subData.subscription);
        setUsage({
          campaigns: Array.isArray(campaigns) ? campaigns.length : 0,
          accounts:  Array.isArray(accounts)  ? accounts.length  : 0,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubscribe(plan) {
    setActionLoading(true);
    setMsg('');
    try {
      const { checkout_url } = await apiFetch('/payments/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      }, token);
      window.location.href = checkout_url;
    } catch (err) {
      setMsg(err.message || 'Failed to start checkout.');
      setMsgType('error');
      setActionLoading(false);
    }
  }

  async function handleManageBilling() {
    setActionLoading(true);
    setMsg('');
    try {
      const { portal_url } = await apiFetch('/payments/create-portal-session', {
        method: 'POST',
      }, token);
      window.location.href = portal_url;
    } catch (err) {
      setMsg(err.message || 'Failed to open billing portal.');
      setMsgType('error');
      setActionLoading(false);
    }
  }

  const currentPlanIndex = subscription ? PLANS.findIndex(p => p.key === subscription.plan) : -1;
  const limits           = subscription ? PLAN_LIMITS[subscription.plan] : null;

  return (
    <AppLayout>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')}>
          ← Back to Settings
        </button>
        <h1 className={styles.title}>Billing &amp; Subscription</h1>
        <p className={styles.subtitle}>Manage your plan and billing details</p>
      </div>

      {msg && (
        <div className={`${styles.msgBanner} ${msgType === 'success' ? styles.msgSuccess : styles.msgError}`}>
          {msg}
        </div>
      )}

      {loading ? (
        <p className={styles.loadingText}>Loading…</p>
      ) : subscription ? (
        <>
          {/* ── Current plan card ── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Current Plan</h2>
            <div className={styles.currentCard}>
              <div className={styles.currentCardTop}>
                <div className={styles.badgeRow}>
                  <span className={styles.planBadge}>
                    {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
                  </span>
                  <span className={`${styles.statusBadge} ${subscription.status === 'active' || subscription.status === 'trialing' ? styles.statusActive : styles.statusInactive}`}>
                    {subscription.status}
                  </span>
                </div>
                <button
                  className={styles.manageBtn}
                  onClick={handleManageBilling}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Loading…' : 'Manage Billing'}
                </button>
              </div>

              {subscription.current_period_end && (
                <p className={styles.renewalText}>
                  Renews {new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </p>
              )}

              {limits && (
                <div className={styles.usageGrid}>
                  <UsageMeter label="Campaigns" current={usage.campaigns} limit={limits.campaigns} />
                  <UsageMeter label="Creators"  current={usage.accounts}  limit={limits.accounts}  />
                </div>
              )}
            </div>
          </section>

          {/* ── Change plan ── */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Change Plan</h2>
            <div className={styles.planGrid}>
              {PLANS.map((plan, idx) => {
                const isCurrent  = plan.key === subscription.plan;
                const isUpgrade  = idx > currentPlanIndex;
                return (
                  <div key={plan.key} className={`${styles.planCard} ${isCurrent ? styles.planCardActive : ''}`}>
                    {isCurrent && <div className={styles.currentPill}>Current Plan</div>}
                    <div className={styles.planName}>{plan.name}</div>
                    <div className={styles.planPrice}>
                      {plan.price}<span className={styles.planPeriod}>{plan.period}</span>
                    </div>
                    <ul className={styles.planFeatures}>
                      {plan.features.map(f => <li key={f}>{f}</li>)}
                    </ul>
                    {!isCurrent && (
                      <button
                        className={isUpgrade ? styles.upgradeBtn : styles.downgradeBtn}
                        onClick={() => handleSubscribe(plan.key)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? 'Loading…' : isUpgrade ? '↑ Upgrade' : '↓ Downgrade'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        /* ── No subscription — choose a plan ── */
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Choose a Plan</h2>
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
                  className={styles.upgradeBtn}
                  onClick={() => handleSubscribe(plan.key)}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Loading…' : 'Subscribe'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </AppLayout>
  );
}
