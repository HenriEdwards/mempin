import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import loadGoogleMapsApi from '../../utils/googleMaps.js';
import Button from '../ui/Button.jsx';

const MEMORY_PIN_STYLES = {
  text: { fill: '#3b82f6', stroke: '#1d4ed8' }, // blue
  image: { fill: '#a855f7', stroke: '#7e22ce' }, // purple
  audio: { fill: '#22c55e', stroke: '#15803d' }, // green
  video: { fill: '#facc15', stroke: '#d97706' }, // yellow
  both: { fill: '#ef4444', stroke: '#b91c1c' }, // red
  journey: { fill: '#fb923c', stroke: '#ea580c' }, // orange highlight
};

const memoryIconCache = new Map();
const MIN_VISUAL_RADIUS = 60;
const MAX_VISUAL_RADIUS = 20000;
const BASE_ZOOM_FOR_SCALING = 16;
const ZOOM_SCALE_EXPONENT = 0.6;
const MERGE_BASE_DISTANCE_METERS = 60;
const MAIN_WORLD_BOUNDS = { north: 85, south: -85, east: 180, west: -180 };

const userIconSvg = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"><path fill="%2322c55e" stroke="%2315803d" stroke-width="2" d="M12.5 1C6.29 1 1 6.65 1 13.5 1 21.7 12.5 40 12.5 40S24 21.7 24 13.5C24 6.65 18.71 1 12.5 1Z"/><circle cx="12.5" cy="13" r="5" fill="#fff"/></svg>`,
)}`;

function normalizeLongitude(lng) {
  if (!Number.isFinite(lng)) return 0;
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

function haversineDistanceMeters(origin, destination) {
  const R = 6371000; // meters
  const lat1 = (origin.lat * Math.PI) / 180;
  const lat2 = (destination.lat * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLng = ((destination.lng - origin.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getMemoryPinIcon(google, variant = 'text') {
  const key = MEMORY_PIN_STYLES[variant] ? variant : 'text';
  if (memoryIconCache.has(key)) return memoryIconCache.get(key);

  const { fill, stroke } = MEMORY_PIN_STYLES[key];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"><path fill="${fill}" stroke="${stroke}" stroke-width="2" d="M12.5 1C6.29 1 1 6.65 1 13.5 1 21.7 12.5 40 12.5 40S24 21.7 24 13.5C24 6.65 18.71 1 12.5 1Z"/><circle cx="12.5" cy="13" r="5" fill="#ffffff" stroke="${stroke}" stroke-width="1.4"/></svg>`;
  const icon = {
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(25, 41),
    anchor: new google.maps.Point(12, 41),
    labelOrigin: new google.maps.Point(12, 13),
  };

  memoryIconCache.set(key, icon);
  return icon;
}

function getUserMarkerIcon(google) {
  return {
    url: userIconSvg,
    scaledSize: new google.maps.Size(25, 41),
    anchor: new google.maps.Point(12, 41),
  };
}

function clearOverlays(ref) {
  ref.current?.forEach((item) => item?.setMap?.(null));
  ref.current = [];
}

function getMemoryMediaKind(memory) {
  if (!memory) return 'text';
  const assets = memory.assets || [];
  const imageCount =
    Number(memory.imageCount ?? assets.filter((asset) => asset.type === 'image').length) || 0;
  const audioCount =
    Number(memory.audioCount ?? assets.filter((asset) => asset.type === 'audio').length) || 0;
  const videoCount =
    Number(memory.videoCount ?? assets.filter((asset) => asset.type === 'video').length) || 0;

  const hasImage = imageCount > 0;
  const hasAudio = audioCount > 0;
  const hasVideo = videoCount > 0;
  const hasUnknownMedia =
    (memory.hasMedia || assets.length > 0) && !hasImage && !hasAudio && !hasVideo;

  if (hasVideo) return 'video';
  if (hasImage && hasAudio) return 'both';
  if (hasImage) return 'image';
  if (hasAudio) return 'audio';
  if (hasUnknownMedia) return 'both';
  return 'text';
}

