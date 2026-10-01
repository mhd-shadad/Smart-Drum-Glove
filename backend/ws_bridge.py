"""
WebSocket bridge: exposes GloveWorker signals to the Electron frontend.

Runs a websockets.serve() in a background thread. Signals from Qt threads
are queued and drained on the asyncio loop.

Protocol (backend -> frontend):
  { "type": "sensors", "side": "lh"|"rh", "ts": ..., "f1".."f4",
    "ax".."az", "gx".."gz", "bend": {..}, "movement": .., "baseline_ready": bool }
  { "type": "event",   "side": ..., "name": ..., "note": ..., "velocity": ..., "ts": ... }
  { "type": "status",  "lh_connected": bool, "rh_connected": bool,
                       "midi_port": str|None, "calibrated": {"lh": bool, "rh": bool} }

Protocol (frontend -> backend):
  { "cmd": "test_note",   "note": 36, "velocity": 100 }
  { "cmd": "open_midi",   "port": "Midi Through:Port-0" }
  { "cmd": "set_setting", "key": "...", "value": ... }
  { "cmd": "calibrate",   "side": "lh"|"rh" }
  { "cmd": "connect",     "side": "lh"|"rh", "mode": "udp"|"serial",
                          "port": 5006 | "/dev/ttyUSB0" }
  { "cmd": "disconnect",  "side": "lh"|"rh" }
"""

import asyncio
import json
import threading
import time
from queue import Queue, Empty

try:
    import websockets
except ImportError:
    websockets = None


class WsBridge:
    def __init__(self, host="0.0.0.0", port=8765):
        self.host = host
        self.port = port
        self.clients = set()
        self.outbound_queue = Queue()   # thread-safe: Qt threads -> asyncio loop
        self.loop = None
        self.thread = None
        self._stop = threading.Event()
        self.on_command = None          # callback: (cmd_dict) -> None, runs on Qt thread

    # --- public API used by run_bridge.py / MainWindow ---
    def set_command_handler(self, fn):
        """fn is called (on the Qt main thread) whenever the frontend sends a command."""
        self.on_command = fn

    def send_sensors(self, side, data):
        self._enqueue({
            "type": "sensors",
            "side": side,
            "ts": time.time(),
            "f1": data.get("f1"), "f2": data.get("f2"),
            "f3": data.get("f3"), "f4": data.get("f4"),
            "ax": data.get("ax"), "ay": data.get("ay"), "az": data.get("az"),
            "gx": data.get("gx"), "gy": data.get("gy"), "gz": data.get("gz"),
            "bend": data.get("bend", {"f1": 0, "f2": 0, "f3": 0, "f4": 0}),
            "movement": data.get("movement", 0.0),
            "baseline_ready": data.get("baseline_ready", False),
        })

    def send_event(self, side, ev):
        self._enqueue({
            "type": "event",
            "side": side,
            "name": ev.get("name"),
            "note": ev.get("note"),
            "velocity": ev.get("velocity"),
            "ts": time.time(),
        })

    def send_status(self, status_dict):
        payload = {"type": "status"}
        payload.update(status_dict)
        self._enqueue(payload)

    # --- lifecycle ---
    def start(self):
        if websockets is None:
            raise RuntimeError("websockets not installed. Run: pip install websockets")
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()

    def stop(self):
        self._stop.set()

    # --- internals ---
    def _enqueue(self, payload):
        if self.loop is None:
            return  # bridge not started yet
        self.outbound_queue.put(payload)

    def _run_loop(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        try:
            self.loop.run_until_complete(self._serve())
        finally:
            try:
                self.loop.close()
            except Exception:
                pass

    async def _serve(self):
        async with websockets.serve(self._handler, self.host, self.port):
            print(f"[WsBridge] listening on ws://{self.host}:{self.port}")
            drain = asyncio.create_task(self._drain_outbound())
            try:
                while not self._stop.is_set():
                    await asyncio.sleep(0.25)
            finally:
                drain.cancel()
                try:
                    await drain
                except asyncio.CancelledError:
                    pass

    async def _drain_outbound(self):
        """Pull messages from the thread-safe queue and fan out to clients."""
        while not self._stop.is_set():
            try:
                payload = self.outbound_queue.get_nowait()
            except Empty:
                await asyncio.sleep(0.005)
                continue
            if not self.clients:
                continue
            msg = json.dumps(payload)
            # copy the set — clients can be removed during iteration
            for ws in list(self.clients):
                try:
                    await ws.send(msg)
                except Exception:
                    self.clients.discard(ws)

    async def _handler(self, ws):
        self.clients.add(ws)
        peer = getattr(ws, "remote_address", ("?", 0))
        print(f"[WsBridge] client connected: {peer}")
        # immediately send status
        try:
            await ws.send(json.dumps({"type": "status", "hello": True}))
        except Exception:
            pass
        try:
            async for raw in ws:
                try:
                    cmd = json.loads(raw)
                except Exception:
                    continue
                if self.on_command:
                    self.on_command(cmd)
        except Exception:
            pass
        finally:
            self.clients.discard(ws)
            print(f"[WsBridge] client disconnected: {peer}")
