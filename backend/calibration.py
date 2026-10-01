"""
Calibration + auto-suggested thresholds.
Works with ANY flex sensor range.
"""

import time


class CalibrationManager:
    KEYS = ("f1", "f2", "f3", "f4", "ax", "ay", "az", "gx", "gy", "gz")

    def __init__(self):
        self.active = False
        self.samples = []
        self.target = 40
        self.baseline = {k: 0.0 for k in self.KEYS}
        self.complete = False

        # Track observed ranges per flex (for auto-threshold suggestion)
        self.min_seen = {f"f{i}": 1e9 for i in range(1, 5)}
        self.max_seen = {f"f{i}": -1e9 for i in range(1, 5)}

    def start(self, target_samples: int = 40):
        self.active = True
        self.complete = False
        self.samples.clear()
        self.target = target_samples
        # keep observed ranges across calibrations

    def add_sample(self, data: dict) -> int:
        if not self.active:
            return 0
        self.samples.append({k: data[k] for k in self.KEYS})

        # Update observed range
        for i in range(1, 5):
            k = f"f{i}"
            v = data[k]
            if v < self.min_seen[k]:
                self.min_seen[k] = v
            if v > self.max_seen[k]:
                self.max_seen[k] = v

        pct = int(100 * len(self.samples) / self.target)
        if len(self.samples) >= self.target:
            self._finish()
            pct = 100
        return pct

    def _finish(self):
        for k in self.KEYS:
            self.baseline[k] = sum(s[k] for s in self.samples) / len(self.samples)
        self.active = False
        self.complete = True

    def reset(self):
        self.active = False
        self.complete = False
        self.samples.clear()
        self.baseline = {k: 0.0 for k in self.KEYS}

    # ---------- helpers for auto threshold suggestion ----------
    def suggested_thresholds(self):
        """
        Suggest flex thresholds = 25% of the observed max |delta| from baseline.
        If we've never seen enough motion, fall back to a small default.
        """
        suggestions = {}
        for i in range(1, 5):
            k = f"f{i}"
            b = self.baseline.get(k, 0)
            d_min = abs(b - self.min_seen[k])
            d_max = abs(b - self.max_seen[k])
            swing = max(d_min, d_max)
            if swing < 5:
                suggestions[k] = 15       # safe default for tiny sensors
            else:
                suggestions[k] = max(10, int(swing * 0.25))
        return suggestions
