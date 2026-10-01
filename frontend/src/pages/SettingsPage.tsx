import React, { useState } from 'react';
import { useGloveStore } from '../store/useGloveStore';
import {
  Usb,
  Wifi,
  RotateCw,
  Music,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Volume2,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    activeSide,
    setActiveSide,
    rh,
    lh,
    ports,
    midi,
    settings,
    connectGlove,
    disconnectGlove,
    openMidi,
    listPorts,
    updateSetting,
    audioEnabled,
    toggleAudio,
  } = useGloveStore();

  const [mode, setMode] = useState<'USB Serial' | 'Wireless UDP'>('USB Serial');
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [udpPort, setUdpPort] = useState<number>(activeSide === 'rh' ? 5005 : 5006);
  const [selectedMidi, setSelectedMidi] = useState<string>('');

  const currentGlove = activeSide === 'rh' ? rh : lh;

  const handleConnect = () => {
    if (mode === 'USB Serial') {
      const p = selectedPort || (ports.serial.length > 0 ? ports.serial[0] : '');
      if (p) connectGlove(activeSide, 'USB Serial', p);
    } else {
      connectGlove(activeSide, 'Wireless UDP', udpPort);
    }
  };

  const handleOpenMidi = () => {
    const p = selectedMidi || (ports.midi.length > 0 ? ports.midi[0] : '');
    if (p) openMidi(p);
  };

  return (
    <div className="flex flex-col gap-5 h-full max-w-5xl mx-auto overflow-y-auto pr-1 font-mono text-xs">
      {/* ---------------- 1. HARDWARE CONNECTION CONFIG ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-5 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-studio-gold/15 text-studio-gold flex items-center justify-center">
              <Usb className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-studio-cream">GLOVE HARDWARE CONNECTION</h2>
              <p className="text-[11px] text-studio-creamMuted">Serial COM port or wireless UDP socket</p>
            </div>
          </div>

          <div className="flex bg-[#0b0d12] p-1 rounded-xl border border-studio-border shadow-proInset">
            <button
              onClick={() => {
                setActiveSide('rh');
                setUdpPort(5005);
              }}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
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
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
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
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode('USB Serial')}
            className={`flex items-center justify-center gap-2 py-2 rounded-xl border transition-all ${
              mode === 'USB Serial'
                ? 'bg-studio-surface border-studio-gold/50 text-studio-gold font-bold shadow-proInset'
                : 'bg-[#0b0d12] border-studio-border text-studio-creamMuted hover:text-studio-cream'
            }`}
          >
            <Usb className="w-4 h-4" />
            <span>USB SERIAL (115200 BAUD)</span>
          </button>

          <button
            onClick={() => setMode('Wireless UDP')}
            className={`flex items-center justify-center gap-2 py-2 rounded-xl border transition-all ${
              mode === 'Wireless UDP'
                ? 'bg-studio-surface border-studio-green/50 text-studio-green font-bold shadow-proInset'
                : 'bg-[#0b0d12] border-studio-border text-studio-creamMuted hover:text-studio-cream'
            }`}
          >
            <Wifi className="w-4 h-4" />
            <span>WIRELESS UDP (5005 / 5006)</span>
          </button>
        </div>

        {/* Port Input */}
        {mode === 'USB Serial' ? (
          <div className="flex gap-2">
            <select
              value={selectedPort || (ports.serial[0] ?? '')}
              onChange={(e) => setSelectedPort(e.target.value)}
              className="flex-1 bg-[#0b0d12] text-studio-cream px-3 py-2 rounded-xl border border-studio-border focus:border-studio-gold focus:outline-none shadow-proInset"
            >
              {ports.serial.length === 0 ? (
                <option value="">No serial ports available</option>
              ) : (
                ports.serial.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))
              )}
            </select>
            <button
              onClick={() => listPorts()}
              title="Refresh Ports"
              className="p-2 rounded-xl bg-studio-card hover:bg-studio-surface border border-studio-border text-studio-creamMuted hover:text-studio-gold transition-all shadow-proInset"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-[#0b0d12] p-2.5 rounded-xl border border-studio-border shadow-proInset">
            <span className="text-studio-creamMuted">UDP LISTENING PORT:</span>
            <input
              type="number"
              value={udpPort}
              onChange={(e) => setUdpPort(Number(e.target.value))}
              className="bg-transparent text-studio-green font-bold focus:outline-none w-32"
            />
          </div>
        )}

        {/* Connect Action */}
        <div className="flex items-center justify-between pt-1 border-t border-studio-border">
          <div className="flex items-center gap-2">
            {currentGlove.connected ? (
              <span className="text-studio-green font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> GLOVE ONLINE ({activeSide.toUpperCase()})
              </span>
            ) : (
              <span className="text-studio-creamMuted flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> GLOVE DISCONNECTED
              </span>
            )}
          </div>

          {currentGlove.connected ? (
            <button
              onClick={() => disconnectGlove(activeSide)}
              className="px-4 py-2 rounded-xl bg-studio-red/20 border border-studio-red/50 text-studio-red font-bold hover:bg-studio-red/30 transition-all shadow-glowRed"
            >
              DISCONNECT
            </button>
          ) : (
            <button
              onClick={handleConnect}
              className="px-5 py-2 rounded-xl bg-studio-gold text-black font-bold hover:bg-studio-goldBright transition-all shadow-glowGold"
            >
              CONNECT GLOVE
            </button>
          )}
        </div>
      </div>

      {/* ---------------- 2. MIDI ENGINE CONFIG ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-5 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-studio-gold/15 text-studio-gold flex items-center justify-center">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-studio-cream">MIDI OUTPUT CONFIGURATION</h2>
              <p className="text-[11px] text-studio-creamMuted">Hardware MIDI, Loopback & DAW routing</p>
            </div>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded font-bold border ${
              midi.connected
                ? 'bg-studio-green/15 text-studio-green border-studio-green/40 shadow-glowGreen'
                : 'bg-studio-surface text-studio-creamMuted border-studio-border'
            }`}
          >
            {midi.connected ? `PORT: ${midi.name}` : 'NO ACTIVE PORT'}
          </span>
        </div>

        <div className="flex gap-2">
          <select
            value={selectedMidi || (ports.midi[0] ?? '')}
            onChange={(e) => setSelectedMidi(e.target.value)}
            className="flex-1 bg-[#0b0d12] text-studio-cream px-3 py-2 rounded-xl border border-studio-border focus:border-studio-gold focus:outline-none shadow-proInset"
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
            title="Refresh Ports"
            className="p-2 rounded-xl bg-studio-card hover:bg-studio-surface border border-studio-border text-studio-creamMuted hover:text-studio-gold transition-all shadow-proInset"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleOpenMidi}
            className="px-4 py-2 rounded-xl bg-studio-gold text-black font-bold hover:bg-studio-goldBright transition-all shadow-glowGold"
          >
            ATTACH PORT
          </button>
        </div>
      </div>

      {/* ---------------- 3. GESTURE & ENGINE SLIDERS ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-5 shadow-xl flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-studio-gold/15 text-studio-gold flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-studio-cream">GESTURE ENGINE PARAMETERS</h2>
            <p className="text-[11px] text-studio-creamMuted">Real-time thresholds, filter smoothing & velocity</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Flex 1..4 */}
          {(['flex1_threshold', 'flex2_threshold', 'flex3_threshold', 'flex4_threshold'] as const).map(
            (key, idx) => (
              <div key={key} className="bg-[#0b0d12] p-3 rounded-xl border border-studio-border flex flex-col gap-2 shadow-proInset">
                <div className="flex justify-between items-center">
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
          <div className="bg-[#0b0d12] p-3 rounded-xl border border-studio-border flex flex-col gap-2 shadow-proInset">
            <div className="flex justify-between items-center">
              <span className="text-studio-creamMuted">Movement Threshold</span>
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
          <div className="bg-[#0b0d12] p-3 rounded-xl border border-studio-border flex flex-col gap-2 shadow-proInset">
            <div className="flex justify-between items-center">
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
          <div className="bg-[#0b0d12] p-3 rounded-xl border border-studio-border flex flex-col gap-2 shadow-proInset">
            <div className="flex justify-between items-center">
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
          <div className="bg-[#0b0d12] p-3 rounded-xl border border-studio-border flex flex-col gap-2 shadow-proInset">
            <div className="flex justify-between items-center">
              <span className="text-studio-creamMuted">Velocity Sensitivity</span>
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

          {/* Min Velocity */}
          <div className="bg-[#0b0d12] p-3 rounded-xl border border-studio-border flex flex-col gap-2 shadow-proInset">
            <div className="flex justify-between items-center">
              <span className="text-studio-creamMuted">Min Velocity</span>
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

          {/* Max Velocity */}
          <div className="bg-[#0b0d12] p-3 rounded-xl border border-studio-border flex flex-col gap-2 shadow-proInset">
            <div className="flex justify-between items-center">
              <span className="text-studio-creamMuted">Max Velocity</span>
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

      {/* ---------------- 4. AUDIO SYNTH CONFIG ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-5 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-studio-gold/15 text-studio-gold flex items-center justify-center">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-studio-cream">WEB AUDIO SYNTHESIZER</h3>
            <p className="text-[11px] text-studio-creamMuted">Synthesizes drum hits directly in the browser</p>
          </div>
        </div>

        <button
          onClick={toggleAudio}
          className={`px-4 py-2 rounded-xl font-bold border transition-all ${
            audioEnabled
              ? 'bg-studio-green/15 text-studio-green border-studio-green/40 shadow-glowGreen'
              : 'bg-studio-surface text-studio-creamMuted border-studio-border'
          }`}
        >
          {audioEnabled ? 'ENABLED' : 'MUTED'}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
