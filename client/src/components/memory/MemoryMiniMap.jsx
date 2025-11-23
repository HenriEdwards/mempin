function MemoryMiniMap({ latitude, longitude, radiusM }) {
  const formattedLat = Number(latitude).toFixed(4);
  const formattedLng = Number(longitude).toFixed(4);
  const roundedRadius = Math.round(radiusM || 0);

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
          <span className="memory-mini-map__ring memory-mini-map__ring--outer" />
          <span className="memory-mini-map__ring memory-mini-map__ring--middle" />
          <span className="memory-mini-map__pin" />
        </div>
      </div>
    </div>
  );
}

export default MemoryMiniMap;
