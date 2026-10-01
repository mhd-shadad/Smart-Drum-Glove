"""
Smart Drum Glove - unified two-glove UI.

- Left column: RIGHT glove (RH) - connection + sensors + calibration
- Middle column: LEFT glove (LH) - connection + sensors + calibration
- Right column: shared drum pads + MIDI + settings + log
"""

import os
import sys
import time

from PySide6.QtCore import Qt, QTimer
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QLabel, QPushButton, QComboBox,
    QVBoxLayout, QHBoxLayout, QGridLayout, QGroupBox, QProgressBar,
    QSlider, QTextEdit, QMessageBox
)

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.glove_worker import GloveWorker
from backend.serial_reader import SerialReader
from backend.midi_engine import MidiEngine
from backend.drum_mapper import load_mapping, note_for

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# All drums across both gloves (deduplicated for display)
ALL_PADS = [
    ("kick",          "KICK",     36),
    ("snare",         "SNARE",    38),
    ("closed_hihat",  "HI-HAT",   42),
    ("open_hihat",    "OPEN HH",  46),
    ("low_tom",       "LOW TOM",  45),
    ("mid_tom",       "MID TOM",  47),
    ("high_tom",      "HIGH TOM", 50),
    ("crash",         "CRASH",    49),
    ("ride",          "RIDE",     51),
    ("ride_bell",     "RIDE BELL",53),
    ("china",         "CHINA",    52),
    ("splash",        "SPLASH",   55),
    ("cowbell",       "COWBELL",  56),
    ("clap",          "CLAP",     39),
]


# ---------------- small widgets ----------------
class SensorBar(QWidget):
    def __init__(self, name):
        super().__init__()
        self.bar = QProgressBar()
        self.bar.setRange(0, 4095)
        self.bar.setTextVisible(False)
        self.bar.setFixedHeight(14)
        self.val = QLabel("0")
        self.val.setFixedWidth(50)
        self.val.setAlignment(Qt.AlignRight | Qt.AlignVCenter)
        self.val.setStyleSheet("color:#9ef;font-weight:600;")
        lay = QHBoxLayout(self)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.addWidget(QLabel(name), 0)
        lay.addWidget(self.bar, 1)
        lay.addWidget(self.val, 0)

    def set_value(self, v):
        self.bar.setValue(int(v))
        self.val.setText(str(int(v)))


class BendBar(QWidget):
    def __init__(self, name):
        super().__init__()
        self.bar = QProgressBar()
        self.bar.setRange(0, 500)
        self.bar.setTextVisible(False)
        self.bar.setFixedHeight(12)
        self.bar.setStyleSheet(
            "QProgressBar { background:#1d1f26; border-radius:5px; }"
            "QProgressBar::chunk { background: qlineargradient("
            "x1:0,y1:0,x2:1,y2:0, stop:0 #7af0c4, stop:1 #35c3ff);"
            "border-radius:5px; }")
        self.val = QLabel("0")
        self.val.setFixedWidth(72)
        self.val.setStyleSheet("color:#7af0c4;font-family:Consolas;")
        self.val.setAlignment(Qt.AlignRight | Qt.AlignVCenter)
        lay = QHBoxLayout(self)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.addWidget(QLabel(name), 0)
        lay.addWidget(self.bar, 1)
        lay.addWidget(self.val, 0)

    def set_value(self, v, threshold):
        v_int = max(0, min(500, int(v)))
        self.bar.setValue(v_int)
        mark = "FIRE" if v > threshold else ""
        self.val.setText(f"{int(v):>4} {mark}")


class DrumPad(QPushButton):
    def __init__(self, key, label):
        super().__init__(label)
        self.key = key
        self.setMinimumHeight(52)
        self.setStyleSheet(self._style(False))
        self._t = QTimer(self)
        self._t.setSingleShot(True)
        self._t.timeout.connect(lambda: self.setStyleSheet(self._style(False)))

    def _style(self, active):
        base = ("QPushButton { border-radius:8px; font-size:13px;"
                " font-weight:700; color:#eee; background:%s;"
                " border:2px solid %s; }")
        if active:
            return base % ("#ff6b3d", "#ffd0b0")
        return base % ("#25272e", "#3a3d46")

    def flash(self):
        self.setStyleSheet(self._style(True))
        self._t.start(140)


