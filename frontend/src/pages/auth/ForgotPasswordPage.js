import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import styles from './LoginPage.module.css';
import logo from '../../assets/Hookd-Tracker.png';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.logo} onClick={() => navigate('/')}>
        <img src={logo} alt="Hookd" className={styles.logoImg} />
        Hookd Tracker
      </div>

      <div className={styles.card}>
        {submitted ? (
          <>
            <h1 className={styles.heading}>Check your email</h1>
            <p style={{ fontSize: 14, color: '#7a6f63', marginBottom: 28, lineHeight: 1.6 }}>
              If <strong>{email}</strong> is registered, you'll receive a password reset link shortly. Check your spam folder if you don't see it.
            </p>
            <button
              className={styles.signInBtn}
              onClick={() => navigate('/login')}
            >
              Back to Sign In
            </button>
          </>
        ) : (
          <>
            <h1 className={styles.heading}>Forgot password?</h1>
            <p style={{ fontSize: 14, color: '#7a6f63', marginBottom: 28, lineHeight: 1.6 }}>
              Enter your email and we'll send you a link to reset your password.
            </p>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="email">Email</label>
                <input
                  className={styles.input}
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              {error && <p className={styles.errorMsg}>{error}</p>}

              <button className={styles.signInBtn} type="submit" disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>

            <p className={styles.signupPrompt}>
              <span
                className={styles.linkPrimary}
                onClick={() => navigate('/login')}
                style={{ cursor: 'pointer' }}
              >
                Back to Sign In
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
