const { supabase } = require('../config/supabase');
const { reconstructTimestamp } = require('./reconstruction');
const { checkGrid } = require('./gridMonitor');
const { checkSpike, checkDailyOveruse } = require('./anomalyMonitor');
const { classify, getState } = require('./applianceMonitor');

// track last overuse check per device so it doesn't run every reading
const lastOveruseCheck = new Map();
const OVERUSE_INTERVAL_MS = 10 * 60 * 1000;   // every 10 min

async function ingestReading(reading) {
  const serverTime = new Date();
  const { time, status } = reconstructTimestamp(reading, serverTime);

  const { error } = await supabase.from('readings').insert({
    device_id:     reading.device_id,
    clamp_id:      reading.clamp_id,
    timestamp:     time,
    voltage:       reading.voltage,
    current:       reading.current,
    watts:         reading.watts,
    interval_sec:  reading.interval_sec,
    kwh:           reading.kwh,
    seq:           reading.seq,
    ms_since_boot: reading.ms_since_boot,
    time_status:   status
  });

  const appliance = classify(reading.device_id, reading.clamp_id, {
  rms:   reading.current,   // or reading.rms if you send it separately
  peak:  reading.peak,
  crest: reading.crest,
  form:  reading.form,
  shape: reading.shape,
});

if (error) throw new Error(error.message);

  // Voltage is shared across clamps; the state machine in checkGrid
  // suppresses duplicates, so calling it per reading is safe.
  const gridStatus = await checkGrid(reading.device_id, reading.voltage, time);

    // Spike check runs every reading (cheap, in-memory)
  await checkSpike(reading.device_id, reading.watts, time);

  // Overuse check is a DB query — throttle it
  const last = lastOveruseCheck.get(reading.device_id) || 0;
  if (Date.now() - last > OVERUSE_INTERVAL_MS) {
    lastOveruseCheck.set(reading.device_id, Date.now());
    await checkDailyOveruse(reading.device_id, time);
  }
  
  return { time, status, gridStatus };
}



async function getEnergySummary(deviceId) {
  const { data, error } = await supabase
    .rpc('get_energy_summary', { p_device_id: deviceId })
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function getLatestReading(deviceId) {
  const { data } = await supabase
    .from('readings')
    .select('*')
    .eq('device_id', deviceId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}



module.exports = { ingestReading, getEnergySummary, getLatestReading };