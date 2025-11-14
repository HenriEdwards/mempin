import Button from '../ui/Button.jsx';
import { useUI } from '../../context/UIContext.jsx';

function TopRightActions() {
  const { openMemoriesPanel } = useUI();
  return (
    <div className="map-actions">
      <Button variant="primary" onClick={openMemoriesPanel}>
        Memories
      </Button>
    </div>
  );
}

export default TopRightActions;
