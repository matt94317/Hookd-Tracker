import { useNavigate } from 'react-router-dom';
import styles from './LandingPage.module.css';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>Hookd Tracker</div>
        <button className={styles.loginBtn} onClick={() => navigate('/login')}>
          Log in →
        </button>
      </header>

      <main className={styles.hero}>
        <h1 className={styles.headline}>
          The Best UGC Management Platform
        </h1>
        <p className={styles.subtext}>
          A platform for companies to manage creators marketing campaigns across
          Instagram and TikTok — tracking performance and managing deliverables.
        </p>
        <button className={styles.ctaBtn} onClick={() => navigate('/login')}>
          Try for free →
        </button>
      </main>
    </div>
  );
}

export default LandingPage;
