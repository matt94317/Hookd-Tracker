import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import AppLayout from '../../components/AppLayout';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ChevronRightIcon, CalendarIcon, RefreshIcon, ChevronDownIcon, MoreIcon, CopyIcon, TableSortIcon,
} from '../../components/Icons';
import { formatMetric } from '../../utils/format';
import { TIME_PERIODS } from '../../utils/constants';
import styles from './CampaignDetailsPage.module.css';

const TABS = ['Overview', 'Accounts', 'Rank', 'Notifications', 'Tasks', 'Uploads'];
const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#3b82f6', '#10b981'];

/* ── Helpers ── */
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


function getCurrentWeekDays() {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function minsAgo(date) {
  const mins = Math.floor((Date.now() - date) / 60000);
  return mins < 1 ? 'just now' : `${mins} min ago`;
}

function currentMonthLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function currentWeekRange() {
  const today = new Date();
  const dow = today.getDay();
  const mon = new Date(today);
  mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  mon.setHours(0, 0, 0, 0);
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  const opts = { month: 'short', day: 'numeric' };
  const monStr = mon.toLocaleDateString('en-US', opts);
  const friStr = fri.toLocaleDateString('en-US', { day: 'numeric' });
  return `${monStr} – ${friStr}`;
}

function formatPlatformName(name) {
  if (!name) return 'Unknown';
  const n = name.toLowerCase();
  if (n === 'tiktok')    return 'TikTok';
  if (n === 'instagram') return 'Instagram';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/* ── Component ── */
export default function CampaignDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [campaign, setCampaign] = useState(null);
  const [posts, setPosts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [activeTab, setActiveTab] = useState('Overview');
  const [timePeriod, setTimePeriod] = useState(365);
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lbSortCol, setLbSortCol] = useState('views');
  const [lbSortDir, setLbSortDir] = useState('desc');
  const [oauthUrl, setOauthUrl] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState('');
  const [copied, setCopied] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [syncMsg, setSyncMsg] = useState('');
  const [editTargetAccount, setEditTargetAccount] = useState(null); // { id, daily_target, monthly_target }
  const [editTargetSaving, setEditTargetSaving] = useState(false);

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

  /* ── Platform helpers ── */
  const availablePlatforms = useMemo(() => {
    const seen = new Set();
    return accounts
      .filter(a => a.channel_name)
      .filter(a => {
        const key = a.channel_name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(a => ({ value: a.channel_name.toLowerCase(), label: formatPlatformName(a.channel_name) }));
  }, [accounts]);

  const platformAccounts = useMemo(() => {
    if (selectedPlatform === 'all') return accounts;
    return accounts.filter(a => (a.channel_name || '').toLowerCase() === selectedPlatform);
  }, [accounts, selectedPlatform]);

  /* ── Filtered posts ── */
  const filteredPosts = useMemo(() => {
    let result = posts;
    if (selectedPlatform !== 'all') {
      const ids = new Set(platformAccounts.map(a => a.id));
      result = result.filter(p => ids.has(p.account_id));
    }
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
  }, [posts, timePeriod, selectedAccount, selectedPlatform, platformAccounts]);

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
    if (!platformAccounts.length) return [];
    const weekDays = getCurrentWeekDays();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return platformAccounts.map(acc => {
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
      const monthPosts = accPosts.filter(p => {
        if (!p.posted_at) return false;
        const t = new Date(p.posted_at);
        return t >= monthStart && t <= monthEnd;
      }).length;
      const dailyTarget   = acc.daily_target   || 0;
      const weeklyTarget  = acc.weekly_target  || 0;
      const monthlyTarget = acc.monthly_target || 0;
      return {
        id:           acc.id,
        username:     acc.username || `Account ${acc.id}`,
        channelName:  acc.channel_name || '',
        creatorName:  '',
        totalPosts:   accPosts.length,
        monthPosts,
        monthlyTarget,
        weeklyTarget,
        dailyTarget,
        weekPosts,
      };
    });
  }, [platformAccounts, posts]);

  /* ── Leaderboard data ── */
  const leaderboardData = useMemo(() => {
    if (!platformAccounts.length) return [];
    const raw = platformAccounts.map(acc => {
      const accPosts = posts.filter(p => p.account_id === acc.id);
      const videos   = accPosts.length;
      const views    = accPosts.reduce((s, p) => s + (p.views || 0), 0);
      const likes    = accPosts.reduce((s, p) => s + (p.likes || 0), 0);
      const avgViews = videos > 0 ? Math.round(views / videos) : 0;
      const breakouts = accPosts.filter(p => (p.views || 0) > avgViews * 2).length;
      return {
        id:   acc.id,
        name: abbreviateName(acc.username),
        fullName: acc.username || `Account ${acc.id}`,
        videos, views, avgViews, likes, breakouts,
      };
    });
    const withTiers = assignTier(raw);
    return [...withTiers].sort((a, b) => {
      const v = lbSortDir === 'asc' ? 1 : -1;
      if (typeof a[lbSortCol] === 'number') return (a[lbSortCol] - b[lbSortCol]) * v;
      return String(a[lbSortCol]).localeCompare(String(b[lbSortCol])) * v;
    });
  }, [platformAccounts, posts, lbSortCol, lbSortDir]);

  function handleLbSort(col) {
    if (lbSortCol === col) setLbSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setLbSortCol(col); setLbSortDir('desc'); }
  }

  /* ── Metric cards config ── */
  const metricCards = [
    { label: 'Posts',            value: formatMetric(metrics.videos) },
    { label: 'Views',           value: formatMetric(metrics.views) },
    { label: 'Likes',           value: formatMetric(metrics.likes) },
    { label: 'Comments',        value: formatMetric(metrics.comments) },
    { label: 'Shares',          value: formatMetric(metrics.shares) },
    { label: 'Saves',           value: '0' },
    { label: 'Engagement Rate', value: Math.round(metrics.engagementRate) + '%', info: true },
    { label: 'Comment Rate',    value: Math.round(metrics.commentRate) + '%',    info: true },
  ];

  const isAdminOrCompany = user?.role === 'admin' || user?.role === 'company';

  async function generateOAuthUrl(platform) {
    setOauthLoading(true);
    setOauthUrl('');
    setOauthError('');
    setCopied(false);
    try {
      // Find channel_id for the platform
      const channelId = platform === 'instagram' ? 1 : 2;
      const res = await apiFetch(`/campaigns/${id}/oauth-url?channel_id=${channelId}`, {}, token);
      setOauthUrl(res.oauth_url);
    } catch (err) {
      console.error('Failed to generate OAuth URL', err);
      setOauthError(err?.message || 'Failed to generate OAuth URL. Check that your app credentials are configured.');
    } finally {
      setOauthLoading(false);
    }
  }

  async function syncAccount(accountId) {
    setSyncingId(accountId);
    setSyncMsg('Syncing in background...');
    try {
      await apiFetch(`/accounts/${accountId}/fetch-posts`, { method: 'POST' }, token);
      setSyncMsg('Sync started — data will appear in ~30 seconds');
      setTimeout(() => {
        setRefreshKey(k => k + 1);
        setSyncMsg('');
      }, 30000);
    } catch (err) {
      setSyncMsg('Sync failed');
    } finally {
      setSyncingId(null);
    }
  }

  function copyOAuthUrl() {
    navigator.clipboard.writeText(oauthUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function saveTargets() {
    if (!editTargetAccount) return;
    setEditTargetSaving(true);
    try {
      const updated = await apiFetch(`/accounts/${editTargetAccount.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          daily_target: editTargetAccount.daily_target,
          weekly_target: editTargetAccount.weekly_target,
          monthly_target: editTargetAccount.monthly_target,
        }),
      }, token);
      setAccounts(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
      setEditTargetAccount(null);
    } catch {
      // keep modal open on error
    } finally {
      setEditTargetSaving(false);
    }
  }

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
        {TABS.filter(tab => tab !== 'Accounts' || isAdminOrCompany).map(tab => (
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
                value={selectedPlatform}
                onChange={e => {
                  setSelectedPlatform(e.target.value);
                  setSelectedAccount('all');
                }}
              >
                <option value="all">All Platforms</option>
                {availablePlatforms.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
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
                <option value="all">All Accounts</option>
                {platformAccounts.map(a => (
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
                      <div className={styles.progressCreatorInfo}>
                        <span className={styles.progressUsername}>
                          @{c.username.replace(/^@/, '')}
                        </span>
                        {c.creatorName && (
                          <span className={styles.progressCreatorName}>{c.creatorName}</span>
                        )}
                      </div>
                      <div className={styles.progressCardTopRight}>
                        <div className={styles.progressBadgeGroup}>
                          <span className={styles.progressPostsBadge}>
                            {c.weekPosts.reduce((a, b) => a + b, 0)}/{c.weeklyTarget || '—'} posts
                          </span>
                          {c.weeklyTarget > 0 && (
                            <span className={styles.progressGoalLabel}>{c.weeklyTarget}/week goal</span>
                          )}
                        </div>
                        <button
                          className={styles.editTargetBtn}
                          onClick={() => setEditTargetAccount({
                            id: c.id,
                            username: c.username,
                            daily_target: c.dailyTarget,
                            weekly_target: c.weeklyTarget,
                            monthly_target: c.monthlyTarget,
                          })}
                          title="Edit targets"
                        >
                          ✏
                        </button>
                      </div>
                    </div>

                    <div className={styles.progressBarTrack}>
                      <div
                        className={styles.progressBarFill}
                        style={{
                          width: c.weeklyTarget > 0
                            ? `${Math.min(100, (c.weekPosts.reduce((a, b) => a + b, 0) / c.weeklyTarget) * 100)}%`
                            : '0%'
                        }}
                      />
                    </div>

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
                            <div className={`${styles.bubble} ${bubbleClass}`}>
                              {count > 0 ? count : ''}
                            </div>
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
                  { key: 'videos',   label: 'Posts' },
                  { key: 'views',    label: 'Views' },
                  { key: 'avgViews', label: 'Avg. views' },
                  { key: 'likes',    label: 'Likes' },
                ].map(({ key, label }) => (
                  <th key={key} className={styles.lbTh} onClick={() => handleLbSort(key)}>
                    <span className={styles.lbThInner}>
                      {label}
                      <TableSortIcon col={key} sortCol={lbSortCol} sortDir={lbSortDir} />
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

      {activeTab === 'Accounts' && isAdminOrCompany && (
        <div className={styles.accountsSection}>
          <div className={styles.accountsHeader}>
            <h2 className={styles.accountsTitle}>Accounts</h2>
            <div className={styles.oauthButtons}>
              <button
                className={styles.oauthBtn}
                onClick={() => generateOAuthUrl('instagram')}
                disabled={oauthLoading}
              >
                Generate Instagram OAuth URL
              </button>
              <button
                className={styles.oauthBtn}
                onClick={() => generateOAuthUrl('tiktok')}
                disabled={oauthLoading}
              >
                Generate TikTok OAuth URL
              </button>
            </div>
          </div>
          {oauthError && (
            <p style={{ color: 'red', marginTop: 8 }}>{oauthError}</p>
          )}
          {oauthUrl && (
            <div className={styles.oauthUrlBox}>
              <input
                className={styles.oauthUrlInput}
                type="text"
                value={oauthUrl}
                readOnly
                onClick={e => e.target.select()}
              />
              <button className={styles.copyBtn} onClick={copyOAuthUrl}>
                <CopyIcon /> {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
          {syncMsg && (
            <p style={{ marginTop: 8, color: syncMsg.startsWith('Sync failed') ? 'red' : 'green' }}>{syncMsg}</p>
          )}
          {accounts.length > 0 && (
            <table className={styles.accountsTable}>
              <thead>
                <tr>
                  <th className={styles.accountsTh}>Platform</th>
                  <th className={styles.accountsTh}>Username</th>
                  <th className={styles.accountsTh}></th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(a => (
                  <tr key={a.id} className={styles.accountsRow}>
                    <td className={styles.accountsTd}>
                      <span className={styles.platformBadge}>{platformLabel(a.channel_name)}</span>
                      {' '}{a.channel_name || '—'}
                    </td>
                    <td className={styles.accountsTd}>@{a.username || '—'}</td>
                    <td className={styles.accountsTd}>
                      <button
                        className={styles.oauthBtn}
                        onClick={() => syncAccount(a.id)}
                        disabled={syncingId === a.id}
                      >
                        {syncingId === a.id ? 'Syncing...' : 'Sync Posts'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {accounts.length === 0 && (
            <p className={styles.stateMsg}>No accounts linked yet. Generate an OAuth URL and share it with a creator.</p>
          )}
        </div>
      )}

      {activeTab !== 'Overview' && activeTab !== 'Rank' && activeTab !== 'Accounts' && (
        <div className={styles.comingSoon}>
          <p>{activeTab} — coming soon</p>
        </div>
      )}
      {editTargetAccount && (
        <div className={styles.modalOverlay} onClick={() => setEditTargetAccount(null)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Edit targets — @{editTargetAccount.username}</h3>
            <div className={styles.modalFields}>
              <label className={styles.modalLabel}>
                Daily target
                <div className={styles.modalInputRow}>
                  <input
                    className={styles.modalInput}
                    type="number"
                    min="0"
                    value={editTargetAccount.daily_target || ''}
                    placeholder="0"
                    onChange={e => setEditTargetAccount(prev => ({ ...prev, daily_target: e.target.value === '' ? 0 : parseInt(e.target.value) }))}
                  />
                  <span className={styles.modalInputUnit}>posts / day</span>
                </div>
              </label>
              <label className={styles.modalLabel}>
                Weekly target
                <div className={styles.modalInputRow}>
                  <input
                    className={styles.modalInput}
                    type="number"
                    min="0"
                    value={editTargetAccount.weekly_target || ''}
                    placeholder="0"
                    onChange={e => setEditTargetAccount(prev => ({ ...prev, weekly_target: e.target.value === '' ? 0 : parseInt(e.target.value) }))}
                  />
                  <span className={styles.modalInputUnit}>posts / week</span>
                </div>
              </label>
              <label className={styles.modalLabel}>
                Monthly target
                <div className={styles.modalInputRow}>
                  <input
                    className={styles.modalInput}
                    type="number"
                    min="0"
                    value={editTargetAccount.monthly_target || ''}
                    placeholder="0"
                    onChange={e => setEditTargetAccount(prev => ({ ...prev, monthly_target: e.target.value === '' ? 0 : parseInt(e.target.value) }))}
                  />
                  <span className={styles.modalInputUnit}>posts / month</span>
                </div>
              </label>
            </div>
            <p className={styles.modalHint}>
              Set any combination of targets. Leave a field blank (0) to hide it from the card.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setEditTargetAccount(null)}>Cancel</button>
              <button className={styles.modalSaveBtn} onClick={saveTargets} disabled={editTargetSaving}>
                {editTargetSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
