import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import AppLayout from '../../components/AppLayout';
import {
  SearchIcon, ChevronDownIcon, CalendarIcon, ExternalLinkIcon, TableSortIcon,
} from '../../components/Icons';
import { formatMetric, getPlatformIcon } from '../../utils/format';
import { TIME_PERIODS } from '../../utils/constants';
import styles from './PostsPage.module.css';

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function truncate(str, max = 60) {
  if (!str) return '—';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

const SORT_COLS = ['posted_at', 'views', 'likes', 'shares'];

export default function PostsPage() {
  const { token, user } = useAuth();

  const [posts, setPosts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [creatorFilter, setCreatorFilter] = useState('all');
  const [timePeriod, setTimePeriod] = useState(30);

  const [sortCol, setSortCol] = useState('posted_at');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    if (!user?.sub) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/companies/${user.sub}/posts`, {}, token),
      apiFetch('/accounts', {}, token),
      apiFetch('/campaigns', {}, token),
    ])
      .then(([postsData, accountsData, campaignsData]) => {
        setPosts(postsData.posts || []);
        setAccounts(accountsData);
        setCampaigns(campaignsData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, user]);

  // Build account lookup map: account_id → { username, channel_name, campaign_name }
  const accountMap = useMemo(() => {
    const map = {};
    accounts.forEach(a => { map[a.id] = a; });
    return map;
  }, [accounts]);

  // Available platforms derived from accounts
  const availablePlatforms = useMemo(() => {
    const seen = new Set();
    return accounts
      .filter(a => a.channel_name && !seen.has(a.channel_name.toLowerCase()) && seen.add(a.channel_name.toLowerCase()))
      .map(a => a.channel_name);
  }, [accounts]);

  // Available creators scoped to current platform + campaign filter
  const availableCreators = useMemo(() => {
    return accounts.filter(a => {
      if (platformFilter !== 'all' && (a.channel_name || '').toLowerCase() !== platformFilter) return false;
      if (campaignFilter !== 'all' && String(a.campaign_id) !== campaignFilter) return false;
      return true;
    });
  }, [accounts, platformFilter, campaignFilter]);

  const filtered = useMemo(() => {
    let result = posts;

    // Time period
    if (timePeriod) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - timePeriod);
      result = result.filter(p => p.posted_at && new Date(p.posted_at) >= cutoff);
    }

    // Platform
    if (platformFilter !== 'all') {
      const ids = new Set(
        accounts.filter(a => (a.channel_name || '').toLowerCase() === platformFilter).map(a => a.id)
      );
      result = result.filter(p => ids.has(p.account_id));
    }

    // Campaign
    if (campaignFilter !== 'all') {
      const ids = new Set(
        accounts.filter(a => String(a.campaign_id) === campaignFilter).map(a => a.id)
      );
      result = result.filter(p => ids.has(p.account_id));
    }

    // Creator
    if (creatorFilter !== 'all') {
      result = result.filter(p => p.account_id === parseInt(creatorFilter));
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p => {
        const acc = accountMap[p.account_id];
        return (
          (p.caption || '').toLowerCase().includes(q) ||
          (acc?.username || '').toLowerCase().includes(q)
        );
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortCol === 'posted_at') {
        return (new Date(a.posted_at || 0) - new Date(b.posted_at || 0)) * dir;
      }
      return ((a[sortCol] || 0) - (b[sortCol] || 0)) * dir;
    });

    return result;
  }, [posts, timePeriod, platformFilter, campaignFilter, creatorFilter, search, sortCol, sortDir, accounts, accountMap]);

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  }

  function handlePlatformChange(val) {
    setPlatformFilter(val);
    setCreatorFilter('all');
  }

  function handleCampaignChange(val) {
    setCampaignFilter(val);
    setCreatorFilter('all');
  }

  return (
    <AppLayout>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Posts</h1>
        <span className={styles.postCount}>{loading ? '—' : filtered.length} posts</span>
      </div>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}><SearchIcon /></span>
          <input
            className={styles.searchInput}
            placeholder="Search creator or caption..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.selectWrap}>
          <span className={styles.selectCalendar}><CalendarIcon /></span>
          <select
            className={`${styles.filterSelect} ${styles.filterSelectDate}`}
            value={timePeriod ?? ''}
            onChange={e => setTimePeriod(e.target.value === '' ? null : Number(e.target.value))}
          >
            {TIME_PERIODS.map(t => (
              <option key={t.label} value={t.days ?? ''}>{t.label}</option>
            ))}
          </select>
          <span className={styles.selectChevron}><ChevronDownIcon /></span>
        </div>

        <div className={styles.selectWrap}>
          <select
            className={styles.filterSelect}
            value={platformFilter}
            onChange={e => handlePlatformChange(e.target.value)}
          >
            <option value="all">All Platforms</option>
            {availablePlatforms.map(p => (
              <option key={p} value={p.toLowerCase()}>
                {p.toLowerCase() === 'tiktok' ? 'TikTok' : p.toLowerCase() === 'instagram' ? 'Instagram' : p}
              </option>
            ))}
          </select>
          <span className={styles.selectChevron}><ChevronDownIcon /></span>
        </div>

        <div className={styles.selectWrap}>
          <select
            className={styles.filterSelect}
            value={campaignFilter}
            onChange={e => handleCampaignChange(e.target.value)}
          >
            <option value="all">All Campaigns</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <span className={styles.selectChevron}><ChevronDownIcon /></span>
        </div>

        <div className={styles.selectWrap}>
          <select
            className={styles.filterSelect}
            value={creatorFilter}
            onChange={e => setCreatorFilter(e.target.value)}
          >
            <option value="all">All Creators</option>
            {availableCreators.map(a => (
              <option key={a.id} value={a.id}>
                {a.username || `Account ${a.id}`}
              </option>
            ))}
          </select>
          <span className={styles.selectChevron}><ChevronDownIcon /></span>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        {loading ? (
          <p className={styles.stateMsg}>Loading posts...</p>
        ) : filtered.length === 0 ? (
          <p className={styles.stateMsg}>No posts found.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Creator</th>
                <th className={styles.th}>Platform</th>
                <th className={styles.th}>Caption</th>
                <th className={styles.th}>Link</th>
                <th
                  className={`${styles.th} ${styles.thSortable}`}
                  onClick={() => handleSort('posted_at')}
                >
                  Post Date <TableSortIcon col="posted_at" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th
                  className={`${styles.th} ${styles.thSortable} ${styles.thNum}`}
                  onClick={() => handleSort('views')}
                >
                  Views <TableSortIcon col="views" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th
                  className={`${styles.th} ${styles.thSortable} ${styles.thNum}`}
                  onClick={() => handleSort('likes')}
                >
                  Likes <TableSortIcon col="likes" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th
                  className={`${styles.th} ${styles.thSortable} ${styles.thNum}`}
                  onClick={() => handleSort('shares')}
                >
                  Shares <TableSortIcon col="shares" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className={`${styles.th} ${styles.thNum}`}>Saves</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const acc = accountMap[p.account_id];
                const platform = getPlatformIcon(acc?.channel_name);
                return (
                  <tr key={p.id} className={styles.tr}>
                    <td className={styles.td}>
                      <span className={styles.creatorName}>
                        @{acc?.username || `Account ${p.account_id}`}
                      </span>
                      {acc?.campaign_name && (
                        <span className={styles.campaignTag}>{acc.campaign_name}</span>
                      )}
                    </td>
                    <td className={styles.td}>
                      {platform ? (
                        <span className={styles.platformBadge}>
                          {platform.Icon && <platform.Icon size={11} />}
                          {platform.label}
                        </span>
                      ) : '—'}
                    </td>
                    <td className={`${styles.td} ${styles.captionCell}`}>
                      {truncate(p.caption)}
                    </td>
                    <td className={styles.td}>
                      {p.post_url ? (
                        <a
                          href={p.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.postLink}
                        >
                          <ExternalLinkIcon size={13} />
                          View
                        </a>
                      ) : '—'}
                    </td>
                    <td className={`${styles.td} ${styles.tdNum}`}>{formatDate(p.posted_at)}</td>
                    <td className={`${styles.td} ${styles.tdNum}`}>{formatMetric(p.views || 0)}</td>
                    <td className={`${styles.td} ${styles.tdNum}`}>{formatMetric(p.likes || 0)}</td>
                    <td className={`${styles.td} ${styles.tdNum}`}>{formatMetric(p.shares || 0)}</td>
                    <td className={`${styles.td} ${styles.tdNum}`}>—</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}
