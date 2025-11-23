import { Outlet } from 'react-router-dom';

function MainLayout() {
  return (
    <div className="layout-shell">
      <div className="map-brand">mempin</div>
      <div className="layout-content">
        <Outlet />
      </div>
    </div>
  );
}

export default MainLayout;
