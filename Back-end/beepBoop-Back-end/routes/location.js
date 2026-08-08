// energyLink · routes/location.js  (CommonJS)
// Register in index.js:  app.use('/api/location', require('./routes/location'));

const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { supabase } = require('../config/supabase');
const { reverseGeocode } = require('../services/geocode');

// Load ressort boundaries once at boot (optional — geocoding degrades gracefully if absent).
let RESSORTS = null;
try {
  RESSORTS = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/ressorts.geojson'), 'utf8'));
} catch {
  console.warn('[location] data/ressorts.geojson not found — pin reverse-geocoding disabled.');
}

// POST /api/location  { device_id, lat, lon, district?, ressort?, feeders?, street_hints?, label? }
router.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.device_id) return res.status(400).json({ error: 'device_id required' });
  if (b.lat == null && !b.ressort && !b.district) {
    return res.status(400).json({ error: 'provide a pin (lat/lon) or a district/ressort' });
  }

  let district = b.district ?? null;
  let ressort = b.ressort ?? null;
  if ((!district || !ressort) && b.lat != null && b.lon != null && RESSORTS) {
    const geo = reverseGeocode(b.lon, b.lat, RESSORTS);
    if (geo) { district = district || geo.district; ressort = ressort || geo.ressort; }
  }

  const row = {
    device_id: b.device_id,
    label: b.label ?? 'Thuis',
    district, ressort,
    feeders: b.feeders ?? [],
    street_hints: (b.street_hints ?? []).map((s) => String(s).toUpperCase()),
    lat: b.lat ?? null,
    lon: b.lon ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('device_locations')
    .upsert(row, { onConflict: 'device_id' });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, location: row, geocoded: !!(district || ressort) });
});

// GET /api/location/:deviceId
router.get('/:deviceId', async (req, res) => {
  const { data, error } = await supabase
    .from('device_locations')
    .select('*')
    .eq('device_id', req.params.deviceId)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'no location set' });
  res.json({ location: data });
});

module.exports = router;