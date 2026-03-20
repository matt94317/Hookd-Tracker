import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import AppLayout from '../../components/AppLayout';
import { SearchIcon, ChevronDownIcon, UserIcon } from '../../components/Icons';
import { getPlatformIcon } from '../../utils/format';
import styles from './AccountsPage.module.css';

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
        a => (a.username && a.username.toLowerCase().includes(q))
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
