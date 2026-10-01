"""
Smart Drum Glove - WebSocket & Web Dashboard Backend Server
FastAPI + uvicorn + websockets bridging GloveWorker Qt signals to the browser.
Runs on ws://localhost:8765/ws
"""

import asyncio
import json
import os
import signal
import sys
import threading
import time
from contextlib import asynccontextmanager
from typing import Set

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from PySide6.QtCore import QCoreApplication, QObject, Signal, QTimer

from backend.glove_worker import GloveWorker
from backend.serial_reader import SerialReader
from backend.midi_engine import MidiEngine
from backend.drum_mapper import load_mapping, note_for

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ----------------- GLOBALS & QT APPLICATION -----------------
qapp = QCoreApplication.instance() or QCoreApplication(sys.argv)


class CommandBridge(QObject):
    """Bridges incoming WebSocket commands into the Qt main thread safely."""
    command_signal = Signal(dict)


command_bridge = CommandBridge()

settings = {
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

midi = MidiEngine()

rh_worker = GloveWorker(
    "rh",
    os.path.join(BASE_DIR, "config", "drum_mapping_rh.json"),
    settings
)
lh_worker = GloveWorker(
    "lh",
    os.path.join(BASE_DIR, "config", "drum_mapping_lh.json"),
    settings
)

# Asyncio broadcast state
loop: asyncio.AbstractEventLoop = None
broadcast_queue: asyncio.Queue = None
connected_clients: Set[WebSocket] = set()


def queue_broadcast(msg: dict):
    """Thread-safe enqueue from Qt/Serial threads to asyncio WebSocket loop."""
    if loop is not None and loop.is_running() and broadcast_queue is not None:
        loop.call_soon_threadsafe(broadcast_queue.put_nowait, msg)


# ----------------- QT SIGNAL HANDLERS -----------------
def on_data_received(side: str, data: dict):
    payload = {
        "side": side,
        "f1": int(data.get("f1", 0)),
        "f2": int(data.get("f2", 0)),
        "f3": int(data.get("f3", 0)),
        "f4": int(data.get("f4", 0)),
        "ax": round(float(data.get("ax", 0.0)), 3),
        "ay": round(float(data.get("ay", 0.0)), 3),
        "az": round(float(data.get("az", 0.0)), 3),
        "gx": round(float(data.get("gx", 0.0)), 2),
        "gy": round(float(data.get("gy", 0.0)), 2),
        "gz": round(float(data.get("gz", 0.0)), 2),
        "movement": round(float(data.get("movement", 0.0)), 2),
        "bend": {
            "f1": int(data.get("bend", {}).get("f1", 0)),
            "f2": int(data.get("bend", {}).get("f2", 0)),
            "f3": int(data.get("bend", {}).get("f3", 0)),
            "f4": int(data.get("bend", {}).get("f4", 0)),
        }
    }
    queue_broadcast({"type": "sensor_data", "payload": payload})


def on_event_fired(side: str, ev: dict):
    name = ev.get("name", "drum")
    note = int(ev.get("note", 0))
    vel = int(ev.get("velocity", 100))

    # Send MIDI
    midi.send_note(note, vel)
    QTimer.singleShot(60, lambda n=note: midi.send_note_off(n))

    queue_broadcast({
        "type": "drum_hit",
        "payload": {
            "side": side,
            "name": name,
            "note": note,
            "velocity": vel
        }
    })
    queue_broadcast({
        "type": "log",
        "payload": {"text": f"[{side.upper()}] Hit: {name.upper()} | Note: {note} | Vel: {vel}"}
    })


def on_connection_changed(side: str, connected: bool):
    queue_broadcast({
        "type": "connection_changed",
        "payload": {
            "side": side,
            "connected": connected
        }
    })
    queue_broadcast({
        "type": "log",
        "payload": {"text": f"[{side.upper()}] Status changed: {'CONNECTED' if connected else 'DISCONNECTED'}"}
    })


def on_calibration_progress(side: str, pct: int):
    queue_broadcast({
        "type": "calibration_progress",
        "payload": {
            "side": side,
            "pct": int(pct)
        }
    })


def on_calibration_done(side: str):
    queue_broadcast({
        "type": "calibration_done",
        "payload": {
            "side": side
        }
    })
    queue_broadcast({
        "type": "log",
        "payload": {"text": f"[{side.upper()}] Calibration complete! Ready to suggest thresholds."}
    })


def on_log_message(text: str):
    queue_broadcast({
        "type": "log",
        "payload": {"text": text}
    })


# Connect signals for both workers
for w in (rh_worker, lh_worker):
    w.data_received.connect(on_data_received)
    w.event_fired.connect(on_event_fired)
    w.connection_changed.connect(on_connection_changed)
    w.calibration_progress.connect(on_calibration_progress)
    w.calibration_done.connect(on_calibration_done)
    w.log_message.connect(on_log_message)


# ----------------- COMMAND PROCESSOR (ON QT MAIN THREAD) -----------------
def _process_command_on_qt_thread(cmd: dict):
    msg_type = cmd.get("type", "")
    payload = cmd.get("payload", {})

    if msg_type == "update_setting":
        key = payload.get("key")
        value = payload.get("value")
        if key in settings and value is not None:
            if key in ("movement_threshold", "gesture_cooldown", "smoothing", "velocity_sensitivity"):
                settings[key] = float(value)
            else:
                settings[key] = int(value)
            rh_worker.update_settings(settings)
            lh_worker.update_settings(settings)
            queue_broadcast({"type": "settings_update", "payload": settings})
            queue_broadcast({"type": "log", "payload": {"text": f"Setting updated: {key} = {settings[key]}"}})

    elif msg_type == "trigger_test_note":
        note = int(payload.get("note", 36))
        vel = int(payload.get("velocity", 100))
        midi.send_note(note, vel)
        QTimer.singleShot(60, lambda n=note: midi.send_note_off(n))
        queue_broadcast({
            "type": "drum_hit",
            "payload": {
                "side": "rh",
                "name": "test",
                "note": note,
                "velocity": vel
            }
        })
        queue_broadcast({"type": "log", "payload": {"text": f"TEST note triggered: {note} (vel {vel})"}})

    elif msg_type == "connect_glove":
        side = payload.get("side", "rh")
        mode = payload.get("mode", "USB Serial")
        port = payload.get("port")
        worker = rh_worker if side == "rh" else lh_worker
        if mode == "Wireless UDP" or "udp" in str(mode).lower():
            udp_port = int(port) if port else (5005 if side == "rh" else 5006)
            worker.connect_udp(udp_port)
            queue_broadcast({"type": "log", "payload": {"text": f"[{side.upper()}] Listening on UDP {udp_port}..."}})
        else:
            if port:
                worker.connect_serial(str(port))
                queue_broadcast({"type": "log", "payload": {"text": f"[{side.upper()}] Connecting serial {port}..."}})
            else:
                queue_broadcast({"type": "log", "payload": {"text": f"[{side.upper()}] Cannot connect: no serial port specified"}})

    elif msg_type == "disconnect_glove":
        side = payload.get("side", "rh")
        worker = rh_worker if side == "rh" else lh_worker
        worker.disconnect()
        queue_broadcast({"type": "log", "payload": {"text": f"[{side.upper()}] Disconnected"}})

    elif msg_type == "calibrate":
        side = payload.get("side", "rh")
        worker = rh_worker if side == "rh" else lh_worker
        if worker.is_running():
            worker.start_calibration(samples=40)
            queue_broadcast({"type": "log", "payload": {"text": f"[{side.upper()}] Calibration started (40 samples)..."}})
        else:
            queue_broadcast({"type": "log", "payload": {"text": f"[{side.upper()}] Connect glove before calibrating!"}})

    elif msg_type == "suggest_thresholds":
        side = payload.get("side", "rh")
        worker = rh_worker if side == "rh" else lh_worker
        sug = worker.suggested_thresholds()
        settings["flex1_threshold"] = sug.get("f1", settings["flex1_threshold"])
        settings["flex2_threshold"] = sug.get("f2", settings["flex2_threshold"])
        settings["flex3_threshold"] = sug.get("f3", settings["flex3_threshold"])
        settings["flex4_threshold"] = sug.get("f4", settings["flex4_threshold"])
        rh_worker.update_settings(settings)
        lh_worker.update_settings(settings)
        queue_broadcast({"type": "settings_update", "payload": settings})
        queue_broadcast({
            "type": "log",
            "payload": {
                "text": f"[{side.upper()}] Suggested thresholds applied: F1={sug.get('f1')} F2={sug.get('f2')} F3={sug.get('f3')} F4={sug.get('f4')}"
            }
        })

    elif msg_type == "open_midi":
        name = payload.get("name", "")
        if name:
            ok = midi.open(name)
            queue_broadcast({
                "type": "midi_status",
                "payload": {"connected": ok, "name": name}
            })
            queue_broadcast({
                "type": "log",
                "payload": {"text": f"MIDI {'opened' if ok else 'FAILED to open'}: {name}"}
            })

    elif msg_type in ("list_ports", "list_midi_ports"):
        serial_ports = SerialReader.list_ports()
        midi_ports = MidiEngine.list_outputs()
        queue_broadcast({
            "type": "ports",
            "payload": {
                "serial": serial_ports,
                "midi": midi_ports
            }
        })


command_bridge.command_signal.connect(_process_command_on_qt_thread)


def handle_client_message(cmd: dict):
    # Emits via Qt Signal across threads directly to Qt event loop
    command_bridge.command_signal.emit(cmd)


# ----------------- ASYNCIO WORKERS & FASTAPI -----------------
async def broadcast_worker():
    """Drains messages from broadcast_queue and sends to all connected WebSockets."""
    while True:
        try:
            msg = await broadcast_queue.get()
            if not connected_clients:
                broadcast_queue.task_done()
                continue

            text = json.dumps(msg)
            for ws in list(connected_clients):
                try:
                    await ws.send_text(text)
                except Exception:
                    connected_clients.discard(ws)
            broadcast_queue.task_done()
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[broadcast_worker error] {e}")


async def periodic_ports_worker():
    """Periodically queries available ports to update connected browsers."""
    last_serial = None
    last_midi = None
    while True:
        try:
            await asyncio.sleep(3.0)
            cur_serial = SerialReader.list_ports()
            cur_midi = MidiEngine.list_outputs()
            if cur_serial != last_serial or cur_midi != last_midi:
                last_serial = cur_serial
                last_midi = cur_midi
                if connected_clients and broadcast_queue is not None:
                    await broadcast_queue.put({
                        "type": "ports",
                        "payload": {"serial": cur_serial, "midi": cur_midi}
                    })
        except asyncio.CancelledError:
            break
        except Exception:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    global loop, broadcast_queue
    loop = asyncio.get_running_loop()
    broadcast_queue = asyncio.Queue()

    drain_task = asyncio.create_task(broadcast_worker())
    ports_task = asyncio.create_task(periodic_ports_worker())
    print("[Server] FastAPI WebSocket bridge initialized on port 8765")
    yield
    drain_task.cancel()
    ports_task.cancel()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "rh_connected": rh_worker.is_running(),
        "lh_connected": lh_worker.is_running(),
        "midi_connected": midi.port is not None,
        "midi_port": midi.port_name
    }


