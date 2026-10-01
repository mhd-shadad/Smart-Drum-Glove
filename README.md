# Smart Drum Glove - 3D Web Studio

Wearable MIDI drum controller using an ESP32 + 4 flex sensors + MPU6050 with a real-time 3D spatial hand visualization, responsive drum triggers, and low-latency WebSocket telemetry.

---

## Architecture Overview

```
                      +-----------------------------+
                      |   ESP32 Smart Drum Glove    |
                      | 4 Flex Sensors (0-4095 ADC) |
                      |    MPU6050 6-DoF IMU        |
                      +--------------+--------------+
                                     |
                       USB Serial / WiFi UDP (5005/5006)
                                     v
+------------------------------------+------------------------------------+
| Python Backend (server.py)                                              |
| - GloveWorker (rh_worker & lh_worker)                                  |
| - SerialReader / UdpReader                                              |
| - MidiEngine (mido + python-rtmidi GM Ch 10)                           |
| - GestureEngine & CalibrationManager                                    |
| - FastAPI + Uvicorn WebSocket Bridge (ws://localhost:8765/ws)          |
| - Thread-safe Qt Signal -> Asyncio Queue Event Loop                     |
+------------------------------------+------------------------------------+
                                     |
                         WebSocket JSON Stream
                                     v
+------------------------------------+------------------------------------+
| Frontend Dashboard (frontend/)                                          |
| - React 18 + Vite + TypeScript + TailwindCSS                            |
| - React Three Fiber (R3F) & Three.js 3D Hand Component                  |
| - Real-time finger bending lerp (f1..f4 -> index..pinky)                |
| - IMU Complementary Filter (alpha = 0.98) for roll/pitch/yaw            |
| - Amber (#ffb46b) emissive flash on drum hit events                     |
| - 14-button reactive drum pad grid & MIDI control                       |
| - Live engine settings sliders & auto-scrolling activity log            |
+-------------------------------------------------------------------------+
```

---

## Prerequisites

- **Python 3.10+** (tested on 3.12)
- **Node.js 18+** & **npm** (tested on Node v20)
- Virtual MIDI loopback device (e.g. `snd-virmidi` on Linux, `loopMIDI` on Windows, or standard DAW input)

---

## Installation

### 1. Python Backend Dependencies

```bash
# In the project root (drum-first)
source venv/bin/activate    # or: python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

### 2. Frontend Dependencies

```bash
cd frontend
npm install
npm run build              # builds static bundle into frontend/dist
cd ..
```

---

## Running the Application

### Option A: Development Mode (Hot Reloading Frontend + Backend)

**Terminal 1 — Run Python WebSocket Server:**
```bash
source venv/bin/activate
python server.py
```
> Server runs on `http://localhost:8765` and `ws://localhost:8765/ws`.

**Terminal 2 — Run Frontend Dev Server:**
```bash
cd frontend
npm run dev
```
> Open your browser at **`http://localhost:5173`**.

---

### Option B: Unified Production Mode (FastAPI serves both Web App and WebSocket)

If `frontend/dist` is built (`npm run build` inside `frontend/`):
```bash
source venv/bin/activate
python server.py
```
> Open your browser directly at **`http://localhost:8765`**. FastAPI automatically serves the SPA and bridges the WebSocket!

---

## Multi-Page Architecture & Features

The overhauled dashboard provides a dedicated multi-page studio console:

| Route | Page | Purpose |
|---|---|---|
| `/` | **Overview** | Cinematic Hero with 3D anatomical hand centerpiece, live telemetry HUD, ambient 24-band kinetic & audio spectrum visualizer. |
| `/studio` | **3D Studio** | Full 3-column control matrix (Glove connection & sensor graphs, 3D hand viewport, 14-pad velocity matrix, knurled DSP sliders, MIDI router, activity log). |
| `/drums` | **Drum Kit 3D** | Fullscreen 14-piece kinetic drum playground with Drummer POV / Stage / Overhead camera presets and dynamic MIDI strike velocity VU gauge. |
| `/calibrate` | **Calibrate** | 3-Step Guided Calibration Wizard with circular SVG progress meter, rest baseline sampler, and auto-suggestion engine. |
| `/settings` | **Settings** | Pro-Audio DSP rack sliders (flex thresholds F1-F4, movement threshold, smoothing $\alpha$, cooldown, velocity sensitivity, min/max velocity), port manager, and Web Audio synth toggle. |
| `/logs` | **Audit Logs** | Timestamped audit console with real-time search, category filtering (`All`, `Hits`, `Conn`, `MIDI`, `Setup`), auto-scroll, single-click copy to clipboard, and file export. |
| `/about` | **System Info** | End-to-end dataflow pipeline, interactive ESP32 DevKit pinout chip diagram, $\alpha = 0.98$ complementary filter math, and WebSocket schema reference. |

---

## Global Studio Keyboard Shortcuts

Press `?` anywhere in the dashboard to toggle the shortcut reference modal:

* **Drum Triggers**:
  * `1` : Kick (`#36`)
  * `2` : Snare (`#38`)
  * `3` : Closed Hi-Hat (`#42`)
  * `4` : Open Hi-Hat (`#46`)
  * `5` : Low Tom (`#45`)
  * `6` : Mid Tom (`#47`)
  * `7` : High Tom (`#50`)
  * `8` : Crash Cymbal (`#49`)
  * `9` : Ride Cymbal (`#51`)
  * `0` : Ride Bell (`#53`)
  * `-` : China Cymbal (`#52`)
  * `=` : Splash Cymbal (`#55`)
  * `Q` : Cowbell (`#56`)
  * `W` : Hand Clap (`#39`)
* **Navigation**:
  * `H` : Overview
  * `S` : 3D Studio
  * `D` : 3D Drum Kit
  * `C` : Calibration Wizard
  * `E` : Settings Rack
  * `L` : Audit Logs
  * `A` : System Info
* **Actions**:
  * `Space` : Trigger Calibration Recording
  * `?` : Toggle Shortcuts Help
  * `Esc` : Dismiss Modals

---

## Hardware & Firmware Setup

1. Open Arduino IDE and install the **esp32 by Espressif** board package.
2. Open `esp32/glove/last-glove.ino`.
3. Select **ESP32 Dev Module** and upload.
4. Pinout:
   - **FLEX 1 (Index)**: GPIO34
   - **FLEX 2 (Middle)**: GPIO35
   - **FLEX 3 (Ring)**: GPIO32
   - **FLEX 4 (Pinky)**: GPIO33
   - **MPU6050 (I2C)**: SDA = GPIO21, SCL = GPIO22 (Address 0x68)
5. Sensor CSV Format @ 115200 baud / UDP:
   `F1,F2,F3,F4,AX,AY,AZ,GX,GY,GZ`

