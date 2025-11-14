import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import userIconUrl from 'leaflet/dist/images/marker-icon.png';
import userIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import userIconShadow from 'leaflet/dist/images/marker-shadow.png';
import Button from '../ui/Button.jsx';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: userIconRetina,
  iconUrl: userIconUrl,
  shadowUrl: userIconShadow,
});

const userMarkerIcon = L.icon({
  iconUrl: userIconUrl,
  shadowUrl: userIconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function formatRelative(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
}

function MapView({
  userLocation,
  locationError,
  onRetryLocation,
  memories,
  onSelectGroup,
  onRequestPlace,
  canPlaceMemory,
}) {
  const hasLocation = Boolean(userLocation);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userLayerRef = useRef(null);
  const memoriesLayerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const groupedMemories = useMemo(() => {
    const groups = new Map();
    memories.forEach((memory) => {
      const key = `${Number(memory.latitude).toFixed(6)}:${Number(memory.longitude).toFixed(6)}`;
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          latitude: Number(memory.latitude),
          longitude: Number(memory.longitude),
          memories: [],
        });
      }
      groups.get(key).memories.push(memory);
    });
    return Array.from(groups.values());
  }, [memories]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }
    mapRef.current = L.map(mapContainerRef.current, {
      center: [0, 0],
      zoom: 2,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapRef.current);

    userLayerRef.current = L.layerGroup().addTo(mapRef.current);
    memoriesLayerRef.current = L.layerGroup().addTo(mapRef.current);

    setMapReady(true);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !userLayerRef.current) return;
    userLayerRef.current.clearLayers();
    if (!userLocation) return;

    const latLng = [userLocation.latitude, userLocation.longitude];
    L.marker(latLng, { icon: userMarkerIcon })
      .bindTooltip('You are here', { direction: 'top' })
      .addTo(userLayerRef.current);

    L.circle(latLng, { radius: 25, color: '#22d3ee' }).addTo(userLayerRef.current);
    mapRef.current.setView(latLng, 15, { animate: true });
  }, [userLocation, mapReady]);

  useEffect(() => {
    if (!mapReady || !memoriesLayerRef.current) return;
    memoriesLayerRef.current.clearLayers();
    groupedMemories.forEach((group) => {
      const latLng = [group.latitude, group.longitude];
      const radius = group.memories[0]?.radiusM || 50;
      const tooltipText =
        group.memories.length > 1
          ? `Total memories: ${group.memories.length}`
          : `Unlocked ${group.memories[0].timesFound} times\nLast: ${formatRelative(
              group.memories[0].lastUnlockedAt,
            )}`;
      const marker = L.marker(latLng).bindTooltip(tooltipText, {
        direction: 'top',
      });
      marker.on('click', () => onSelectGroup?.(group));
      marker.addTo(memoriesLayerRef.current);

      const circle = L.circle(latLng, {
        radius,
        color: '#f97316',
        opacity: 0.35,
        fillOpacity: 0.15,
      });
      circle.on('click', () => onSelectGroup?.(group));
      circle.addTo(memoriesLayerRef.current);
    });
  }, [mapReady, groupedMemories, onSelectGroup]);

  return (
    <div className="map-panel">
      <div className="map-wrapper">
        <div ref={mapContainerRef} className="map-canvas" />
        {!hasLocation && (
          <div className="map-placeholder empty-state">
            <p>{locationError || 'Requesting your location...'}</p>
            <Button variant="primary" onClick={onRetryLocation}>
              Try again
            </Button>
          </div>
        )}
      </div>
      <div className="map-fab">
        <span
          className="tooltip-anchor"
          data-tooltip={canPlaceMemory ? null : 'Sign in to place a memory'}
        >
          <Button
            variant="primary"
            disabled={!canPlaceMemory || !hasLocation}
            onClick={onRequestPlace}
          >
            Place memory here
          </Button>
        </span>
      </div>
    </div>
  );
}

export default MapView;
