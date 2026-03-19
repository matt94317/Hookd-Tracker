import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import AppLayout from '../../components/AppLayout';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import styles from './CampaignDetailsPage.module.css';

/* ── SVG icons ── */
const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const MoreIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>
  </svg>
);

/* ── Constants ── */
const TIME_PERIODS = [
  { label: 'Last 7 Days',    days: 7 },
  { label: 'Last 30 Days',   days: 30 },
  { label: 'Last 90 Days',   days: 90 },
  { label: 'Last 12 Months', days: 365 },
  { label: 'All Time',       days: null },
];

const TABS = ['Overview', 'Rank', 'Notifications', 'Tasks', 'Uploads'];
const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F'];
const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#3b82f6', '#10b981'];

/* ── Helpers ── */
function formatMetric(n) {
  if (n == null || isNaN(n)) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 10_000)    return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function abbreviateName(name) {
  if (!name) return '—';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function avatarColor(name) {
  const hash = [...(name || 'X')].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function assignTier(rows) {
  // Sort by views descending, then assign Gold/Silver/Bronze by thirds
  const sorted = [...rows].sort((a, b) => b.views - a.views);
  return sorted.map((r, i) => {
    const pct = sorted.length > 1 ? i / (sorted.length - 1) : 0;
    const tier = pct < 0.34 ? 'Gold' : pct < 0.67 ? 'Silver' : 'Bronze';
    return { ...r, tier };
  });
}

const SortIcon = ({ col, sortCol, sortDir }) => (
  <svg width="9" height="11" viewBox="0 0 9 11" fill="none" style={{ marginLeft: 4, flexShrink: 0 }}>
    <path d="M4.5 0L0 3.5h9L4.5 0z"   fill={sortCol === col && sortDir === 'asc'  ? '#111827' : '#d1d5db'}/>
    <path d="M4.5 11L0 7.5h9L4.5 11z" fill={sortCol === col && sortDir === 'desc' ? '#111827' : '#d1d5db'}/>
  </svg>
);

function getCurrentWeekDays() {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function minsAgo(date) {
  const mins = Math.floor((Date.now() - date) / 60000);
  return mins < 1 ? 'just now' : `${mins} min ago`;
}

/* ── Component ── */
export default function CampaignDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [campaign, setCampaign] = useState(null);
  const [posts, setPosts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [activeTab, setActiveTab] = useState('Overview');
  const [timePeriod, setTimePeriod] = useState(365);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lbSortCol, setLbSortCol] = useState('views');
  const [lbSortDir, setLbSortDir] = useState('desc');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch(`/campaigns/${id}`, {}, token),
      apiFetch(`/campaigns/${id}/posts`, {}, token),
      apiFetch(`/campaigns/${id}/accounts`, {}, token),
    ])
      .then(([camp, postsData, accountsData]) => {
        setCampaign(camp);
        setPosts(postsData.posts || []);
        setAccounts(accountsData);
        setLastUpdated(new Date());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, token, refreshKey]);

  /* ── Filtered posts ── */
  const filteredPosts = useMemo(() => {
    let result = posts;
    if (selectedAccount !== 'all') {
      const aid = parseInt(selectedAccount);
      result = result.filter(p => p.account_id === aid);
    }
    if (timePeriod) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - timePeriod);
      result = result.filter(p => p.posted_at && new Date(p.posted_at) >= cutoff);
    }
    return result;
  }, [posts, timePeriod, selectedAccount]);

  /* ── Metrics ── */
  const metrics = useMemo(() => {
    const videos   = filteredPosts.length;
    const views    = filteredPosts.reduce((s, p) => s + (p.views    || 0), 0);
    const likes    = filteredPosts.reduce((s, p) => s + (p.likes    || 0), 0);
    const comments = filteredPosts.reduce((s, p) => s + (p.comments || 0), 0);
    const shares   = filteredPosts.reduce((s, p) => s + (p.shares   || 0), 0);
    const engagementRate = views > 0 ? ((likes + comments + shares) / views) * 100 : 0;
    const commentRate    = views > 0 ? (comments / views) * 100 : 0;
    return { videos, views, likes, comments, shares, engagementRate, commentRate };
  }, [filteredPosts]);

  /* ── Chart data ── */
  const chartData = useMemo(() => {
    const useMonthly = timePeriod === null || timePeriod >= 90;
    const map = {};
    filteredPosts.forEach(p => {
      if (!p.posted_at) return;
      const d = new Date(p.posted_at);
      const key = useMonthly
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : d.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + (p.views || 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, views]) => ({ date, views }));
  }, [filteredPosts, timePeriod]);

  /* ── Creator progress ── */
  const creatorProgress = useMemo(() => {
    if (!accounts.length) return [];
    const weekDays = getCurrentWeekDays();
    return accounts.map(acc => {
      const accPosts = posts.filter(p => p.account_id === acc.id);
      const weekPosts = weekDays.map(day => {
        const next = new Date(day);
        next.setDate(day.getDate() + 1);
        return accPosts.filter(p => {
          if (!p.posted_at) return false;
          const t = new Date(p.posted_at);
          return t >= day && t < next;
        }).length;
      });
      const dailyTarget  = acc.daily_target  || 0;
      const monthlyTarget = acc.monthly_target || 0;
      const weeklyTarget  = dailyTarget > 0 ? dailyTarget * 5 : monthlyTarget;
      return {
        id:           acc.id,
        username:     acc.username || `Account ${acc.id}`,
        channelName:  acc.channel_name || '',
        creatorName:  acc.creator_name || '',
        totalPosts:   accPosts.length,
        monthlyTarget,
        weeklyTarget,
        dailyTarget,
        weekPosts,
      };
    });
  }, [accounts, posts]);

  /* ── Leaderboard data ── */
  const leaderboardData = useMemo(() => {
    if (!accounts.length) return [];
    const raw = accounts.map(acc => {
      const accPosts = posts.filter(p => p.account_id === acc.id);
      const videos   = accPosts.length;
      const views    = accPosts.reduce((s, p) => s + (p.views || 0), 0);
      const likes    = accPosts.reduce((s, p) => s + (p.likes || 0), 0);
      const avgViews = videos > 0 ? Math.round(views / videos) : 0;
      const breakouts = accPosts.filter(p => (p.views || 0) > avgViews * 2).length;
      return {
        id:   acc.id,
        name: abbreviateName(acc.creator_name || acc.username),
        fullName: acc.creator_name || acc.username || `Account ${acc.id}`,
        videos, views, avgViews, likes, breakouts,
      };
    });
    const withTiers = assignTier(raw);
    return [...withTiers].sort((a, b) => {
      const v = lbSortDir === 'asc' ? 1 : -1;
      if (typeof a[lbSortCol] === 'number') return (a[lbSortCol] - b[lbSortCol]) * v;
      return String(a[lbSortCol]).localeCompare(String(b[lbSortCol])) * v;
    });
  }, [accounts, posts, lbSortCol, lbSortDir]);

  function handleLbSort(col) {
    if (lbSortCol === col) setLbSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setLbSortCol(col); setLbSortDir('desc'); }
  }

  /* ── Metric cards config ── */
  const metricCards = [
    { label: 'Videos',          value: formatMetric(metrics.videos) },
    { label: 'Likes',           value: formatMetric(metrics.likes) },
    { label: 'Saves',           value: '0' },
    { label: 'Shares',          value: formatMetric(metrics.shares) },
    { label: 'Views',           value: formatMetric(metrics.views) },
    { label: 'Comments',        value: formatMetric(metrics.comments) },
    { label: 'Engagement rate', value: Math.round(metrics.engagementRate) + '%', info: true },
    { label: 'Comment rate',    value: Math.round(metrics.commentRate) + '%',    info: true },
  ];

  const useMonthlyAxis = timePeriod === null || timePeriod >= 90;

  const platformLabel = name => {
    if (!name) return 'TT';
    if (name.toLowerCase() === 'tiktok')    return 'TT';
    if (name.toLowerCase() === 'instagram') return 'IG';
    return name.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return <AppLayout><p className={styles.stateMsg}>Loading...</p></AppLayout>;
  }

  return (
    <AppLayout>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <button className={styles.breadcrumbLink} onClick={() => navigate('/campaigns')}>
          Campaigns
        </button>
        <span className={styles.breadcrumbSep}><ChevronRightIcon /></span>
        <span className={styles.breadcrumbCurrent}>{campaign?.name || 'Campaign'}</span>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <>
          {/* Filter bar */}
          <div className={styles.filterBar}>
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
                value={selectedAccount}
                onChange={e => setSelectedAccount(e.target.value)}
              >
                <option value="all">Creators: All creators</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.username || `Account ${a.id}`}
                  </option>
                ))}
              </select>
              <span className={styles.selectChevron}><ChevronDownIcon /></span>
            </div>

            <button
              className={styles.refreshBtn}
              onClick={() => setRefreshKey(k => k + 1)}
            >
              <RefreshIcon /> Refresh
            </button>

            {lastUpdated && (
              <span className={styles.updateInfo}>
                Updated {minsAgo(lastUpdated)}&nbsp;&nbsp;|&nbsp;&nbsp;24hr data sync
                <span className={styles.infoIcon}>ⓘ</span>
              </span>
            )}

            <button className={styles.moreBtn}><MoreIcon /></button>
          </div>

          {/* Metrics card */}
          <div className={styles.metricsCard}>
            {metricCards.map(m => (
              <div key={m.label} className={styles.metricCell}>
                <span className={styles.metricValue}>{m.value}</span>
                <span className={styles.metricLabel}>
                  {m.label}
                  {m.info && <span className={styles.infoIcon}>ⓘ</span>}
                </span>
              </div>
            ))}
          </div>

          {/* Chart card */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h2 className={styles.chartTitle}>Daily Views Over Time</h2>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" vertical={false}/>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => {
                    if (useMonthlyAxis) {
                      return new Date(v + '-15').toLocaleDateString('en-US', { month: 'short' });
                    }
                    return new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => v >= 1000 ? (v / 1000) + 'k' : v}
                  width={36}
                />
                <Tooltip
                  contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                  formatter={v => [v.toLocaleString(), 'Views']}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#viewsGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#6366f1' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Creator Progress */}
          <div className={styles.progressSection}>
            <div className={styles.progressHeader}>
              <h2 className={styles.progressTitle}>Creator Progress</h2>
              <button className={styles.seeAllBtn} onClick={() => navigate('/posts')}>
                See all posts
              </button>
            </div>

            {creatorProgress.length === 0 ? (
              <p className={styles.stateMsg}>No creators assigned to this campaign.</p>
            ) : (
              <div className={styles.progressGrid}>
                {creatorProgress.map(c => (
                  <div key={c.id} className={styles.progressCard}>
                    <div className={styles.progressCardTop}>
                      <div className={styles.progressUsernameRow}>
                        <span className={styles.progressUsername}>
                          @{c.username.replace(/^@/, '')}
                        </span>
                        <span className={styles.platformBadge}>{platformLabel(c.channelName)}</span>
                      </div>
                      <span className={styles.progressPostCount}>
                        {c.totalPosts}/{c.monthlyTarget || '—'} posts
                      </span>
                    </div>

                    {c.creatorName && (
                      <p className={styles.progressRealName}>{c.creatorName}</p>
                    )}
                    <p className={styles.progressTarget}>
                      {c.weeklyTarget || '—'} posts/week target
                    </p>

                    <div className={styles.dayBubbles}>
                      {WEEK_LABELS.map((label, i) => {
                        const count = c.weekPosts[i] || 0;
                        const hit   = c.dailyTarget > 0 && count >= c.dailyTarget;
                        const bubbleClass = hit
                          ? styles.bubbleFull
                          : count > 0
                          ? styles.bubblePartial
                          : styles.bubbleEmpty;
                        return (
                          <div key={i} className={styles.dayBubble}>
                            <div className={`${styles.bubble} ${bubbleClass}`}>{count}</div>
                            <span className={styles.dayLabel}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'Rank' && (
        <div className={styles.leaderboardCard}>
          <h2 className={styles.lbTitle}>Creator Performance</h2>
          <table className={styles.lbTable}>
            <thead>
              <tr>
                {[
                  { key: 'name',     label: 'Creator' },
                  { key: 'tier',     label: 'Tier' },
                  { key: 'videos',   label: 'Videos' },
                  { key: 'views',    label: 'Views' },
                  { key: 'avgViews', label: 'Avg. views' },
                  { key: 'likes',    label: 'Likes' },
                ].map(({ key, label }) => (
                  <th key={key} className={styles.lbTh} onClick={() => handleLbSort(key)}>
                    <span className={styles.lbThInner}>
                      {label}
                      <SortIcon col={key} sortCol={lbSortCol} sortDir={lbSortDir} />
                    </span>
                  </th>
                ))}
                <th className={styles.lbTh}>Breakouts</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData.length === 0 ? (
                <tr><td colSpan={7} className={styles.lbEmpty}>No creator data yet.</td></tr>
              ) : leaderboardData.map(row => (
                <tr key={row.id} className={styles.lbRow}>
                  <td className={styles.lbTd}>
                    <div className={styles.lbCreator}>
                      <div
                        className={styles.lbAvatar}
                        style={{ background: avatarColor(row.fullName) }}
                      >
                        {row.fullName[0]?.toUpperCase()}
                      </div>
                      <span className={styles.lbName}>{row.name}</span>
                    </div>
                  </td>
                  <td className={styles.lbTd}>
                    <span className={`${styles.tierBadge} ${styles['tier' + row.tier]}`}>
                      {row.tier}
                    </span>
                  </td>
                  <td className={styles.lbTd}>{row.videos.toLocaleString()}</td>
                  <td className={styles.lbTd}>{row.views.toLocaleString()}</td>
                  <td className={styles.lbTd}>{row.avgViews.toLocaleString()}</td>
                  <td className={styles.lbTd}>{row.likes.toLocaleString()}</td>
                  <td className={styles.lbTd}>{row.breakouts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab !== 'Overview' && activeTab !== 'Rank' && (
        <div className={styles.comingSoon}>
          <p>{activeTab} — coming soon</p>
        </div>
      )}
    </AppLayout>
  );
}
