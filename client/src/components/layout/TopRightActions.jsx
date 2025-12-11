import { useEffect, useRef, useState } from 'react';
import Button from '../ui/Button.jsx';
import { useUI } from '../../context/UIContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import Input from '../ui/Input.jsx';

const VISIBILITY_OPTIONS = ['public', 'followers', 'unlisted', 'private'];

function SearchIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="16.65" y1="16.65" x2="21" y2="21" />
    </svg>
  );
}

function TopRightActions({
  filters,
  isFilterOpen,
  onToggleFilter,
  onResetFilters,
  onSelectOwnership,
  onSelectJourneyType,
  onSelectMedia,
  onToggleVisibilityFilter,
  onSearchChange,
  onCenterOnUser,
  isLocating = false,
  hasLocation = false,
  onCloseFilter,
}) {
  const {
    panels,
    leftView,
    rightView,
    openProfilePanel,
    closeLeftPanel,
    openFollowingPanel,
    resetRightPanel,
  } = useUI();
  const { logout, user } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const visibilitySet = filters?.visibilities || new Set(VISIBILITY_OPTIONS);
  const filterRef = useRef(null);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const handleProfileClick = () => {
    if (leftView === 'profile') {
      closeLeftPanel();
      return;
    }
    openProfilePanel();
  };

  const handleFollowingClick = () => {
    const isOpen =
      rightView === 'social' && panels.right?.payload?.mode === 'following';
    if (isOpen) {
      resetRightPanel();
      return;
    }
    openFollowingPanel(user?.handle);
  };

  const avatarFallback =
    (user?.name?.[0] || user?.email?.[0] || 'U').toString().toUpperCase();
  const showAvatarImage = Boolean(user?.avatarUrl && !avatarError);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatarUrl]);

  useEffect(() => {
    if (!isFilterOpen) return undefined;
    const handleClick = (event) => {
      if (!filterRef.current) return;
      if (!filterRef.current.contains(event.target)) {
        onCloseFilter?.();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isFilterOpen, onCloseFilter]);

  return (
    <div className="map-actions">

      <div className="map-actions__cluster">
        <div className={`filter-combo ${isFilterOpen ? 'is-open' : ''}`} ref={filterRef}>
          <button
            type="button"
            className="filter-combo__trigger"
            aria-label="Filter and search"
            onClick={onToggleFilter}
          >
            <div className="filter-combo__input">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search memories, journeys, or handles"
                value={filters?.search || ''}
                onChange={(event) => onSearchChange?.(event.target.value)}
                aria-label="Search memories, journeys, or handles"
              />
            </div>
            <span className="filter-combo__label">Filter by</span>
          </button>

          {isFilterOpen && (
            <div className="filter-card filter-card--attached">
              <div className="filter-card__row">
                <div className="filter-card__label">Visibility</div>
                <div className="chip-group">
                  {VISIBILITY_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`chip chip--clickable ${
                        visibilitySet.has(option) ? 'chip--active' : ''
                      }`}
                      onClick={() => onToggleVisibilityFilter?.(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-card__row">
                <div className="filter-card__label">Ownership</div>
                <div className="chip-group">
                  {[
                    ['all', 'All'],
                    ['mine', 'My memories'],
                    ['others', 'Others'],
                    ['unlocked', 'Unlocked'],
                    ['following', 'Following'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`chip chip--clickable ${
                        filters?.ownership === value ? 'chip--active' : ''
                      }`}
                      onClick={() => onSelectOwnership?.(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-card__row">
                <div className="filter-card__label">Journey</div>
                <div className="chip-group">
                  {[
                    ['all', 'Any'],
                    ['journey', 'In a journey'],
                    ['standalone', 'Standalone'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`chip chip--clickable ${
                        filters?.journey === value ? 'chip--active' : ''
                      }`}
                      onClick={() => onSelectJourneyType?.(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-card__row">
                <div className="filter-card__label">Media</div>
                <div className="chip-group">
                  {[
                    ['all', 'Any'],
                    ['withMedia', 'Has media'],
                    ['textOnly', 'Text only'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`chip chip--clickable ${
                        filters?.media === value ? 'chip--active' : ''
                      }`}
                      onClick={() => onSelectMedia?.(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-card__actions">
                <Button variant="ghost" onClick={onResetFilters}>
                  Reset filters
                </Button>
              </div>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          aria-label={hasLocation ? 'Center map on your location' : 'Find your location'}
          title={hasLocation ? 'Center on my location' : 'Find my location'}
          onClick={onCenterOnUser}
          disabled={isLocating}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            <path d="M5.64 5.64 7.76 7.76M16.24 16.24l2.12 2.12M16.24 7.76l2.12-2.12M5.64 18.36l2.12-2.12" />
          </svg>
          <span className="map-actions__label">
            {isLocating ? 'Locating...' : hasLocation ? 'My location' : 'Find me'}
          </span>
        </Button>
        <Button
          variant="ghost"
          aria-label="Social"
          onClick={handleFollowingClick}
          title="Social"
          disabled={!user}
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor" aria-hidden="true">
            <path d="M40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Zm720 0v-120q0-44-24.5-84.5T666-434q51 6 96 20.5t84 35.5q36 20 55 44.5t19 53.5v120H760ZM360-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm400-160q0 66-47 113t-113 47q-11 0-28-2.5t-28-5.5q27-32 41.5-71t14.5-81q0-42-14.5-81T544-792q14-5 28-6.5t28-1.5q66 0 113 47t47 113ZM120-240h480v-32q0-11-5.5-20T580-306q-54-27-109-40.5T360-360q-56 0-111 13.5T140-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T440-640q0-33-23.5-56.5T360-720q-33 0-56.5 23.5T280-640q0 33 23.5 56.5T360-560Zm0 320Zm0-400Z" />
          </svg>
          <span className="map-actions__label">Social</span>
        </Button>
      </div>
      <Button
        variant="ghost"
        className="map-fab__button"
        onClick={handleProfileClick}
        aria-label={user?.name ? `Profile: ${user.name}` : 'Profile'}
        title={user?.name || user?.email || 'Profile'}
      >
        <span className="map-avatar">
          {showAvatarImage ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="map-avatar__image"
              onError={() => setAvatarError(true)}
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="map-avatar__fallback">{avatarFallback}</span>
          )}
        </span>
        <span className="map-actions__label">Profile</span>
      </Button>
      <Button
        variant="ghost"
        className="map-fab__button"
        aria-label="Settings"
        title="Settings"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.34.3.8.48 1.27.48H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
        <span className="map-actions__label">Settings</span>
      </Button>
      <Button
        variant="ghost"
        onClick={handleLogout}
        aria-label="Logout"
        title="Logout"
        disabled={loggingOut}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span className="map-actions__label">Logout</span>
      </Button>
    </div>
  );
}

export default TopRightActions;
