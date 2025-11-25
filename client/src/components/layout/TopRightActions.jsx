import { useEffect, useState } from 'react';
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
}) {
  const {
    openProfilePanel,
    closePanel,
    activePanel,
    openFollowersPanel,
    openFollowingPanel,
  } = useUI();
  const { logout, user } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const visibilitySet = filters?.visibilities || new Set(VISIBILITY_OPTIONS);
  const actionOffset = 'var(--controls-gap)';

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const handleProfileClick = () => {
    if (activePanel === 'profile') {
      closePanel();
      return;
    }
    openProfilePanel();
  };

  const avatarFallback =
    (user?.name?.[0] || user?.email?.[0] || 'U').toString().toUpperCase();
  const showAvatarImage = Boolean(user?.avatarUrl && !avatarError);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatarUrl]);

  return (
    <div className="map-actions" style={{ right: actionOffset }}>

      <div className="map-actions__cluster">
        <div className="filter-wrapper">
          <Button variant="ghost" onClick={onToggleFilter} aria-label="Filters">
            <SearchIcon />
          </Button>
          {isFilterOpen && (
            <div className="filter-card">
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

              <div className="filter-card__row">
                <div className="filter-card__label">Search</div>
                <Input
                  placeholder="Search memories, journeys, or handles"
                  value={filters?.search || ''}
                  onChange={(event) => onSearchChange?.(event.target.value)}
                />
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
          aria-label="Followers"
          onClick={openFollowersPanel}
          title="Followers"
          disabled={!user}
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
            <circle cx="9" cy="7" r="4" />
            <path d="M17 11.5V7.5a2.5 2.5 0 0 0-5 0v4" />
            <path d="M5 21v-2a4 4 0 0 1 4-4h2" />
            <path d="M17 17v4" />
            <path d="M21 17v4" />
            <path d="M17 13a3 3 0 0 1 3 3" />
          </svg>
        </Button>
        <Button
          variant="ghost"
          aria-label="Following"
          onClick={openFollowingPanel}
          title="Following"
          disabled={!user}
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
            <path d="M16 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z" />
            <path d="M5 21a7 7 0 0 1 14 0" />
            <path d="m12 11 3 3-3 3" />
            <path d="M9 14h6" />
          </svg>
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
      </Button>
    </div>
  );
}

export default TopRightActions;
