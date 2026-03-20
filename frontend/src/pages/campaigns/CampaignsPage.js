import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import AppLayout from '../../components/AppLayout';
import {
  TargetIcon, TrendingUpIcon, UsersIcon, FileTextIcon, EyeIcon,
  SearchIcon, CalendarIcon, EditIcon, TrashIcon, ChevronRightIcon, ChevronDownIcon,
} from '../../components/Icons';
import { formatNumber } from '../../utils/format';
import styles from './CampaignsPage.module.css';

/* ── Helpers ── */
function isCompleted(campaign) {
  if (!campaign.end_date) return false;
  return new Date() > new Date(campaign.end_date);
}

function isActive(campaign) {
  if (isCompleted(campaign)) return false;
  const today = new Date();
  const start = campaign.start_date ? new Date(campaign.start_date) : null;
  if (start && today < start) return false;
  return true;
}

function formatDateRange(start, end) {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  if (!s && !e) return null;
  const monthDay = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const full = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (s && e && s.getFullYear() === e.getFullYear()) {
    return `${monthDay(s)} - ${monthDay(e)}, ${e.getFullYear()}`;
  }
  return [s && full(s), e && full(e)].filter(Boolean).join(' - ');
}


export default function CampaignsPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const role = user?.role;

  const [campaigns, setCampaigns] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    apiFetch('/campaigns', {}, token)
      .then(setCampaigns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (search.trim() && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter === 'active' && !isActive(c)) return false;
      if (statusFilter === 'upcoming') {
        const start = c.start_date ? new Date(c.start_date) : null;
        if (!start || start <= new Date()) return false;
      }
      if (statusFilter === 'completed' && !isCompleted(c)) return false;
      return true;
    });
  }, [campaigns, search, statusFilter]);

  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(isActive).length;
  const totalAccounts = campaigns.reduce((sum, c) => sum + (c.account_count || 0), 0);
  const totalViews = campaigns.reduce((sum, c) => sum + (c.total_views || 0), 0);

  const handleDelete = async (id) => {
    try {
      await apiFetch(`/campaigns/${id}`, { method: 'DELETE' }, token);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const canManage = role === 'admin' || role === 'company';

  return (
    <AppLayout>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Campaigns</h1>
          <p className={styles.subtitle}>
            {totalCampaigns} campaign{totalCampaigns !== 1 ? 's' : ''} &bull; {activeCampaigns} active
          </p>
        </div>
        {canManage && (
          <button className={styles.newBtn} onClick={() => navigate('/campaigns/new')}>
            + New Campaign
          </button>
        )}
      </div>

      {/* Summary stat cards */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statDark}`}>
          <span className={styles.statIcon}><TargetIcon size={22} /></span>
          <span className={styles.statValue}>{totalCampaigns}</span>
          <span className={styles.statLabel}>Total Campaigns</span>
        </div>
        <div className={`${styles.statCard} ${styles.statGreen}`}>
          <span className={styles.statIcon}><TrendingUpIcon size={22} /></span>
          <span className={styles.statValue}>{activeCampaigns}</span>
          <span className={styles.statLabel}>Active</span>
        </div>
        <div className={`${styles.statCard} ${styles.statPurple}`}>
          <span className={styles.statIcon}><UsersIcon size={22} /></span>
          <span className={styles.statValue}>{totalAccounts}</span>
          <span className={styles.statLabel}>Total Accounts</span>
        </div>
        <div className={`${styles.statCard} ${styles.statLight}`}>
          <span className={styles.statIcon}><EyeIcon size={22} /></span>
          <span className={styles.statValue}>{formatNumber(totalViews)}</span>
          <span className={styles.statLabel}>Total Views</span>
        </div>
      </div>

      {/* Search + Filter */}
      <div className={styles.searchRow}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}><SearchIcon /></span>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.selectWrap}>
          <select
            className={styles.statusSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
          </select>
          <span className={styles.selectChevron}><ChevronDownIcon /></span>
        </div>
      </div>

      {/* Campaign grid */}
      {loading && <p className={styles.stateMsg}>Loading...</p>}
      {error && <p className={styles.errorMsg}>{error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <p className={styles.stateMsg}>No campaigns found.</p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className={styles.grid}>
          {filtered.map((c) => {
            const avgEng = (c.avg_engagement != null
              ? Number(c.avg_engagement)
              : 0
            ).toFixed(1) + '%';
            const dateRange = formatDateRange(c.start_date, c.end_date);

            return (
              <div key={c.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.cardTitleRow}>
                    <span className={styles.cardName}>{c.name}</span>
                    {isActive(c) && <span className={styles.badge}>active</span>}
                    {isCompleted(c) && <span className={`${styles.badge} ${styles.badgeCompleted}`}>completed</span>}
                  </div>
                  <span className={styles.cardTargetIcon}><TargetIcon size={20} /></span>
                </div>

                <div className={styles.cardStats}>
                  <div className={styles.cardStat}>
                    <span className={styles.cardStatIcon}><UsersIcon size={14} /></span>
                    <span className={styles.cardStatValue}>{c.account_count ?? 0}</span>
                    <span className={styles.cardStatLabel}>Accounts</span>
                  </div>
                  <div className={styles.cardStat}>
                    <span className={styles.cardStatIcon}><FileTextIcon size={14} /></span>
                    <span className={styles.cardStatValue}>{c.post_count ?? 0}</span>
                    <span className={styles.cardStatLabel}>Posts</span>
                  </div>
                  <div className={styles.cardStat}>
                    <span className={styles.cardStatIcon}><TrendingUpIcon size={14} /></span>
                    <span className={styles.cardStatValue}>{avgEng}</span>
                    <span className={styles.cardStatLabel}>Avg. Eng.</span>
                  </div>
                </div>

                {dateRange && (
                  <div className={styles.cardDate}>
                    <span className={styles.cardDateIcon}><CalendarIcon /></span>
                    {dateRange}
                  </div>
                )}

                <div className={styles.cardFooter}>
                  {canManage && (
                    <div className={styles.cardActions}>
                      <button
                        className={styles.iconBtn}
                        title="Edit"
                        onClick={() => navigate(`/campaigns/${c.id}/edit`)}
                      >
                        <EditIcon />
                      </button>
                      <button
                        className={`${styles.iconBtn} ${styles.deleteBtn}`}
                        title="Delete"
                        onClick={() => setDeleteConfirm(c.id)}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  )}
                  <button
                    className={styles.viewBtn}
                    onClick={() => navigate(`/campaigns/${c.id}`)}
                  >
                    View Details <span className={styles.viewBtnChevron}><ChevronRightIcon /></span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => setDeleteConfirm(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Delete campaign?</h3>
            <p className={styles.modalText}>This action cannot be undone.</p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className={styles.modalConfirm} onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
