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

        {showSaved && tab === 'saved' && (
          <>
            <Input
              placeholder="Search saved memories..."
              value={savedSearch}
              onChange={(event) => setSavedSearch(event.target.value)}
            />
            <div className="profile-memory-list">
              {visibleSaved.map((memory) => {
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
                    {memory.savedAt && (
                      <div className="profile-memory-sub mt-4">
                        Saved {new Date(memory.savedAt).toLocaleString()}
                      </div>
                    )}
                  </button>
                );
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
