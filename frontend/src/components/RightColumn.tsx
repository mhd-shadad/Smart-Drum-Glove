import React, { useState, useRef, useEffect } from 'react';
import { useGloveStore } from '../store/useGloveStore';
import {
  Music,
  RotateCw,
  Sliders,
  Terminal,
  Trash2,
  Volume2,
  Sparkles,
} from 'lucide-react';

const DRUM_PADS = [
  { key: 'kick', label: 'KICK', note: 36 },
  { key: 'snare', label: 'SNARE', note: 38 },
  { key: 'closed_hihat', label: 'HI-HAT', note: 42 },
  { key: 'open_hihat', label: 'OPEN HH', note: 46 },
  { key: 'low_tom', label: 'LOW TOM', note: 45 },
  { key: 'mid_tom', label: 'MID TOM', note: 47 },
  { key: 'high_tom', label: 'HIGH TOM', note: 50 },
  { key: 'crash', label: 'CRASH', note: 49 },
  { key: 'ride', label: 'RIDE', note: 51 },
  { key: 'ride_bell', label: 'RIDE BELL', note: 53 },
  { key: 'china', label: 'CHINA', note: 52 },
  { key: 'splash', label: 'SPLASH', note: 55 },
  { key: 'cowbell', label: 'COWBELL', note: 56 },
  { key: 'clap', label: 'CLAP', note: 39 },
];

