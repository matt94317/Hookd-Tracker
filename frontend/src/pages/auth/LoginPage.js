import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import styles from './LoginPage.module.css';
import logo from '../../assets/Hookd-Tracker.png';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const registered = location.state?.registered;
  const redirectTo = location.state?.redirectTo;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      login(data.access_token);
      navigate(redirectTo || '/campaigns');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {registered && (
        <div className={styles.successBanner}>
          Your account has been created. Sign in to get started.
        </div>
      )}
      <div className={styles.logo} onClick={() => navigate('/')}>
        <img src={logo} alt="Hookd" className={styles.logoImg} />
        Hookd Tracker
      </div>
      <div className={styles.card}>
        <h1 className={styles.heading}>Welcome back</h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              className={styles.input}
              id="email"
              type="email"
              placeholder="you@example.com"
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className={styles.forgotRow}>
            <span
              className={styles.linkSmall}
              onClick={() => navigate('/forgot-password')}
              style={{ cursor: 'pointer' }}
            >
              Forgot password?
            </span>
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <button className={styles.signInBtn} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className={styles.signupPrompt}>
          Don't have an account?{' '}
          <a className={styles.linkPrimary} onClick={() => navigate('/register')} style={{ cursor: 'pointer' }}>Sign Up</a>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