# ---------------- glove panel ----------------
class GlovePanel(QGroupBox):
    """Connection + sensor monitor + calibration for one glove."""

    def __init__(self, title, side, mapping_path, settings):
        super().__init__(title)
        self.side = side
        self.settings = settings
        self.mapping_path = mapping_path

        v = QVBoxLayout(self)

        # --- mode + port ---
        row = QHBoxLayout()
        row.addWidget(QLabel("Mode:"))
        self.mode_combo = QComboBox()
        self.mode_combo.addItems(["USB Serial", "Wireless UDP"])
        row.addWidget(self.mode_combo, 1)
        v.addLayout(row)

        row = QHBoxLayout()
        self.port_label = QLabel("Port:")
        self.port_combo = QComboBox()
        self.refresh_btn = QPushButton("Refresh")
        row.addWidget(self.port_label)
        row.addWidget(self.port_combo, 1)
        row.addWidget(self.refresh_btn)
        v.addLayout(row)

        self.status_lbl = QLabel("Disconnected")
        self.status_lbl.setStyleSheet("color:#ff8080;font-weight:600;")
        v.addWidget(self.status_lbl)

        row = QHBoxLayout()
        self.connect_btn = QPushButton("Connect")
        self.disconnect_btn = QPushButton("Disconnect")
        self.disconnect_btn.setEnabled(False)
        row.addWidget(self.connect_btn)
        row.addWidget(self.disconnect_btn)
        v.addLayout(row)

        # --- raw sensors ---
        v.addWidget(QLabel("RAW FLEX"))
        self.flex_bars = [SensorBar(f"F{i+1}") for i in range(4)]
        for b in self.flex_bars:
            v.addWidget(b)

        self.acc_lbl = QLabel("ACC: 0.00 0.00 0.00")
        self.acc_lbl.setStyleSheet("color:#9ef;font-family:Consolas;font-size:11px;")
        v.addWidget(self.acc_lbl)

        self.gyro_lbl = QLabel("GYR: 0.0 0.0 0.0")
        self.gyro_lbl.setStyleSheet("color:#9ef;font-family:Consolas;font-size:11px;")
        v.addWidget(self.gyro_lbl)

        self.mv_lbl = QLabel("Movement: 0.0")
        self.mv_lbl.setStyleSheet("color:#f6c;font-weight:600;")
        v.addWidget(self.mv_lbl)

        # --- live bend ---
        v.addWidget(QLabel("LIVE BEND"))
        self.bend_bars = [BendBar(f"F{i+1}") for i in range(4)]
        for b in self.bend_bars:
            v.addWidget(b)

        # --- calibration ---
        self.calib_status = QLabel("Calibration: NOT READY")
        v.addWidget(self.calib_status)
        self.calib_bar = QProgressBar()
        self.calib_bar.setRange(0, 100)
        v.addWidget(self.calib_bar)
        row = QHBoxLayout()
        self.calib_btn = QPushButton("CALIBRATE")
        self.suggest_btn = QPushButton("Suggest")
        self.suggest_btn.setEnabled(False)
        row.addWidget(self.calib_btn)
        row.addWidget(self.suggest_btn)
        v.addLayout(row)

        v.addStretch(1)

    # helpers called by MainWindow
    def set_port_list(self, ports):
        cur = self.port_combo.currentText()
        self.port_combo.clear()
        self.port_combo.addItems(ports)
        if cur and cur in ports:
            self.port_combo.setCurrentText(cur)

    def current_port(self):
        return self.port_combo.currentText().strip()

    def mode(self):
        return self.mode_combo.currentText()

    def set_connected(self, ok):
        if ok:
            self.status_lbl.setText("Connected")
            self.status_lbl.setStyleSheet("color:#7af0c4;font-weight:600;")
            self.connect_btn.setEnabled(False)
            self.disconnect_btn.setEnabled(True)
        else:
            self.status_lbl.setText("Disconnected")
            self.status_lbl.setStyleSheet("color:#ff8080;font-weight:600;")
            self.connect_btn.setEnabled(True)
            self.disconnect_btn.setEnabled(False)

    def update_sensor(self, data):
        for i, k in enumerate(("f1", "f2", "f3", "f4")):
            self.flex_bars[i].set_value(data[k])
        self.acc_lbl.setText(
            f"ACC: {data['ax']:.2f} {data['ay']:.2f} {data['az']:.2f}")
        self.gyro_lbl.setText(
            f"GYR: {data['gx']:.1f} {data['gy']:.1f} {data['gz']:.1f}")
        self.mv_lbl.setText(f"Movement: {data['movement']:.1f}")
        for i, k in enumerate(("f1", "f2", "f3", "f4")):
            thr = self.settings.get(f"flex{i+1}_threshold", 20)
            self.bend_bars[i].set_value(data["bend"][k], thr)


