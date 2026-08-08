// energyLink · services/geocode.js  (CommonJS)
// Reverse-geocode a map pin (lon/lat) to a Surinamese district + ressort via
// point-in-polygon, using a bundled boundary GeoJSON. Lets a household set its
// location with one tap and still get the named-area fields the matcher uses.
//
// Data: provide data/ressorts.geojson as a FeatureCollection whose features carry
// properties { district, ressort } and Polygon/MultiPolygon geometry (WGS84 lon/lat).

function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = (yi > y) !== (yj > y) &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(x, y, polygon) {
  if (!polygon.length || !pointInRing(x, y, polygon[0])) return false;
  for (let k = 1; k < polygon.length; k++) if (pointInRing(x, y, polygon[k])) return false;
  return true;
}

function pointInFeature(lon, lat, geom) {
  if (!geom) return false;
  if (geom.type === 'Polygon') return pointInPolygon(lon, lat, geom.coordinates);
  if (geom.type === 'MultiPolygon') return geom.coordinates.some((p) => pointInPolygon(lon, lat, p));
  return false;
}

function reverseGeocode(lon, lat, featureCollection) {
  if (lon == null || lat == null || !featureCollection?.features) return null;
  for (const f of featureCollection.features) {
    if (pointInFeature(lon, lat, f.geometry)) {
      const p = f.properties || {};
      return { district: p.district ?? null, ressort: p.ressort ?? null };
    }
  }
  return null;
}

module.exports = { reverseGeocode };