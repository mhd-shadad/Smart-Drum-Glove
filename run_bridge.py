"""
Headless entry point that runs the Qt app (optionally hidden) + WS + HTTP bridge.

Usage:
  python run_bridge.py            # headless (no Qt window)
  python run_bridge.py --qt       # also show the Qt window
  python run_bridge.py --no-ws    # skip WebSocket bridge
  python run_bridge.py --no-http  # skip HTTP API
"""

import argparse
import os
import signal
import sys

# Bring the app's MainWindow into scope without running its event loop twice.
from PySide6.QtCore import QTimer
from PySide6.QtWidgets import QApplication

from backend.ws_bridge import WsBridge
from backend.http_api import start_http_api
from ui.app import MainWindow     # <-- adjust if your Qt file lives elsewhere


def build_argparser():
    p = argparse.ArgumentParser()
    p.add_argument("--qt", action="store_true", help="show Qt window")
    p.add_argument("--no-ws", action="store_true", help="disable WebSocket bridge")
    p.add_argument("--no-http", action="store_true", help="disable HTTP API")
    p.add_argument("--ws-port", type=int, default=8765)
    p.add_argument("--http-port", type=int, default=8766)
    return p


def main():
    args = build_argparser().parse_args()

    app = QApplication(sys.argv)
    win = MainWindow()
    if args.qt:
        win.show()
    else:
        win.hide()

    # ---------------- WebSocket bridge ----------------
    if not args.no_ws:
        bridge = WsBridge(port=args.ws_port)

        # forward GloveWorker signals into the bridge
        win.rh_worker.data_received.connect(lambda side, data: bridge.send_sensors(side, data))
        win.lh_worker.data_received.connect(lambda side, data: bridge.send_sensors(side, data))
        win.rh_worker.event_fired.connect(lambda side, ev: bridge.send_event(side, ev))
        win.lh_worker.event_fired.connect(lambda side, ev: bridge.send_event(side, ev))

        def _push_status(*_):
            bridge.send_status({
                "lh_connected": win.lh_worker.is_running(),
                "rh_connected": win.rh_worker.is_running(),
                "midi_port": win.midi.port_name,
                "calibrated": {
                    "lh": win.lh_worker.calib.complete,
                    "rh": win.rh_worker.calib.complete,
                },
            })

        # push status whenever anything changes
        win.rh_worker.connection_changed.connect(lambda *_: _push_status())
        win.lh_worker.connection_changed.connect(lambda *_: _push_status())
        win.rh_worker.calibration_done.connect(lambda *_: _push_status())
        win.lh_worker.calibration_done.connect(lambda *_: _push_status())

        # handle commands coming in from the frontend
        def _on_command(cmd):
            # this runs on the WS asyncio thread — dispatch into Qt main thread
            QTimer.singleShot(0, lambda: _handle_command(cmd))
            _push_status()

        def _handle_command(cmd):
            kind = cmd.get("cmd")
            if kind == "test_note":
                note = int(cmd.get("note", 0))
                vel = int(cmd.get("velocity", 100))
                win.midi.send_note(note, vel)
                QTimer.singleShot(60, lambda n=note: win.midi.send_note_off(n))
            elif kind == "open_midi":
                win.midi.open(cmd.get("port"))
            elif kind == "set_setting":
                key = cmd.get("key"); val = cmd.get("value")
                if key is not None:
                    win.settings[key] = val
                    win.rh_worker.update_settings(win.settings)
                    win.lh_worker.update_settings(win.settings)
            elif kind == "calibrate":
                side = cmd.get("side")
                w = win.lh_worker if side == "lh" else win.rh_worker
                if w.is_running():
                    w.start_calibration(samples=40)
            elif kind == "connect":
                side = cmd.get("side")
                mode = cmd.get("mode")
                port = cmd.get("port")
                w = win.lh_worker if side == "lh" else win.rh_worker
                if mode == "udp":
                    w.connect_udp(int(port))
                elif mode == "serial":
                    w.connect_serial(port)
            elif kind == "disconnect":
                side = cmd.get("side")
                w = win.lh_worker if side == "lh" else win.rh_worker
                w.disconnect()

        bridge.set_command_handler(_on_command)
        bridge.start()

    # ---------------- HTTP API ----------------
    if not args.no_http:
        def _test_note(note, vel):
            win.midi.send_note(note, vel)
            QTimer.singleShot(60, lambda n=note: win.midi.send_note_off(n))
            return True

        def _open_midi(port):
            return bool(win.midi.open(port))

        def _set_setting(key, value):
            if key is None:
                return False
            win.settings[key] = value
            win.rh_worker.update_settings(win.settings)
            win.lh_worker.update_settings(win.settings)
            return True

        def _list_midi():
            from backend.midi_engine import MidiEngine
            return MidiEngine.list_outputs()

        def _status():
            return {
                "lh_connected": win.lh_worker.is_running(),
                "rh_connected": win.rh_worker.is_running(),
                "midi_port": win.midi.port_name,
                "calibrated": {
                    "lh": win.lh_worker.calib.complete,
                    "rh": win.rh_worker.calib.complete,
                },
            }

        start_http_api(
            port=args.http_port,
            test_note_fn=_test_note,
            open_midi_fn=_open_midi,
            set_setting_fn=_set_setting,
            midi_list_fn=_list_midi,
            status_fn=_status,
        )

    # clean shutdown on Ctrl+C
    signal.signal(signal.SIGINT, lambda *_: app.quit())
    QTimer.singleShot(200, lambda: None)   # let event loop start

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
