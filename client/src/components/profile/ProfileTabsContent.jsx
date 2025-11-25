import { useEffect, useMemo, useState } from 'react';
import Input from '../ui/Input.jsx';
import { normalizeHandle } from '../../utils/handles.js';

function formatProfileExpiry(value) {
  if (!value) return 'Forever';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Forever';
  const formatted = new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
  return date.getTime() <= Date.now() ? `Expired ${formatted}` : `Expires ${formatted}`;
}

function ProfileTabsContent({
  profileHandle = '',
  stats = {},
  isOpen = false,
  placedMemories = [],
  foundMemories = [],
  journeys = [],
  journeyMemories = {},
  journeyVisibilityMap = {},
  onSelectMemory,
  onOpenProfile,
  onOpenJourneyPanel,
  followingTabProps = {},
  className = '',
}) {
  const [tab, setTab] = useState('memories');
  const [selectedJourneyId, setSelectedJourneyId] = useState(null);
  const [memorySearch, setMemorySearch] = useState('');
  const [unlockedSearch, setUnlockedSearch] = useState('');
  const [journeySearch, setJourneySearch] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setTab('memories');
      setSelectedJourneyId(null);
      setMemorySearch('');
      setUnlockedSearch('');
      setJourneySearch('');
    }
  }, [isOpen]);

  const normalizedHandle = normalizeHandle(profileHandle);

  const visiblePlaced = useMemo(() => {
    const base = placedMemories.filter(
      (memory) => normalizeHandle(memory.ownerHandle) === normalizedHandle,
    );
    if (!memorySearch.trim()) return base;
    const term = memorySearch.toLowerCase();
    return base.filter((m) =>
      `${m.title} ${m.shortDescription || ''} ${m.body || ''}`.toLowerCase().includes(term),
    );
  }, [placedMemories, normalizedHandle, memorySearch]);

  const visibleUnlocked = useMemo(() => {
    const base = foundMemories;
    if (!unlockedSearch.trim()) return base;
    const term = unlockedSearch.toLowerCase();
    return base.filter((m) =>
      `${m.title} ${m.shortDescription || ''} ${m.body || ''}`.toLowerCase().includes(term),
    );
  }, [foundMemories, unlockedSearch]);

  const journeysList = useMemo(() => {
    const list = journeys.map((journey) => ({
      id: journey.id,
      title: journey.title,
      description: journey.description,
      stepCount: journey.stepCount,
    }));
    if (!journeySearch.trim()) return list;
    const term = journeySearch.toLowerCase();
    return list.filter(
      (j) =>
        j.title.toLowerCase().includes(term) ||
        (j.description || '').toLowerCase().includes(term),
    );
  }, [journeys, journeySearch]);

  const currentJourneyMemories = selectedJourneyId
    ? journeyMemories[selectedJourneyId]?.memories || []
    : [];
  const currentJourneyVisibility = journeyVisibilityMap[selectedJourneyId] || new Set();
  const journeyVisibility =
    currentJourneyVisibility.size === 1
      ? Array.from(currentJourneyVisibility)[0]
      : currentJourneyVisibility.size > 1
      ? 'mixed'
      : currentJourneyMemories[0]?.visibility || 'mixed';

  const filteredJourneyMemories = useMemo(() => {
    if (!selectedJourneyId) return [];
    if (currentJourneyMemories.length) return currentJourneyMemories;
    return placedMemories.filter((mem) => mem.journeyId === selectedJourneyId);
  }, [currentJourneyMemories, placedMemories, selectedJourneyId]);

  const placedCount = stats?.placedCount ?? 0;
  const foundCount = stats?.foundCount ?? 0;
  const followerCount = stats?.followerCount ?? 0;
  const followingCount = stats?.followingCount ?? followerCount ?? 0;
  const journeyCount = journeys.length;

  return (
    <>
      <div className={className}>
        <p className="muted">{normalizedHandle ? `@${normalizedHandle}` : ''}</p>

        <div className="profile-stat-row">
          <div className="profile-stat">
            <span className="profile-stat__icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 4v16m-6-6h12" />
              </svg>
            </span>
            <span className="profile-stat__label">Placed</span>
            <span className="profile-stat__value">{placedCount}</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat__icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 4v16m6-10H6" />
              </svg>
            </span>
            <span className="profile-stat__label">Found</span>
            <span className="profile-stat__value">{foundCount}</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat__icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5 12h14" /><path d="M12 5 5 12l7 7" />
              </svg>
            </span>
            <span className="profile-stat__label">Collections</span>
            <span className="profile-stat__value">{journeyCount}</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat__icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="8" cy="8" r="3" />
                <circle cx="16" cy="8" r="3" />
                <path d="M2 20c0-3.333 3.333-6 6-6s6 2.667 6 6" />
                <path d="M10 20c0-3 2.5-5.5 5.5-5.5.86 0 1.676.16 2.45.46" />
              </svg>
            </span>
            <span className="profile-stat__label">Followers</span>
            <span className="profile-stat__value">{followerCount}</span>
          </div>
        </div>

      <div className="tabs tabs--segmented">
        <button
          type="button"
          className={`tab-button ${tab === 'memories' ? 'active' : ''}`}
          onClick={() => setTab('memories')}
        >
          Memories <span className="tab-count">{placedCount}</span>
        </button>
        <button
          type="button"
          className={`tab-button ${tab === 'unlocked' ? 'active' : ''}`}
          onClick={() => setTab('unlocked')}
        >
          Unlocked <span className="tab-count">{foundCount}</span>
        </button>
        <button
          type="button"
          className={`tab-button ${tab === 'journeys' ? 'active' : ''}`}
          onClick={() => setTab('journeys')}
        >
          Collections <span className="tab-count">{journeyCount}</span>
        </button>
      </div>

      <div className="profile-tab-content">
        {tab === 'memories' && (
          <>
            <Input
              placeholder="Search memories..."
              value={memorySearch}
              onChange={(event) => setMemorySearch(event.target.value)}
            />
            <div className="profile-memory-list">
              {visiblePlaced.map((memory) => {
                const assets = memory.assets || [];
                const imageCount =
                  memory.imageCount ?? assets.filter((asset) => asset.type === 'image').length;
                const audioCount =
                  memory.audioCount ?? assets.filter((asset) => asset.type === 'audio').length;
                const videoCount =
                  memory.videoCount ?? assets.filter((asset) => asset.type === 'video').length;
                const expiryText = formatProfileExpiry(memory.expiresAt);
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
                    {memory.createdAt && (
                      <div className="profile-memory-sub mt-4">
                         {new Date(memory.createdAt).toLocaleString()}
                      </div>
                    )}
                  </button>
                );
              })}
              {!visiblePlaced.length && <div className="empty-state">No placed memories yet.</div>}
            </div>
          </>
        )}

        {tab === 'unlocked' && (
          <>
            <Input
              placeholder="Search unlocked memories..."
              value={unlockedSearch}
              onChange={(event) => setUnlockedSearch(event.target.value)}
            />
            <div className="profile-memory-list">
              {visibleUnlocked.map((memory) => {
                const assets = memory.assets || [];
                const imageCount =
                  memory.imageCount ?? assets.filter((asset) => asset.type === 'image').length;
                const audioCount =
                  memory.audioCount ?? assets.filter((asset) => asset.type === 'audio').length;
                const videoCount =
                  memory.videoCount ?? assets.filter((asset) => asset.type === 'video').length;
                const expiryText = formatProfileExpiry(memory.expiresAt);
                const unlockedText = memory.unlockedAt
                  ? new Date(memory.unlockedAt).toLocaleString()
                  : null;
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
                    {(unlockedText || memory.createdAt) && (
                      <div className="profile-memory-sub mt-4">
                        {unlockedText ? `Unlocked ${unlockedText}` : new Date(memory.createdAt).toLocaleString()}
                      </div>
                    )}
                  </button>
                );
              })}
              {!visibleUnlocked.length && <div className="empty-state">No unlocked memories yet.</div>}
            </div>
          </>
        )}

        {tab === 'journeys' && (
          <div className="profile-journeys">
            <Input
              placeholder="Search collections..."
              value={journeySearch}
              onChange={(event) => setJourneySearch(event.target.value)}
            />
            <div className="memories-panel__list">
              {journeysList.map((journey) => {
                const selected = journey.id === selectedJourneyId;
                return (
                  <button
                    key={journey.id}
                    type="button"
                    className={`memories-panel__item ${selected ? 'active' : ''}`}
                    onClick={() => {
                      const nextId = selected ? null : journey.id;
                      setSelectedJourneyId(nextId);
                      if (nextId) {
                        onOpenJourneyPanel?.({
                          journeyId: journey.id,
                          journeyTitle: journey.title,
                          ownerHandle: normalizedHandle,
                          memories: filteredJourneyMemories.length ? filteredJourneyMemories : [],
                        });
                      } else {
                        onOpenJourneyPanel?.(null);
                      }
                    }}
                  >
                    <div className="memories-panel__item-header">
                      <h4>{journey.title}</h4>
                      <span className="pill">{journey.stepCount} steps</span>
                    </div>
                    <p className="memories-panel__preview">
                      {journey.description || 'No description yet.'}
                    </p>
                  </button>
                );
              })}
              {!journeysList.length && (
                <div className="empty-state">No collections yet.</div>
              )}
            </div>
            <div className="journey-details">
              <div className="journey-details__header">
                <h4>Selected Collection memories</h4>
                {selectedJourneyId ? <span className="pill">{journeyVisibility}</span> : null}
              </div>
              {!selectedJourneyId && <div className="empty-state">No collection selected.</div>}
              {selectedJourneyId && (
                <div className="empty-state">Memories open in the left panel.</div>
              )}
            </div>
          </div>
        )}

      </div>
      </div>
    </>
  );
}

export default ProfileTabsContent;
