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
  iconUrl: `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"><path fill="%2322c55e" stroke="%2315803d" stroke-width="2" d="M12.5 1C6.29 1 1 6.65 1 13.5 1 21.7 12.5 40 12.5 40S24 21.7 24 13.5C24 6.65 18.71 1 12.5 1Z"/><circle cx="12.5" cy="13" r="5" fill="#fff"/></svg>`,
  )}`,
  iconRetinaUrl: `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"><path fill="%2322c55e" stroke="%2315803d" stroke-width="2" d="M12.5 1C6.29 1 1 6.65 1 13.5 1 21.7 12.5 40 12.5 40S24 21.7 24 13.5C24 6.65 18.71 1 12.5 1Z"/><circle cx="12.5" cy="13" r="5" fill="#fff"/></svg>`,
  )}`,
  shadowUrl: userIconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const BASE_ZOOM_FOR_SCALING = 16;
// Lower exponent and base distance to avoid over-merging distant clusters at low zooms
const ZOOM_SCALE_EXPONENT = 0.6;
const MERGE_BASE_DISTANCE_METERS = 60;
const MIN_VISUAL_RADIUS = 60;
const MAX_VISUAL_RADIUS = 20000;

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
  const [zoomLevel, setZoomLevel] = useState(2);
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
    setZoomLevel(mapRef.current.getZoom());

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
    if (!mapReady || !mapRef.current) return undefined;
    const map = mapRef.current;
    const updateZoom = () => setZoomLevel(map.getZoom());
    map.on('zoomend', updateZoom);
    // sync state with current zoom immediately
    updateZoom();
    return () => map.off('zoomend', updateZoom);
  }, [mapReady]);

  const displayGroups = useMemo(() => {
    const map = mapRef.current;
    const zoom = map?.getZoom() ?? BASE_ZOOM_FOR_SCALING;
    const scale = Math.pow(2, (BASE_ZOOM_FOR_SCALING - zoom) * ZOOM_SCALE_EXPONENT);

    if (!map) {
      return groupedMemories.map((group) => ({
        ...group,
        radius: (group.memories[0]?.radiusM || 50) * scale,
      }));
    }

    const pending = [...groupedMemories];
    const clusters = [];

    while (pending.length) {
      const seed = pending.pop();
      const clusterMembers = [seed];
      const queue = [seed];

      // Merge nearby points together as zoom level decreases
      while (queue.length) {
        const current = queue.pop();
        for (let i = pending.length - 1; i >= 0; i -= 1) {
          const candidate = pending[i];
          const distance = map.distance(
            [current.latitude, current.longitude],
            [candidate.latitude, candidate.longitude],
          );
          if (distance <= MERGE_BASE_DISTANCE_METERS * scale) {
            clusterMembers.push(candidate);
            queue.push(candidate);
            pending.splice(i, 1);
          }
        }
      }

      const totalMemoryCount = clusterMembers.reduce(
        (sum, item) => sum + item.memories.length,
        0,
      );
      const latitude =
        clusterMembers.reduce(
          (sum, item) => sum + item.latitude * item.memories.length,
          0,
        ) / totalMemoryCount;
      const longitude =
        clusterMembers.reduce(
          (sum, item) => sum + item.longitude * item.memories.length,
          0,
        ) / totalMemoryCount;

      let radius = 0;
      clusterMembers.forEach((item) => {
        const baseRadius = item.memories[0]?.radiusM || 50;
        const scaledRadius = Math.min(
          Math.max(baseRadius * scale, MIN_VISUAL_RADIUS),
          MAX_VISUAL_RADIUS,
        );
        const distanceToCenter = map.distance([latitude, longitude], [
          item.latitude,
          item.longitude,
        ]);
        radius = Math.max(radius, distanceToCenter + scaledRadius);
      });

      clusters.push({
        id: clusterMembers.map((item) => item.id).join('|'),
        latitude,
        longitude,
        memories: clusterMembers.flatMap((item) => item.memories),
        radius: Math.min(Math.max(radius, MIN_VISUAL_RADIUS), MAX_VISUAL_RADIUS),
      });
    }

    return clusters;
  }, [groupedMemories, zoomLevel]);

  useEffect(() => {
    if (!mapReady || !memoriesLayerRef.current) return;
    memoriesLayerRef.current.clearLayers();
    displayGroups.forEach((group) => {
      const latLng = [group.latitude, group.longitude];
      const radius = group.radius || group.memories[0]?.radiusM || 50;
      const tooltipText =
        group.memories.length > 1
          ? `Memories in this area: ${group.memories.length}`
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
  }, [mapReady, displayGroups, onSelectGroup]);

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
