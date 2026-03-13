import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard',  icon: '📊' },
  { label: 'Campaigns', path: '/campaigns',  icon: '◎' },
  { label: 'Creators',  path: '/creators',   icon: '👤' },
  { label: 'Posts',     path: '/posts',      icon: '📋' },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo} onClick={() => navigate('/campaigns')}>
        Hookd Tracker
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ label, path, icon }) => (
          <button
            key={path}
            className={`${styles.navItem} ${location.pathname === path ? styles.active : ''}`}
            onClick={() => navigate(path)}
          >
            <span className={styles.icon}>{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      <button
        className={`${styles.navItem} ${location.pathname === '/settings' ? styles.active : ''}`}
        onClick={() => navigate('/settings')}
      >
        <span className={styles.icon}>⚙</span>
        Settings
      </button>

    </aside>
  );
}

export default Sidebar;
