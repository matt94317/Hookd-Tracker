import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import AppLayout from '../../components/AppLayout';
import styles from './NewCampaignPage.module.css';

export default function EditCampaignPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    apiFetch(`/campaigns/${id}`, {}, token)
      .then((data) => {
        setName(data.name || '');
        setStartDate(data.start_date || '');
        setEndDate(data.end_date || '');
      })
      .catch((e) => setError(e.message))
      .finally(() => setFetching(false));
  }, [id, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch(`/campaigns/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name,
          start_date: startDate || null,
          end_date: endDate || null,
        }),
      }, token);
      navigate('/campaigns');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <AppLayout><p style={{ color: '#7a6f63', fontSize: 14 }}>Loading...</p></AppLayout>;

  return (
    <AppLayout>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.title}>Edit Campaign</h1>
          <p className={styles.subtitle}>Update your campaign details</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.block}>
            <label className={styles.label} htmlFor="name">Campaign Name</label>
            <input
              className={styles.input}
              id="name"
              type="text"
              placeholder="e.g., Summer Product Launch"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.block}>
            <p className={styles.label}>Duration</p>
            <div className={styles.dateRow}>
              <div className={styles.dateField}>
                <label className={styles.dateLabel} htmlFor="startDate">Start Date</label>
                <input
                  className={styles.input}
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className={styles.dateField}>
                <label className={styles.dateLabel} htmlFor="endDate">End Date</label>
                <input
                  className={styles.input}
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => navigate('/campaigns')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.createBtn}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
