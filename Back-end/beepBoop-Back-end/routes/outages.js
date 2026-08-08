// energyLink · routes/outages.js  (CommonJS)
// Register in index.js:  app.use('/api/outages', require('./routes/outages'));

const router = require('express').Router();
const { supabase } = require('../config/supabase');
const { relevantOutages } = require('../services/ebsMatch');

// GET /api/outages — all upcoming planned outages (soonest first).
router.get('/', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('planned_outages')
    .select('*')
    .gte('outage_date', today)
    .order('outage_date', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ count: data.length, outages: data.map(toPublic) });
});

// GET /api/outages/relevant?device_id=... — only outages near that device's location.
router.get('/relevant', async (req, res) => {
  const deviceId = req.query.device_id;
  if (!deviceId) return res.status(400).json({ error: 'device_id required' });

  const { data: locRow, error: locErr } = await supabase
    .from('device_locations')
    .select('*')
    .eq('device_id', deviceId)
    .maybeSingle();
  if (locErr) return res.status(500).json({ error: locErr.message });
  if (!locRow) {
    return res.status(404).json({
      error: 'no location set for this device',
      hint: 'Have the user set their location once (map pin + ressort) during onboarding.',
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: outages, error } = await supabase
    .from('planned_outages')
    .select('*')
    .gte('outage_date', today)
    .order('outage_date', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });

  const loc = {
    district: locRow.district,
    ressort: locRow.ressort,
    feeders: locRow.feeders || [],
    streetHints: locRow.street_hints || [],
    lat: locRow.lat,
    lon: locRow.lon,
  };
  const matched = relevantOutages(loc, outages.map(toNormalized));
  res.json({ count: matched.length, outages: matched.map(toPublic) });
});

function toNormalized(r) {
  return {
    ebsItemId: r.ebs_item_id,
    mapTitle: r.map_title,
    outageDate: r.outage_date,
    districts: r.districts || [],
    ressorts: r.ressorts || [],
    feeders: r.feeders || [],
    substations: r.substations || [],
    affected_area_text: r.affected_area_text,
    geometry: r.geometry,
    start_time: r.start_time,
    end_time: r.end_time,
    reason: r.reason,
    geometry_status: r.geometry_status,
    gis_app_link: r.gis_app_link,
    match: r.match,
  };
}

function toPublic(o) {
  const timeKnown = !!(o.start_time || o.startTime);
  return {
    id: o.ebsItemId || o.ebs_item_id,
    title: o.mapTitle || o.map_title,
    date: o.outageDate || o.outage_date,
    startTime: o.start_time || null,
    endTime: o.end_time || null,
    timeKnown,
    reason: o.reason || null,
    districts: o.districts || [],
    ressorts: o.ressorts || [],
    feeders: o.feeders || [],
    affectedAreaText: o.affected_area_text || null,
    lengthKm: o.total_length_km ?? o.totalLengthKm ?? null,
    geometryStatus: o.geometry_status || o.geometryStatus || null,
    gisLink: o.gis_app_link || o.gisAppLink || null,
    geometry: o.geometry || null,
    match: o.match || null,
  };
}

module.exports = router;