import React from 'react';
import { useLocation } from 'react-router-dom';
import { useGloveStore } from '../store/useGloveStore';
import { Radio, Music, Cpu, Volume2, VolumeX, Sparkles, HelpCircle } from 'lucide-react';

interface HeaderProps {
  onOpenShortcuts?: () => void;
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'STUDIO OVERVIEW', subtitle: 'BIOMECHANICAL 3D HAND & SENSOR STREAM' },
  '/studio': { title: '3D WORKSTATION', subtitle: 'LIVE SENSORS, 3D VIEWPORT & MIDI CONSOLE' },
  '/drums': { title: '3D DRUM KIT RIG', subtitle: '14-PAD KINETIC PERCUSSION PLAYGROUND' },
  '/calibrate': { title: 'CALIBRATION WIZARD', subtitle: 'ANATOMICAL FLEX BASELINE & OPTIMIZER' },
  '/settings': { title: 'RACK SETTINGS', subtitle: 'GESTURE THRESHOLDS, SMOOTHING & MIDI PORTS' },
  '/logs': { title: 'CONSOLE AUDIT LOG', subtitle: 'TIMESTAMPED TELEMETRY & WEBSOCKET STREAM' },
  '/about': { title: 'SYSTEM ARCHITECTURE', subtitle: 'ESP32 PINOUT, IMU FILTER & HARDWARE SPECS' },
};

export const Header: React.FC<HeaderProps> = ({ onOpenShortcuts }) => {
  const { wsConnected, rh, lh, midi, audioEnabled, toggleAudio, isHandFlashing, lastHit } = useGloveStore();
  const location = useLocation();

  const currentMeta = pageTitles[location.pathname] || {
    title: 'SMART DRUM GLOVE',
    subtitle: 'WEARABLE MIDI CONTROLLER',
  };

  return (
    <header className="h-16 bg-[#0c0e14]/95 backdrop-blur-md border-b border-studio-border px-5 flex items-center justify-between z-20 shrink-0 select-none">
      {/* Route Title & Pro Audio Subtitle */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-black tracking-wider text-studio-cream font-mono flex items-center gap-2">
              {currentMeta.title}
              <span className="text-[9px] font-mono font-bold bg-studio-gold/15 text-studio-gold border border-studio-gold/30 px-1.5 py-0.5 rounded">
                PRO-V2
              </span>
            </h1>
          </div>
          <p className="text-[10px] font-mono text-studio-creamMuted tracking-tight hidden sm:block">
            {currentMeta.subtitle}
          </p>
        </div>

        {/* Live Hit Phosphor Badge */}
        {lastHit && isHandFlashing && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-studio-amber/20 border border-studio-amber text-studio-amber text-[10px] font-mono font-bold shadow-glowAmber animate-pulse">
            <Sparkles className="w-3 h-3 text-studio-amber" />
            <span>HIT: {lastHit.name.toUpperCase()} (NOTE #{lastHit.note})</span>
          </div>
        )}
      </div>

      {/* Global Connection Banner & Status Meters */}
      <div className="flex items-center gap-2.5">
        {/* Web Audio Synthesizer Toggle */}
        <button
          onClick={toggleAudio}
          title={audioEnabled ? 'Mute Web Audio Synth' : 'Enable Web Audio Synth'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-all ${
            audioEnabled
              ? 'bg-studio-surface border-studio-gold/40 text-studio-gold hover:bg-studio-elevated shadow-glowGold'
              : 'bg-studio-card border-studio-border text-studio-creamMuted hover:text-white'
          }`}
        >
          {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-studio-gold" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span className="text-[10px] font-bold hidden lg:inline">
            {audioEnabled ? 'SYNTH ON' : 'MUTED'}
          </span>
        </button>

        {/* Keyboard Shortcuts Trigger */}
        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            title="Keyboard Shortcuts (?)"
            className="p-1.5 rounded-xl bg-studio-card border border-studio-border text-studio-creamMuted hover:text-studio-gold hover:border-studio-gold/40 transition-all"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}

        {/* Global Connection Banner: BRIDGE */}
        <div className="flex items-center gap-2 bg-studio-card border border-studio-border rounded-xl px-2.5 py-1.5 text-xs font-mono shadow-proInset">
          <span
            className={`w-2 h-2 rounded-full ${
              wsConnected ? 'bg-studio-green shadow-glowGreen animate-pulse' : 'bg-studio-red shadow-glowRed'
            }`}
          />
          <span className="text-studio-creamMuted text-[10px] hidden sm:inline">BRIDGE:</span>
          <span
            className={`font-bold text-[10px] ${
              wsConnected ? 'text-studio-green' : 'text-studio-red'
            }`}
          >
            {wsConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        {/* Global Connection Banner: MIDI */}
        <div className="flex items-center gap-2 bg-studio-card border border-studio-border rounded-xl px-2.5 py-1.5 text-xs font-mono shadow-proInset">
          <Music
            className={`w-3.5 h-3.5 ${
              midi.connected ? 'text-studio-gold' : 'text-studio-creamMuted'
            }`}
          />
          <span className="text-studio-creamMuted text-[10px] hidden sm:inline">MIDI:</span>
          <span
            className={`font-bold text-[10px] ${
              midi.connected ? 'text-studio-gold' : 'text-studio-creamMuted'
            }`}
          >
            {midi.connected ? (midi.name.length > 9 ? midi.name.slice(0, 8) + '..' : midi.name) : 'NONE'}
          </span>
        </div>

        {/* Global Connection Banner: RH GLOVE */}
        <div className="flex items-center gap-2 bg-studio-card border border-studio-border rounded-xl px-2.5 py-1.5 text-xs font-mono shadow-proInset">
          <Cpu
            className={`w-3.5 h-3.5 ${
              rh.connected ? 'text-studio-amber animate-pulse' : 'text-studio-creamMuted'
            }`}
          />
          <span className="text-studio-creamMuted text-[10px]">RH:</span>
          <span
            className={`font-bold text-[10px] ${
              rh.connected ? 'text-studio-amber' : 'text-studio-creamMuted'
            }`}
          >
            {rh.connected ? 'ON' : 'OFF'}
          </span>
        </div>

        {/* Global Connection Banner: LH GLOVE */}
        <div className="flex items-center gap-2 bg-studio-card border border-studio-border rounded-xl px-2.5 py-1.5 text-xs font-mono shadow-proInset">
          <Cpu
            className={`w-3.5 h-3.5 ${
              lh.connected ? 'text-studio-green animate-pulse' : 'text-studio-creamMuted'
            }`}
          />
          <span className="text-studio-creamMuted text-[10px]">LH:</span>
          <span
            className={`font-bold text-[10px] ${
              lh.connected ? 'text-studio-green' : 'text-studio-creamMuted'
            }`}
          >
            {lh.connected ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
