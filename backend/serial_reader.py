"""
Reads CSV lines from the ESP32 over USB serial and emits parsed dicts.
Runs in a QThread so the UI never blocks.

Supports both:
  - Old format:  f1,f2,f3,f4,ax,ay,az,gx,gy,gz    (10 fields)
  - New format:  R,f1,f2,f3,f4,ax,ay,az,gx,gy,gz  (11 fields, with hand ID)
"""

import time
import serial
import serial.tools.list_ports
from PySide6.QtCore import QThread, Signal


class SerialReader(QThread):
    data_received = Signal(dict)     # {'hand': 'R'/'L'/None, 'f1':.., ..., 'time':..}
    error_occurred = Signal(str)
    connection_changed = Signal(bool)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.port = None
        self.baud = 115200
        self._ser = None
        self._running = False

    # ---------- static helpers ----------
    @staticmethod
    def list_ports():
        return [p.device for p in serial.tools.list_ports.comports()]

    # ---------- public API ----------
    def connect_port(self, port: str, baud: int = 115200):
        if self.isRunning():
            return
        self.port = port
        self.baud = baud
        self._running = True
        self.start()

    def disconnect_port(self):
        self._running = False

    # ---------- thread body ----------
    def run(self):
        try:
            self._ser = serial.Serial(self.port, self.baud, timeout=1)
            # ESP32 resets when serial opens - wait for boot
            time.sleep(2.0)
            self._ser.reset_input_buffer()
            self.connection_changed.emit(True)
        except Exception as e:
            self.error_occurred.emit(f"Could not open {self.port}: {e}")
            self.connection_changed.emit(False)
            self._running = False
            return

        while self._running:
            try:
                raw = self._ser.readline()
                if not raw:
                    continue

                line = raw.decode("utf-8", errors="ignore").strip()

                # Skip empty and comment lines
                if not line:
                    continue
                if line.startswith("#"):
                    continue
                if line.startswith("HAND,"):
                    continue
                if line.startswith("F1,"):
                    continue

                parts = line.split(",")

                # ---- Support BOTH 10-field and 11-field formats ----
                hand = None
                if len(parts) == 11 and parts[0] in ("L", "R"):
                    hand = parts[0]
                    numeric = parts[1:]
                elif len(parts) == 10:
                    numeric = parts
                else:
                    # Unknown format — ignore
                    continue

                try:
                    vals = [float(p) for p in numeric]
                except ValueError:
                    continue

                data = {
                    "hand": hand,
                    "f1": vals[0], "f2": vals[1], "f3": vals[2], "f4": vals[3],
                    "ax": vals[4], "ay": vals[5], "az": vals[6],
                    "gx": vals[7], "gy": vals[8], "gz": vals[9],
                    "time": time.time(),
                }
                self.data_received.emit(data)

            except Exception as e:
                self.error_occurred.emit(f"Serial read error: {e}")
                break

        try:
            if self._ser and self._ser.is_open:
                self._ser.close()
        except Exception:
            pass
        self.connection_changed.emit(False)
