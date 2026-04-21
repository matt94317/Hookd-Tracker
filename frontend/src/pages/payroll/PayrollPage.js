import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import AppLayout from '../../components/AppLayout';
import { getPlatformIcon } from '../../utils/format';
import styles from './PayrollPage.module.css';

function formatMonth(yyyymm) {
  if (!yyyymm) return '—';
  const [year, month] = yyyymm.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  });
}

function formatCurrency(amount) {
  if (!amount || amount === 0) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

const STATUS_LABELS = { all: 'All', pending: 'Pending Review', approved: 'Approved' };

export default function PayrollPage() {
  const { token } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [approvingId, setApprovingId] = useState(null);

  useEffect(() => {
    apiFetch('/payroll', {}, token)
      .then(setRecords)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return records;
    return records.filter(r => r.status === statusFilter);
  }, [records, statusFilter]);

  async function handleApprove(record) {
    setApprovingId(record.id);
    try {
      const updated = await apiFetch(`/payroll/${record.id}/approve`, { method: 'POST' }, token);
      setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
    } catch {
      // keep UI intact on error
    } finally {
      setApprovingId(null);
    }
  }

  const pendingCount = records.filter(r => r.status === 'pending').length;
  const approvedCount = records.filter(r => r.status === 'approved').length;

  return (
    <AppLayout>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Payroll</h1>
          <p className={styles.subtitle}>
            Review and approve creator payments when monthly targets are met
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{pendingCount}</span>
          <span className={styles.summaryLabel}>Pending Review</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{approvedCount}</span>
          <span className={styles.summaryLabel}>Approved</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{records.length}</span>
          <span className={styles.summaryLabel}>Total Records</span>
        </div>
      </div>

      {/* Status filter */}
      <div className={styles.filterBar}>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <button
            key={key}
            className={`${styles.filterBtn} ${statusFilter === key ? styles.filterBtnActive : ''}`}
            onClick={() => setStatusFilter(key)}
          >
            {label}
            {key === 'pending' && pendingCount > 0 && (
              <span className={styles.filterCount}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && <p className={styles.stateMsg}>Loading...</p>}
      {error && <p className={styles.errorMsg}>{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No payroll records</p>
          <p className={styles.emptyBody}>
            {statusFilter === 'all'
              ? 'Records appear here when a creator meets their monthly post target.'
              : `No ${STATUS_LABELS[statusFilter].toLowerCase()} records.`}
          </p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Creator</th>
                <th className={styles.th}>Platform</th>
                <th className={styles.th}>Campaign</th>
                <th className={styles.th}>Month</th>
                <th className={styles.th}>Posts</th>
                <th className={styles.th}>Payout</th>
                <th className={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const platform = getPlatformIcon(r.channel_name);
                const isApproving = approvingId === r.id;

                return (
                  <tr key={r.id} className={styles.tr}>
                    {/* Creator */}
                    <td className={styles.td}>
                      <span className={styles.creatorName}>
                        @{r.account_username || '—'}
                      </span>
                    </td>

                    {/* Platform */}
                    <td className={styles.td}>
                      {platform ? (
                        <span className={styles.platformBadge}>
                          {platform.Icon && <platform.Icon />}
                          {platform.label}
                        </span>
                      ) : (
                        <span className={styles.dash}>—</span>
                      )}
                    </td>

                    {/* Campaign */}
                    <td className={styles.td}>
                      <span className={styles.campaignName}>{r.campaign_name || '—'}</span>
                    </td>

                    {/* Month */}
                    <td className={styles.td}>
                      <span className={styles.monthLabel}>{formatMonth(r.month)}</span>
                    </td>

                    {/* Posts progress */}
                    <td className={styles.td}>
                      <span className={styles.progress}>
                        {r.posts_count} / {r.monthly_target}
                      </span>
                      <span className={styles.progressLabel}>posts</span>
                    </td>

                    {/* Payout */}
                    <td className={styles.td}>
                      <span className={styles.payout}>{formatCurrency(r.payout_amount)}</span>
                    </td>

                    {/* Status / Action */}
                    <td className={styles.td}>
                      {r.status === 'approved' ? (
                        <div className={styles.approvedCell}>
                          <span className={styles.badgeApproved}>Approved</span>
                          <span className={styles.paymentNote}>
                            Payment within 5 business days
                          </span>
                        </div>
                      ) : (
                        <div className={styles.pendingCell}>
                          <span className={styles.badgePending}>Pending Review</span>
                          <button
                            className={styles.approveBtn}
                            onClick={() => handleApprove(r)}
                            disabled={isApproving}
                          >
                            {isApproving ? 'Approving…' : 'Approve'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
