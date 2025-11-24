import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors';

function MemoryMiniMap({ latitude, longitude, radiusM }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  const lat = Number(latitude);
  const lng = Number(longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const formattedLat = hasCoords ? lat.toFixed(4) : '—';
  const formattedLng = hasCoords ? lng.toFixed(4) : '—';
  const roundedRadius = Math.max(Math.round(radiusM || 0), 25);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !hasCoords) return;

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      tap: false,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    markerRef.current = L.circleMarker([lat, lng], {
      radius: 6,
      color: '#04ddff',
      weight: 2,
      fillColor: '#04ddff',
      fillOpacity: 0.9,
    }).addTo(map);

    circleRef.current = L.circle([lat, lng], {
      radius: roundedRadius,
      color: '#04ddff',
      fillColor: '#04ddff',
      fillOpacity: 0.08,
      weight: 2,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  }, [hasCoords, lat, lng, roundedRadius]);

  useEffect(() => {
    if (!mapRef.current || !hasCoords) return;
    const nextCenter = [lat, lng];
    mapRef.current.setView(nextCenter, 15);
    markerRef.current?.setLatLng(nextCenter);
    circleRef.current?.setLatLng(nextCenter);
    circleRef.current?.setRadius(roundedRadius);
  }, [lat, lng, roundedRadius, hasCoords]);

  useEffect(() => {
    if (hasCoords || !mapRef.current) return;
    mapRef.current?.remove();
    mapRef.current = null;
    markerRef.current = null;
    circleRef.current = null;
  }, [hasCoords]);

  return (
    <div className="memory-mini-map">
      <div className="memory-mini-map__content">
        <div className="memory-mini-map__meta">
          <p className="memory-mini-map__title">Location snapshot</p>
          <div className="memory-mini-map__coords">
            <span>Lat {formattedLat}</span>
            <span>Lng {formattedLng}</span>
          </div>
          <span className="memory-mini-map__radius">Radius ~{roundedRadius} m</span>
        </div>
        <div className="memory-mini-map__visual">
          <div className="memory-mini-map__map" ref={mapContainerRef} />
          {!hasCoords && <div className="memory-mini-map__empty">No location available</div>}
        </div>
      </div>
    </div>
  );
}

export default MemoryMiniMap;
