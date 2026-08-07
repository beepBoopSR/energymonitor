// energyLink · appliance recognition — STEP 3: inference (reference)
// team beepBoop · Hackomation 2026
//
// This is a REFERENCE copy of the inference logic. The LIVE version runs in the
// backend as services/applianceMonitor.js — it loads appliance_tree.json (exported
// by 2_train_model.py) and walks the tree on each live reading. No Python runs in
// production; the trained model is just a small JSON of if/else thresholds.
//
// Kept here so the training folder documents the full path: Python trains ->
// JSON carries the model -> JavaScript runs it.

const fs = require("fs");
const path = require("path");

const MODEL = JSON.parse(
  fs.readFileSync(path.join(__dirname, "appliance_tree.json"), "utf8")
);

// Dutch display names for the electrical categories.
const DISPLAY = {
  verwarmingselement: "Verwarmingselement",
  fan: "Ventilator/motor",
  charger: "Oplader",
  niets: "Niets",
  onbekend: "Onbekend",
};

/**
 * Classify one reading's features into an appliance TYPE.
 * @param {{rms:number, peak:number, crest:number, form:number, shape:number}} f
 * @returns {{label:string, display:string, confidence:number}}
 */
function classify(f) {
  // Guard 1: below the noise floor, nothing is meaningfully drawing.
  if (f.rms < MODEL.noise_floor_rms) {
    return { label: "niets", display: DISPLAY.niets, confidence: 1 };
  }

  // Walk the exported decision tree.
  let node = MODEL.tree;
  while (!node.leaf) {
    const v = f[node.feature];
    node = v <= node.threshold ? node.left : node.right;
  }

  // Guard 2: low-confidence leaf -> report unknown rather than guess.
  if (node.confidence < MODEL.min_confidence) {
    return { label: "onbekend", display: DISPLAY.onbekend, confidence: node.confidence };
  }

  return {
    label: node.label,
    display: DISPLAY[node.label] || node.label,
    confidence: node.confidence,
  };
}

// Note on the LIVE version (services/applianceMonitor.js): it adds state memory for
// thermostatically-cycling appliances (e.g. a grill whose element switches on/off),
// so brief off-phases don't flip the reported appliance. That stateful wrapper is
// omitted here to keep this a clean inference reference.

module.exports = { classify, MODEL, DISPLAY };

// quick self-test when run directly: node 3_inference_reference.js
if (require.main === module) {
  const samples = [
    { rms: 6.5, peak: 9.4, crest: 1.45, form: 1.11, shape: 0.6 }, // grill
    { rms: 3.5, peak: 5.0, crest: 1.43, form: 1.10, shape: 0.5 }, // fan
    { rms: 1.2, peak: 2.1, crest: 1.77, form: 1.64, shape: 0.9 }, // charger
    { rms: 0.01, peak: 0.02, crest: 1.4, form: 1.1, shape: 0.5 }, // nothing
  ];
  for (const s of samples) console.log(s.rms, "A ->", classify(s));
}