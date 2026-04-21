import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { PLANS } from '../../utils/constants';
import styles from './PlanSelectionPage.module.css';
import logo from '../../assets/Hookd-Tracker.png';

const PLANS_WITH_HIGHLIGHT = PLANS.map(p =>
  p.key === 'pro' ? { ...p, highlighted: true } : p
);

export default function PlanSelectionPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');

  async function handleSelectPlan(plan) {
    setLoading(plan);
    setError('');
    try {
      const { checkout_url } = await apiFetch('/payments/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      }, token);
      window.location.href = checkout_url;
    } catch (err) {
      setError(err.message || 'Failed to start checkout. Please try again.');
      setLoading(null);
    }
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.logo} onClick={() => navigate('/')}>
        <img src={logo} alt="Hookd" className={styles.logoImg} />
        Hookd Tracker
      </div>
      <div className={styles.container}>
        <h1 className={styles.heading}>Choose your plan</h1>
        <p className={styles.subheading}>Start growing your creator network today. Cancel anytime.</p>

        {error && <p className={styles.errorMsg}>{error}</p>}

        <div className={styles.planGrid}>
          {PLANS_WITH_HIGHLIGHT.map(plan => (
            <div
              key={plan.key}
              className={`${styles.planCard} ${plan.highlighted ? styles.planCardHighlighted : ''}`}
            >
              {plan.highlighted && <div className={styles.popularBadge}>Most Popular</div>}
              <div className={styles.planName}>{plan.name}</div>
              <div className={styles.planPrice}>
                {plan.price}<span className={styles.planPeriod}>{plan.period}</span>
              </div>
              <ul className={styles.planFeatures}>
                {plan.features.map(f => <li key={f}>{f}</li>)}
              </ul>
              <button
                className={`${styles.selectBtn} ${plan.highlighted ? styles.selectBtnHighlighted : ''}`}
                onClick={() => handleSelectPlan(plan.key)}
                disabled={loading !== null}
              >
                {loading === plan.key ? 'Redirecting…' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>

        <p className={styles.skipLink}>
          <span className={styles.link} onClick={() => navigate('/campaigns')}>
            Skip for now — I'll set this up later
          </span>
        </p>
      </div>
    </div>
  );
}
