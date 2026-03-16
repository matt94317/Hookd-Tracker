import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import AppLayout from '../components/AppLayout';
import styles from './CreatorsPage.module.css';

/* ── Icons ─────────────────────────────────────────────────────────────── */
const UserIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const TikTokIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.77 1.52V6.78a4.85 4.85 0 0 1-1-.09z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
);

const LinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

const BarChartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const SyncIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const AlertCircleIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const UsersViewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const GridViewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const ListViewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

const SortIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <polyline points="5 12 12 5 19 12"/>
    <polyline points="5 12 12 19 19 12" opacity="0.4"/>
  </svg>
);

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function getPlatformIcon(platform) {
  if (!platform) return null;
  const lower = platform.toLowerCase();
  if (lower === 'tiktok') return { label: 'TikTok', Icon: TikTokIcon };
  if (lower === 'instagram') return { label: 'Instagram', Icon: InstagramIcon };
  return { label: platform.charAt(0).toUpperCase() + platform.slice(1), Icon: null };
}

function flattenToCards(creators) {
  const cards = [];
  for (const c of creators) {
    if (c.accounts && c.accounts.length > 0) {
      for (const acc of c.accounts) {
        cards.push({
          key: `${c.id}-${acc.id}`,
          creatorId: c.id,
          accountId: acc.id,
          name: c.name,
          username: acc.username,
          platform: acc.channel,
          campaignId: acc.campaign_id,
          campaignName: acc.campaign_name,
          autoSync: true,
        });
      }
    } else {
      cards.push({
        key: `${c.id}-none`,
        creatorId: c.id,
        accountId: null,
        name: c.name,
        username: null,
        platform: null,
        campaignId: null,
        campaignName: null,
        autoSync: false,
      });
    }
  }
  return cards;
}