export const RightColumn: React.FC = () => {
  const {
    ports,
    midi,
    settings,
    activePads,
    logs,
    triggerTestNote,
    openMidi,
    listPorts,
    updateSetting,
    clearLogs,
  } = useGloveStore();

  const [selectedMidi, setSelectedMidi] = useState<string>('');
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleOpenMidi = () => {
    const portToOpen = selectedMidi || (ports.midi.length > 0 ? ports.midi[0] : '');
    if (portToOpen) {
      openMidi(portToOpen);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pl-1">
      {/* ---------------- 14-BUTTON PRO DRUM PAD MATRIX ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-4 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-mono text-studio-gold flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5" /> 14-PAD VELOCITY MATRIX
          </span>
          <span className="text-[10px] font-mono text-studio-creamMuted">Click or keys 1-9</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {DRUM_PADS.map((pad) => {
            const isFired = !!activePads[pad.note];
            return (
              <button
                key={pad.key}
                onClick={() => triggerTestNote(pad.note, 115)}
                className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-0.5 font-mono transition-all duration-75 select-none shadow-proInset ${
                  isFired
                    ? 'bg-studio-amber text-black scale-[0.96] shadow-glowAmber border border-white font-extrabold'
                    : 'bg-[#0b0d12] hover:bg-studio-surface text-studio-cream border border-studio-border hover:border-studio-gold/50 font-bold'
                }`}
              >
                <span className="text-xs leading-none tracking-tight">{pad.label}</span>
                <span
                  className={`text-[10px] ${
                    isFired ? 'text-black/80 font-bold' : 'text-studio-creamMuted'
                  }`}
                >
                  #{pad.note}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- MIDI OUTPUT ROUTING ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-4 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-mono text-studio-gold flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5" /> MIDI ENGINE OUTPUT
          </span>
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              midi.connected
                ? 'bg-studio-green/20 border-studio-green/40 text-studio-green'
                : 'bg-studio-surface border-studio-border text-studio-creamMuted'
            }`}
          >
            {midi.connected ? 'ACTIVE PORT' : 'OFFLINE'}
          </span>
        </div>

        <div className="flex gap-2 items-center">
          <select
            value={selectedMidi || (ports.midi[0] ?? '')}
            onChange={(e) => setSelectedMidi(e.target.value)}
            className="flex-1 bg-[#0b0d12] text-xs font-mono text-studio-cream px-3 py-2 rounded-xl border border-studio-border focus:border-studio-gold focus:outline-none shadow-proInset"
          >
            {ports.midi.length === 0 ? (
              <option value="">No MIDI ports detected</option>
            ) : (
              ports.midi.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))
            )}
          </select>

          <button
            onClick={() => listPorts()}
            title="Refresh MIDI Ports"
            className="p-2 rounded-xl bg-studio-card hover:bg-studio-surface border border-studio-border text-studio-creamMuted hover:text-studio-gold transition-all shadow-proInset"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleOpenMidi}
            className="px-3.5 py-2 rounded-xl bg-studio-gold hover:bg-studio-goldBright text-black text-xs font-bold font-mono transition-all shadow-glowGold"
          >
            Open
          </button>
        </div>
      </div>

      {/* ---------------- PRO-AUDIO RACK SETTINGS SLIDERS ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-4 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-mono text-studio-gold flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" /> ENGINE RACK SLIDERS
          </span>
          <span className="text-[10px] font-mono text-studio-creamMuted">Realtime DSP</span>
        </div>

        <div className="flex flex-col gap-3">
          {/* Flex 1..4 Thresholds */}
          {(['flex1_threshold', 'flex2_threshold', 'flex3_threshold', 'flex4_threshold'] as const).map(
            (key, idx) => (
              <div key={key} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-studio-creamMuted">F{idx + 1} Threshold</span>
                  <span className="text-studio-gold font-bold">{settings[key]}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={settings[key]}
                  onChange={(e) => updateSetting(key, Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )
          )}

          {/* Movement Threshold */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-studio-creamMuted">Movement Thresh</span>
              <span className="text-studio-gold font-bold">{settings.movement_threshold}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="20"
              step="0.5"
              value={settings.movement_threshold}
              onChange={(e) => updateSetting('movement_threshold', Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Gesture Cooldown */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-studio-creamMuted">Gesture Cooldown</span>
              <span className="text-studio-gold font-bold">{settings.gesture_cooldown}s</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={settings.gesture_cooldown}
              onChange={(e) => updateSetting('gesture_cooldown', Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Smoothing Alpha */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-studio-creamMuted">Smoothing (α)</span>
              <span className="text-studio-gold font-bold">{settings.smoothing}</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.95"
              step="0.05"
              value={settings.smoothing}
              onChange={(e) => updateSetting('smoothing', Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Velocity Sensitivity */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-studio-creamMuted">Velocity Sens</span>
              <span className="text-studio-gold font-bold">{settings.velocity_sensitivity}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.1"
              value={settings.velocity_sensitivity}
              onChange={(e) => updateSetting('velocity_sensitivity', Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Velocity Range (Min / Max) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-studio-creamMuted">Min Vel</span>
                <span className="text-studio-gold font-bold">{settings.min_velocity}</span>
              </div>
              <input
                type="range"
                min="1"
                max="127"
                value={settings.min_velocity}
                onChange={(e) => updateSetting('min_velocity', Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-studio-creamMuted">Max Vel</span>
                <span className="text-studio-gold font-bold">{settings.max_velocity}</span>
              </div>
              <input
                type="range"
                min="1"
                max="127"
                value={settings.max_velocity}
                onChange={(e) => updateSetting('max_velocity', Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- ACTIVITY & MIDI AUDIT LOG ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-4 shadow-xl flex flex-col gap-2.5 h-64">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-mono text-studio-gold flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" /> RECENT ACTIVITY
          </span>
          <button
            onClick={clearLogs}
            title="Clear Activity Log"
            className="p-1 rounded text-studio-creamMuted hover:text-studio-red transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div
          ref={logContainerRef}
          className="flex-1 overflow-y-auto bg-[#0b0d12] rounded-xl p-3 border border-studio-border flex flex-col gap-1 font-mono text-[11px] select-text shadow-proInset"
        >
          {logs.length === 0 ? (
            <span className="text-studio-creamMuted/50 italic">Awaiting events...</span>
          ) : (
            logs.map((log, i) => (
              <div
                key={i}
                className={`leading-relaxed break-all ${
                  log.includes('Hit:')
                    ? 'text-studio-amber font-semibold'
                    : log.includes('CONNECTED')
                    ? 'text-studio-green font-semibold'
                    : log.includes('DISCONNECTED')
                    ? 'text-studio-red font-semibold'
                    : 'text-studio-creamMuted'
                }`}
              >
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RightColumn;
