import React, { useState } from 'react';
import { useGloveStore } from '../store/useGloveStore';
import {
  Wifi,
  Usb,
  RotateCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Activity,
  Compass,
  Sparkles,
} from 'lucide-react';

export const LeftColumn: React.FC = () => {
  const {
    activeSide,
    setActiveSide,
    rh,
    lh,
    settings,
    ports,
    connectGlove,
    disconnectGlove,
    calibrate,
    suggestThresholds,
    listPorts,
  } = useGloveStore();

  const [mode, setMode] = useState<'USB Serial' | 'Wireless UDP'>('USB Serial');
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [udpPort, setUdpPort] = useState<number>(activeSide === 'rh' ? 5005 : 5006);

  const currentGlove = activeSide === 'rh' ? rh : lh;

  const handleConnect = () => {
    if (mode === 'USB Serial') {
      const portToUse = selectedPort || (ports.serial.length > 0 ? ports.serial[0] : '');
      if (portToUse) {
        connectGlove(activeSide, 'USB Serial', portToUse);
      }
    } else {
      connectGlove(activeSide, 'Wireless UDP', udpPort);
    }
  };

  const handleDisconnect = () => {
    disconnectGlove(activeSide);
  };

  const fingerNames = ['F1 (Index)', 'F2 (Middle)', 'F3 (Ring)', 'F4 (Pinky)'];
  const flexKeys = ['f1', 'f2', 'f3', 'f4'] as const;

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      {/* ---------------- GLOVE SIDE SELECTOR & STATUS ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-4 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-studio-gold shadow-glowGold animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-studio-gold font-mono">
              GLOVE TELEMETRY
            </h2>
          </div>
          <div className="flex bg-[#0b0d12] p-1 rounded-xl border border-studio-border shadow-proInset">
            <button
              onClick={() => {
                setActiveSide('rh');
                setUdpPort(5005);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                activeSide === 'rh'
                  ? 'bg-studio-gold text-black shadow-glowGold'
                  : 'text-studio-creamMuted hover:text-white'
              }`}
            >
              RH (Right)
            </button>
            <button
              onClick={() => {
                setActiveSide('lh');
                setUdpPort(5006);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                activeSide === 'lh'
                  ? 'bg-studio-green text-black shadow-glowGreen'
                  : 'text-studio-creamMuted hover:text-white'
              }`}
            >
              LH (Left)
            </button>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            onClick={() => setMode('USB Serial')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl border text-xs font-mono transition-all ${
              mode === 'USB Serial'
                ? 'bg-studio-surface border-studio-gold/50 text-studio-gold font-bold shadow-proInset'
                : 'bg-[#0e1017] border-studio-border text-studio-creamMuted hover:text-studio-cream'
            }`}
          >
            <Usb className="w-3.5 h-3.5" />
            <span>USB SERIAL</span>
          </button>
          <button
            onClick={() => setMode('Wireless UDP')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl border text-xs font-mono transition-all ${
              mode === 'Wireless UDP'
                ? 'bg-studio-surface border-studio-green/50 text-studio-green font-bold shadow-proInset'
                : 'bg-[#0e1017] border-studio-border text-studio-creamMuted hover:text-studio-cream'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>WIFI UDP</span>
          </button>
        </div>

        {/* Port Configuration */}
        {mode === 'USB Serial' ? (
          <div className="flex gap-2">
            <select
              value={selectedPort || (ports.serial.length > 0 ? ports.serial[0] : '')}
              onChange={(e) => setSelectedPort(e.target.value)}
              className="flex-1 bg-[#0b0d12] border border-studio-border rounded-xl px-3 py-1.5 text-xs font-mono text-studio-cream focus:outline-none focus:border-studio-gold shadow-proInset"
            >
              {ports.serial.length === 0 && <option value="">No Serial Ports Found</option>}
              {ports.serial.map((port) => (
                <option key={port} value={port}>
                  {port}
                </option>
              ))}
            </select>
            <button
              onClick={() => listPorts()}
              title="Refresh Ports"
              className="p-2 rounded-xl bg-studio-card hover:bg-studio-surface border border-studio-border text-studio-creamMuted hover:text-white transition-all shadow-proInset"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-[#0b0d12] border border-studio-border rounded-xl px-3 py-1.5 shadow-proInset">
            <span className="text-xs font-mono text-studio-creamMuted">UDP PORT:</span>
            <input
              type="number"
              value={udpPort}
              onChange={(e) => setUdpPort(Number(e.target.value))}
              className="w-full bg-transparent text-xs font-mono text-studio-green focus:outline-none"
            />
          </div>
        )}

        {/* Connect / Disconnect Action */}
        <div className="flex gap-2 mt-1">
          {currentGlove.connected ? (
            <button
              onClick={handleDisconnect}
              className="flex-1 py-2 rounded-xl bg-studio-red/20 border border-studio-red/50 text-studio-red font-mono font-bold text-xs hover:bg-studio-red/30 transition-all shadow-glowRed"
            >
              DISCONNECT GLOVE
            </button>
          ) : (
            <button
              onClick={handleConnect}
              className="flex-1 py-2 rounded-xl bg-studio-gold text-black font-mono font-bold text-xs hover:bg-studio-goldBright transition-all shadow-glowGold"
            >
              CONNECT GLOVE
            </button>
          )}
        </div>

        {/* Connection LED readout */}
        <div className="flex items-center justify-between text-[11px] font-mono border-t border-studio-border pt-2 text-studio-creamMuted">
          <span>HARDWARE STATUS:</span>
          <span
            className={`font-bold flex items-center gap-1 ${
              currentGlove.connected ? 'text-studio-green' : 'text-studio-creamMuted'
            }`}
          >
            {currentGlove.connected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-studio-green" /> ONLINE (STREAMING)
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-studio-creamMuted" /> DISCONNECTED
              </>
            )}
          </span>
        </div>
      </div>

      {/* ---------------- CALIBRATION SUITE ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-4 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-studio-gold" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-studio-gold font-mono">
              CALIBRATION
            </h2>
          </div>
          <span className="text-[10px] font-mono text-studio-creamMuted">SPACE TO RUN</span>
        </div>

        <p className="text-[11px] text-studio-creamMuted font-mono">
          Hold hand open and flat on a desk before initiating baseline recording.
        </p>

        {/* Progress Bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[10px] font-mono">
            <span>PROGRESS</span>
            <span className="text-studio-gold font-bold">{currentGlove.calibPct}%</span>
          </div>
          <div className="w-full bg-[#0b0d12] rounded-full h-2.5 overflow-hidden border border-studio-border shadow-proInset">
            <div
              className="bg-studio-gold h-full transition-all duration-150 shadow-glowGold"
              style={{ width: `${currentGlove.calibPct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            onClick={() => calibrate(activeSide)}
            disabled={currentGlove.isCalibrating}
            className={`py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
              currentGlove.isCalibrating
                ? 'bg-studio-surface border-studio-border text-studio-creamMuted cursor-not-allowed'
                : 'bg-studio-gold/15 border-studio-gold/40 text-studio-gold hover:bg-studio-gold hover:text-black shadow-glowGold'
            }`}
          >
            {currentGlove.isCalibrating ? 'RECORDING...' : 'CALIBRATE'}
          </button>
          <button
            onClick={() => suggestThresholds(activeSide)}
            className="py-2 rounded-xl bg-studio-surface border border-studio-border hover:border-studio-gold/40 text-studio-cream font-mono font-bold text-xs transition-all shadow-proInset"
          >
            SUGGEST
          </button>
        </div>
      </div>

      {/* ---------------- 4 FLEX SENSORS REAL-TIME GAUGES ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-4 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-studio-gold" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-studio-gold font-mono">
              FLEX SENSORS (F1-F4)
            </h2>
          </div>
          <span className="text-[10px] font-mono text-studio-green font-bold">12-BIT ADC</span>
        </div>

        <div className="flex flex-col gap-3">
          {flexKeys.map((key, index) => {
            const rawVal = currentGlove[key];
            const deltaVal = currentGlove.bend[key];
            const thresholdKey = `flex${index + 1}_threshold` as keyof typeof settings;
            const threshold = settings[thresholdKey] as number;
            const isFired = deltaVal >= threshold;

            return (
              <div key={key} className="flex flex-col gap-1 bg-[#0b0d12] p-2.5 rounded-xl border border-studio-border shadow-proInset">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="font-bold text-studio-cream">{fingerNames[index]}</span>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-studio-creamMuted">RAW: {rawVal}</span>
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded border ${
                        isFired
                          ? 'bg-studio-amber/20 border-studio-amber text-studio-amber shadow-glowAmber animate-pulse'
                          : 'bg-studio-surface border-studio-border text-studio-creamMuted'
                      }`}
                    >
                      Δ {deltaVal} / THRESH {threshold}
                    </span>
                  </div>
                </div>

                {/* Meter Bar */}
                <div className="w-full bg-[#171a23] rounded-full h-2 overflow-hidden relative">
                  <div
                    className={`h-full transition-all duration-75 ${
                      isFired ? 'bg-studio-amber shadow-glowAmber' : 'bg-studio-gold'
                    }`}
                    style={{ width: `${Math.min(100, (deltaVal / 100) * 100)}%` }}
                  />
                  {/* Threshold marker tick */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-studio-red z-10"
                    style={{ left: `${Math.min(100, (threshold / 100) * 100)}%` }}
                    title={`Threshold: ${threshold}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------- MPU6050 6-DoF IMU & MOVEMENT METRICS ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-4 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-studio-gold" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-studio-gold font-mono">
              MPU6050 6-DoF IMU
            </h2>
          </div>
          <span className="text-[10px] font-mono text-studio-gold font-bold">I2C 0x68</span>
        </div>

        {/* Accelerometer */}
        <div className="flex flex-col gap-1.5 bg-[#0b0d12] p-2.5 rounded-xl border border-studio-border shadow-proInset">
          <span className="text-[10px] font-mono text-studio-creamMuted font-bold">
            ACCELEROMETER (g)
          </span>
          <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center">
            <div className="bg-studio-surface p-1.5 rounded-lg border border-studio-border">
              <span className="text-studio-creamMuted text-[9px] block">AX</span>
              <span className="text-studio-cream font-bold">{currentGlove.ax.toFixed(2)}</span>
            </div>
            <div className="bg-studio-surface p-1.5 rounded-lg border border-studio-border">
              <span className="text-studio-creamMuted text-[9px] block">AY</span>
              <span className="text-studio-cream font-bold">{currentGlove.ay.toFixed(2)}</span>
            </div>
            <div className="bg-studio-surface p-1.5 rounded-lg border border-studio-border">
              <span className="text-studio-creamMuted text-[9px] block">AZ</span>
              <span className="text-studio-cream font-bold">{currentGlove.az.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Gyroscope */}
        <div className="flex flex-col gap-1.5 bg-[#0b0d12] p-2.5 rounded-xl border border-studio-border shadow-proInset">
          <span className="text-[10px] font-mono text-studio-creamMuted font-bold">
            GYROSCOPE (deg/s)
          </span>
          <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center">
            <div className="bg-studio-surface p-1.5 rounded-lg border border-studio-border">
              <span className="text-studio-creamMuted text-[9px] block">GX</span>
              <span className="text-studio-gold font-bold">{currentGlove.gx.toFixed(1)}</span>
            </div>
            <div className="bg-studio-surface p-1.5 rounded-lg border border-studio-border">
              <span className="text-studio-creamMuted text-[9px] block">GY</span>
              <span className="text-studio-gold font-bold">{currentGlove.gy.toFixed(1)}</span>
            </div>
            <div className="bg-studio-surface p-1.5 rounded-lg border border-studio-border">
              <span className="text-studio-creamMuted text-[9px] block">GZ</span>
              <span className="text-studio-gold font-bold">{currentGlove.gz.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Movement Metric */}
        <div className="flex flex-col gap-1 bg-[#0b0d12] p-2.5 rounded-xl border border-studio-border shadow-proInset">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-studio-cream font-bold flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-studio-amber" /> MOVEMENT ENERGY
            </span>
            <span className="text-studio-gold font-bold">
              {currentGlove.movement.toFixed(1)} / THRESH {settings.movement_threshold}
            </span>
          </div>
          <div className="w-full bg-[#171a23] rounded-full h-2 overflow-hidden relative">
            <div
              className={`h-full transition-all duration-75 ${
                currentGlove.movement >= settings.movement_threshold
                  ? 'bg-studio-amber shadow-glowAmber'
                  : 'bg-studio-green'
              }`}
              style={{
                width: `${Math.min(100, (currentGlove.movement / 25) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeftColumn;
