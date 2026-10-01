"""
Loads config/drum_mapping.json and exposes gesture -> MIDI note mapping.
"""

import json
import os


DEFAULT_MAPPING = {
    "kick":         {"midi_note": 36, "finger": 1, "cooldown": 0.15, "requires_movement": False},
    "snare":        {"midi_note": 38, "finger": 2, "cooldown": 0.15, "requires_movement": True},
    "closed_hihat": {"midi_note": 42, "finger": 3, "cooldown": 0.10, "requires_movement": False},
    "tom":          {"midi_note": 47, "finger": 4, "cooldown": 0.15, "requires_movement": False},
    "crash":        {"midi_note": 49, "finger": 0, "cooldown": 0.40, "requires_movement": True},
}


def load_mapping(path: str) -> dict:
    if not os.path.isfile(path):
        return dict(DEFAULT_MAPPING)
    try:
        with open(path, "r") as f:
            data = json.load(f)
    except Exception:
        return dict(DEFAULT_MAPPING)

    # ensure required keys exist
    for k, v in DEFAULT_MAPPING.items():
        if k not in data:
            data[k] = v
        else:
            for kk, vv in v.items():
                data[k].setdefault(kk, vv)
    return data


def save_mapping(path: str, mapping: dict):
    with open(path, "w") as f:
        json.dump(mapping, f, indent=4)


def note_for(mapping: dict, gesture: str) -> int:
    return int(mapping.get(gesture, {}).get("midi_note", 0))
