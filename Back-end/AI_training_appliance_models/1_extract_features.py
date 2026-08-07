"""
energyLink · appliance recognition — STEP 1: feature extraction
team beepBoop · Hackomation 2026

NOTE: This is a clean, documented reconstruction of the training pipeline we used,
provided for documentation and reproducibility. It reflects the real method:
capture current waveforms of known appliances, extract electrical features, and
build a labeled dataset for training a classifier.

--------------------------------------------------------------------------------
WHAT THIS DOES
--------------------------------------------------------------------------------
For each captured sample (a short window of current readings from one known
appliance), compute the electrical features that distinguish load TYPES:

  - rms      : root-mean-square current  -> how much current it draws
  - peak     : maximum instantaneous current
  - crest    : peak / rms                -> how "peaky" the waveform is
  - form     : rms / mean(|i|)           -> waveform shape (sine vs pulsed)
  - shape    : an additional shape descriptor (see below)

The physics that makes this work:
  - Resistive loads (heating elements): clean sine current, low crest, high rms.
  - Motor loads (fans): fairly sinusoidal, but LOW rms (draw little current).
  - Switching supplies (chargers): current drawn in sharp narrow pulses ->
    HIGH crest factor and a distinctly different form factor.

So load TYPE separates along two axes: waveform shape (form/crest) and magnitude (rms).

--------------------------------------------------------------------------------
INPUT
--------------------------------------------------------------------------------
Raw captures: one CSV per appliance-capture in ./captures/, each a single column
of instantaneous current samples (amps), filename tagged with the class, e.g.
  captures/verwarmingselement_grill_01.csv
  captures/fan_desk_02.csv
  captures/charger_laptop_03.csv

The class is taken from the filename prefix before the first underscore.

OUTPUT
  features.csv  — one row per capture: [rms, peak, crest, form, shape, label]

IMPORTANT CALIBRATION NOTE (kept for honesty/reproducibility):
Our capture firmware used BURDEN=22 while the physical burden is 220 ohm, so raw
captured current is ~10x low. Training features were scaled x10 on rms and peak to
match the calibrated live pipeline (CURRENT_CALIBRATION=0.1255). See SCALE below.
"""

import os
import glob
import numpy as np
import pandas as pd

CAPTURES_DIR = "captures"
OUT_CSV = "features.csv"

# 10x scale fix: capture used BURDEN=22, live pipeline is calibrated to 220 ohm.
# rms and peak are magnitudes -> scaled. crest/form/shape are ratios -> unaffected.
SCALE = 10.0


def extract_features(current_samples: np.ndarray) -> dict:
    """Compute the electrical features from one window of current samples."""
    i = np.asarray(current_samples, dtype=float)
    i = i[np.isfinite(i)]
    if i.size == 0:
        return None

    # remove DC offset so shape metrics reflect the AC waveform
    i = i - np.mean(i)

    abs_i = np.abs(i)
    rms = np.sqrt(np.mean(i ** 2)) * SCALE
    peak = np.max(abs_i) * SCALE
    mean_abs = np.mean(abs_i) if np.mean(abs_i) > 0 else 1e-9

    crest = (peak / rms) if rms > 0 else 0.0            # peakiness
    form = (rms / (mean_abs * SCALE)) if mean_abs > 0 else 0.0  # sine≈1.11, pulsed higher
    # shape: normalized std of the abs waveform — another descriptor of "spikiness"
    shape = (np.std(abs_i) / mean_abs) if mean_abs > 0 else 0.0

    return {
        "rms": round(rms, 5),
        "peak": round(peak, 5),
        "crest": round(crest, 5),
        "form": round(form, 5),
        "shape": round(shape, 5),
    }


def label_from_filename(path: str) -> str:
    base = os.path.basename(path)
    return base.split("_")[0].lower()   # e.g. "verwarmingselement", "fan", "charger"


def main():
    rows = []
    files = sorted(glob.glob(os.path.join(CAPTURES_DIR, "*.csv")))
    if not files:
        print(f"No captures found in ./{CAPTURES_DIR}/ — add one CSV per appliance capture.")
        return

    for path in files:
        try:
            samples = pd.read_csv(path, header=None).iloc[:, 0].to_numpy()
        except Exception as e:
            print(f"skip {path}: {e}")
            continue
        feats = extract_features(samples)
        if feats is None:
            print(f"skip {path}: no valid samples")
            continue
        feats["label"] = label_from_filename(path)
        rows.append(feats)
        print(f"{os.path.basename(path):40s} -> {feats['label']:20s} "
              f"rms={feats['rms']:.2f} crest={feats['crest']:.2f} form={feats['form']:.2f}")

    df = pd.DataFrame(rows, columns=["rms", "peak", "crest", "form", "shape", "label"])
    df.to_csv(OUT_CSV, index=False)
    print(f"\nWrote {len(df)} feature rows to {OUT_CSV}")
    print(df.groupby('label').size().to_string())


if __name__ == "__main__":
    main()