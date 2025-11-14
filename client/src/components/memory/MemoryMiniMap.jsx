import { useEffect, useRef } from 'react';
import L from 'leaflet';
import userIconUrl from 'leaflet/dist/images/marker-icon.png';
import userIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import userIconShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: userIconRetina,
  iconUrl: userIconUrl,
  shadowUrl: userIconShadow,
});

function MemoryMiniMap({ latitude, longitude, radiusM }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayer = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }
    mapRef.current = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      scrollWheelZoom: false,
      dragging: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '',
    }).addTo(mapRef.current);
    markerLayer.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerLayer.current) {
      return;
    }
    markerLayer.current.clearLayers();
    const position = [latitude, longitude];
    L.marker(position).addTo(markerLayer.current);
    L.circle(position, { radius: radiusM, color: '#f97316', opacity: 0.4 }).addTo(
      markerLayer.current,
    );
    mapRef.current.setView(position, 15);
  }, [latitude, longitude, radiusM]);

  return <div className="memory-mini-map" ref={containerRef} />;
}

export default MemoryMiniMap;
