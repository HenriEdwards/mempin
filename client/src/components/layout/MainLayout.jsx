import { Outlet } from 'react-router-dom';

function MainLayout() {
  return (
    <div className="layout-shell">
      <div className="layout-content">
        <Outlet />
      </div>
    </div>
  );
}

export default MainLayout;
