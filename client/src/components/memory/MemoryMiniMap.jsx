import { useEffect, useRef, useState } from 'react';
import loadGoogleMapsApi from '../../utils/googleMaps.js';

function MemoryMiniMap({ latitude, longitude, radiusM }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const googleRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const coordsRef = useRef({ lat: 0, lng: 0, roundedRadius: 25 });
  const [mapError, setMapError] = useState('');

  const lat = Number(latitude);
  const lng = Number(longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const formattedLat = hasCoords ? lat.toFixed(4) : '—';
  const formattedLng = hasCoords ? lng.toFixed(4) : '—';
  const roundedRadius = Math.max(Math.round(radiusM || 0), 25);

  useEffect(() => {
    coordsRef.current = { lat, lng, roundedRadius };
  }, [lat, lng, roundedRadius]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !hasCoords) return undefined;
    let isCancelled = false;
    setMapError('');
    const { lat: currentLat, lng: currentLng, roundedRadius: currentRadius } = coordsRef.current;

    loadGoogleMapsApi()
      .then((google) => {
        if (isCancelled || mapRef.current) return;
        googleRef.current = google;

        const map = new google.maps.Map(mapContainerRef.current, {
          center: { lat: currentLat, lng: currentLng },
          zoom: 15,
          disableDefaultUI: true,
          gestureHandling: 'none',
          clickableIcons: false,
          keyboardShortcuts: false,
        });
        mapRef.current = map;

        markerRef.current = new google.maps.Marker({
          position: { lat: currentLat, lng: currentLng },
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            strokeColor: '#04ddff',
            strokeWeight: 2,
            fillColor: '#04ddff',
            fillOpacity: 0.9,
          },
        });

        circleRef.current = new google.maps.Circle({
          map,
          center: { lat: currentLat, lng: currentLng },
          radius: currentRadius,
          strokeColor: '#04ddff',
          strokeOpacity: 0.6,
          strokeWeight: 2,
          fillColor: '#04ddff',
          fillOpacity: 0.08,
        });
      })
      .catch((error) => {
        if (isCancelled) return;
        console.error('Failed to load Google Maps', error);
        setMapError('Map unavailable right now.');
      });

    return () => {
      isCancelled = true;
      markerRef.current?.setMap(null);
      circleRef.current?.setMap(null);
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
      googleRef.current = null;
    };
  }, [hasCoords]);

  useEffect(() => {
    if (!mapRef.current || !googleRef.current || !hasCoords) return;
    const center = { lat, lng };
    mapRef.current.setCenter(center);
    mapRef.current.setZoom(15);
    markerRef.current?.setPosition(center);
    circleRef.current?.setCenter(center);
    circleRef.current?.setRadius(roundedRadius);
  }, [lat, lng, roundedRadius, hasCoords]);

  useEffect(() => {
    if (hasCoords || !mapRef.current) return;
    markerRef.current?.setMap(null);
    circleRef.current?.setMap(null);
    mapRef.current = null;
    markerRef.current = null;
    circleRef.current = null;
    googleRef.current = null;
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
          {mapError && hasCoords && (
            <div className="memory-mini-map__empty">{mapError}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MemoryMiniMap;
