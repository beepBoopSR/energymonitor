"""
energyLink · appliance recognition — STEP 2: train + export the classifier
team beepBoop · Hackomation 2026

Clean, documented reconstruction of the training step (for documentation/repro).

--------------------------------------------------------------------------------
WHAT THIS DOES
--------------------------------------------------------------------------------
1. Loads features.csv (from step 1): rows of [rms, peak, crest, form, shape, label].
2. Trains a DECISION TREE classifier. A decision tree is chosen deliberately:
   - it is interpretable — you can read the exact thresholds it learned,
   - it exports trivially to a set of if/else rules that run in plain JavaScript
     in the backend (no Python at runtime),
   - it needs very little data to separate cleanly-separable classes, which ours
     are (the load types differ sharply in form factor and magnitude).
3. Validates with cross-validation (small dataset -> k-fold, not a single split).
4. Exports the trained tree to appliance_tree.json — the format the backend's
   applianceMonitor.js loads and walks at inference time.

The classes are ELECTRICAL CATEGORIES, not appliance brands:
   verwarmingselement (resistive) · fan (motor) · charger (switching supply)

--------------------------------------------------------------------------------
WHY A SHALLOW TREE
--------------------------------------------------------------------------------
The separation is essentially:
   form factor high?            -> charger (switching supply, pulsed current)
   else, rms high?              -> verwarmingselement (resistive, high draw)
   else                         -> fan (motor, low draw, sinusoidal)
max_depth is kept small so the model stays interpretable and does not overfit the
modest number of captures.
"""

import json
import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeClassifier, _tree
from sklearn.model_selection import cross_val_score, StratifiedKFold

FEATURES = ["rms", "peak", "crest", "form", "shape"]
IN_CSV = "features.csv"
OUT_JSON = "appliance_tree.json"

# noise/confidence guards baked into the exported model for the backend to honor
NOISE_FLOOR_RMS = 0.05   # below this -> "niets" (nothing meaningfully drawing)
MIN_CONFIDENCE = 0.60    # below this leaf purity -> "onbekend" (unknown)
MAX_DEPTH = 4


def tree_to_dict(clf, feature_names):
    """Convert a fitted sklearn tree into a compact nested dict of if/else nodes.

    Leaf nodes carry the predicted class and its confidence (max class proportion),
    so the JS inference side can apply the MIN_CONFIDENCE guard.
    """
    t = clf.tree_
    classes = clf.classes_

    def recurse(node):
        if t.feature[node] == _tree.TREE_UNDEFINED:
            counts = t.value[node][0]
            total = counts.sum()
            idx = int(np.argmax(counts))
            return {
                "leaf": True,
                "label": str(classes[idx]),
                "confidence": round(float(counts[idx] / total), 4) if total else 0.0,
            }
        return {
            "leaf": False,
            "feature": feature_names[t.feature[node]],
            "threshold": round(float(t.threshold[node]), 6),
            # sklearn convention: go left if feature <= threshold
            "left": recurse(t.children_left[node]),
            "right": recurse(t.children_right[node]),
        }

    return recurse(0)


def main():
    df = pd.read_csv(IN_CSV)
    X = df[FEATURES].to_numpy()
    y = df["label"].to_numpy()

    print(f"Loaded {len(df)} samples across classes: {sorted(set(y))}")

    clf = DecisionTreeClassifier(max_depth=MAX_DEPTH, random_state=42)

    # cross-validation (stratified k-fold; k capped by smallest class size)
    min_class = pd.Series(y).value_counts().min()
    k = max(2, min(5, min_class))
    cv = StratifiedKFold(n_splits=k, shuffle=True, random_state=42)
    scores = cross_val_score(clf, X, y, cv=cv)
    print(f"{k}-fold cross-validation accuracy: "
          f"{scores.mean():.3f} (+/- {scores.std():.3f})  folds={np.round(scores,3).tolist()}")

    # fit on all data for the exported model
    clf.fit(X, y)

    model = {
        "_comment": "energyLink appliance classifier — decision tree exported for JS inference",
        "features": FEATURES,
        "classes": sorted(set(y.tolist())),
        "noise_floor_rms": NOISE_FLOOR_RMS,
        "min_confidence": MIN_CONFIDENCE,
        "tree": tree_to_dict(clf, FEATURES),
    }
    with open(OUT_JSON, "w") as f:
        json.dump(model, f, indent=2)
    print(f"\nExported trained tree to {OUT_JSON}")

    # print the learned rules for the documentation
    print("\nLearned decision rules:")
    _print_rules(model["tree"])


def _print_rules(node, depth=0):
    pad = "  " * depth
    if node["leaf"]:
        print(f"{pad}-> {node['label']} (confidence {node['confidence']})")
    else:
        print(f"{pad}if {node['feature']} <= {node['threshold']}:")
        _print_rules(node["left"], depth + 1)
        print(f"{pad}else:")
        _print_rules(node["right"], depth + 1)


if __name__ == "__main__":
    main()