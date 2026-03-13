import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import AppLayout from '../components/AppLayout';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import styles from './DashboardPage.module.css';

const TIME_PERIODS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time', days: null },
];

function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n ?? 0);
}

function toFixed2(n) {
  return isNaN(n) || !isFinite(n) ? '0.00' : n.toFixed(2);
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [timePeriod, setTimePeriod] = useState(30);
  const [chartMode, setChartMode] = useState('daily'); // 'daily' | 'monthly'
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Fetch campaign list
  useEffect(() => {
    apiFetch('/campaigns', {}, token)
      .then((data) => setCampaigns(data))
      .catch(() => {});
  }, [token]);

  // Fetch posts when campaign changes
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

  // Apply time period filter
  const filteredPosts = useMemo(() => {
    if (!timePeriod) return posts;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - timePeriod);
    return posts.filter((p) => p.posted_at && new Date(p.posted_at) >= cutoff);
  }, [posts, timePeriod]);

  // Aggregate metrics
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

  // Build chart data
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
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, views]) => ({ date, views }));
  }, [filteredPosts, chartMode]);

  const metricCards = [
    { label: 'Videos', value: formatNumber(metrics.videos) },
    { label: 'Views', value: formatNumber(metrics.views) },
    { label: 'Likes', value: formatNumber(metrics.likes) },
    { label: 'Comments', value: formatNumber(metrics.comments) },
    { label: 'Shares', value: formatNumber(metrics.shares) },
    { label: 'Saves', value: formatNumber(metrics.saves) },
    { label: 'Eng. Rate', value: toFixed2(metrics.engagementRate) + '%' },
    { label: 'Comment Rate', value: toFixed2(metrics.commentRate) + '%' },
  ];

  return (
    <AppLayout>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <div className={styles.filterBar}>
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
          <select
            className={styles.filterSelect}
            value={timePeriod ?? ''}
            onChange={(e) => setTimePeriod(e.target.value === '' ? null : Number(e.target.value))}
          >
            {TIME_PERIODS.map((t) => (
              <option key={t.label} value={t.days ?? ''}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics grid */}
      <div className={styles.metricsGrid}>
        {metricCards.map((m) => (
          <div key={m.label} className={styles.metricCard}>
            <span className={styles.metricValue}>{loadingPosts ? '—' : m.value}</span>
            <span className={styles.metricLabel}>{m.label}</span>
          </div>
        ))}
      </div>

      {/* Line chart */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <h2 className={styles.chartTitle}>Views Over Time</h2>
          <div className={styles.chartToggle}>
            <button
              className={`${styles.toggleBtn} ${chartMode === 'daily' ? styles.toggleActive : ''}`}
              onClick={() => setChartMode('daily')}
            >
              Daily
            </button>
            <button
              className={`${styles.toggleBtn} ${chartMode === 'monthly' ? styles.toggleActive : ''}`}
              onClick={() => setChartMode('monthly')}
            >
              Monthly
            </button>
          </div>
        </div>

        {chartData.length === 0 ? (
          <p className={styles.emptyChart}>No data for the selected period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE4" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#7a6f63' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#7a6f63' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatNumber}
              />
              <Tooltip
                contentStyle={{ border: '1px solid #E2D9CC', borderRadius: 8, fontSize: 13 }}
                formatter={(v) => [formatNumber(v), 'Views']}
              />
              <Line
                type="monotone"
                dataKey="views"
                stroke="#1a1a1a"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </AppLayout>
  );
}
