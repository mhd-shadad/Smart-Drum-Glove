# Smart Drum Glove — Frontend Development Guide

You're building the **PySide6 desktop UI**. The backend (sensor reading,
gesture detection, MIDI) is handled and frozen — do not edit `backend/`.

## Setup

    python -m venv venv
    source venv/bin/activate      # Windows: venv\Scripts\activate
    pip install -r requirements.txt

## Run

    python run.py

You'll see a PySide6 window with sensor bars, drum pads, MIDI panel.

Without a physical glove, sensor values will stay at 0 — that's fine.
To test with fake data, uncomment the `_demo_timer` in `MainWindow.__init__`.

## Files you edit

Only: **`ui/app.py`**

## Files you must NOT edit

Everything under `backend/`:

- `backend/serial_reader.py` — reads USB serial from ESP32
- `backend/udp_reader.py`    — reads UDP packets from ESP32 (wireless)
- `backend/calibration.py`   — baseline capture
- `backend/gesture_engine.py`— rule-based gesture detection
- `backend/drum_mapper.py`   — loads config/drum_mapping.json
- `backend/midi_engine.py`   — sends MIDI note_on/note_off

If you need a new method from these classes, ask me — I'll add it to the
backend and push it to you.

## Backend API you can call (already available)

### SerialReader / UdpReader (both same interface)

    reader = SerialReader()                    # or UdpReader
    reader.data_received.connect(on_data)      # signal emits dict
    reader.error_occurred.connect(on_error)    # signal emits str
    reader.connection_changed.connect(on_conn) # signal emits bool
    reader.list_ports()                        # static, returns list[str]
    reader.connect_port("COM3")                # start thread
    reader.disconnect_port()                   # stop thread

    # Signal payload (dict) keys:
    #   f1..f4  : float  (raw flex ADC values 0..4095)
    #   ax, ay, az : float  (accel in g)
    #   gx, gy, gz : float  (gyro in deg/s)
    #   time    : float  (unix timestamp)

### CalibrationManager

    calib = CalibrationManager()
    calib.start(target_samples=40)
    pct = calib.add_sample(sensor_dict)   # returns 0..100
    calib.complete                        # bool
    calib.baseline                        # dict: f1..gz -> float
    calib.suggested_thresholds()          # dict: f1..f4 -> int
    calib.reset()

### GestureEngine

    engine = GestureEngine(mapping_dict, settings_dict)
    engine.update_settings(settings_dict)
    events = engine.process(bend_dict, movement_float)
    # events is a list of: {"name": "kick", "note": 36, "velocity": 95}
    engine.current()                      # currently-playing gesture or None

### DrumMapper

    mapping = load_mapping("config/drum_mapping.json")
    note = note_for(mapping, "kick")      # returns int (36)

### MidiEngine

    midi = MidiEngine()
    MidiEngine.list_outputs()             # static, returns list[str]
    midi.open("port name")                # bool
    midi.close()
    midi.send_note(note=36, velocity=100) # bool
    midi.send_note_off(note=36)
    midi.channel                          # 9 (= MIDI ch 10)
    midi.last_note, midi.last_velocity

## Data flow (do not bypass this)

    ESP32 (USB/WiFi)
        ↓
    SerialReader / UdpReader  →  data_received signal
        ↓
    your UI receives dict via on_data
        ↓
    CalibrationManager.add_sample (if calibrating)
        ↓
    compute bend = current - baseline (per finger)
        ↓
    compute movement from ax/ay/az/gx/gy/gz deltas
        ↓
    GestureEngine.process(bend, movement) → list of events
        ↓
    MidiEngine.send_note(note, velocity)
        ↓
    UI updates: pads flash, log entry, current gesture

Keep this flow. You can change how it LOOKS but not what it does.

## What you're free to change

- Layout, colors, fonts, sizes
- Panel arrangement
- Add new panels (session stats, gesture history, etc.)
- Custom widgets, animations, charts
- Theming / dark-light mode
- Keyboard shortcuts
- Save/load user presets

## What to keep working

- MIDI panel: list, refresh, open/close a port
- Serial/UDP connect panel
- Calibration button + progress bar
- Live Bend bars (visual feedback on threshold crossing)
- Drum pads (clickable, flash on trigger)
- Activity log
- Settings sliders that update `self.settings` dict

## Testing without hardware

Add this temporary block in `MainWindow.__init__` to simulate data:

    from PySide6.QtCore import QTimer
    import random, math, time as _t
    self._fake_t = 0
    self._fake_timer = QTimer(self)
    def _fake_emit():
        self._fake_t += 0.05
        # pretend user bends finger 1 every 2 seconds
        bend = 300 if int(self._fake_t) % 2 == 0 else 0
        fake = {
            "f1": 3000 - bend, "f2": 2800, "f3": 2700, "f4": 2600,
            "ax": math.sin(self._fake_t), "ay": 0.1, "az": 9.8,
            "gx": random.uniform(-5,5), "gy": random.uniform(-5,5),
            "gz": random.uniform(-5,5),
            "time": _t.time(),
        }
        self.on_data(fake)
    self._fake_timer.timeout.connect(_fake_emit)
    self._fake_timer.start(50)     # 20 Hz

Delete this before shipping.

## Deliverable

When done, hand back:

- Updated `ui/app.py`
- Any new asset files (icons, stylesheets) in `ui/`
- Updated `requirements.txt` if you added dependencies

Do NOT modify `backend/`, `config/`, or `run.py`.

## Questions

Ask Muhammad if you need a new backend method or something in the API.
