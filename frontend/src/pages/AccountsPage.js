import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import AppLayout from '../components/AppLayout';
import styles from './AccountsPage.module.css';

/* ── Icons ── */
const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const TikTokIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.77 1.52V6.78a4.85 4.85 0 0 1-1-.09z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
);

const UserIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

function getPlatformIcon(platform) {
  if (!platform) return null;
  const lower = platform.toLowerCase();
  if (lower === 'tiktok') return { label: 'TikTok', Icon: TikTokIcon };
  if (lower === 'instagram') return { label: 'Instagram', Icon: InstagramIcon };
  return { label: platform.charAt(0).toUpperCase() + platform.slice(1), Icon: null };
}

/* ── Account Card ── */
function AccountCard({ account }) {
  const platform = getPlatformIcon(account.channel_name);

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.accountInfo}>
          <div className={styles.avatar}><UserIcon size={22} /></div>
          <div className={styles.accountMeta}>
            <span className={styles.accountUsername}>
              @{account.username || account.platform_account_id || '—'}
            </span>
            {account.campaign_name && (
              <span className={styles.accountCampaign}>{account.campaign_name}</span>
            )}
          </div>
        </div>
        {platform && (
          <div className={styles.platformBadge}>
            {platform.Icon && <platform.Icon />}
            <span>{platform.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Page ── */
export default function AccountsPage() {
  const { token } = useAuth();

  const [accounts, setAccounts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      apiFetch('/accounts', {}, token),
      apiFetch('/campaigns', {}, token),
    ])
      .then(([accts, camps]) => {
        setAccounts(accts);
        setCampaigns(camps);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const platformOptions = useMemo(() => {
    const seen = new Set();
    return accounts
      .map(a => a.channel_name)
      .filter(p => p && !seen.has(p) && seen.add(p));
  }, [accounts]);

  const filtered = useMemo(() => {
    let result = accounts;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        a => (a.username && a.username.toLowerCase().includes(q)) ||
             (a.creator_name && a.creator_name.toLowerCase().includes(q))
      );
    }
    if (platformFilter !== 'all') {
      result = result.filter(a => (a.channel_name || '').toLowerCase() === platformFilter.toLowerCase());
    }
    if (campaignFilter !== 'all') {
      result = result.filter(a => String(a.campaign_id) === String(campaignFilter));
    }
    return result;
  }, [accounts, search, platformFilter, campaignFilter]);

  return (
    <AppLayout>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Accounts</h1>
          <p className={styles.subtitle}>
            {accounts.length} total account{accounts.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}><SearchIcon /></span>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.filterSelectWrap}>
          <select
            className={styles.filterSelect}
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
          >
            <option value="all">All Platforms</option>
            {platformOptions.map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
          <span className={styles.filterSelectChevron}><ChevronDownIcon /></span>
        </div>

        <div className={styles.filterSelectWrap}>
          <select
            className={styles.filterSelect}
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
          >
            <option value="all">All Campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <span className={styles.filterSelectChevron}><ChevronDownIcon /></span>
        </div>
      </div>

      {/* Content */}
      {loading && <p className={styles.stateMsg}>Loading...</p>}
      {error && <p className={styles.errorMsg}>{error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <p className={styles.stateMsg}>No accounts found.</p>
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className={styles.grid}>
          {filtered.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
