// services/applianceMonitor.js
//
// Live appliance classification, ported from the Python model.
// Loads the exported decision tree (appliance_tree.json) and applies the same
// two guardrails plus the cycling-heater state memory that the Python version
// proved out:
//   - noise floor  -> below it, "niets" (idle), no classification
//   - a cycling heater (thermostat off) is held as verwarmingselement, not
//     misread as a charger, but released cleanly on true idle
//
// One tracker is kept per device+clamp so two clamps don't corrupt each other.

const fs = require('fs');
const path = require('path');

const MODEL = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'appliance_tree.json'), 'utf8')
);

const NOISE_FLOOR   = MODEL.noise_floor_a;   // 0.02 A
const CYCLE_MEMORY  = 3;                      // readings to hold a cycling heater
const HEATER_RMS    = 3.0;    // a real heater draws at least this (scaled)
const AMBIGUOUS_MAX = 1.5;    // mid-low zone where a heater dip lands (scaled)
const TRUE_IDLE     = 0.05;   // at/under this the circuit is empty

// ── Walk the tree for a raw class ──
function classifyRaw(sample) {
  let node = MODEL.tree;
  while (!node.leaf) {
    const v = sample[node.feature];
    node = (v <= node.threshold) ? node.left : node.right;
  }
  return { label: node.leaf, confidence: node.confidence };
}

// ── Per device+clamp state ──
const trackers = new Map();   // key -> { heaterTtl, state }

function keyFor(deviceId, clampId) { return `${deviceId}:${clampId}`; }

function classify(deviceId, clampId, sample) {
  const key = keyFor(deviceId, clampId);
  let st = trackers.get(key) || { heaterTtl: 0, state: 'niets' };

  const rms = sample.rms ?? 0;

  // True idle: clear any heater memory, report empty
  if (rms <= TRUE_IDLE) {
    st.heaterTtl = 0; st.state = 'niets';
    trackers.set(key, st);
    return { label: 'niets', confidence: 1, note: 'idle' };
  }

  const raw = classifyRaw(sample);

  // Confident heater at real current: remember it
  if (raw.label === 'verwarmingselement' && rms >= HEATER_RMS) {
    st.heaterTtl = CYCLE_MEMORY; st.state = 'verwarmingselement';
    trackers.set(key, st);
    return { label: 'verwarmingselement', confidence: raw.confidence, note: 'heating' };
  }

  // Thermostat dip while a heater was just active -> hold it, don't call it charger
  if (rms < AMBIGUOUS_MAX && st.heaterTtl > 0) {
    st.heaterTtl -= 1; st.state = 'verwarmingselement';
    trackers.set(key, st);
    return { label: 'verwarmingselement', confidence: 0.7, note: 'cycling' };
  }

  // Otherwise accept the raw class (with confidence gate)
  if (raw.confidence < MODEL.confidence_min) {
    st.state = 'onbekend'; trackers.set(key, st);
    return { label: 'onbekend', confidence: raw.confidence, note: '' };
  }

  // a confident fan/charger ends any heater assumption
  if (raw.label === 'fan' || raw.label === 'charger') st.heaterTtl = 0;
  st.state = raw.label;
  trackers.set(key, st);
  return { label: raw.label, confidence: raw.confidence, note: '' };
}

function getState(deviceId, clampId) {
  const st = trackers.get(keyFor(deviceId, clampId));
  return st ? st.state : 'niets';
}

module.exports = { classify, getState };