@app.websocket("/ws")
@app.websocket("/")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    try:
        # Send initial state snapshot on connect
        snapshot = [
            {
                "type": "ports",
                "payload": {
                    "serial": SerialReader.list_ports(),
                    "midi": MidiEngine.list_outputs()
                }
            },
            {
                "type": "connection_changed",
                "payload": {"side": "rh", "connected": rh_worker.is_running()}
            },
            {
                "type": "connection_changed",
                "payload": {"side": "lh", "connected": lh_worker.is_running()}
            },
            {
                "type": "settings_update",
                "payload": settings
            },
            {
                "type": "midi_status",
                "payload": {
                    "connected": midi.port is not None,
                    "name": midi.port_name or ""
                }
            },
            {
                "type": "log",
                "payload": {"text": "Connected to Smart Drum Glove backend (ws://localhost:8765/ws)"}
            }
        ]
        for m in snapshot:
            await websocket.send_text(json.dumps(m))

        while True:
            raw = await websocket.receive_text()
            try:
                cmd = json.loads(raw)
                handle_client_message(cmd)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        pass
    finally:
        connected_clients.discard(websocket)


# Serve built frontend if available in frontend/dist
frontend_dist = os.path.join(BASE_DIR, "frontend", "dist")
frontend_public = os.path.join(BASE_DIR, "frontend", "public")

