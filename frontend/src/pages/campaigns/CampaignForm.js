import styles from './NewCampaignPage.module.css';

export default function CampaignForm({
  name, setName, startDate, setStartDate, endDate, setEndDate,
  error, loading, title, subtitle, submitLabel, submittingLabel, onSubmit, onCancel,
}) {
  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>

      <form className={styles.form} onSubmit={onSubmit}>
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
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className={styles.createBtn} disabled={loading}>
            {loading ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
