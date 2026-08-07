// Detects two kinds of anomaly and logs them to the alerts table:
//   1. Power spikes  — a sudden jump far above the device's recent normal
//   2. Daily overuse — today's kWh running well above the trailing average
//
// Both write type='anomaly' rows. The AI layer explains them in NL/Sranan;
// this service only decides WHEN something is unusual, never invents WHY.

const { supabase } = require('../config/supabase');

// ── Spike detection ──
// Per-device rolling baseline of recent watts. A reading that jumps far
// above the baseline, and is a large absolute step, fires once.
const recentWatts = new Map();   // device_id -> number[]  (last N readings)
const spikeActive = new Map();   // device_id -> bool      (debounce)
const WINDOW        = 12;        // ~how many readings form the baseline
const SPIKE_RATIO   = 2.5;       // must be >2.5x the baseline average
const SPIKE_MIN_W   = 800;       // and at least this many watts of jump
const SPIKE_FLOOR_W = 100;       // ignore baselines below this (noise)

async function checkSpike(deviceId, watts, timestamp) {
  const hist = recentWatts.get(deviceId) || [];

  // Need a baseline before we can call anything a spike
  if (hist.length >= WINDOW / 2) {
    const avg = hist.reduce((a, b) => a + b, 0) / hist.length;
    const isSpike = avg > SPIKE_FLOOR_W
      && watts > avg * SPIKE_RATIO
      && (watts - avg) > SPIKE_MIN_W;

    if (isSpike && !spikeActive.get(deviceId)) {
      spikeActive.set(deviceId, true);
      await supabase.from('alerts').insert({
        device_id: deviceId, timestamp, type: 'anomaly',
        message: `Plotselinge piek: ${Math.round(watts)}W (normaal ~${Math.round(avg)}W)`,
        value: watts, resolved: false
      });
      console.log(`⚠️  spike — ${deviceId} ${Math.round(watts)}W vs ~${Math.round(avg)}W`);
    }
    // Reset debounce once power falls back near baseline
    if (watts < avg * 1.5) spikeActive.set(deviceId, false);
  }

  hist.push(watts);
  while (hist.length > WINDOW) hist.shift();
  recentWatts.set(deviceId, hist);
}

// ── Daily consumption comparison ──
// Compares today's kWh so far against the same-hour trailing average of the
// last 7 days, so "more than usual" is time-of-day fair, not just totals.
// Called sparingly (see cooldown in ingestion), not every reading.
async function checkDailyOveruse(deviceId, timestamp) {
  const { data, error } = await supabase.rpc('get_overuse_check',
    { p_device_id: deviceId });
  if (error || !data) return null;

  const { today_kwh, baseline_kwh, pct_over } = data;

  // Only flag a meaningful, sustained overuse — needs some consumption to matter
  if (baseline_kwh > 0.05 && pct_over >= 40 && today_kwh > baseline_kwh) {
    // Avoid duplicate daily-overuse alerts: one per day
    const { data: existing } = await supabase.from('alerts')
      .select('id').eq('device_id', deviceId).eq('type', 'anomaly')
      .gte('timestamp', new Date(new Date().setHours(0,0,0,0)).toISOString())
      .ilike('message', '%meer dan gebruikelijk%').limit(1);

    if (!existing || existing.length === 0) {
      await supabase.from('alerts').insert({
        device_id: deviceId, timestamp, type: 'anomaly',
        message: `Vandaag ${Math.round(pct_over)}% meer dan gebruikelijk `
               + `(${today_kwh.toFixed(2)} vs ~${baseline_kwh.toFixed(2)} kWh)`,
        value: pct_over, resolved: false
      });
      console.log(`⚠️  overuse — ${deviceId} +${Math.round(pct_over)}%`);
      return { today_kwh, baseline_kwh, pct_over };
    }
  }
  return null;
}

module.exports = { checkSpike, checkDailyOveruse };