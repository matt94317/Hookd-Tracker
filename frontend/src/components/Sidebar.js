import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import styles from './Sidebar.module.css';
import logo from '../assets/Hookd-Tracker.png';

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
    label: 'Payroll', path: '/payroll',
    icon: <Icon><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></Icon>,
  },
  {
    label: 'Accounts', path: '/accounts',
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

const UserIcon = () => (
  <Icon>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </Icon>
);

const LogoutIcon = () => (
  <Icon>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </Icon>
);

const SunIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </Icon>
);

const MoonIcon = () => (
  <Icon><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></Icon>
);

const MonitorIcon = () => (
  <Icon>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </Icon>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: <SunIcon /> },
  { value: 'dark',  label: 'Dark',  icon: <MoonIcon /> },
  { value: 'system', label: 'System', icon: <MonitorIcon /> },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navItems = BASE_NAV_ITEMS;
  const [menuOpen, setMenuOpen] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setShowThemes(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  function handleSettings() {
    navigate('/settings');
    setMenuOpen(false);
    setShowThemes(false);
  }

  function handleLogout() {
    logout();
    setMenuOpen(false);
  }

  function handleThemeSelect(value) {
    setTheme(value);
    setShowThemes(false);
    setMenuOpen(false);
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoRow} onClick={() => navigate('/dashboard')}>
        <img src={logo} alt="Hookd" className={styles.logoImg} />
        <span className={styles.logoText}>Hookd Tracker</span>
      </div>

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

      <div className={styles.bottomSection} ref={menuRef}>
        {menuOpen && (
          <div className={styles.accountMenu}>
            {showThemes ? (
              <>
                <div className={styles.themeLabel}>Appearance</div>
                <div className={styles.themeOptions}>
                  {THEME_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      className={`${styles.themeOption} ${theme === opt.value ? styles.themeOptionActive : ''}`}
                      onClick={() => handleThemeSelect(opt.value)}
                    >
                      <span className={styles.themeOptionIcon}>{opt.icon}</span>
                      {opt.label}
                      {theme === opt.value && (
                        <span className={styles.checkmark}><CheckIcon /></span>
                      )}
                    </button>
                  ))}
                </div>
                <div className={styles.menuDivider} />
                <button className={styles.menuItem} onClick={handleSettings}>
                  <span className={styles.menuItemIcon}><SettingsIcon /></span>
                  Settings
                </button>
                <div className={styles.menuDivider} />
                <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={handleLogout}>
                  <span className={styles.menuItemIcon}><LogoutIcon /></span>
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button className={styles.menuItem} onClick={() => setShowThemes(true)}>
                  <span className={styles.menuItemIcon}><SunIcon /></span>
                  Appearance
                  <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
                <button className={styles.menuItem} onClick={handleSettings}>
                  <span className={styles.menuItemIcon}><SettingsIcon /></span>
                  Settings
                </button>
                <div className={styles.menuDivider} />
                <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={handleLogout}>
                  <span className={styles.menuItemIcon}><LogoutIcon /></span>
                  Sign Out
                </button>
              </>
            )}
          </div>
        )}

        {user && (
          <button
            className={`${styles.accountBtn} ${menuOpen ? styles.accountBtnActive : ''}`}
            onClick={() => { setMenuOpen(o => !o); setShowThemes(false); }}
          >
            <span className={styles.navIcon}><UserIcon /></span>
            <span className={styles.accountEmail}>{user.email}</span>
            <svg
              className={`${styles.chevron} ${menuOpen ? styles.chevronUp : ''}`}
              width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
