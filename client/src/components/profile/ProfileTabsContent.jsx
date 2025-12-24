import { useEffect, useMemo, useRef, useState } from 'react';
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
  savedMemories = [],
  journeys = [],
  journeyMemories = {},
  onSelectMemory,
  onOpenProfile,
  onOpenJourneyPanel,
  followingTabProps = {},
  className = '',
  showSaved = true,
  defaultJourneyId = null,
  defaultJourneyScroll = 0,
  onJourneyViewChange,
  avatarUrl = '',
  displayName = '',
  showProfileHeader = true,
}) {
  const [tab, setTab] = useState('memories');
  const [selectedJourneyId, setSelectedJourneyId] = useState(null);
  const [memorySearch, setMemorySearch] = useState('');
  const [savedSearch, setSavedSearch] = useState('');
  const [journeySearch, setJourneySearch] = useState('');
  const journeyListRef = useRef(null);
  const [journeyScroll, setJourneyScroll] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setTab('memories');
      setSelectedJourneyId(null);
      setMemorySearch('');
      setSavedSearch('');
      setJourneySearch('');
      setJourneyScroll(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!showSaved && tab === 'saved') {
      setTab('memories');
    }
  }, [showSaved, tab]);

  const normalizedHandle = normalizeHandle(profileHandle);

  const visiblePlaced = useMemo(() => {
    const base = placedMemories.filter(
      (memory) => normalizeHandle(memory.ownerHandle) === normalizedHandle,
    );
    if (!memorySearch.trim()) return base;
    const term = memorySearch.toLowerCase();
    return base.filter((m) =>
      `${m.title} ${m.shortDescription || ''}`.toLowerCase().includes(term),
    );
  }, [placedMemories, normalizedHandle, memorySearch]);

  const visibleSaved = useMemo(() => {
    const base = savedMemories;
    if (!savedSearch.trim()) return base;
    const term = savedSearch.toLowerCase();
    return base.filter((m) =>
      `${m.title} ${m.shortDescription || ''}`.toLowerCase().includes(term),
    );
  }, [savedMemories, savedSearch]);

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

  useEffect(() => {
    if (!isOpen) return;
    if (defaultJourneyId && journeysList.some((j) => j.id === defaultJourneyId)) {
      setTab('journeys');
      setSelectedJourneyId(defaultJourneyId);
      const targetScroll = journeyScroll || defaultJourneyScroll || 0;
      if (journeyListRef.current && targetScroll > 0) {
        journeyListRef.current.scrollTop = targetScroll;
      }
    }
  }, [defaultJourneyId, defaultJourneyScroll, isOpen, journeysList, journeyScroll]);

  const currentJourneyMemories = selectedJourneyId
    ? journeyMemories[selectedJourneyId]?.memories || []
    : [];

  const filteredJourneyMemories = useMemo(() => {
    if (!selectedJourneyId) return [];
    if (currentJourneyMemories.length) return currentJourneyMemories;
    return placedMemories.filter((mem) => mem.journeyId === selectedJourneyId);
  }, [currentJourneyMemories, placedMemories, selectedJourneyId]);

  const placedCount = stats?.placedCount ?? 0;
  const foundCount = stats?.foundCount ?? 0;
  const followerCount = stats?.followerCount ?? 0;
  const followingCount = stats?.followingCount ?? 0;
  const journeyCount = journeys.length;
  const savedCount = savedMemories.length;

  const renderMemoryItem = (memory, { timestamp, prefix = '' } = {}) => {
    const assets = memory.assets || [];
    const imageCount = memory.imageCount ?? assets.filter((asset) => asset.type === 'image').length;
    const audioCount = memory.audioCount ?? assets.filter((asset) => asset.type === 'audio').length;
    const videoCount = memory.videoCount ?? assets.filter((asset) => asset.type === 'video').length;
    const expiryText = formatProfileExpiry(memory.expiresAt);
    const visibilityIcon =
      memory.visibility === 'private'
        ? 'lock'
        : memory.visibility === 'followers'
          ? 'groups'
          : memory.visibility === 'unlisted'
            ? 'link'
            : 'public';
    const radiusValue = Number(memory.radiusM);
    const radiusText = Number.isFinite(radiusValue) ? `${radiusValue} m` : 'N/A';
    const viewCountValue = Number(memory.timesFound);
    const viewCount = Number.isFinite(viewCountValue) ? viewCountValue : 0;
    const timestampText = timestamp
      ? `${prefix ? `${prefix} ` : ''}${new Date(timestamp).toLocaleString()}`
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
        {timestampText && <div className="profile-memory-sub mt-4">{timestampText}</div>}
      </button>
    );
  };

  return (
    <>
      <div className={className}>
        {showProfileHeader && (
          <div className="profile-header">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="profile-header__avatar" />
            ) : (
              <div className="profile-header__avatar profile-header__avatar--fallback">
                {(displayName || normalizedHandle || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="profile-header__meta">
              <div className="profile-header__handle">@{normalizedHandle}</div>
              {displayName && <div className="profile-header__name">{displayName}</div>}
            </div>
          </div>
        )}
        <div className="profile-stat-row">
          <div className="profile-stat">
            <span className="profile-stat__icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M17 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path d="M3 21v-1a6 6 0 0 1 6-6h2" />
                <path d="M21 21v-1a6 6 0 0 0-4-5.65" />
                <path d="m19 16-2 2.5V20" />
              </svg>
            </span>
            <span className="profile-stat__label">Following</span>
            <span className="profile-stat__value">{followingCount}</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat__icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M7 7a5 5 0 1 1 10 0 5 5 0 0 1-10 0Z" />
                <path d="M2 21c0-4 3.5-7 10-7s10 3 10 7" />
              </svg>
            </span>
            <span className="profile-stat__label">Followers</span>
            <span className="profile-stat__value">{followerCount}</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat__icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5 22V12l7-9 7 9v10" />
                <path d="M5 12h14" />
              </svg>
            </span>
            <span className="profile-stat__label">Memories Found</span>
            <span className="profile-stat__value">{foundCount}</span>
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
        {showSaved && (
          <button
            type="button"
            className={`tab-button ${tab === 'saved' ? 'active' : ''}`}
            onClick={() => setTab('saved')}
          >
            Saved <span className="tab-count">{savedCount}</span>
          </button>
        )}
        <button
          type="button"
          className={`tab-button ${tab === 'journeys' ? 'active' : ''}`}
          onClick={() => setTab('journeys')}
        >
          Journeys <span className="tab-count">{journeyCount}</span>
        </button>
      </div>

      <div className="profile-tab-content ">
        {tab === 'memories' && (
          <>
            <Input
              placeholder="Search memories..."
              value={memorySearch}
              onChange={(event) => setMemorySearch(event.target.value)}
            />
            <div className="profile-memory-list ">
              {visiblePlaced.map((memory) => {
                return renderMemoryItem(memory, { timestamp: memory.createdAt });
              })}
              {!visiblePlaced.length && <div className="empty-state">No placed memories yet.</div>}
            </div>
          </>
        )}

        {showSaved && tab === 'saved' && (
          <>
            <Input
              placeholder="Search saved memories..."
              value={savedSearch}
              onChange={(event) => setSavedSearch(event.target.value)}
            />
            <div className="profile-memory-list">
              {visibleSaved.map((memory) => {
                return renderMemoryItem(memory, {
                  timestamp: memory.savedAt,
                  prefix: 'Saved',
                });
              })}
              {!visibleSaved.length && <div className="empty-state">No saved memories yet.</div>}
            </div>
          </>
        )}

        {tab === 'journeys' && (
          <div className="profile-journeys">
            <Input
              placeholder="Search journeys..."
              value={journeySearch}
              onChange={(event) => setJourneySearch(event.target.value)}
            />
            <div
              className="memories-panel__list"
              ref={journeyListRef}
              onScroll={() => {
                const nextScroll = journeyListRef.current?.scrollTop || 0;
                setJourneyScroll(nextScroll);
                onJourneyViewChange?.({ journeyId: selectedJourneyId, scrollTop: nextScroll });
              }}
            >
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
                      const nextScroll = journeyListRef.current?.scrollTop || 0;
                      setJourneyScroll(nextScroll);
                      onJourneyViewChange?.({ journeyId: nextId, scrollTop: nextScroll });
                      if (nextId) {
                        onOpenJourneyPanel?.({
                          journeyId: journey.id,
                          journeyTitle: journey.title,
                          ownerHandle: normalizedHandle,
                          journeyListScroll: nextScroll,
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
                <div className="empty-state">No journeys yet.</div>
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
