"""
Flex pose selects the drum. IMU strike fires it.

Rules:
  - Fingers bent form a "pose" (set of fingers).
  - A rising edge on movement (crossing above movement_threshold from
    below) fires the drum for the currently held pose - only if a rule
    matches that pose.
  - A sustained high-movement condition does NOT retrigger.
  - Releasing fingers clears the pose; striking while a pose is held
    always fires its drum (subject to cooldown).
"""

import time


class GestureEngine:
    def __init__(self, rules, settings):
        self.rules = rules
        self.settings = settings

        self.finger_state = [False, False, False, False]
        self.held_combo = None         # tuple of finger numbers, or None

        self.movement_above = False    # was movement above threshold last frame?
        self.last_trigger = {}

        self.current_gesture = None
        self.current_gesture_time = 0.0
        self.last_velocity = 0
        self.last_note = 0

    def update_settings(self, settings):
        self.settings = settings

    def process(self, bend, movement):
        now = time.time()
        events = []

        flex_thr = {
            1: self.settings.get("flex1_threshold", 20),
            2: self.settings.get("flex2_threshold", 20),
            3: self.settings.get("flex3_threshold", 20),
            4: self.settings.get("flex4_threshold", 20),
        }
        mv_thr = self.settings.get("movement_threshold", 5.0)
        global_cd = self.settings.get("gesture_cooldown", 0.20)
        sens = self.settings.get("velocity_sensitivity", 2.0)
        v_min = self.settings.get("min_velocity", 40)
        v_max = self.settings.get("max_velocity", 127)

        # ---- 1. Update bent state ----
        for finger in (1, 2, 3, 4):
            key = f"f{finger}"
            self.finger_state[finger - 1] = \
                bend.get(key, 0.0) > flex_thr[finger]

        current_combo = tuple(
            f for f in (1, 2, 3, 4) if self.finger_state[f - 1]
        )

        # ---- 2. Rising edge of a pose -> remember it as held ----
        if current_combo:
            self.held_combo = current_combo
        else:
            self.held_combo = None

        # ---- 3. Detect movement rising edge ----
        movement_above = movement >= mv_thr
        rising_edge = movement_above and not self.movement_above
        self.movement_above = movement_above

        # ---- 4. On movement rising edge, fire the held pose's drum ----
        if rising_edge and self.held_combo is not None:
            for name, rule in self.rules.items():
                if tuple(sorted(rule.get("fingers", []))) != self.held_combo:
                    continue
                cd = rule.get("cooldown", global_cd)
                if now - self.last_trigger.get(name, 0) < cd:
                    break
                note = int(rule.get("midi_note", 0))
                if note <= 0:
                    break

                velocity = self._velocity(movement, sens, v_min, v_max)
                self.last_trigger[name] = now
                self._set_current(name, now, velocity, note)
                events.append({
                    "name": name,
                    "note": note,
                    "velocity": velocity,
                })
                break

        return events

    def _velocity(self, movement, sens, v_min, v_max):
        raw = v_min + movement * sens
        v = int(max(v_min, min(v_max, raw)))
        return max(1, min(127, v))

    def _set_current(self, name, t, velocity, note):
        self.current_gesture = name
        self.current_gesture_time = t
        self.last_velocity = velocity
        self.last_note = note

    def current(self):
        if self.current_gesture and \
           time.time() - self.current_gesture_time > 1.0:
            return None
        return self.current_gesture
