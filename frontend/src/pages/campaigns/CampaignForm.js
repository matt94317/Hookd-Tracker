import { useRef } from 'react';
import styles from './NewCampaignPage.module.css';

export default function CampaignForm({
  name, setName,
  isLive, setIsLive,
  coverImage, setCoverImage,
  startDate, setStartDate,
  endDate, setEndDate,
  hashtags, setHashtags,
  briefLinks, setBriefLinks,
  error, loading, title, subtitle, submitLabel, submittingLabel, onSubmit, onCancel,
}) {
  const fileInputRef = useRef(null);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);

  const openDatePicker = (ref) => {
    if (ref.current?.showPicker) ref.current.showPicker();
    else ref.current?.click();
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0] || e.target.files?.[0];
    if (file && setCoverImage) setCoverImage(file);
  };

  const addLink = () => setBriefLinks && setBriefLinks([...(briefLinks || []), '']);
  const updateLink = (i, val) => {
    const updated = [...(briefLinks || [])];
    updated[i] = val;
    setBriefLinks(updated);
  };
  const removeLink = (i) => setBriefLinks((briefLinks || []).filter((_, idx) => idx !== i));

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>

      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.card}>

          {/* Campaign Name + Live Toggle */}
          <div className={styles.section}>
            <div className={styles.sectionHeaderRow}>
              <label className={styles.fieldLabel} htmlFor="name">CAMPAIGN NAME</label>
              <div className={styles.liveRow}>
                <span className={styles.fieldLabel}>LIVE</span>
                <button
                  type="button"
                  className={`${styles.toggle} ${isLive ? styles.toggleOn : ''}`}
                  onClick={() => setIsLive && setIsLive(!isLive)}
                >
                  <span className={styles.toggleThumb} />
                </button>
              </div>
            </div>
            <input
              className={styles.input}
              id="name"
              type="text"
              placeholder="e.g., Summer Brand Push"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.divider} />

          {/* Cover Image */}
          <div className={styles.section}>
            <p className={styles.fieldLabel}>COVER IMAGE</p>
            <div
              className={styles.dropzone}
              onDrop={handleFileDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileDrop}
              />
              {coverImage ? (
                <p className={styles.dropzoneFileName}>📎 {coverImage.name}</p>
              ) : (
                <>
                  <span className={styles.dropzoneIcon}>🖼</span>
                  <p className={styles.dropzoneText}>Drop an image or click to browse</p>
                  <button
                    type="button"
                    className={styles.chooseFileBtn}
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  >
                    Choose File
                  </button>
                </>
              )}
            </div>
          </div>

          <div className={styles.divider} />

          {/* Campaign Window */}
          <div className={styles.section}>
            <p className={styles.fieldLabel}>
              CAMPAIGN WINDOW <span className={styles.optional}>(OPTIONAL)</span>
            </p>
            <div className={styles.dateRow}>
              <div className={styles.dateCol}>
                <span className={styles.dateLabel}>Start Date</span>
                <div className={styles.dateInput} onClick={() => openDatePicker(startDateRef)}>
                  <span className={styles.dateIcon}>📅</span>
                  <input
                    ref={startDateRef}
                    type="date"
                    className={styles.dateInputField}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.dateCol}>
                <span className={styles.dateLabel}>End Date</span>
                <div className={styles.dateInput} onClick={() => openDatePicker(endDateRef)}>
                  <span className={styles.dateIcon}>📅</span>
                  <input
                    ref={endDateRef}
                    type="date"
                    className={styles.dateInputField}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.divider} />

          {/* Hashtags */}
          <div className={styles.section}>
            <label className={styles.fieldLabel} htmlFor="hashtags">
              HASHTAGS <span className={styles.infoIcon}>ⓘ</span>
            </label>
            <input
              className={styles.input}
              id="hashtags"
              type="text"
              placeholder="#yourbrand, #ad, #collab"
              value={hashtags || ''}
              onChange={(e) => setHashtags && setHashtags(e.target.value)}
            />
          </div>

          <div className={styles.divider} />

          {/* Brief Links */}
          <div className={styles.section}>
            <p className={styles.fieldLabel}>
              BRIEF LINKS <span className={styles.infoIcon}>ⓘ</span>
            </p>
            {(briefLinks || []).map((link, i) => (
              <div key={i} className={styles.linkRow}>
                <input
                  className={styles.input}
                  type="url"
                  placeholder="https://"
                  value={link}
                  onChange={(e) => updateLink(i, e.target.value)}
                />
                <button type="button" className={styles.removeLinkBtn} onClick={() => removeLink(i)}>✕</button>
              </div>
            ))}
            <button type="button" className={styles.addLinkBtn} onClick={addLink}>
              + Add link
            </button>
          </div>

        </div>

        {error && <p className={styles.errorMsg}>{error}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
          <button type="submit" className={styles.createBtn} disabled={loading}>
            {loading ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
