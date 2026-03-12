import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './RegisterPage.module.css';

function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('select'); // 'select' | 'form'
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRoleSelect = (selected) => {
    setRole(selected);
    setStep('form');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder — API integration added in Sprint 3
    console.log('Register attempted:', { email, role });
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
              <label className={styles.label} htmlFor="email">Email address</label>
              <input
                className={styles.input}
                id="email"
                type="email"
                placeholder="name@example.com"
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

            <button className={styles.signUpBtn} type="submit">
              Sign up
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
