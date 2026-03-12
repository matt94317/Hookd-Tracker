import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LoginPage.module.css';

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder — API integration added in Sprint 3
    console.log('Sign in attempted:', { email });
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.logo} onClick={() => navigate('/')}>Hookd Tracker</div>
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
            <a className={styles.linkSmall} href="#">Forgot password?</a>
          </div>

          <button className={styles.signInBtn} type="submit">
            Sign In
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
