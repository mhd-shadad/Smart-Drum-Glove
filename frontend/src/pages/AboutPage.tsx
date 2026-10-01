import React, { useState } from 'react';
import {
  Info,
  Cpu,
  Layers,
  Radio,
  Music,
  Terminal,
  Code2,
  CheckCircle,
  FileCode,
  HardDrive,
  Workflow,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const [activePin, setActivePin] = useState<string | null>(null);

  const pins = [
    { pin: 'GPIO 34', func: 'ADC1_CH6 (Flex Sensor 1 - Index)', type: 'analog', active: true },
    { pin: 'GPIO 35', func: 'ADC1_CH7 (Flex Sensor 2 - Middle)', type: 'analog', active: true },
    { pin: 'GPIO 32', func: 'ADC1_CH4 (Flex Sensor 3 - Ring)', type: 'analog', active: true },
    { pin: 'GPIO 33', func: 'ADC1_CH5 (Flex Sensor 4 - Pinky)', type: 'analog', active: true },
    { pin: 'GPIO 21', func: 'I2C SDA (MPU6050 6-DoF IMU)', type: 'i2c', active: true },
    { pin: 'GPIO 22', func: 'I2C SCL (400kHz Fast Mode)', type: 'i2c', active: true },
    { pin: '3V3', func: 'Power Rail (Flex Dividers & IMU VCC)', type: 'pwr', active: true },
    { pin: 'GND', func: 'Common Ground Reference', type: 'gnd', active: true },
  ];

  return (
    <div className="flex flex-col gap-5 h-full max-w-5xl mx-auto overflow-y-auto pr-1 font-mono text-xs">
      {/* ---------------- PROJECT OVERVIEW ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-5 shadow-xl flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-studio-gold/15 text-studio-gold flex items-center justify-center">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-studio-cream">SMART DRUM GLOVE // SYSTEM ARCHITECTURE</h2>
            <p className="text-[11px] text-studio-creamMuted">
              Wearable MIDI controller with low-latency spatial tracking & 3D visualization
            </p>
          </div>
        </div>

        <p className="text-studio-cream leading-relaxed mt-1 text-xs">
          The Smart Drum Glove captures finger bend dynamics via 4 analog flex sensors (0–4095 ADC)
          and hand orientation via an MPU6050 6-DoF inertial measurement unit. Telemetry streams
          over USB Serial or WiFi UDP to a Python FastAPI backend which executes gesture detection,
          applies calibration curves, and dispatches General MIDI Channel 10 percussion events
          to DAWs and virtual sound modules.
        </p>
      </div>

      {/* ---------------- END-TO-END DATAFLOW PIPELINE ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-5 shadow-xl flex flex-col gap-3">
        <div className="flex items-center gap-2.5 text-studio-gold font-bold text-sm">
          <Workflow className="w-4 h-4" />
          <span>END-TO-END DATAFLOW PIPELINE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
          <div className="bg-[#0b0d12] p-3 rounded-xl border border-studio-border flex flex-col gap-1 shadow-proInset">
            <span className="text-studio-gold font-bold text-xs">1. SENSORS</span>
            <span className="text-[11px] text-studio-cream">4x Flex (12-bit ADC)</span>
            <span className="text-[10px] text-studio-creamMuted">MPU6050 6-DoF IMU</span>
          </div>

          <div className="bg-[#0b0d12] p-3 rounded-xl border border-studio-border flex flex-col gap-1 shadow-proInset">
            <span className="text-studio-green font-bold text-xs">2. TRANSMISSION</span>
            <span className="text-[11px] text-studio-cream">115200 Baud Serial</span>
            <span className="text-[10px] text-studio-creamMuted">WiFi UDP Socket (5005/6)</span>
          </div>

          <div className="bg-[#0b0d12] p-3 rounded-xl border border-studio-border flex flex-col gap-1 shadow-proInset">
            <span className="text-studio-amber font-bold text-xs">3. PYTHON DSP</span>
            <span className="text-[11px] text-studio-cream">FastAPI + GloveWorker</span>
            <span className="text-[10px] text-studio-creamMuted">Gesture Curve & α=0.98</span>
          </div>

          <div className="bg-[#0b0d12] p-3 rounded-xl border border-studio-border flex flex-col gap-1 shadow-proInset">
            <span className="text-studio-cyan font-bold text-xs">4. OUTPUT & 3D</span>
            <span className="text-[11px] text-studio-cream">GM MIDI Channel 10</span>
            <span className="text-[10px] text-studio-creamMuted">Three.js Hand & Drum Kit</span>
          </div>
        </div>
      </div>

      {/* ---------------- HARDWARE & PINOUT SPECIFICATION ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-5 shadow-xl flex flex-col gap-4">
        <div className="flex items-center gap-2.5 text-studio-gold font-bold text-sm">
          <Cpu className="w-4 h-4" />
          <span>ESP32 PINOUT & SENSOR INTERFACE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Flex Sensor Wiring Table */}
          <div className="bg-[#0b0d12] p-4 rounded-xl border border-studio-border flex flex-col gap-2 shadow-proInset">
            <span className="text-studio-cream font-bold text-xs border-b border-studio-border pb-2">
              FLEX SENSORS (ADC 12-BIT)
            </span>
            <div className="flex justify-between py-1 border-b border-studio-border/60">
              <span className="text-studio-creamMuted">FLEX 1 (Index Finger):</span>
              <span className="text-studio-gold font-bold">GPIO 34 (ADC1_CH6)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-studio-border/60">
              <span className="text-studio-creamMuted">FLEX 2 (Middle Finger):</span>
              <span className="text-studio-gold font-bold">GPIO 35 (ADC1_CH7)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-studio-border/60">
              <span className="text-studio-creamMuted">FLEX 3 (Ring Finger):</span>
              <span className="text-studio-gold font-bold">GPIO 32 (ADC1_CH4)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-studio-creamMuted">FLEX 4 (Pinky Finger):</span>
              <span className="text-studio-gold font-bold">GPIO 33 (ADC1_CH5)</span>
            </div>
          </div>

          {/* IMU & Connectivity Table */}
          <div className="bg-[#0b0d12] p-4 rounded-xl border border-studio-border flex flex-col gap-2 shadow-proInset">
            <span className="text-studio-cream font-bold text-xs border-b border-studio-border pb-2">
              MPU6050 & COMM PROTOCOLS
            </span>
            <div className="flex justify-between py-1 border-b border-studio-border/60">
              <span className="text-studio-creamMuted">I2C SDA:</span>
              <span className="text-studio-green font-bold">GPIO 21 (Addr 0x68)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-studio-border/60">
              <span className="text-studio-creamMuted">I2C SCL:</span>
              <span className="text-studio-green font-bold">GPIO 22 (400kHz Fast)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-studio-border/60">
              <span className="text-studio-creamMuted">USB Serial Baud:</span>
              <span className="text-studio-amber font-bold">115200 8-N-1</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-studio-creamMuted">WiFi UDP Ports:</span>
              <span className="text-studio-amber font-bold">5005 (RH) / 5006 (LH)</span>
            </div>
          </div>
        </div>

        {/* Visual Pinout Chip Card */}
        <div className="bg-[#080a0e] p-4 rounded-xl border border-studio-border flex flex-col gap-3 shadow-proInset">
          <span className="text-[10px] text-studio-creamMuted font-bold uppercase tracking-wider">
            ESP32 DEVKIT ACTIVE PIN MAPPING (CLICK PIN TO INSPECT)
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {pins.map((p) => {
              const isSelected = activePin === p.pin;
              return (
                <button
                  key={p.pin}
                  onClick={() => setActivePin(isSelected ? null : p.pin)}
                  className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                    isSelected
                      ? 'bg-studio-gold/20 border-studio-gold text-studio-gold shadow-glowGold'
                      : 'bg-[#12151e] border-studio-border text-studio-cream hover:border-studio-gold/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{p.pin}</span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        p.type === 'analog'
                          ? 'bg-studio-gold'
                          : p.type === 'i2c'
                          ? 'bg-studio-green'
                          : 'bg-studio-amber'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] text-studio-creamMuted leading-tight">{p.func}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CSV Format */}
        <div className="bg-[#090b10] p-3 rounded-xl border border-studio-border flex flex-col gap-1 shadow-proInset">
          <span className="text-studio-creamMuted text-[10px]">SENSOR CSV STREAM FORMAT:</span>
          <code className="text-studio-gold font-mono text-xs">
            F1,F2,F3,F4,AX,AY,AZ,GX,GY,GZ\n
          </code>
        </div>
      </div>

      {/* ---------------- IMU COMPLEMENTARY FILTER MATH ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-5 shadow-xl flex flex-col gap-3">
        <div className="flex items-center gap-2.5 text-studio-gold font-bold text-sm">
          <Code2 className="w-4 h-4" />
          <span>IMU SENSOR FUSION (α = 0.98 COMPLEMENTARY FILTER)</span>
        </div>

        <div className="bg-[#0b0d12] p-4 rounded-xl border border-studio-border flex flex-col gap-2 shadow-proInset">
          <p className="text-studio-cream leading-relaxed">
            The frontend and backend apply a high-pass / low-pass complementary filter to merge high-frequency
            gyroscope angular velocity with low-frequency gravity vector orientation from the accelerometer:
          </p>
          <div className="bg-[#090b10] p-3 rounded-lg border border-studio-border text-studio-gold text-xs font-mono">
            angle(t) = α × (angle(t-1) + gyro × Δt) + (1 - α) × accel_angle
          </div>
          <p className="text-studio-creamMuted text-[11px]">
            Where α = 0.98 gives 98% weight to instantaneous gyro angular rate while correcting long-term drift with 2% accelerometer tilt.
          </p>
        </div>
      </div>

      {/* ---------------- WEBSOCKET PROTOCOL SPECIFICATION ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-5 shadow-xl flex flex-col gap-3">
        <div className="flex items-center gap-2.5 text-studio-green font-bold text-sm">
          <Radio className="w-4 h-4" />
          <span>WEBSOCKET JSON SCHEMA (ws://localhost:8765/ws)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-[#0b0d12] p-3 rounded-xl border border-studio-border flex flex-col gap-1.5 shadow-proInset">
            <span className="text-studio-gold font-bold text-[11px]">SERVER BROADCAST EVENTS:</span>
            <ul className="text-studio-creamMuted space-y-1 text-[11px]">
              <li>• <code className="text-studio-cream">sensor_data</code>: f1..f4, ax..az, gx..gz, bend</li>
              <li>• <code className="text-studio-cream">drum_hit</code>: side, name, note, velocity</li>
              <li>• <code className="text-studio-cream">connection_changed</code>: side, connected</li>
              <li>• <code className="text-studio-cream">calibration_progress</code>: side, pct</li>
              <li>• <code className="text-studio-cream">midi_status</code>: connected, name</li>
              <li>• <code className="text-studio-cream">ports</code>: serial[], midi[]</li>
            </ul>
          </div>

          <div className="bg-[#0b0d12] p-3 rounded-xl border border-studio-border flex flex-col gap-1.5 shadow-proInset">
            <span className="text-studio-gold font-bold text-[11px]">CLIENT COMMAND PAYLOADS:</span>
            <ul className="text-studio-creamMuted space-y-1 text-[11px]">
              <li>• <code className="text-studio-cream">connect_glove</code>: side, mode, port</li>
              <li>• <code className="text-studio-cream">disconnect_glove</code>: side</li>
              <li>• <code className="text-studio-cream">calibrate</code>: side</li>
              <li>• <code className="text-studio-cream">suggest_thresholds</code>: side</li>
              <li>• <code className="text-studio-cream">trigger_test_note</code>: note, velocity</li>
              <li>• <code className="text-studio-cream">update_setting</code>: key, value</li>
              <li>• <code className="text-studio-cream">open_midi</code>: name</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