function getGroupMediaVariant(memories = []) {
  if (!memories.length) return 'text';
  const variants = new Set(memories.map(getMemoryMediaKind));
  if (variants.has('video')) return 'video';
  if (variants.size === 1) return [...variants][0];
  if (variants.has('both')) return 'both';
  if (variants.has('image') && variants.has('audio')) return 'both';
  if (variants.has('image')) return 'image';
  if (variants.has('audio')) return 'audio';
  return 'text';
}

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

function clampCenterWithinBounds(map) {
  const center = map.getCenter();
  if (!center) return;
  const clampedLat = Math.min(Math.max(center.lat(), MAIN_WORLD_BOUNDS.south), MAIN_WORLD_BOUNDS.north);
  const normalizedLng = normalizeLongitude(center.lng());

  if (clampedLat !== center.lat() || normalizedLng !== center.lng()) {
    map.setCenter({ lat: clampedLat, lng: normalizedLng });
  }
}

function FlatMapView({
  userLocation,
  locationError,
  onRetryLocation,
  memories,
  onSelectGroup,
  hasLocation,
  focusBounds,
  journeyPaths = [],
  highlightedMemoryIds = new Set(),
  navigationRequest = null,
  onRouteComputed,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const googleRef = useRef(null);
  const userLayerRef = useRef([]);
  const memoriesLayerRef = useRef([]);
  const memoryCirclesRef = useRef([]);
  const journeysLayerRef = useRef([]);
  const directionsLayerRef = useRef([]);
  const mapListenersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [zoomLevel, setZoomLevel] = useState(2);

  const clearDirections = useCallback(() => {
    clearOverlays(directionsLayerRef);
  }, []);

  const groupedMemories = useMemo(() => {
    const groups = new Map();
    memories.forEach((memory) => {
      const lat = Number(memory.latitude);
      const lng = Number(memory.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const key = `${lat.toFixed(6)}:${lng.toFixed(6)}`;
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          latitude: lat,
          longitude: lng,
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
    let isCancelled = false;
    setMapError('');

    loadGoogleMapsApi()
      .then((google) => {
        if (isCancelled || mapRef.current) return;
        googleRef.current = google;

        const map = new google.maps.Map(mapContainerRef.current, {
          center: { lat: 0, lng: 0 },
          zoom: 2,
          minZoom: 2,
          maxZoom: 19,
          zoomControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          clickableIcons: true,
          gestureHandling: 'greedy',
          scrollwheel: true,
          draggable: true,
          restriction: {
            latLngBounds: MAIN_WORLD_BOUNDS,
            strictBounds: false,
          },
        });

        mapRef.current = map;
        setMapReady(true);
        setZoomLevel(map.getZoom() || 2);

        const zoomListener = map.addListener('zoom_changed', () => {
          setZoomLevel(map.getZoom() || 2);
        });
        const idleListener = map.addListener('idle', () => clampCenterWithinBounds(map));
        mapListenersRef.current = [zoomListener, idleListener];
      })
      .catch((error) => {
        if (isCancelled) return;
        console.error('Failed to load Google Maps', error);
        setMapError(error?.message || 'Failed to load the map. Check your API key and network.');
      });

    return () => {
      isCancelled = true;
      mapListenersRef.current.forEach((listener) => listener?.remove());
      mapListenersRef.current = [];
      clearOverlays(userLayerRef);
      clearOverlays(memoriesLayerRef);
      clearOverlays(memoryCirclesRef);
      clearOverlays(journeysLayerRef);
      clearOverlays(directionsLayerRef);
      mapRef.current = null;
      googleRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !googleRef.current) return;
    clearOverlays(userLayerRef);
    if (!userLocation) return;

    const google = googleRef.current;
    const map = mapRef.current;
    const position = {
      lat: Number(userLocation.latitude),
      lng: Number(userLocation.longitude),
    };
    if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng)) return;

    const marker = new google.maps.Marker({
      position,
      map,
      icon: getUserMarkerIcon(google),
      title: 'You are here',
    });
    const circle = new google.maps.Circle({
      map,
      center: position,
      radius: 25,
      strokeColor: '#22d3ee',
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: '#22d3ee',
      fillOpacity: 0.12,
    });

    userLayerRef.current = [marker, circle];
    map.panTo(position);
    if ((map.getZoom() || 0) < 15) {
      map.setZoom(15);
    }
  }, [userLocation, mapReady]);

  const highlightedIds = useMemo(() => {
    if (!highlightedMemoryIds) return new Set();
    const list = highlightedMemoryIds instanceof Set ? Array.from(highlightedMemoryIds) : highlightedMemoryIds;
    return new Set(list.map((id) => String(id)));
  }, [highlightedMemoryIds]);

  const displayGroups = useMemo(() => {
    const zoom = mapRef.current?.getZoom() ?? BASE_ZOOM_FOR_SCALING;
    const scale = Math.pow(2, (BASE_ZOOM_FOR_SCALING - zoom) * ZOOM_SCALE_EXPONENT);

    const pending = [...groupedMemories];
    const clusters = [];

    while (pending.length) {
      const seed = pending.pop();
      const clusterMembers = [seed];
      const queue = [seed];

      while (queue.length) {
        const current = queue.pop();
        for (let i = pending.length - 1; i >= 0; i -= 1) {
          const candidate = pending[i];
          const distance = haversineDistanceMeters(
            { lat: current.latitude, lng: current.longitude },
            { lat: candidate.latitude, lng: candidate.longitude },
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
        const baseRadius = item.memories[0]?.radiusM || MIN_VISUAL_RADIUS;
        const scaledRadius = Math.min(
          Math.max(baseRadius * scale, MIN_VISUAL_RADIUS),
          MAX_VISUAL_RADIUS,
        );
        const distanceToCenter = haversineDistanceMeters(
          { lat: latitude, lng: longitude },
          { lat: item.latitude, lng: item.longitude },
        );
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
    if (!mapReady || !googleRef.current || !mapRef.current) return;
    const google = googleRef.current;
    const map = mapRef.current;
    clearOverlays(memoriesLayerRef);
    clearOverlays(memoryCirclesRef);

    displayGroups.forEach((group) => {
      const latLng = { lat: group.latitude, lng: group.longitude };
      const radius = group.radius || group.memories[0]?.radiusM || 50;
      const tooltipText =
        group.memories.length > 1
          ? `Memories in this area: ${group.memories.length}`
          : `Unlocked ${group.memories[0].timesFound} times\nLast: ${formatRelative(
              group.memories[0].lastUnlockedAt,
            )}`;
      const isJourneyMemory = group.memories.some((memory) =>
        highlightedIds.has(String(memory.id)),
      );
      const variant = isJourneyMemory ? 'journey' : getGroupMediaVariant(group.memories);
      const marker = new google.maps.Marker({
        position: latLng,
        map,
        icon: getMemoryPinIcon(google, variant),
        title: tooltipText.replace(/\n/g, ' '),
      });
      marker.addListener('click', () => onSelectGroup?.(group));
      memoriesLayerRef.current.push(marker);

      const pinStyle = MEMORY_PIN_STYLES[variant] || MEMORY_PIN_STYLES.text;
      const circle = new google.maps.Circle({
        map,
        center: latLng,
        radius,
        strokeColor: pinStyle.stroke,
        strokeOpacity: 0.35,
        strokeWeight: 2,
        fillColor: pinStyle.fill,
        fillOpacity: 0.15,
      });
      circle.addListener('click', () => onSelectGroup?.(group));
      memoryCirclesRef.current.push(circle);
    });
  }, [mapReady, displayGroups, onSelectGroup, highlightedIds]);

  useEffect(() => {
    if (!mapReady || !googleRef.current || !mapRef.current) return;
    clearOverlays(journeysLayerRef);

    // Temporarily disable drawing journey connector polylines.
    return;

    const google = googleRef.current;
    const map = mapRef.current;
    const directionsService = new google.maps.DirectionsService();
    let cancelled = false;

    const toLatLng = (points = []) =>
      points
        .map((pt) => ({
          lat: Number(pt.latitude),
          lng: Number(pt.longitude),
        }))
        .filter((pt) => Number.isFinite(pt.lat) && Number.isFinite(pt.lng));

    const fetchLegPath = (origin, destination) =>
      new Promise((resolve) => {
        directionsService.route(
          {
            origin,
            destination,
            travelMode: google.maps.TravelMode.DRIVING,
            provideRouteAlternatives: false,
          },
          (result, status) => {
            if (status === 'OK' && result?.routes?.length) {
              resolve(result.routes[0].overview_path || null);
            } else {
              resolve(null);
            }
          },
        );
      });

    const drawJourneys = async () => {
      for (const journey of journeyPaths) {
        const latLngs = toLatLng(journey.points || []);
        if (latLngs.length < 2) continue;

        const pathPoints = [];
        for (let i = 0; i < latLngs.length - 1; i += 1) {
          const origin = latLngs[i];
          const destination = latLngs[i + 1];
          let segment = null;
          try {
            segment = await fetchLegPath(origin, destination);
          } catch (error) {
            segment = null;
          }
          if (cancelled) return;
          if (segment?.length) {
            if (i > 0) {
              segment = segment.slice(1); // avoid duplicate point joins
            }
            pathPoints.push(...segment);
          } else {
            if (i > 0 && pathPoints.length) {
              pathPoints.push(destination);
            } else {
              pathPoints.push(origin, destination);
            }
          }
        }

        if (cancelled) return;

        const polyline = new google.maps.Polyline({
          map,
          path: pathPoints.length ? pathPoints : latLngs,
          strokeColor: journey.color || '#0ea5e9',
          strokeWeight: pathPoints.length ? 6 : 4,
          strokeOpacity: 0.9,
          geodesic: false,
        });
        journeysLayerRef.current.push(polyline);
      }
    };

    drawJourneys();

    return () => {
      cancelled = true;
      clearOverlays(journeysLayerRef);
    };
  }, [journeyPaths, mapReady]);

  useEffect(() => {
    if (!mapReady || !googleRef.current || !mapRef.current) return;
    clearDirections();
    if (!navigationRequest || !navigationRequest.destination) {
      onRouteComputed?.(null);
      return;
    }

    const google = googleRef.current;
    const map = mapRef.current;
    const service = new google.maps.DirectionsService();

    const origin =
      navigationRequest.origin && typeof navigationRequest.origin === 'object'
        ? navigationRequest.origin
        : navigationRequest.origin || null;
    const destination = navigationRequest.destination;
    const mode =
      google.maps.TravelMode[navigationRequest.mode?.toUpperCase?.() || 'DRIVING'] ||
      google.maps.TravelMode.DRIVING;

    if (!origin || !destination) {
      onRouteComputed?.(null);
      return;
    }

    const points = [
      origin,
      ...(navigationRequest.waypoints || []).map((wp) => wp.location || wp).filter(Boolean),
      destination,
    ]
      .map((pt) => ({
        lat: Number(pt.lat),
        lng: Number(pt.lng),
      }))
      .filter((pt) => Number.isFinite(pt.lat) && Number.isFinite(pt.lng));

    if (points.length < 2) {
      onRouteComputed?.(null);
      return;
    }

    const chunkSize = 25; // origin + 23 waypoints + destination
    const segments = [];
    for (let i = 0; i < points.length - 1; i += chunkSize - 1) {
      const slice = points.slice(i, i + chunkSize);
      if (slice.length < 2) continue;
      segments.push({
        origin: slice[0],
        destination: slice[slice.length - 1],
        waypoints: slice.slice(1, -1).map((pt) => ({ location: pt, stopover: false })),
      });
    }

    const runRoute = (req) =>
      new Promise((resolve) => {
        service.route(
          {
            origin: req.origin,
            destination: req.destination,
            waypoints: req.waypoints,
            travelMode: mode,
            provideRouteAlternatives: false,
            optimizeWaypoints: false,
          },
          (result, status) => {
            if (status === 'OK' && result?.routes?.length) {
              resolve(result.routes[0]);
            } else {
              resolve(null);
            }
          },
        );
      });

    const formatDistance = (meters = 0) => {
      if (!Number.isFinite(meters)) return '';
      if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
      return `${Math.round(meters)} m`;
    };

    const formatDuration = (seconds = 0) => {
      if (!Number.isFinite(seconds)) return '';
      const minutes = Math.round(seconds / 60);
      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins ? `${hours}h ${mins}m` : `${hours}h`;
      }
      return `${minutes}m`;
    };

    (async () => {
      const allPaths = [];
      let totalDistance = 0;
      let totalDuration = 0;
      let startPos = null;
      let endPos = null;

      for (const seg of segments) {
        const route = await runRoute(seg);
        if (!route) {
          onRouteComputed?.(null);
          return;
        }
        const leg = route.legs?.[0];
        totalDistance += leg?.distance?.value || 0;
        totalDuration += leg?.duration?.value || 0;
        const segPath = route.overview_path || [];
        if (segPath.length) {
          if (!startPos) startPos = segPath[0];
          endPos = segPath[segPath.length - 1];
          if (allPaths.length) {
            allPaths.push(...segPath.slice(1));
          } else {
            allPaths.push(...segPath);
          }
        }
      }

      if (!allPaths.length) {
        onRouteComputed?.(null);
        return;
      }

      const polyline = new google.maps.Polyline({
        map,
        path: allPaths,
        strokeColor: '#2563eb',
        strokeOpacity: 0.9,
        strokeWeight: 7,
        geodesic: true,
      });
      const startMarker = new google.maps.Marker({
        map,
        position: startPos || allPaths[0],
        title: 'Start',
      });
      const endMarker = new google.maps.Marker({
        map,
        position: endPos || allPaths[allPaths.length - 1],
        title: 'Destination',
      });
      directionsLayerRef.current = [polyline, startMarker, endMarker];

      const bounds = new google.maps.LatLngBounds();
      allPaths.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds, { top: 80, right: 80, bottom: 80, left: 80 });

      onRouteComputed?.({
        distanceText: formatDistance(totalDistance),
        durationText: formatDuration(totalDuration),
        mode: navigationRequest.mode || 'DRIVING',
      });
    })();

    return () => {
      clearDirections();
    };
  }, [navigationRequest, mapReady, onRouteComputed, clearDirections]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !focusBounds || !googleRef.current) return;
    const google = googleRef.current;
    const bounds = new google.maps.LatLngBounds(
      { lat: focusBounds.minLat, lng: focusBounds.minLng },
      { lat: focusBounds.maxLat, lng: focusBounds.maxLng },
    );
    mapRef.current.fitBounds(bounds, { top: 32, right: 32, bottom: 32, left: 32 });
  }, [focusBounds, mapReady]);

  return (
    <div className="map-wrapper">
      <div ref={mapContainerRef} className="map-canvas" />
      {mapError && (
        <div className="map-placeholder empty-state">
          <p>{mapError}</p>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Retry map
          </Button>
        </div>
      )}
      {!hasLocation && !mapError && (
        <div className="map-notice">
          <div className="map-notice__text">
            {locationError || 'Enable location to show your position. The map is still usable without it.'}
          </div>
          <Button variant="primary" onClick={onRetryLocation}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

function MapView({
  userLocation,
  locationError,
  onRetryLocation,
  memories,
  onSelectGroup,
  focusBounds,
  journeyPaths,
  highlightedMemoryIds,
  navigationRequest = null,
  onRouteComputed,
}) {
  const hasLocation = Boolean(userLocation);

  return (
    <div className="map-panel map-panel--flat">
      <FlatMapView
        userLocation={userLocation}
        locationError={locationError}
        onRetryLocation={onRetryLocation}
        memories={memories}
        onSelectGroup={onSelectGroup}
        hasLocation={hasLocation}
        focusBounds={focusBounds}
        journeyPaths={journeyPaths}
        highlightedMemoryIds={highlightedMemoryIds}
        navigationRequest={navigationRequest}
        onRouteComputed={onRouteComputed}
      />
    </div>
  );
}

export default MapView;
