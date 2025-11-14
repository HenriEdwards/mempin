import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

function MainLayout() {
  return (
    <div className="layout-shell">
      <Sidebar collapsed />
      <div className="layout-content">
        <Outlet />
      </div>
    </div>
  );
}

export default MainLayout;
