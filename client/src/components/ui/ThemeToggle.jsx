import { useTheme } from '../../context/ThemeContext.jsx';
import Button from './Button.jsx';

function ThemeToggle() {
  const { theme, cycleTheme } = useTheme();
  const label = `Theme: ${theme}`;

  return (
    <span className="tooltip-anchor" data-tooltip="Change theme">
      <Button
        variant="ghost"
        aria-label={label}
        title="Change theme"
        onClick={cycleTheme}
      >
        {label}
      </Button>
    </span>
  );
}

export default ThemeToggle;
