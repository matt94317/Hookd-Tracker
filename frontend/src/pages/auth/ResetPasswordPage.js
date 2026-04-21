import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import styles from './LoginPage.module.css';
import logo from '../../assets/Hookd-Tracker.png';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, new_password: password }),
      });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.card}>
          <h1 className={styles.heading}>Invalid link</h1>
          <p style={{ fontSize: 14, color: '#7a6f63', marginBottom: 28 }}>
            This reset link is missing a token. Please request a new one.
          </p>
          <button className={styles.signInBtn} onClick={() => navigate('/forgot-password')}>
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.logo} onClick={() => navigate('/')}>
        <img src={logo} alt="Hookd" className={styles.logoImg} />
        Hookd Tracker
      </div>

      <div className={styles.card}>
        {done ? (
          <>
            <h1 className={styles.heading}>Password updated</h1>
            <p style={{ fontSize: 14, color: '#7a6f63', marginBottom: 28, lineHeight: 1.6 }}>
              Your password has been changed. You can now sign in with your new password.
            </p>
            <button className={styles.signInBtn} onClick={() => navigate('/login')}>
              Sign In
            </button>
          </>
        ) : (
          <>
            <h1 className={styles.heading}>Set new password</h1>
            <p style={{ fontSize: 14, color: '#7a6f63', marginBottom: 28, lineHeight: 1.6 }}>
              Choose a new password for your account.
            </p>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="password">New password</label>
                <input
                  className={styles.input}
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="confirm">Confirm password</label>
                <input
                  className={styles.input}
                  id="confirm"
                  type="password"
                  placeholder="Repeat your new password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
              </div>

              {error && <p className={styles.errorMsg}>{error}</p>}

              <button className={styles.signInBtn} type="submit" disabled={loading}>
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
