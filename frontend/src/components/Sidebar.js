import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Sidebar.module.css';

const Icon = ({ d, children, viewBox = '0 0 24 24' }) => (
  <svg
    width="19" height="19" viewBox={viewBox}
    fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    {d ? <path d={d} /> : children}
  </svg>
);

const BASE_NAV_ITEMS = [
  {
    label: 'Home', path: '/home',
    icon: <Icon><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></Icon>,
  },
  {
    label: 'Campaigns', path: '/campaigns',
    icon: <Icon><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></Icon>,
  },
  {
    label: 'Analytics', path: '/analytics', creatorOnly: true,
    icon: <Icon><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></Icon>,
  },
  {
    label: 'Payroll', path: '/payroll',
    icon: <Icon><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></Icon>,
  },
  {
    label: 'Creators', path: '/creators',
    icon: <Icon><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Icon>,
  },
  {
    label: 'Posts', path: '/posts',
    icon: <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></Icon>,
  },
];

const SettingsIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </Icon>
);

const LogoIcon = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
  </svg>
);

const UserIcon = () => (
  <Icon>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </Icon>
);

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const navItems = BASE_NAV_ITEMS.filter((item) => !item.creatorOnly || user?.role === 'creator');

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoRow} onClick={() => navigate('/dashboard')}>
        <span className={styles.logoIcon}><LogoIcon /></span>
        <span className={styles.logoText}>Hookd Tracker</span>
      </div>

      {user && (
        <div className={styles.accountRow}>
          <span className={styles.navIcon}><UserIcon /></span>
          <span className={styles.accountEmail}>{user.email}</span>
        </div>
      )}

      <nav className={styles.nav}>
        {navItems.map(({ label, path, icon }) => (
          <button
            key={path}
            className={`${styles.navItem} ${location.pathname === path ? styles.active : ''}`}
            onClick={() => navigate(path)}
          >
            <span className={styles.navIcon}>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <button
        className={`${styles.navItem} ${location.pathname === '/settings' ? styles.active : ''}`}
        onClick={() => navigate('/settings')}
      >
        <span className={styles.navIcon}><SettingsIcon /></span>
        <span>Settings</span>
      </button>
    </aside>
  );
}

export default Sidebar;
