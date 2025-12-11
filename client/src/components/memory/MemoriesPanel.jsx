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
    const expiryText = formatExpiry(memory.expiresAt);
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
          <span className="profile-memory-pill">{memory.visibility}</span>
          <span className="profile-memory-pill">Found {memory.timesFound ?? 0}</span>
          <span className="profile-memory-pill">{expiryText}</span>
        </div>
        <div className="profile-memory-meta profile-memory-assets">
          <span className="profile-memory-asset">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="14" rx="2" ry="2" />
              <circle cx="8.5" cy="8" r="1.5" />
              <path d="M21 14l-5-5-4 4-2-2-4 4" />
            </svg>
            <span>{imageCount}</span>
          </span>
          <span className="profile-memory-asset">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 4h4l7 4v8l-7 4H5V4Z" />
              <path d="M15 9v6" />
            </svg>
            <span>{audioCount}</span>
          </span>
          <span className="profile-memory-asset">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 6a2 2 0 0 1 2-2h8.5a2 2 0 0 1 1.6.8l3.5 4.2a2 2 0 0 1 0 2.6l-3.5 4.2a2 2 0 0 1-1.6.8H6a2 2 0 0 1-2-2V6Z" />
              <path d="m12 9.5-2.5 2L12 13" />
            </svg>
            <span>{videoCount}</span>
          </span>
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
