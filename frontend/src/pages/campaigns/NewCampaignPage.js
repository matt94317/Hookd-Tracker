import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import AppLayout from '../../components/AppLayout';
import styles from './NewCampaignPage.module.css';

export default function NewCampaignPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/campaigns', {
        method: 'POST',
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

  return (
    <AppLayout>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.title}>Everything you need for a successful UGC campaign</h1>
          <p className={styles.subtitle}>Set up your campaign details and tracking preferences</p>
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
            {loading ? 'Creating...' : 'Create Campaign'}
          </button>
        </div>
      </form>
      </div>
    </AppLayout>
  );
}
