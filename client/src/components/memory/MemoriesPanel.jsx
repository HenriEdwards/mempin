import { useMemo, useState } from 'react';
import Input from '../ui/Input.jsx';

function formatExpiry(value) {
  if (!value) return 'Forever';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Forever';
  const formatted = new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
  return date.getTime() <= Date.now() ? `Expired ${formatted}` : formatted;
}

function MemoriesPanel({ placed = [], found = [], onSelectMemory, titleHandle = '' }) {
  const [tab, setTab] = useState('placed');
  const [searchPlaced, setSearchPlaced] = useState('');
  const [searchFound, setSearchFound] = useState('');

  const visiblePlaced = useMemo(() => {
    if (!searchPlaced.trim()) return placed;
    const term = searchPlaced.toLowerCase();
    return placed.filter((memory) =>
      `${memory.title} ${memory.shortDescription || ''}`
        .toLowerCase()
        .includes(term),
    );
  }, [placed, searchPlaced]);

  const visibleFound = useMemo(() => {
    if (!searchFound.trim()) return found;
    const term = searchFound.toLowerCase();
    return found.filter((memory) =>
      `${memory.title} ${memory.shortDescription || ''}`
        .toLowerCase()
        .includes(term),
    );
  }, [found, searchFound]);

  const renderMemoryRow = (memory, isFound = false) => {
    const assets = memory.assets || [];
    const imageCount =
      memory.imageCount ?? assets.filter((asset) => asset.type === 'image').length;
    const audioCount =
      memory.audioCount ?? assets.filter((asset) => asset.type === 'audio').length;
    const videoCount =
      memory.videoCount ?? assets.filter((asset) => asset.type === 'video').length;
    const visibilityIcon =
      memory.visibility === 'private'
        ? 'lock'
        : memory.visibility === 'followers'
          ? 'groups'
          : memory.visibility === 'unlisted'
            ? 'link'
            : 'public';
    const expiryText = formatExpiry(memory.expiresAt);
    const radiusValue = Number(memory.radiusM);
    const radiusText = Number.isFinite(radiusValue) ? `${radiusValue} m` : 'N/A';
    const viewCountValue = Number(memory.timesFound);
    const viewCount = Number.isFinite(viewCountValue) ? viewCountValue : 0;
    const timestamp = isFound ? memory.unlockedAt || memory.createdAt : memory.createdAt;

    return (
      <button
        key={memory.id}
        type="button"
        className="profile-memory-item"
        onClick={() => onSelectMemory?.(memory)}
      >
        <div className="profile-memory-row">
          <div className="profile-memory-title">{memory.title}</div>
          <div className="profile-memory-stats">
            <span className="profile-memory-pill">
              <span className="material-symbols-rounded profile-memory-pill__icon" aria-hidden="true">
                {visibilityIcon}
              </span>
              <span>{memory.visibility}</span>
            </span>
            <span className="profile-memory-pill">
              <span className="material-symbols-rounded profile-memory-pill__icon" aria-hidden="true">
                near_me
              </span>
              <span>{radiusText}</span>
            </span>
            <span className="profile-memory-pill">
              <span className="material-symbols-rounded profile-memory-pill__icon" aria-hidden="true">
                visibility
              </span>
              <span>{viewCount}</span>
            </span>
            <span className="profile-memory-pill">
              <span className="material-symbols-rounded profile-memory-pill__icon" aria-hidden="true">
                hourglass_bottom
              </span>
              <span>{expiryText}</span>
            </span>
            {imageCount > 0 && (
              <span className="profile-memory-pill">
                <span className="material-symbols-rounded profile-memory-pill__icon" aria-hidden="true">
                  image
                </span>
                <span>{imageCount}</span>
              </span>
            )}
            {audioCount > 0 && (
              <span className="profile-memory-pill">
                <span className="material-symbols-rounded profile-memory-pill__icon" aria-hidden="true">
                  music_note
                </span>
                <span>{audioCount}</span>
              </span>
            )}
            {videoCount > 0 && (
              <span className="profile-memory-pill">
                <span className="profile-memory-pill__icon" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 -960 960 960" width="18" fill="currentColor">
                    <path d="m460-380 280-180-280-180v360ZM320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z" />
                  </svg>
                </span>
                <span>{videoCount}</span>
              </span>
            )}
          </div>
        </div>
        {timestamp && (
          <div className="profile-memory-sub mt-4">
            {new Date(timestamp).toLocaleString()}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="memories-panel">
      {titleHandle ? <p className="muted">@{titleHandle}</p> : null}

      <div className="tabs tabs--segmented">
        <button
          type="button"
          className={`tab-button ${tab === 'placed' ? 'active' : ''}`}
          onClick={() => setTab('placed')}
        >
          Placed <span className="tab-count">{placed.length}</span>
        </button>
        <button
          type="button"
          className={`tab-button ${tab === 'found' ? 'active' : ''}`}
          onClick={() => setTab('found')}
        >
          Unlocked <span className="tab-count">{found.length}</span>
        </button>
      </div>

      <div className="profile-tab-content">
        {tab === 'placed' && (
          <>
            <Input
              placeholder="Search placed memories..."
              value={searchPlaced}
              onChange={(event) => setSearchPlaced(event.target.value)}
            />
            <div className="profile-memory-list">
              {visiblePlaced.map((memory) => renderMemoryRow(memory, false))}
              {!visiblePlaced.length && <div className="empty-state">No placed memories yet.</div>}
            </div>
          </>
        )}
        {tab === 'found' && (
          <>
            <Input
              placeholder="Search unlocked memories..."
              value={searchFound}
              onChange={(event) => setSearchFound(event.target.value)}
            />
            <div className="profile-memory-list">
              {visibleFound.map((memory) => renderMemoryRow(memory, true))}
              {!visibleFound.length && <div className="empty-state">No unlocked memories yet.</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MemoriesPanel;
