// Detects outages and brownouts from the voltage reading and logs them
// to the alerts table. Only state *transitions* are written, so a
// sustained outage produces one start row and one end row.

const { supabase } = require('../config/supabase');

const OUTAGE_THRESHOLD   = 20;    // below this, power is out
const LOW_VOLT_THRESHOLD = 105;   // below this (but above 20), brownout
const NORMAL_MIN         = 110;   // recovery point — gap prevents alert spam

const gridState   = new Map();    // device_id -> 'up' | 'low' | 'down'
const outageStart = new Map();    // device_id -> Date

async function checkGrid(deviceId, voltage, timestamp) {
  const prev = gridState.get(deviceId) || 'up';

  // Full outage
  if (voltage < OUTAGE_THRESHOLD && prev !== 'down') {
    gridState.set(deviceId, 'down');
    outageStart.set(deviceId, new Date(timestamp));
    await supabase.from('alerts').insert({
      device_id: deviceId, timestamp, type: 'outage_start',
      message: 'Grid power lost', value: voltage, resolved: false
    });
    console.log(`⚡ outage start — ${deviceId}`);
    return 'down';
  }

  // Recovery from outage
  if (voltage >= NORMAL_MIN && prev === 'down') {
    gridState.set(deviceId, 'up');
    const start = outageStart.get(deviceId);
    const mins  = start ? Math.round((new Date(timestamp) - start) / 60000) : null;
    await supabase.from('alerts').insert({
      device_id: deviceId, timestamp, type: 'outage_end',
      message: `Power restored after ${mins} min`,
      duration_min: mins, value: voltage, resolved: true
    });
    console.log(`✅ outage end — ${deviceId} (${mins} min)`);
    return 'up';
  }

  // Brownout
  if (voltage >= OUTAGE_THRESHOLD && voltage < LOW_VOLT_THRESHOLD && prev === 'up') {
    gridState.set(deviceId, 'low');
    await supabase.from('alerts').insert({
      device_id: deviceId, timestamp, type: 'low_voltage',
      message: `Low grid voltage: ${voltage.toFixed(1)}V`,
      value: voltage, resolved: false
    });
    console.log(`⚠️  low voltage — ${deviceId} (${voltage.toFixed(1)}V)`);
    return 'low';
  }

  // Recovery from brownout
  if (voltage >= NORMAL_MIN && prev === 'low') {
    gridState.set(deviceId, 'up');
    console.log(`✅ voltage normal — ${deviceId}`);
    return 'up';
  }

  return prev;
}

function getGridStatus(deviceId) {
  return gridState.get(deviceId) || 'unknown';
}

module.exports = { checkGrid, getGridStatus, OUTAGE_THRESHOLD, LOW_VOLT_THRESHOLD };