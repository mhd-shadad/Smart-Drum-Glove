import React from 'react';
import { useGloveStore } from '../store/useGloveStore';
import DrumKit3D from '../components/DrumKit3D';
import { Volume2, Sparkles, Disc, Video, Zap, Activity } from 'lucide-react';

const DRUM_PADS = [
  { key: 'kick', label: 'KICK', note: 36, hotkey: '1' },
  { key: 'snare', label: 'SNARE', note: 38, hotkey: '2' },
  { key: 'closed_hihat', label: 'HI-HAT', note: 42, hotkey: '3' },
  { key: 'open_hihat', label: 'OPEN HH', note: 46, hotkey: '4' },
  { key: 'low_tom', label: 'LOW TOM', note: 45, hotkey: '5' },
  { key: 'mid_tom', label: 'MID TOM', note: 47, hotkey: '6' },
  { key: 'high_tom', label: 'HIGH TOM', note: 50, hotkey: '7' },
  { key: 'crash', label: 'CRASH', note: 49, hotkey: '8' },
  { key: 'ride', label: 'RIDE', note: 51, hotkey: '9' },
  { key: 'ride_bell', label: 'RIDE BELL', note: 53, hotkey: '0' },
  { key: 'china', label: 'CHINA', note: 52, hotkey: '-' },
  { key: 'splash', label: 'SPLASH', note: 55, hotkey: '=' },
  { key: 'cowbell', label: 'COWBELL', note: 56, hotkey: 'Q' },
  { key: 'clap', label: 'CLAP', note: 39, hotkey: 'W' },
];

export const DrumsPage: React.FC = () => {
  const {
    activePads,
    lastHit,
    isHandFlashing,
    triggerTestNote,
    audioEnabled,
    toggleAudio,
    cameraPreset,
    setCameraPreset,
  } = useGloveStore();

  const hitVelocity = lastHit ? lastHit.velocity : 0;
  const velPercent = Math.min(100, Math.round((hitVelocity / 127) * 100));

  return (
    <div className="flex flex-col gap-4 h-full max-w-7xl mx-auto overflow-y-auto pr-1">
      {/* ---------------- 3D DRUM KIT STAGE ---------------- */}
      <div className="relative flex-1 min-h-[480px] w-full rounded-2xl overflow-hidden border border-studio-border shadow-2xl bg-[#090b10]">
        <DrumKit3D />

        {/* Top Floating Controls & Intensity HUD */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
          {/* Velocity Strike Intensity Gauge */}
          <div
            className={`px-3.5 py-2 rounded-xl border font-mono text-xs flex items-center gap-3 backdrop-blur-md shadow-2xl transition-all duration-150 ${
              isHandFlashing
                ? 'bg-studio-amber/25 border-studio-amber text-studio-amber shadow-glowAmber scale-105 font-bold'
                : 'bg-[#12141a]/90 border-studio-border text-studio-creamMuted'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${isHandFlashing ? 'text-studio-amber animate-spin' : 'text-studio-creamMuted'}`} />
            {lastHit ? (
              <div className="flex items-center gap-2.5">
                <span className="text-white font-bold">{lastHit.name.toUpperCase()}</span>
                <span className="text-studio-gold">#{lastHit.note}</span>
                <div className="flex items-center gap-1.5 pl-1 border-l border-white/10">
                  <span className="text-[10px] text-studio-creamMuted">VEL:</span>
                  <span className="text-studio-amber font-bold">{hitVelocity}</span>
                  <div className="w-16 bg-[#080a0e] h-2 rounded-full overflow-hidden border border-white/10 shadow-proInset p-[1px]">
                    <div
                      className={`h-full rounded-full transition-all duration-75 ${
                        hitVelocity > 100
                          ? 'bg-studio-amber shadow-glowAmber'
                          : hitVelocity > 60
                          ? 'bg-studio-gold'
                          : 'bg-studio-green'
                      }`}
                      style={{ width: `${velPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <span>STRIKE GLOVE OR PRESS 1-9</span>
            )}
          </div>
        </div>
      </div>

      {/* ---------------- 14-PAD TRIGGER MATRIX & CONTROLS ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-4 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-studio-gold" />
            <span className="text-xs font-mono font-bold text-studio-cream tracking-wide">
              14-PAD VELOCITY MATRIX & KEYBOARD SHORTCUTS
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Camera Presets Selector */}
            <div className="hidden sm:flex bg-[#0b0d12] p-1 rounded-xl border border-studio-border font-mono text-[11px] shadow-proInset">
              <button
                onClick={() => setCameraPreset('pov')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  cameraPreset === 'pov'
                    ? 'bg-studio-gold text-black font-bold shadow-glowGold'
                    : 'text-studio-creamMuted hover:text-white'
                }`}
              >
                DRUMMER POV
              </button>
              <button
                onClick={() => setCameraPreset('front')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  cameraPreset === 'front'
                    ? 'bg-studio-gold text-black font-bold shadow-glowGold'
                    : 'text-studio-creamMuted hover:text-white'
                }`}
              >
                STAGE
              </button>
              <button
                onClick={() => setCameraPreset('top')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  cameraPreset === 'top'
                    ? 'bg-studio-gold text-black font-bold shadow-glowGold'
                    : 'text-studio-creamMuted hover:text-white'
                }`}
              >
                OVERHEAD
              </button>
            </div>

            {/* Audio Toggle */}
            <button
              onClick={toggleAudio}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold border transition-all ${
                audioEnabled
                  ? 'bg-studio-green/15 text-studio-green border-studio-green/40 shadow-glowGreen'
                  : 'bg-studio-surface text-studio-creamMuted border-studio-border'
              }`}
            >
              {audioEnabled ? 'SYNTH ACTIVE' : 'MUTED'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          {DRUM_PADS.map((pad) => {
            const isFired = !!activePads[pad.note];
            return (
              <button
                key={pad.key}
                onClick={() => triggerTestNote(pad.note, 110)}
                className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1 font-mono transition-all duration-75 select-none relative group shadow-proInset ${
                  isFired
                    ? 'bg-studio-amber text-black scale-[0.96] shadow-glowAmber border border-white font-extrabold'
                    : 'bg-[#0b0d12] hover:bg-studio-surface text-studio-cream border border-studio-border hover:border-studio-gold/60 font-bold'
                }`}
              >
                {/* Hotkey Tag */}
                <span
                  className={`absolute top-1 right-1.5 text-[9px] px-1 rounded ${
                    isFired ? 'bg-black/30 text-black font-bold' : 'text-studio-creamMuted group-hover:text-studio-gold'
                  }`}
                >
                  [{pad.hotkey}]
                </span>

                <span className="text-xs tracking-wider mt-1">{pad.label}</span>
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
    </div>
  );
};

export default DrumsPage;
