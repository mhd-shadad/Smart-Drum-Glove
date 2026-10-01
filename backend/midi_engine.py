"""
MIDI output via mido + python-rtmidi.
Channel 10 (General MIDI percussion) is index 9 internally.
"""

import time
import mido


class MidiEngine:
    def __init__(self):
        self.port = None
        self.port_name = None
        self.channel = 9            # GM channel 10 (zero-based)
        self.last_note = None
        self.last_velocity = None

    # ---- static ----
    @staticmethod
    def list_outputs():
        try:
            return mido.get_output_names()
        except Exception:
            return []

    # ---- port control ----
    def open(self, port_name: str) -> bool:
        try:
            self.close()
            self.port = mido.open_output(port_name)
            self.port_name = port_name
            return True
        except Exception:
            self.port = None
            self.port_name = None
            return False

    def close(self):
        if self.port:
            try:
                self.port.close()
            except Exception:
                pass
        self.port = None
        self.port_name = None

    # ---- sending ----
    def send_note(self, note: int, velocity: int = 100, duration_ms: int = 60):
        if self.port is None:
            return False
        velocity = max(1, min(127, int(velocity)))
        try:
            self.port.send(mido.Message(
                "note_on", note=note, velocity=velocity, channel=self.channel))
            # Schedule note_off on the caller side? For drums short is fine.
            # Note-off is issued by MainWindow via a QTimer to avoid blocking.
            self.last_note = note
            self.last_velocity = velocity
            return True
        except Exception:
            return False

    def send_note_off(self, note: int):
        if self.port is None:
            return
        try:
            self.port.send(mido.Message(
                "note_off", note=note, velocity=0, channel=self.channel))
        except Exception:
            pass
