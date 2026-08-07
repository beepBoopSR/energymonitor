// Rebuilds timestamps for readings taken while the clock was unsynced.
//
// Every reading carries ms_since_boot from the ESP32's millis(), which runs
// with or without internet. Once we see one reading with a real timestamp we
// store it as an anchor; unsynced readings are then placed by their offset
// from that anchor. Interval-independent by design.

const anchors = new Map();   // device_id -> { ms, real }

function reconstructTimestamp(reading, serverTime) {
  const { device_id, timestamp, ms_since_boot } = reading;

  if (timestamp && timestamp !== 'UNSYNCED') {
    const real = new Date(timestamp);
    anchors.set(device_id, { ms: ms_since_boot, real });
    return { time: real.toISOString(), status: 'synced' };
  }

  const anchor = anchors.get(device_id);
  if (anchor && ms_since_boot != null) {
    const drift = ms_since_boot - anchor.ms;
    return {
      time: new Date(anchor.real.getTime() + drift).toISOString(),
      status: 'reconstructed'
    };
  }

  // No anchor yet — fall back to arrival time
  return { time: serverTime.toISOString(), status: 'reconstructed' };
}

function resetAnchor(deviceId) {
  anchors.delete(deviceId);
}

module.exports = { reconstructTimestamp, resetAnchor };