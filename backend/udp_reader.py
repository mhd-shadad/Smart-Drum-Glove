"""
Reads CSV sensor data over UDP from the ESP32.
Same interface as SerialReader so the UI doesn't care which one is used.

Supports both:
  - Old format:  f1,f2,f3,f4,ax,ay,az,gx,gy,gz    (10 fields)
  - New format:  R,f1,f2,f3,f4,ax,ay,az,gx,gy,gz  (11 fields, with hand ID)
"""

import socket
import time
from PySide6.QtCore import QThread, Signal


class UdpReader(QThread):
    data_received = Signal(dict)
    error_occurred = Signal(str)
    connection_changed = Signal(bool)

    def __init__(self, parent=None, udp_port: int = 5005):
        super().__init__(parent)
        self.udp_port = udp_port
        self.port = None          # UI compat; unused for UDP
        self._sock = None
        self._running = False
        self._last_rx = 0.0
        self.timeout_s = 3.0

        # INSTANCE attribute (not class attribute)
        self.is_connected_flag = False

    @staticmethod
    def list_ports():
        return ["UDP (wireless)"]

    def connect_port(self, port_name=None, baud=0):
        if self.isRunning():
            return
        self._running = True
        self.start()

    def disconnect_port(self):
        self._running = False

    def run(self):
        try:
            self._sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            self._sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self._sock.bind(("0.0.0.0", self.udp_port))
            self._sock.settimeout(0.5)
        except Exception as e:
            self.error_occurred.emit(f"UDP bind failed on port {self.udp_port}: {e}")
            self.connection_changed.emit(False)
            self._running = False
            return

        self._last_rx = time.time()

        while self._running:
            try:
                data, _ = self._sock.recvfrom(2048)
            except socket.timeout:
                if (self.is_connected_flag and
                        time.time() - self._last_rx > self.timeout_s):
                    self.is_connected_flag = False
                    self.connection_changed.emit(False)
                continue
            except Exception as e:
                self.error_occurred.emit(f"UDP recv error: {e}")
                break

            self._last_rx = time.time()
            text = data.decode("utf-8", errors="ignore").strip()

            # Skip non-data lines
            if (not text
                    or text.startswith("#")
                    or text.startswith("HAND,")
                    or text.startswith("F1,")):
                if not self.is_connected_flag:
                    self.is_connected_flag = True
                    self.connection_changed.emit(True)
                continue

            parts = text.split(",")

            # ---- Support both 10-field and 11-field formats ----
            hand = None
            if len(parts) == 11 and parts[0] in ("L", "R"):
                hand = parts[0]
                numeric = parts[1:]
            elif len(parts) == 10:
                numeric = parts
            else:
                continue

            try:
                vals = [float(p) for p in numeric]
            except ValueError:
                continue

            if not self.is_connected_flag:
                self.is_connected_flag = True
                self.connection_changed.emit(True)

            self.data_received.emit({
                "hand": hand,
                "f1": vals[0], "f2": vals[1], "f3": vals[2], "f4": vals[3],
                "ax": vals[4], "ay": vals[5], "az": vals[6],
                "gx": vals[7], "gy": vals[8], "gz": vals[9],
                "time": time.time(),
            })

        try:
            if self._sock:
                self._sock.close()
        except Exception:
            pass
        self.connection_changed.emit(False)