# ---------------- main window ----------------
class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Smart Drum Glove - Dual")
        self.resize(1600, 900)
        self.setStyleSheet(
            "QMainWindow, QWidget { background:#15171c; color:#e6e8ee; }"
            "QGroupBox { border:1px solid #2b2e37; border-radius:8px;"
            " margin-top:10px; padding:10px; font-weight:600; }"
            "QGroupBox::title { subcontrol-origin: margin; left:10px;"
            " padding:0 6px; color:#9ef; }"
            "QPushButton { background:#25272e; border:1px solid #3a3d46;"
            " border-radius:6px; padding:6px 12px; }"
            "QPushButton:hover { background:#2f323b; }"
            "QComboBox { background:#1d1f26; border:1px solid #3a3d46;"
            " border-radius:6px; padding:4px; }"
            "QTextEdit { background:#0f1114; border:1px solid #2b2e37;"
            " border-radius:6px; font-family:Consolas, monospace; }"
            "QProgressBar { background:#1d1f26; border-radius:6px; }"
            "QProgressBar::chunk { background: qlineargradient("
            " x1:0,y1:0,x2:1,y2:0, stop:0 #35c3ff, stop:1 #7af0c4);"
            " border-radius:6px; }"
            "QSlider::groove:horizontal { height:6px; background:#25272e;"
            " border-radius:3px; }"
            "QSlider::handle:horizontal { background:#35c3ff; width:14px;"
            " margin:-5px 0; border-radius:7px; }")

        # shared settings
        self.settings = {
            "flex1_threshold": 20,
            "flex2_threshold": 20,
            "flex3_threshold": 20,
            "flex4_threshold": 20,
            "movement_threshold": 5.0,
            "gesture_cooldown": 0.20,
            "smoothing": 0.35,
            "velocity_sensitivity": 2.0,
            "min_velocity": 40,
            "max_velocity": 127,
        }

        self.midi = MidiEngine()

        # workers per glove
        self.rh_worker = GloveWorker(
            "rh",
            os.path.join(BASE_DIR, "config", "drum_mapping_rh.json"),
            self.settings)
        self.lh_worker = GloveWorker(
            "lh",
            os.path.join(BASE_DIR, "config", "drum_mapping_lh.json"),
            self.settings)

        for w in (self.rh_worker, self.lh_worker):
            w.data_received.connect(self.on_glove_data)
            w.event_fired.connect(self.on_glove_event)
            w.connection_changed.connect(self.on_glove_connection)
            w.calibration_progress.connect(self.on_calibration_progress)
            w.calibration_done.connect(self.on_calibration_done)
            w.log_message.connect(self.log_line)

        # layout
        central = QWidget()
        self.setCentralWidget(central)
        root = QHBoxLayout(central)
        root.setContentsMargins(12, 12, 12, 12)
        root.setSpacing(12)

        # --- left glove panel (RH) ---
        self.rh_panel = GlovePanel(
            "RIGHT GLOVE (hand A)", "rh",
            os.path.join(BASE_DIR, "config", "drum_mapping_rh.json"),
            self.settings)
        root.addWidget(self.rh_panel, 3)

        # --- right glove panel (LH) ---
        self.lh_panel = GlovePanel(
            "LEFT GLOVE (hand B)", "lh",
            os.path.join(BASE_DIR, "config", "drum_mapping_lh.json"),
            self.settings)
        root.addWidget(self.lh_panel, 3)

        # --- shared right column ---
        col = QVBoxLayout()

        # CURRENT HIT
        gb = QGroupBox("CURRENT HIT")
        v = QVBoxLayout(gb)
        self.hit_lbl = QLabel("-")
        self.hit_lbl.setAlignment(Qt.AlignCenter)
        self.hit_lbl.setStyleSheet(
            "font-size:34px;font-weight:800;color:#ffb46b;")
        v.addWidget(self.hit_lbl)
        self.hit_sub = QLabel("note -   vel -   from -")
        self.hit_sub.setAlignment(Qt.AlignCenter)
        self.hit_sub.setStyleSheet("color:#9ef;font-family:Consolas;")
        v.addWidget(self.hit_sub)
        col.addWidget(gb)

        # Drum pads grid
        gb = QGroupBox("Drum Pads (shared)")
        grid = QGridLayout(gb)
        self.pads = {}
        for i, (key, label, _note) in enumerate(ALL_PADS):
            pad = DrumPad(key, label)
            pad.clicked.connect(lambda _=False, k=key, n=_note:
                                self.test_note(n, k))
            self.pads[key] = pad
            grid.addWidget(pad, i // 3, i % 3)
        col.addWidget(gb)

        # MIDI
        gb = QGroupBox("MIDI OUTPUT")
        v = QVBoxLayout(gb)
        row = QHBoxLayout()
        row.addWidget(QLabel("Port:"))
        self.midi_combo = QComboBox()
        row.addWidget(self.midi_combo, 1)
        self.midi_refresh = QPushButton("Refresh")
        self.midi_refresh.clicked.connect(self.refresh_midi)
        row.addWidget(self.midi_refresh)
        v.addLayout(row)
        self.midi_open_btn = QPushButton("Open MIDI")
        self.midi_open_btn.clicked.connect(self.on_midi_connect)
        v.addWidget(self.midi_open_btn)
        self.midi_lbl = QLabel("Status: Disconnected")
        v.addWidget(self.midi_lbl)
        col.addWidget(gb)

        # Settings
        gb = QGroupBox("Settings")
        v = QVBoxLayout(gb)

        def add_slider(label, key, lo, hi, is_float=False):
            row = QHBoxLayout()
            lbl = QLabel(label)
            lbl.setFixedWidth(170)
            row.addWidget(lbl)
            sld = QSlider(Qt.Horizontal)
            sld.setRange(int(lo), int(hi))
            sld.setValue(int(self.settings[key]))
            val_lbl = QLabel(str(self.settings[key]))
            val_lbl.setFixedWidth(50)
            val_lbl.setStyleSheet("color:#7af0c4;")

            def _upd(v):
                self.settings[key] = float(v) if is_float else int(v)
                val_lbl.setText(str(self.settings[key]))
                self.rh_worker.update_settings(self.settings)
                self.lh_worker.update_settings(self.settings)

            sld.valueChanged.connect(_upd)
            row.addWidget(sld, 1)
            row.addWidget(val_lbl)
            v.addLayout(row)
            return sld

        add_slider("Flex 1 Threshold", "flex1_threshold", 1, 500)
        add_slider("Flex 2 Threshold", "flex2_threshold", 1, 500)
        add_slider("Flex 3 Threshold", "flex3_threshold", 1, 500)
        add_slider("Flex 4 Threshold", "flex4_threshold", 1, 500)
        add_slider("Movement Threshold", "movement_threshold", 1, 100)
        add_slider("Cooldown (0.01s)", "gesture_cooldown", 5, 100)
        add_slider("Smoothing (0.01)", "smoothing", 0, 90)
        add_slider("Velocity Sensitivity", "velocity_sensitivity", 5, 100)
        col.addWidget(gb)

        # Log
        gb = QGroupBox("Activity Log")
        v = QVBoxLayout(gb)
        self.log = QTextEdit()
        self.log.setReadOnly(True)
        v.addWidget(self.log)
        clr = QPushButton("Clear Log")
        clr.clicked.connect(lambda: self.log.clear())
        v.addWidget(clr)
        col.addWidget(gb, 1)

        rcol = QWidget()
        rcol.setLayout(col)
        root.addWidget(rcol, 4)

        # ---------- wiring ----------
        self.rh_panel.refresh_btn.clicked.connect(
            lambda: self.refresh_ports(self.rh_panel))
        self.lh_panel.refresh_btn.clicked.connect(
            lambda: self.refresh_ports(self.lh_panel))
        self.rh_panel.connect_btn.clicked.connect(
            lambda: self.on_glove_connect(self.rh_panel, self.rh_worker))
        self.lh_panel.connect_btn.clicked.connect(
            lambda: self.on_glove_connect(self.lh_panel, self.lh_worker))
        self.rh_panel.disconnect_btn.clicked.connect(
            lambda: self.on_glove_disconnect(self.rh_panel, self.rh_worker))
        self.lh_panel.disconnect_btn.clicked.connect(
            lambda: self.on_glove_disconnect(self.lh_panel, self.lh_worker))
        self.rh_panel.calib_btn.clicked.connect(
            lambda: self.on_glove_calibrate(self.rh_panel, self.rh_worker))
        self.lh_panel.calib_btn.clicked.connect(
            lambda: self.on_glove_calibrate(self.lh_panel, self.lh_worker))
        self.rh_panel.suggest_btn.clicked.connect(
            lambda: self.on_glove_suggest(self.rh_worker))
        self.lh_panel.suggest_btn.clicked.connect(
            lambda: self.on_glove_suggest(self.lh_worker))

        # initial port refresh
        self.refresh_ports(self.rh_panel)
        self.refresh_ports(self.lh_panel)
        self.refresh_midi()

        # periodic port refresh
        self._t = QTimer(self)
        self._t.timeout.connect(self._periodic_refresh)
        self._t.start(3000)

    # ---------------- port refresh ----------------
    def _periodic_refresh(self):
        self.refresh_ports(self.rh_panel)
        self.refresh_ports(self.lh_panel)

    def refresh_ports(self, panel):
        if panel.mode() == "Wireless UDP":
            panel.set_port_list(["UDP (wireless)"])
            panel.port_label.setText("UDP listener:")
        else:
            panel.set_port_list(SerialReader.list_ports())
            panel.port_label.setText("Port:")

    def refresh_midi(self):
        ports = MidiEngine.list_outputs()
        cur = self.midi_combo.currentText()
        self.midi_combo.clear()
        self.midi_combo.addItems(ports)
        if cur and cur in ports:
            self.midi_combo.setCurrentText(cur)
        if not ports:
            self.midi_combo.addItem("(no MIDI outputs)")

    # ---------------- glove connect ----------------
    def on_glove_connect(self, panel, worker):
        if panel.mode() == "Wireless UDP":
            udp_port = 5005 if worker.side == "rh" else 5006
            worker.connect_udp(udp_port)
            self.log_line(f"[{worker.side}] Listening on UDP {udp_port}...")
        else:
            port = panel.current_port()
            if not port or port.startswith("UDP"):
                QMessageBox.warning(self, "No port",
                                    "Select a serial port for this glove.")
                return
            worker.connect_serial(port)
            self.log_line(f"[{worker.side}] Connected to {port}")

    def on_glove_disconnect(self, panel, worker):
        worker.disconnect()
        self.log_line(f"[{worker.side}] Disconnected")

    def on_glove_calibrate(self, panel, worker):
        if not worker.is_running():
            QMessageBox.information(self, "Not connected",
                                    "Connect this glove first.")
            return
        worker.start_calibration(samples=40)
        panel.calib_status.setText("Calibrating... 0%")
        panel.calib_bar.setValue(0)

    def on_glove_suggest(self, worker):
        sug = worker.suggested_thresholds()
        # update shared settings
        self.settings["flex1_threshold"] = sug["f1"]
        self.settings["flex2_threshold"] = sug["f2"]
        self.settings["flex3_threshold"] = sug["f3"]
        self.settings["flex4_threshold"] = sug["f4"]
        self.rh_worker.update_settings(self.settings)
        self.lh_worker.update_settings(self.settings)
        self.log_line(
            f"[{worker.side}] Thresholds: F1={sug['f1']} F2={sug['f2']} "
            f"F3={sug['f3']} F4={sug['f4']}")

    # ---------------- MIDI ----------------
    def on_midi_connect(self):
        name = self.midi_combo.currentText().strip()
        if not name or name.startswith("("):
            QMessageBox.warning(self, "No MIDI port",
                                "No MIDI output selected.")
            return
        if self.midi.open(name):
            self.midi_lbl.setText(f"Status: Connected -> {name}")
            self.midi_lbl.setStyleSheet("color:#7af0c4;")
            self.log_line(f"MIDI opened: {name}")
        else:
            self.midi_lbl.setText("Status: Failed")
            self.midi_lbl.setStyleSheet("color:#ff8080;")
            self.log_line(f"MIDI open FAILED: {name}")

    # ---------------- data / event handlers ----------------
    def on_glove_data(self, side, data):
        panel = self.rh_panel if side == "rh" else self.lh_panel
        panel.update_sensor(data)

    def on_glove_connection(self, side, ok):
        panel = self.rh_panel if side == "rh" else self.lh_panel
        panel.set_connected(ok)
        self.log_line(f"[{side}] {'connected' if ok else 'disconnected'}")

    def on_calibration_progress(self, side, pct):
        panel = self.rh_panel if side == "rh" else self.lh_panel
        panel.calib_bar.setValue(pct)
        panel.calib_status.setText(f"Calibrating... {pct}%")

    def on_calibration_done(self, side):
        panel = self.rh_panel if side == "rh" else self.lh_panel
        panel.calib_status.setText("Calibration Complete")
        panel.suggest_btn.setEnabled(True)
        self.log_line(f"[{side}] calibration complete")

    def on_glove_event(self, side, ev):
        name = ev["name"]
        note = ev["note"]
        vel = ev["velocity"]
        self.midi.send_note(note, vel)
        QTimer.singleShot(60, lambda n=note: self.midi.send_note_off(n))

        # UI feedback
        self.hit_lbl.setText(name.upper())
        self.hit_sub.setText(
            f"note {note}   vel {vel}   from {side.upper()}")
        if name in self.pads:
            self.pads[name].flash()
        self.log_line(f"[{side}] {name:<10} MIDI {note:<3} Velocity {vel}")

    def test_note(self, note, name):
        ok = self.midi.send_note(note, 100)
        if ok:
            QTimer.singleShot(60,
                              lambda n=note: self.midi.send_note_off(n))
            self.hit_lbl.setText(name.upper())
            self.hit_sub.setText(f"note {note}   vel 100   TEST")
            if name in self.pads:
                self.pads[name].flash()
            self.log_line(f"TEST {name:<10} MIDI {note:<3} Velocity 100")
        else:
            self.log_line("TEST failed - open a MIDI port first.")

    def log_line(self, text):
        ts = time.strftime("%H:%M:%S")
        self.log.append(f"{ts}  {text}")

    def closeEvent(self, event):
        try:
            self.rh_worker.disconnect()
            self.lh_worker.disconnect()
        except Exception:
            pass
        self.midi.close()
        event.accept()


def main():
    app = QApplication(sys.argv)
    w = MainWindow()
    w.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
