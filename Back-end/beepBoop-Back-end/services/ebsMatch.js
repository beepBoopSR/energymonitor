// energyLink · services/ebsMatch.js  (CommonJS)
// Decide whether a planned outage is relevant to a given household location.
// Converted to CommonJS (only the export lines changed; logic unchanged).

const norm = (s) => (s || '').toString().trim().toLowerCase();

function anyOverlap(a = [], b = []) {
  const set = new Set(a.map(norm));
  return b.map(norm).some((x) => x && set.has(x));
}

function streetHit(streetHints = [], affectedAreaText = '') {
  if (!affectedAreaText) return false;
  const hay = affectedAreaText.toLowerCase();
  return streetHints.map(norm).some((s) => s && hay.includes(s));
}

// ---- geometry: point-to-linestring distance (meters) ------------------------

function metersPerDegLon(lat) {
  return 111320 * Math.cos((lat * Math.PI) / 180);
}
const M_PER_DEG_LAT = 110540;

function project(lon, lat, refLat) {
  return [lon * metersPerDegLon(refLat), lat * M_PER_DEG_LAT];
}

function pointToSegMeters(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Shortest distance (meters) from a point to a GeoJSON MultiLineString/LineString. */
function distanceToGeometryMeters(lon, lat, geometry) {
  if (!geometry || lat == null || lon == null) return Infinity;
  const lines = geometry.type === 'MultiLineString'
    ? geometry.coordinates
    : geometry.type === 'LineString'
      ? [geometry.coordinates]
      : [];
  const [px, py] = project(lon, lat, lat);
  let best = Infinity;
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) {
      const [ax, ay] = project(line[i - 1][0], line[i - 1][1], lat);
      const [bx, by] = project(line[i][0], line[i][1], lat);
      const d = pointToSegMeters(px, py, ax, ay, bx, by);
      if (d < best) best = d;
      if (best === 0) return 0;
    }
  }
  return best;
}

/**
 * @param {object} loc  { district, ressort, feeders[], streetHints[], lat, lon }
 * @param {object} outage  normalized outage (see ebsScraper.finalize)
 * @param {object} opts { geoThresholdM = 250 }
 * @returns {null | { confidence, reasons[], distanceM }}
 */
function matchOutage(loc, outage, { geoThresholdM = 250 } = {}) {
  const reasons = [];
  let distanceM = null;

  const feederMatch = anyOverlap(loc.feeders, outage.feeders);
  const ressortMatch = loc.ressort && outage.ressorts.map(norm).includes(norm(loc.ressort));
  const districtMatch = loc.district && outage.districts.map(norm).includes(norm(loc.district));
  const street = streetHit(loc.streetHints, outage.affected_area_text || outage.affectedAreaText);

  let geoMatch = false;
  if (loc.lat != null && loc.lon != null && outage.geometry) {
    distanceM = Math.round(distanceToGeometryMeters(loc.lon, loc.lat, outage.geometry));
    geoMatch = distanceM <= geoThresholdM;
    if (geoMatch) reasons.push(`binnen ${distanceM} m van getroffen leiding`);
  }

  if (feederMatch) reasons.push('zelfde feeder');
  if (ressortMatch) reasons.push('zelfde ressort');
  if (districtMatch) reasons.push('zelfde district');
  if (street) reasons.push('straatnaam genoemd in aankondiging');

  if (!geoMatch && !feederMatch && !ressortMatch && !districtMatch && !street) return null;

  let confidence = 'low';
  if (geoMatch || feederMatch || (ressortMatch && street)) confidence = 'high';
  else if (ressortMatch || (districtMatch && street)) confidence = 'medium';

  return { confidence, reasons, distanceM };
}

/** Filter + annotate a list of outages for one location. */
function relevantOutages(loc, outages, opts) {
  const out = [];
  for (const o of outages) {
    const m = matchOutage(loc, o, opts);
    if (m) out.push({ ...o, match: m });
  }
  const rank = { high: 0, medium: 1, low: 2 };
  out.sort((a, b) =>
    (a.outageDate || a.outage_date || '9999').localeCompare(b.outageDate || b.outage_date || '9999') ||
    rank[a.match.confidence] - rank[b.match.confidence]);
  return out;
}

module.exports = { distanceToGeometryMeters, matchOutage, relevantOutages };