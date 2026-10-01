"""
Tiny HTTP API for the frontend (drum pad clicks, status queries).

Runs on :8766. Uses only stdlib http.server so no extra dependency.
"""

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class _Handler(BaseHTTPRequestHandler):
    # silence default request logging
    def log_message(self, fmt, *args):
        pass

    def _send_json(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send_json(204, {})

    def do_GET(self):
        if self.path.startswith("/api/midi-ports"):
            ports = self.server.midi_list_fn() if self.server.midi_list_fn else []
            self._send_json(200, {"ports": ports})
            return
        if self.path.startswith("/api/status"):
            status = self.server.status_fn() if self.server.status_fn else {}
            self._send_json(200, status)
            return
        self._send_json(404, {"error": "not found"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(raw.decode("utf-8") or "{}")
        except Exception:
            self._send_json(400, {"error": "bad json"})
            return

        if self.path.startswith("/api/test-note"):
            note = int(data.get("note", 0))
            vel = int(data.get("velocity", 100))
            if self.server.test_note_fn:
                ok = self.server.test_note_fn(note, vel)
                self._send_json(200, {"ok": bool(ok), "note": note, "velocity": vel})
            else:
                self._send_json(500, {"error": "no midi handler"})
            return

        if self.path.startswith("/api/open-midi"):
            port = data.get("port")
            if self.server.open_midi_fn:
                ok = self.server.open_midi_fn(port)
                self._send_json(200, {"ok": bool(ok), "port": port})
            else:
                self._send_json(500, {"error": "no midi handler"})
            return

        if self.path.startswith("/api/settings"):
            key = data.get("key")
            value = data.get("value")
            if self.server.set_setting_fn:
                ok = self.server.set_setting_fn(key, value)
                self._send_json(200, {"ok": bool(ok), "key": key, "value": value})
            else:
                self._send_json(500, {"error": "no settings handler"})
            return

        self._send_json(404, {"error": "not found"})


def start_http_api(host="0.0.0.0", port=8766, *,
                   test_note_fn=None,
                   open_midi_fn=None,
                   set_setting_fn=None,
                   midi_list_fn=None,
                   status_fn=None):
    """Start the HTTP API in a background thread. Returns the server object."""
    server = ThreadingHTTPServer((host, port), _Handler)
    server.test_note_fn = test_note_fn
    server.open_midi_fn = open_midi_fn
    server.set_setting_fn = set_setting_fn
    server.midi_list_fn = midi_list_fn
    server.status_fn = status_fn

    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    print(f"[HTTP API] listening on http://{host}:{port}")
    return server
