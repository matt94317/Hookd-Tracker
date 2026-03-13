import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import styles from './RegisterPage.module.css';

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'msn.com',
  'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'ymail.com',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'aim.com',
  'protonmail.com', 'proton.me',
  'mail.com', 'gmx.com', 'gmx.net',
  'yandex.com', 'yandex.ru',
]);

function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('select'); // 'select' | 'form'
  const [role, setRole] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (selected) => {
    setRole(selected);
    setStep('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain || FREE_EMAIL_DOMAINS.has(domain)) {
      setError('Please use a professional work email address.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      });
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.logo} onClick={() => navigate('/')}>Hookd Tracker</div>

      {step === 'select' ? (
        <div className={styles.selectCard}>
          <h1 className={styles.selectHeading}>Who are you?</h1>
          <p className={styles.selectSubtext}>Choose how you'll be using Hookd Tracker</p>

          <div className={styles.roleGrid}>
            <button
              className={`${styles.roleBtn} ${styles.roleDark}`}
              onClick={() => handleRoleSelect('creator')}
            >
              <span className={styles.roleIcon}>🎬</span>
              <span className={styles.roleTitle}>I'm a Creator</span>
              <span className={styles.roleDesc}>I create content and want to manage my campaigns</span>
            </button>

            <button
              className={`${styles.roleBtn} ${styles.roleLight}`}
              onClick={() => handleRoleSelect('company')}
            >
              <span className={styles.roleIcon}>🏢</span>
              <span className={styles.roleTitle}>I'm Looking for Talent</span>
              <span className={styles.roleDesc}>I represent a brand and want to manage UGC creators</span>
            </button>
          </div>

          <p className={styles.loginPrompt}>
            Already have an account?{' '}
            <a className={styles.linkPrimary} onClick={() => navigate('/login')}>
              Sign in
            </a>
          </p>
        </div>
      ) : (
        <div className={styles.card}>
          <button className={styles.backBtn} onClick={() => setStep('select')}>
            ← Back
          </button>
          <h1 className={styles.heading}>Create account</h1>
          <p className={styles.subheading}>
            Signing up as a <strong>{role === 'creator' ? 'Creator' : 'Company'}</strong>
          </p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="name">
                {role === 'company' ? 'Company name' : 'Full name'}
              </label>
              <input
                className={styles.input}
                id="name"
                type="text"
                placeholder={role === 'company' ? 'Your company name' : 'Your name'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="email">
                {role === 'company' ? 'Work email address' : 'Email address'}
              </label>
              <input
                className={styles.input}
                id="email"
                type="email"
                placeholder={role === 'company' ? 'you@yourcompany.com' : 'name@example.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="password">Password</label>
              <input
                className={styles.input}
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <button className={styles.signUpBtn} type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </form>

          <p className={styles.loginPrompt}>
            Already have an account?{' '}
            <a className={styles.linkPrimary} onClick={() => navigate('/login')}>
              Sign in
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

export default RegisterPage;
