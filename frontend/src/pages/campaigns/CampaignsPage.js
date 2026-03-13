import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import AppLayout from '../../components/AppLayout';
import styles from './CampaignsPage.module.css';

function isActive(campaign) {
  const today = new Date();
  const start = campaign.start_date ? new Date(campaign.start_date) : null;
  const end = campaign.end_date ? new Date(campaign.end_date) : null;
  if (start && today < start) return false;
  if (end && today > end) return false;
  return true;
}

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', d: 'numeric', year: 'numeric' });
}

function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export default function CampaignsPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const role = user?.role;

  const [campaigns, setCampaigns] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // campaign id pending delete

  useEffect(() => {
    apiFetch('/campaigns', {}, token)
      .then(setCampaigns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    if (!search.trim()) return campaigns;
    return campaigns.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [campaigns, search]);

  // Summary stats
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(isActive).length;
  const totalCreators = campaigns.reduce((sum, c) => sum + (c.creator_count || 0), 0);
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
          <span className={styles.statIcon}>◎</span>
          <span className={styles.statValue}>{totalCampaigns}</span>
          <span className={styles.statLabel}>Total Campaigns</span>
        </div>
        <div className={`${styles.statCard} ${styles.statGreen}`}>
          <span className={styles.statIcon}>↗</span>
          <span className={styles.statValue}>{activeCampaigns}</span>
          <span className={styles.statLabel}>Active</span>
        </div>
        <div className={`${styles.statCard} ${styles.statAmber}`}>
          <span className={styles.statIcon}>👥</span>
          <span className={styles.statValue}>{totalCreators}</span>
          <span className={styles.statLabel}>Total Creators</span>
        </div>
        <div className={`${styles.statCard} ${styles.statLight}`}>
          <span className={styles.statIcon}>👁</span>
          <span className={styles.statValue}>{formatNumber(totalViews)}</span>
          <span className={styles.statLabel}>Total Views</span>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchRow}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
          {filtered.map((c) => (
            <div key={c.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.cardTitleRow}>
                  <span className={styles.cardName}>{c.name}</span>
                  {isActive(c) && <span className={styles.badge}>active</span>}
                </div>
                <span className={styles.cardTargetIcon}>◎</span>
              </div>

              <div className={styles.cardStats}>
                <div className={styles.cardStat}>
                  <span className={styles.cardStatValue}>{c.creator_count ?? 0}</span>
                  <span className={styles.cardStatLabel}>Creators</span>
                </div>
                <div className={styles.cardStat}>
                  <span className={styles.cardStatValue}>{c.post_count ?? 0}</span>
                  <span className={styles.cardStatLabel}>Posts</span>
                </div>
                <div className={styles.cardStat}>
                  <span className={styles.cardStatValue}>{formatNumber(c.total_views ?? 0)}</span>
                  <span className={styles.cardStatLabel}>Views</span>
                </div>
              </div>

              {(c.start_date || c.end_date) && (
                <div className={styles.cardDate}>
                  📅 {c.start_date ?? '—'} – {c.end_date ?? '—'}
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
                      ✏️
                    </button>
                    <button
                      className={`${styles.iconBtn} ${styles.deleteBtn}`}
                      title="Delete"
                      onClick={() => setDeleteConfirm(c.id)}
                    >
                      🗑️
                    </button>
                  </div>
                )}
                <button
                  className={styles.viewBtn}
                  onClick={() => navigate(`/campaigns/${c.id}`)}
                >
                  View Details →
                </button>
              </div>
            </div>
          ))}
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
