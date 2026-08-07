// energyLink · scripts/refreshOutages.js
// Scrape upcoming EBS planned outages, upsert into planned_outages, and emit a row into
// your existing `alerts` table for every household the outage matches.
//
// Run manually:            node scripts/refreshOutages.js
// Run on a schedule:       import { startOutageCron } from './scripts/refreshOutages.js' in index.js
//
// Requires: EBS reachable from wherever this runs (it is NOT reachable from every
// network — the portal cert & robots policy matter; see README-ebs.md).
// at the very top of refreshOutages.js, line 1
require('dotenv').config({
  path: require('path').join(__dirname, '../beepBoop-Back-end/.env')
});
const { supabase } = require('../beepBoop-Back-end/config/supabase.js')
const { scrapeUpcomingOutages } = require('../beepBoop-Back-end/services/ebsScraper.js');
const { relevantOutages } = require('../beepBoop-Back-end/services/ebsMatch.js');


async function refreshOutages() {
  const scraped = await scrapeUpcomingOutages({ concurrency: 4 });
  const now = new Date().toISOString();

  let upserted = 0, pending = 0;
  for (const o of scraped) {
    if (o.geometryStatus === 'pending') pending++;
    const row = {
      ebs_item_id: o.ebsItemId,
      map_title: o.mapTitle,
      outage_date: o.outageDate,
      districts: o.districts,
      ressorts: o.ressorts,
      feeders: o.feeders,
      substations: o.substations,
      total_line_segments: o.totalLineSegments,
      total_length_km: o.totalLengthKm,
      geometry: o.geometry,
      gis_app_link: o.gisAppLink,
      source: o.source,
      geometry_status: o.geometryStatus,
      raw: o,
      last_seen: now,
      updated_at: now,
      // start_time / end_time / reason / affected_area_text are left untouched here so a
      // manual FB/website enrichment step can fill them without being overwritten.
    };
    const { error } = await supabase
      .from('planned_outages')
      .upsert(row, { onConflict: 'ebs_item_id', ignoreDuplicates: false });
    if (!error) upserted++;
    else console.error('[refreshOutages] upsert failed', o.mapTitle, error.message);
  }

  await emitAlerts(scraped);

  console.log(`[refreshOutages] ${upserted}/${scraped.length} upserted ` +
    `(${pending} awaiting geometry, will retry next run).`);
  return { scraped: scraped.length, upserted, pending };
}

// For each device with a known location, insert a planned_outage alert if not present.
async function emitAlerts(outages) {
  const { data: locations, error } = await supabase.from('device_locations').select('*');
  if (error) { console.error('[refreshOutages] cannot read device_locations', error.message); return; }
  if (!locations?.length) return;

  for (const locRow of locations) {
    const loc = {
      district: locRow.district, ressort: locRow.ressort,
      feeders: locRow.feeders || [], streetHints: locRow.street_hints || [],
      lat: locRow.lat, lon: locRow.lon,
    };
    const matches = relevantOutages(loc, outages);
    for (const o of matches) {
      const startISO = o.outageDate
        ? `${o.outageDate}T${(o.start_time || '00:00')}:00`
        : null;
      const msg = buildMessage(o);
      // De-dupe: one planned_outage alert per device per outage date.
      const { data: existing } = await supabase
        .from('alerts')
        .select('id')
        .eq('device_id', locRow.device_id)
        .eq('type', 'planned_outage')
        .eq('timestamp', startISO)
        .maybeSingle();
      if (existing) continue;

      const { error: insErr } = await supabase.from('alerts').insert({
        device_id: locRow.device_id,
        type: 'planned_outage',
        timestamp: startISO,
        duration_min: o.duration_min || null,
        message: msg,
      });
      if (insErr) console.error('[refreshOutages] alert insert failed', insErr.message);
    }
  }
}

function buildMessage(o) {
  const when = o.outageDate || 'binnenkort';
  const time = o.start_time && o.end_time
    ? `van ${o.start_time} tot ${o.end_time}`
    : 'tijd nog niet bekend';
  const where = o.ressorts?.length ? o.ressorts.join(', ') : (o.districts?.join(', ') || 'uw gebied');
  const conf = o.match?.confidence ? ` (${o.match.confidence})` : '';
  return `Geplande stroomonderbreking op ${when} (${time}) in ${where}${conf}. Bereid u voor.`;
}

// Optional in-process cron (no external scheduler needed).
function startOutageCron() {
  // npm i node-cron  — then:
  //   import cron from 'node-cron';
  //   cron.schedule('0 */2 * * *', () => refreshOutages().catch(console.error));
  // Every 2 hours is plenty: EBS updates planned maps at most a few times a day.
  console.log('[refreshOutages] wire node-cron in index.js to schedule this.');
}

// Allow `node scripts/refreshOutages.js`
if (require.main === module ) {
  refreshOutages().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { refreshOutages, startOutageCron };