import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../ui/Button.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useUI } from '../../context/UIContext.jsx';
import logoBlueIcon from '../../assets/logo/logo_blue-1_iconOnly.png';
import logoBlueFull from '../../assets/logo/logo_blue-1_nobg.png';
import logoWhiteIcon from '../../assets/logo/logo_white_iconOnly (2).png';
import logoWhiteFull from '../../assets/logo/logo_white_nobg.png';
import logoPinkIcon from '../../assets/logo/logo_pink_iconOnly (1).png';
import logoPinkFull from '../../assets/logo/logo_pink_nobg.png';

const logoByTheme = {
  light: {
    icon: logoBlueIcon,
    full: logoBlueFull,
  },
  dark: {
    icon: logoWhiteIcon,
    full: logoWhiteFull,
  },
  sunset: {
    icon: logoPinkIcon,
    full: logoPinkFull,
  },
};

function Sidebar({ collapsed = true }) {
  const { theme, cycleTheme } = useTheme();
  const {
    activePanel,
    openMemoriesPanel,
    openProfilePanel,
    openFriendsPanel,
    closePanel,
  } = useUI();
  const location = useLocation();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  const isExpanded = !collapsed || hovered;
  const themeLogos = logoByTheme[theme] || logoByTheme.light;

  const menuItems = useMemo(
    () => [
      { key: 'map', label: 'Map', icon: '🗺️', path: '/' },
      {
        key: 'memories',
        label: 'Memories',
        icon: '📚',
        action: openMemoriesPanel,
        isActive: activePanel === 'memories',
      },
      {
        key: 'profile',
        label: 'Profile',
        icon: '👤',
        action: openProfilePanel,
        isActive: activePanel === 'profile',
      },
      {
        key: 'friends',
        label: 'Friends',
        icon: '🤝',
        action: openFriendsPanel,
        isActive: activePanel === 'friends',
      },
      {
        key: 'about',
        label: 'About',
        icon: 'ℹ️',
        action: () => window.alert('memloc – leave memories around the world.'),
      },
    ],
    [activePanel, openMemoriesPanel, openProfilePanel, openFriendsPanel],
  );

  const handleNavigate = (item) => {
    if (item.path) {
      if (item.path === '/') {
        closePanel();
      }
      navigate(item.path);
    } else if (item.action) {
      item.action();
    }
  };

  return (
    <aside
      className={`sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}
      onMouseEnter={() => collapsed && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="sidebar__header">
        <div className="sidebar__logo">
          {isExpanded ? (
            <span className="sidebar__logo-text">mempin</span>
          ) : (
            <img src={themeLogos.icon} alt="mempin logo" />
          )}
        </div>
      </div>
      <nav className="sidebar__nav">
        {menuItems.map((item) => {
          const active =
            item.isActive ||
            (item.path && (location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))));
          return (
            <button
              key={item.key}
              type="button"
              className={`sidebar__nav-item ${active ? 'active' : ''}`}
              onClick={() => handleNavigate(item)}
            >
              <span className="sidebar__icon" aria-hidden="true">
                {item.icon}
              </span>
              {isExpanded && <span className="sidebar__label">{item.label}</span>}
            </button>
          );
        })}
      </nav>
      <div className="sidebar__footer">
        <Button
          variant="ghost"
          onClick={cycleTheme}
          className="sidebar__theme-button"
          title="Change theme"
        >
          <span aria-hidden="true">🌓</span>
          {isExpanded && <span>{theme}</span>}
        </Button>
      </div>
    </aside>
  );
}

export default Sidebar;
