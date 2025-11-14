const EARTH_RADIUS_METERS = 6371000;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function calculateDistanceMeters(lat1, lng1, lat2, lng2) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

function getBoundingBox(latitude, longitude, radiusMeters) {
  const radiusInDegrees = radiusMeters / 111320;
  const minLat = latitude - radiusInDegrees;
  const maxLat = latitude + radiusInDegrees;
  const minLng = longitude - radiusInDegrees / Math.cos(toRadians(latitude));
  const maxLng = longitude + radiusInDegrees / Math.cos(toRadians(latitude));

  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
  };
}

module.exports = {
  calculateDistanceMeters,
  getBoundingBox,
};
