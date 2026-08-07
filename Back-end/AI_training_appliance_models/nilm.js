// services/nilm.js
//
// Event-based NILM (non-intrusive load monitoring).
//
// The single-appliance classifier (applianceMonitor.js) reads the WHOLE circuit
// and only works when one thing draws at a time. This layer watches the power
// SEQUENCE and reacts to CHANGES, so it can attribute an appliance switching on
// or off even while other loads run.
//
// Honest scope — what this can and cannot do:
//   RELIABLE : detecting THAT a step happened and its SIZE (delta watts).
//   RELIABLE : classifying a step that occurs against a near-idle baseline
//              (the new reading's own features ARE the appliance).
//   BEST-EFFORT (gated to 'onbekend' when unclear): classifying a step layered
//              on top of an existing large load. The device sends summary
//              features of the TOTAL waveform, not the raw waveform, so the
//              shape of the *delta* can't be cleanly recovered — only its size
//              and a muddy shift in aggregate shape. Small load under big load
//              is where this honestly returns 'onbekend'.
//
// A DOWN step is matched against the appliances currently believed active,
// by removed-power magnitude.

// NILM must classify WITHOUT touching applianceMonitor's stateful heater memory,
// or the two state machines corrupt each other. We load the tree directly and
// run a pure, stateless classification here.
const fs = require('fs');
const path = require('path');
const MODEL = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'appliance_tree.json'), 'utf8')
);

function classifyStateless(sample) {
  const rms = sample.rms ?? sample.current ?? 0;
  if (rms < MODEL.noise_floor_a) return { label: 'niets', confidence: 1 };
  let node = MODEL.tree;
  while (!node.leaf) {
    const v = sample[node.feature];
    node = (v <= node.threshold) ? node.left : node.right;
  }
  if (node.confidence < MODEL.confidence_min)
    return { label: 'onbekend', confidence: node.confidence };
  return { label: node.leaf, confidence: node.confidence };
}

// ── tuning ──
const STEP_MIN_W       = 30;    // ignore power wiggles smaller than this
const DEBOUNCE_READINGS = 1;    // step must persist to count (avoids transients)
const IDLE_BASELINE_W  = 25;    // below this, the circuit was effectively empty
const NAMES = {
  verwarmingselement: 'Verwarmingselement',
  fan: 'Ventilator', charger: 'Oplader',
};

const state = new Map();   // device:clamp -> { lastWatts, active:[{label,watts}], pending }

function keyFor(d, c) { return `${d}:${c}`; }

function processReading(deviceId, clampId, reading) {
  const key = keyFor(deviceId, clampId);
  let st = state.get(key);
  const w = reading.watts ?? 0;

  // First reading for this device: establish baseline, emit nothing.
  if (!st) {
    st = { lastWatts: w, active: [] };
    if (w >= IDLE_BASELINE_W) {
      const c = classifyStateless(reading);
      if (c.label !== 'niets' && c.label !== 'onbekend')
        st.active = [{ label: c.label, watts: w }];
    }
    state.set(key, st);
    return null;
  }

  const prev = st.lastWatts;
  const delta = w - prev;
  let event = null;

  // ── UP step: something switched ON ──
  if (delta > STEP_MIN_W) {
    if (prev < IDLE_BASELINE_W) {
      // Clean case: nothing was running, so this reading IS the appliance.
      const c = classifyStateless(reading);
      if (c.label !== 'niets' && c.label !== 'onbekend') {
        st.active = [{ label: c.label, watts: w }];
        event = { type: 'on', label: c.label, watts: Math.round(delta),
                  confidence: c.confidence, basis: 'clean' };
      } else {
        event = { type: 'on', label: 'onbekend', watts: Math.round(delta),
                  confidence: c.confidence ?? 0.3, basis: 'clean-unclear' };
      }
    } else {
      // Layered case: a load added on top of an existing one.
      const guess = guessLayeredOn(reading, prev, delta);
      st.active.push({ label: guess.label, watts: delta });
      event = { type: 'on', label: guess.label, watts: Math.round(delta),
                confidence: guess.confidence, basis: 'layered' };
    }
  }

  // ── DOWN step: something switched OFF ──
  else if (delta < -STEP_MIN_W) {
    const removed = -delta;
    // Match the removed power against what we think is active
    const match = matchRemoved(st.active, removed);
    if (match.idx >= 0) {
      const gone = st.active.splice(match.idx, 1)[0];
      event = { type: 'off', label: gone.label, watts: Math.round(removed),
                confidence: match.confidence, basis: 'match' };
    } else {
      event = { type: 'off', label: 'onbekend', watts: Math.round(removed),
                confidence: 0.4, basis: 'no-match' };
    }
    // If power fell to idle, clear everything
    if (w < IDLE_BASELINE_W) st.active = [];
  }

  st.lastWatts = w;
  state.set(key, st);
  return event;   // null when nothing changed
}

// Layered-on guess: size gives a hint, but shape of the delta is unavailable,
// so we lean on the aggregate form-factor shift and gate hard.
function guessLayeredOn(reading, prevW, deltaW) {
  // If the total waveform became noticeably spikier, a switching load (charger)
  // was likely added. If it stayed clean-sine and the step is large, likely a
  // heating element. A small clean step could be a fan OR a small heater — we
  // cannot tell from summed features, so that stays 'onbekend'.
  const form = reading.form ?? 1.1;

  if (form > 1.30) {
    return { label: 'charger', confidence: 0.55 };   // spiky total -> charger added
  }
  if (deltaW >= 500) {
    return { label: 'verwarmingselement', confidence: 0.55 };  // big clean step
  }
  // small-to-medium clean step on top of a load: genuinely ambiguous
  return { label: 'onbekend', confidence: 0.35 };
}

// Match a removed-power magnitude to an active appliance (nearest within 40%).
function matchRemoved(active, removed) {
  let best = { idx: -1, confidence: 0 };
  for (let i = 0; i < active.length; i++) {
    const ratio = Math.min(active[i].watts, removed) / Math.max(active[i].watts, removed);
    if (ratio > 0.6 && ratio > best.confidence) {
      best = { idx: i, confidence: ratio };
    }
  }
  return best;
}

function getActive(deviceId, clampId) {
  const st = state.get(keyFor(deviceId, clampId));
  if (!st || !st.active.length) return [];
  return st.active.map(a => ({ label: a.label, name: NAMES[a.label] || a.label,
                                watts: Math.round(a.watts) }));
}

module.exports = { processReading, getActive };