/* ── Add Creator Modal ───────────────────────────────────────────────────── */
function AddCreatorModal({ campaigns, onClose, onAdd }) {
  const [socialUrl, setSocialUrl] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) { setError('Display name is required.'); return; }
    setLoading(true);
    setError('');
    try {
      await onAdd({
        name: displayName.trim(),
        social_url: socialUrl.trim() || undefined,
        campaign_id: campaignId ? Number(campaignId) : undefined,
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Add New Creator</h2>
          <button className={styles.modalClose} onClick={onClose}><XIcon /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Social Media URL</label>
            <div className={styles.inputIconWrap}>
              <span className={styles.inputIcon}><LinkIcon /></span>
              <input
                className={styles.textInputWithIcon}
                type="text"
                placeholder="https://tiktok.com/@username/video/..."
                value={socialUrl}
                onChange={(e) => setSocialUrl(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Display Name</label>
            <input
              className={styles.textInput}
              type="text"
              placeholder="Creator name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Assign to Campaign</label>
            <div className={styles.fieldSelectWrap}>
              <select
                className={styles.fieldSelect}
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
              >
                <option value="">Select a campaign (optional)</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <span className={styles.fieldSelectChevron}><ChevronDownIcon /></span>
            </div>
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Notes (Optional)</label>
            <textarea
              className={styles.textarea}
              placeholder="Any notes about this creator..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className={styles.warningBox}>
            <span className={styles.noticeIcon}><AlertCircleIcon size={15} /></span>
            <p className={styles.warningText}>
              <strong>Auto-sync limitation:</strong> Currently, only posts from your connected
              TikTok account can be auto-synced. For other creators, you'll need to manually
              add posts or reconnect with their specific account.
            </p>
          </div>

          <div className={styles.infoBox}>
            <span className={styles.noticeIcon}><AlertCircleIcon size={15} /></span>
            <p className={styles.infoText}>
              <strong>Note:</strong> Profile Visits and Link Clicks require OAuth integration.
              These metrics will need to be entered manually.
            </p>
          </div>

          {error && <p className={styles.formError}>{error}</p>}

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Adding...' : 'Add Creator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Edit Creator Modal ──────────────────────────────────────────────────── */
function EditCreatorModal({ card, onClose, onSave }) {
  const [name, setName] = useState(card.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSave(card.creatorId, { name: name.trim() });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.modalSm}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Edit Creator</h2>
          <button className={styles.modalClose} onClick={onClose}><XIcon /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Display Name</label>
            <input
              className={styles.textInput}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          {error && <p className={styles.formError}>{error}</p>}
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Creator Card ────────────────────────────────────────────────────────── */
function CreatorCard({ card, onEdit, onDelete, onToggleSync }) {
  const platform = getPlatformIcon(card.platform);

  const openProfile = () => {
    if (!card.username) return;
    const lower = (card.platform || '').toLowerCase();
    let url = null;
    if (lower === 'tiktok') url = `https://www.tiktok.com/@${card.username}`;
    else if (lower === 'instagram') url = `https://www.instagram.com/${card.username}`;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={styles.card}>
      {/* Top: avatar + name + platform badge */}
      <div className={styles.cardTop}>
        <div className={styles.creatorInfo}>
          <div className={styles.avatar}><UserIcon size={22} /></div>
          <div className={styles.creatorMeta}>
            <span className={styles.creatorName}>{card.name}</span>
            {card.username && (
              <span className={styles.creatorHandle}>@{card.username}</span>
            )}
          </div>
        </div>
        {platform && (
          <div className={styles.platformBadge}>
            {platform.Icon && <platform.Icon />}
            <span>{platform.label}</span>
          </div>
        )}
      </div>

      {/* Auto-sync row */}
      <div className={styles.syncRow}>
        <span className={styles.syncLabel}>Auto-sync posts</span>
        <span className={card.autoSync ? styles.syncBadgeOn : styles.syncBadgeOff}>
          {card.autoSync ? 'On' : 'Off'}
        </span>
        <button
          className={`${styles.toggle} ${card.autoSync ? styles.toggleOn : ''}`}
          onClick={() => onToggleSync(card.key)}
          aria-label="Toggle auto-sync"
          type="button"
        >
          <span className={`${styles.toggleThumb} ${card.autoSync ? styles.toggleThumbOn : ''}`} />
        </button>
      </div>

      {/* Campaign badge */}
      {card.campaignName && (
        <div className={styles.campaignRow}>
          <span className={styles.campaignBadge}>{card.campaignName}</span>
        </div>
      )}

      {/* Footer: Log Metrics + action icons */}
      <div className={styles.cardFooter}>
        <button className={styles.logMetricsBtn} type="button">
          <BarChartIcon />
          <span>Log Metrics</span>
        </button>
        <div className={styles.cardActions}>
          {card.username && (
            <button className={styles.iconBtn} title="View profile" onClick={openProfile} type="button">
              <ExternalLinkIcon />
            </button>
          )}
          <button className={styles.iconBtn} title="Edit" onClick={() => onEdit(card)} type="button">
            <EditIcon />
          </button>
          <button
            className={`${styles.iconBtn} ${styles.deleteBtnIcon}`}
            title="Delete"
            onClick={() => onDelete(card)}
            type="button"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function CreatorsPage() {
  const { token } = useAuth();

  const [cards, setCards] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [viewMode, setViewMode] = useState('card');

  const [showAdd, setShowAdd] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [deleteCard, setDeleteCard] = useState(null);

  useEffect(() => {
    Promise.all([
      apiFetch('/creators', {}, token),
      apiFetch('/campaigns', {}, token),
    ])
      .then(([creators, camps]) => {
        setCards(flattenToCards(creators));
        setCampaigns(camps);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const platformOptions = useMemo(() => {
    const seen = new Set();
    return cards.map((c) => c.platform).filter((p) => p && !seen.has(p) && seen.add(p));
  }, [cards]);

  const filtered = useMemo(() => {
    let result = cards;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.username && c.username.toLowerCase().includes(q))
      );
    }
    if (platformFilter !== 'all') {
      result = result.filter((c) => (c.platform || '').toLowerCase() === platformFilter.toLowerCase());
    }
    if (campaignFilter !== 'all') {
      result = result.filter((c) => String(c.campaignId) === String(campaignFilter));
    }
    if (sortOrder === 'oldest') result = [...result].reverse();
    return result;
  }, [cards, search, platformFilter, campaignFilter, sortOrder]);

  const handleAdd = async (data) => {
    const created = await apiFetch('/creators', { method: 'POST', body: JSON.stringify(data) }, token);
    setCards((prev) => [...prev, ...flattenToCards([created])]);
  };

  const handleSave = async (creatorId, data) => {
    const updated = await apiFetch(
      `/creators/${creatorId}`,
      { method: 'PUT', body: JSON.stringify(data) },
      token
    );
    setCards((prev) =>
      prev.map((c) => (c.creatorId === creatorId ? { ...c, name: updated.name } : c))
    );
  };

  const handleDelete = async (card) => {
    await apiFetch(`/creators/${card.creatorId}`, { method: 'DELETE' }, token);
    setCards((prev) => prev.filter((c) => c.creatorId !== card.creatorId));
    setDeleteCard(null);
  };

  const handleToggleSync = (key) => {
    setCards((prev) => prev.map((c) => (c.key === key ? { ...c, autoSync: !c.autoSync } : c)));
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Creators</h1>
          <p className={styles.subtitle}>
            {cards.length} total creator{cards.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.syncBtn} type="button">
            <SyncIcon />
            <span>Sync Now</span>
          </button>
          <button className={styles.wizardBtn} type="button">Setup Wizard</button>
          <button className={styles.addBtn} type="button" onClick={() => setShowAdd(true)}>
            + Add Creator
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}><SearchIcon /></span>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search creators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.filterSelectWrap}>
          <select
            className={styles.filterSelect}
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
          >
            <option value="all">All Platforms</option>
            {platformOptions.map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
          <span className={styles.filterSelectChevron}><ChevronDownIcon /></span>
        </div>

        <div className={styles.filterSelectWrap}>
          <select
            className={styles.filterSelect}
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
          >
            <option value="all">All Campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <span className={styles.filterSelectChevron}><ChevronDownIcon /></span>
        </div>

        <div className={styles.filterSelectWrap}>
          <span className={styles.filterSortIcon}><SortIcon /></span>
          <select
            className={`${styles.filterSelect} ${styles.filterSelectWithIcon}`}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <span className={styles.filterSelectChevron}><ChevronDownIcon /></span>
        </div>

        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${viewMode === 'card' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('card')}
            type="button"
            title="Card view"
          >
            <UsersViewIcon />
          </button>
          <button
            className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('grid')}
            type="button"
            title="Grid view"
          >
            <GridViewIcon />
          </button>
          <button
            className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('list')}
            type="button"
            title="List view"
          >
            <ListViewIcon />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading && <p className={styles.stateMsg}>Loading...</p>}
      {error && <p className={styles.errorMsg}>{error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <p className={styles.stateMsg}>No creators found.</p>
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className={styles.grid}>
          {filtered.map((card) => (
            <CreatorCard
              key={card.key}
              card={card}
              onEdit={setEditCard}
              onDelete={setDeleteCard}
              onToggleSync={handleToggleSync}
            />
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <AddCreatorModal
          campaigns={campaigns}
          onClose={() => setShowAdd(false)}
          onAdd={handleAdd}
        />
      )}

      {/* Edit modal */}
      {editCard && (
        <EditCreatorModal
          card={editCard}
          onClose={() => setEditCard(null)}
          onSave={handleSave}
        />
      )}

      {/* Delete confirm */}
      {deleteCard && (
        <div className={styles.modalOverlay} onClick={() => setDeleteCard(null)}>
          <div className={`${styles.modal} ${styles.modalSm}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Delete creator?</h3>
            <p className={styles.modalText}>
              This will permanently delete <strong>{deleteCard.name}</strong> and all their data.
              This cannot be undone.
            </p>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setDeleteCard(null)}>Cancel</button>
              <button className={styles.deleteConfirmBtn} onClick={() => handleDelete(deleteCard)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