assets_dir = os.path.join(frontend_dist, "assets")
if os.path.isdir(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

models_dir = os.path.join(frontend_dist, "models")
if not os.path.isdir(models_dir):
    models_dir = os.path.join(frontend_public, "models")
if os.path.isdir(models_dir):
    app.mount("/models", StaticFiles(directory=models_dir), name="models")


@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    if os.path.isdir(frontend_dist):
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
    return {"status": "backend_running", "hint": "Build frontend with 'npm run build' inside frontend/ to serve SPA"}



# ----------------- MAIN EXECUTION -----------------
def main():
    def run_uvicorn():
        config = uvicorn.Config(
            app,
            host="0.0.0.0",
            port=8765,
            log_level="info",
            loop="asyncio"
        )
        server = uvicorn.Server(config)
        server.run()

    server_thread = threading.Thread(target=run_uvicorn, daemon=True)
    server_thread.start()

    # Allow Python signal handling inside Qt event loop
    signal.signal(signal.SIGINT, lambda *_: qapp.quit())
    sig_timer = QTimer()
    sig_timer.timeout.connect(lambda: None)
    sig_timer.start(500)

    print("==================================================")
    print(" Smart Drum Glove Server")
    print(" WebSocket: ws://localhost:8765/ws")
    print(" HTTP API:  http://localhost:8765")
    print("==================================================")

    try:
        sys.exit(qapp.exec())
    finally:
        try:
            rh_worker.disconnect()
            lh_worker.disconnect()
            midi.close()
        except Exception:
            pass


if __name__ == "__main__":
    main()
