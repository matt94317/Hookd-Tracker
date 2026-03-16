import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import AppLayout from '../components/AppLayout';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import styles from './DashboardPage.module.css';

const TIME_PERIODS = [
  { label: 'Last 7 Days',  days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
  { label: 'All Time',     days: null },
];

function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n ?? 0);
}

function toFixed2(n) {
  return isNaN(n) || !isFinite(n) ? '0.00' : n.toFixed(2);
}

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
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

const ChevronIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

export default function CreatorAnalyticsPage() {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [timePeriod, setTimePeriod] = useState(30);
  const [chartMode, setChartMode] = useState('daily');
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    apiFetch('/campaigns', {}, token)
      .then((data) => setCampaigns(data))
      .catch(() => {});
  }, [token, refreshKey]);

  useEffect(() => {
    if (selectedCampaign === '') return;
    setLoadingPosts(true);

    if (selectedCampaign === 'all') {
      if (campaigns.length === 0) {
        setPosts([]);
        setLoadingPosts(false);
        return;
      }
      Promise.all(
        campaigns.map((c) =>
          apiFetch(`/campaigns/${c.id}/posts`, {}, token).then((d) => d.posts || [])
        )
      )
        .then((results) => setPosts(results.flat()))
        .catch(() => setPosts([]))
        .finally(() => setLoadingPosts(false));
    } else {
      apiFetch(`/campaigns/${selectedCampaign}/posts`, {}, token)
        .then((data) => setPosts(data.posts || []))
        .catch(() => setPosts([]))
        .finally(() => setLoadingPosts(false));
    }
  }, [selectedCampaign, campaigns, token]);

  const filteredPosts = useMemo(() => {
    if (!timePeriod) return posts;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - timePeriod);
    return posts.filter((p) => p.posted_at && new Date(p.posted_at) >= cutoff);
  }, [posts, timePeriod]);

  const metrics = useMemo(() => {
    const videos = filteredPosts.length;
    const views = filteredPosts.reduce((s, p) => s + (p.views || 0), 0);
    const likes = filteredPosts.reduce((s, p) => s + (p.likes || 0), 0);
    const comments = filteredPosts.reduce((s, p) => s + (p.comments || 0), 0);
    const shares = filteredPosts.reduce((s, p) => s + (p.shares || 0), 0);
    const engagementRate = views > 0 ? ((likes + comments + shares) / views) * 100 : 0;
    const commentRate = views > 0 ? (comments / views) * 100 : 0;
    return { videos, views, likes, comments, shares, saves: 0, engagementRate, commentRate };
  }, [filteredPosts]);

  const chartData = useMemo(() => {
    const map = {};
    filteredPosts.forEach((p) => {
      if (!p.posted_at) return;
      const d = new Date(p.posted_at);
      const key = chartMode === 'daily'
        ? d.toISOString().slice(0, 10)
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + (p.views || 0);
    });

    const entries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));

    if (chartMode === 'total') {
      let cumulative = 0;
      return entries.map(([date, views]) => {
        cumulative += views;
        return { date, views: cumulative };
      });
    }

    return entries.map(([date, views]) => ({ date, views }));
  }, [filteredPosts, chartMode]);

  const metricCards = [
    { label: 'Videos',          value: formatNumber(metrics.videos) },
    { label: 'Views',           value: formatNumber(metrics.views) },
    { label: 'Likes',           value: formatNumber(metrics.likes) },
    { label: 'Comments',        value: formatNumber(metrics.comments) },
    { label: 'Shares',          value: formatNumber(metrics.shares) },
    { label: 'Saves',           value: formatNumber(metrics.saves) },
    { label: 'Engagement Rate', value: toFixed2(metrics.engagementRate) + '%', info: true },
    { label: 'Comment Rate',    value: toFixed2(metrics.commentRate) + '%',    info: true },
  ];

  return (
    <AppLayout>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Analytics</h1>
        <div className={styles.filterBar}>
          <div className={styles.selectWrap}>
            <select
              className={styles.filterSelect}
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
            >
              <option value="all">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <span className={styles.selectChevron}><ChevronIcon /></span>
          </div>

          <div className={styles.selectWrap}>
            <span className={styles.selectCalendar}><CalendarIcon /></span>
            <select
              className={`${styles.filterSelect} ${styles.filterSelectDate}`}
              value={timePeriod ?? ''}
              onChange={(e) => setTimePeriod(e.target.value === '' ? null : Number(e.target.value))}
            >
              {TIME_PERIODS.map((t) => (
                <option key={t.label} value={t.days ?? ''}>{t.label}</option>
              ))}
            </select>
            <span className={styles.selectChevron}><ChevronIcon /></span>
          </div>

          <button className={styles.refreshBtn} onClick={() => setRefreshKey(k => k + 1)} title="Refresh">
            <RefreshIcon />
          </button>
        </div>
      </div>

      <div className={styles.metricsCard}>
        {metricCards.map((m) => (
          <div key={m.label} className={styles.metricCell}>
            <span className={styles.metricValue}>{loadingPosts ? '—' : m.value}</span>
            <span className={styles.metricLabel}>
              {m.label}
              {m.info && <span className={styles.infoIcon}>ⓘ</span>}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h2 className={styles.chartTitle}>Daily Views Across All Campaigns</h2>
            <p className={styles.chartSubtitle}>Combined daily views across all active campaigns</p>
          </div>
          <div className={styles.chartToggle}>
            <button
              className={`${styles.toggleBtn} ${chartMode === 'daily' ? styles.toggleActive : ''}`}
              onClick={() => setChartMode('daily')}
            >
              Daily
            </button>
            <button
              className={`${styles.toggleBtn} ${chartMode === 'total' ? styles.toggleActive : ''}`}
              onClick={() => setChartMode('total')}
            >
              Total
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" vertical={true} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => {
                const d = new Date(v);
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatNumber}
              width={32}
            />
            <Tooltip
              contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              formatter={(v) => [formatNumber(v), 'Views']}
            />
            <Line
              type="monotone"
              dataKey="views"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#6366f1' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </AppLayout>
  );
}
