"""
Per-glove pipeline: reader + calibration + gesture engine.
Two instances are used in the app - one for RH, one for LH.
Emits drum events to the UI.
"""

import os
from PySide6.QtCore import QObject, Signal, QThread

from backend.serial_reader import SerialReader
from backend.udp_reader import UdpReader
from backend.calibration import CalibrationManager
from backend.gesture_engine import GestureEngine
from backend.drum_mapper import load_mapping


class GloveWorker(QObject):
    # Signals to the UI
    data_received        = Signal(str, dict)
    event_fired          = Signal(str, dict)
    connection_changed   = Signal(str, bool)
    calibration_progress = Signal(str, int)
    calibration_done     = Signal(str)
    log_message          = Signal(str)

    def __init__(self, side, config_path, settings, parent=None):
        super().__init__(parent)
        self.side = side
        self.settings = settings
        self.mapping = load_mapping(config_path)
        self.calib = CalibrationManager()
        self.engine = GestureEngine(self.mapping, settings)

        self._filt = {k: None for k in
                      ("f1", "f2", "f3", "f4",
                       "ax", "ay", "az", "gx", "gy", "gz")}

        self.reader = None

    # --------------- connection ---------------
    def connect_serial(self, port):
        self._make_reader("serial", port)

    def connect_udp(self, udp_port):
        self._make_reader("udp", udp_port)

    def _make_reader(self, kind, arg):
        # --- Properly tear down old reader ---
        self.disconnect()

        if kind == "serial":
            self.reader = SerialReader()
            self.reader.data_received.connect(self._on_data)
            self.reader.error_occurred.connect(
                lambda m: self.log_message.emit(f"[{self.side}] ERROR: {m}"))
            self.reader.connection_changed.connect(
                lambda ok: self.connection_changed.emit(self.side, ok))
            self.reader.connect_port(arg)

        else:  # udp
            udp_port = arg if isinstance(arg, int) else 5005
            self.reader = UdpReader(udp_port=udp_port)
            self.reader.data_received.connect(self._on_data)
            self.reader.error_occurred.connect(
                lambda m: self.log_message.emit(f"[{self.side}] ERROR: {m}"))
            self.reader.connection_changed.connect(
                lambda ok: self.connection_changed.emit(self.side, ok))
            self.reader.connect_port("udp")

    def disconnect(self):
        """Properly stop the reader thread and wait for it to finish."""
        reader = self.reader
        self.reader = None

        if reader is None:
            return

        try:
            # Ask the thread to stop
            reader.disconnect_port()

            # Wait for the QThread to actually exit (max 2 sec)
            if isinstance(reader, QThread):
                if not reader.wait(2000):
                    self.log_message.emit(
                        f"[{self.side}] Warning: reader thread did not stop in time")

        except Exception as e:
            self.log_message.emit(f"[{self.side}] Disconnect error: {e}")

    def is_running(self):
        return self.reader is not None and self.reader.isRunning()

    # --------------- calibration ---------------
    def start_calibration(self, samples=40):
        self.calib.start(target_samples=samples)

    def suggested_thresholds(self):
        return self.calib.suggested_thresholds()

    def update_settings(self, settings):
        self.settings = settings
        self.engine.update_settings(settings)

    # --------------- data path ---------------
    def _on_data(self, data):
        alpha = self.settings["smoothing"]
        f = {}
        for k in self._filt:
            prev = self._filt[k]
            if prev is None:
                self._filt[k] = data[k]
                f[k] = data[k]
            else:
                self._filt[k] = alpha * prev + (1 - alpha) * data[k]
                f[k] = self._filt[k]

        if self.calib.active:
            pct = self.calib.add_sample(f)
            self.calibration_progress.emit(self.side, pct)
            if self.calib.complete:
                self.calibration_done.emit(self.side)

        # bend amounts
        if self.calib.complete:
            bend = {
                "f1": f["f1"] - self.calib.baseline["f1"],
                "f2": f["f2"] - self.calib.baseline["f2"],
                "f3": f["f3"] - self.calib.baseline["f3"],
                "f4": f["f4"] - self.calib.baseline["f4"],
            }
        else:
            bend = {"f1": 0, "f2": 0, "f3": 0, "f4": 0}

        # movement intensity
        dax = f["ax"] - self.calib.baseline["ax"]
        day = f["ay"] - self.calib.baseline["ay"]
        daz = f["az"] - self.calib.baseline["az"]
        acc_mag = (dax * dax + day * day + daz * daz) ** 0.5
        gyro_mag = (f["gx"] ** 2 + f["gy"] ** 2 + f["gz"] ** 2) ** 0.5
        movement = acc_mag * 4.0 + gyro_mag * 0.25

        self.data_received.emit(self.side, {
            **f,
            "bend": bend,
            "movement": movement,
            "baseline_ready": self.calib.complete,
        })

        events = self.engine.process(bend, movement)
        for ev in events:
            self.event_fired.emit(self.side, ev)
