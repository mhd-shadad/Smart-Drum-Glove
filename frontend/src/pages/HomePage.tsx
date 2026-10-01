import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGloveStore } from '../store/useGloveStore';
import RealisticHand3D from '../components/RealisticHand3D';
import {
  Layers,
  Disc,
  Activity,
  Zap,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Radio,
  Sparkles,
  Music,
  Volume2,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const {
    activeSide,
    setActiveSide,
    rh,
    lh,
    midi,
    wsConnected,
    isHandFlashing,
    lastHit,
    triggerTestNote,
  } = useGloveStore();

  const currentGlove = activeSide === 'rh' ? rh : lh;

  // Ambient audio-reactive visualizer state (24 frequency bands)
  const [visualizerBars, setVisualizerBars] = useState<number[]>(() =>
    Array.from({ length: 24 }, () => Math.floor(Math.random() * 20 + 8))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setVisualizerBars((prev) =>
        prev.map((val, idx) => {
          // If hand is flashing (drum strike triggered), pulse the spectrum
          if (isHandFlashing) {
            const centerPeak = Math.sin((idx / 24) * Math.PI);
            return Math.min(100, Math.floor(val * 0.7 + centerPeak * 95));
          }
          // Motion energy reaction
          const motionBoost = Math.min(40, currentGlove.movement * 2.5);
          const noise = (Math.sin(Date.now() * 0.005 + idx * 0.8) + 1) * 12;
          const target = Math.max(8, Math.min(100, motionBoost + noise + (idx % 3) * 5));
          return Math.floor(val * 0.75 + target * 0.25);
        })
      );
    }, 60);

    return () => clearInterval(interval);
  }, [isHandFlashing, currentGlove.movement]);

  return (
    <div className="flex flex-col gap-5 h-full max-w-7xl mx-auto overflow-y-auto pr-1">
      {/* ---------------- HERO ROW: 3D HAND + TELEMETRY SPOTLIGHT ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[520px]">
        {/* 3D Realistic Hand Viewport */}
        <div className="lg:col-span-8 flex flex-col relative rounded-2xl overflow-hidden min-h-[480px] border border-studio-border bg-[#0b0d12] shadow-2xl">
          {/* Top Bar inside 3D canvas */}
          <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2 bg-[#12141a]/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-studio-border shadow-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-studio-gold shadow-glowGold animate-pulse" />
              <span className="text-xs font-mono font-bold text-studio-cream tracking-wide">
                BIOMECHANICAL 3D HAND SKELETON
              </span>
            </div>

            {/* Hand Toggle */}
            <div className="pointer-events-auto flex bg-[#12141a]/90 backdrop-blur-md p-1 rounded-xl border border-studio-border text-xs font-mono shadow-xl">
              <button
                onClick={() => setActiveSide('rh')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  activeSide === 'rh'
                    ? 'bg-studio-gold text-black shadow-glowGold'
                    : 'text-studio-creamMuted hover:text-white'
                }`}
              >
                RIGHT (RH)
              </button>
              <button
                onClick={() => setActiveSide('lh')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  activeSide === 'lh'
                    ? 'bg-studio-green text-black shadow-glowGreen'
                    : 'text-studio-creamMuted hover:text-white'
                }`}
              >
                LEFT (LH)
              </button>
            </div>
          </div>

          {/* Canvas */}
          <RealisticHand3D side={activeSide} />

          {/* Dynamic Hit Flash Banner */}
          <div
            className={`absolute bottom-4 right-4 z-10 pointer-events-none transition-all duration-150 px-4 py-2 rounded-xl border backdrop-blur-md flex items-center gap-2.5 font-mono text-xs ${
              isHandFlashing
                ? 'bg-studio-amber/30 border-studio-amber text-studio-amber shadow-glowAmber scale-105 font-bold'
                : 'bg-[#12141a]/85 border-studio-border text-studio-creamMuted'
            }`}
          >
            <Zap className={`w-4 h-4 ${isHandFlashing ? 'text-studio-amber animate-bounce' : 'text-studio-creamMuted'}`} />
            <span>
              {lastHit
                ? `LAST HIT: ${lastHit.name.toUpperCase()} (#${lastHit.note} | VEL ${lastHit.velocity})`
                : 'IDLE SENSOR STREAM (READY)'}
            </span>
          </div>

          {/* Bottom Left Quick Orbit Hint */}
          <div className="absolute bottom-4 left-4 z-10 pointer-events-none hidden sm:flex items-center gap-2 bg-[#12141a]/75 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/5 text-[10px] font-mono text-studio-creamMuted">
            <span>DRAG TO ORBIT / SCROLL TO ZOOM</span>
          </div>
        </div>

        {/* Telemetry Summary & Quick Controls Column */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Real-time Status Card */}
          <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-studio-gold flex items-center gap-2">
                <Radio className="w-3.5 h-3.5" /> LIVE SENSOR METRICS
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                  currentGlove.connected
                    ? 'bg-studio-green/20 text-studio-green border-studio-green/40 shadow-glowGreen'
                    : 'bg-studio-surface text-studio-creamMuted border-studio-border'
                }`}
              >
                {currentGlove.connected ? 'STREAM ACTIVE' : 'DISCONNECTED'}
              </span>
            </div>

            {/* Flex Sensor Gauges */}
            <div className="flex flex-col gap-2 pt-1 font-mono text-xs">
              {[
                { label: 'F1 (Index)', val: currentGlove.f1 },
                { label: 'F2 (Middle)', val: currentGlove.f2 },
                { label: 'F3 (Ring)', val: currentGlove.f3 },
                { label: 'F4 (Pinky)', val: currentGlove.f4 },
              ].map((f, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-studio-creamMuted">{f.label}</span>
                    <span className="text-studio-gold font-bold tabular-nums">{f.val}</span>
                  </div>
                  <div className="w-full bg-[#0b0d12] h-2 rounded-full overflow-hidden border border-studio-border shadow-proInset p-[1px]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-studio-gold to-studio-amber transition-all duration-75"
                      style={{ width: `${Math.min(100, (f.val / 4095) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* MPU6050 Motion Snapshot */}
            <div className="mt-2 pt-3 border-t border-studio-border flex flex-col gap-2 font-mono text-xs">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-studio-creamMuted">Movement Energy:</span>
                <span className="text-studio-green font-bold tabular-nums">
                  {currentGlove.movement.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="bg-[#0b0d12] p-1.5 rounded-lg border border-studio-border shadow-proInset">
                  <div className="text-studio-creamMuted">ACC X</div>
                  <div className="font-bold text-studio-cream">{currentGlove.ax.toFixed(2)}</div>
                </div>
                <div className="bg-[#0b0d12] p-1.5 rounded-lg border border-studio-border shadow-proInset">
                  <div className="text-studio-creamMuted">ACC Y</div>
                  <div className="font-bold text-studio-cream">{currentGlove.ay.toFixed(2)}</div>
                </div>
                <div className="bg-[#0b0d12] p-1.5 rounded-lg border border-studio-border shadow-proInset">
                  <div className="text-studio-creamMuted">ACC Z</div>
                  <div className="font-bold text-studio-cream">{currentGlove.az.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Quick Test Trigger Buttons */}
            <div className="mt-1 pt-2 border-t border-studio-border flex gap-2">
              <button
                onClick={() => triggerTestNote(36, 120)}
                className="flex-1 py-2 rounded-xl bg-studio-gold text-black font-mono text-xs font-bold transition-all shadow-glowGold hover:bg-studio-goldBright"
              >
                TEST KICK (#36)
              </button>
              <button
                onClick={() => triggerTestNote(38, 110)}
                className="flex-1 py-2 rounded-xl bg-studio-surface hover:bg-studio-elevated border border-studio-border text-studio-cream font-mono text-xs font-bold transition-all shadow-proInset"
              >
                TEST SNARE (#38)
              </button>
            </div>
          </div>

          {/* Quick Hub Navigation Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/studio"
              className="group p-3.5 rounded-2xl bg-[#12141a]/95 hover:bg-studio-surface border border-studio-border hover:border-studio-gold/40 transition-all flex flex-col gap-1.5 shadow-xl"
            >
              <div className="w-8 h-8 rounded-xl bg-studio-gold/15 text-studio-gold flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold text-studio-cream group-hover:text-studio-gold flex items-center justify-between">
                  3D Studio <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </h3>
                <p className="text-[10px] text-studio-creamMuted line-clamp-1 font-mono">
                  Full 3-column control matrix
                </p>
              </div>
            </Link>

            <Link
              to="/drums"
              className="group p-3.5 rounded-2xl bg-[#12141a]/95 hover:bg-studio-surface border border-studio-border hover:border-studio-gold/40 transition-all flex flex-col gap-1.5 shadow-xl"
            >
              <div className="w-8 h-8 rounded-xl bg-studio-amber/15 text-studio-amber flex items-center justify-center">
                <Disc className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold text-studio-cream group-hover:text-studio-amber flex items-center justify-between">
                  3D Drum Kit <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </h3>
                <p className="text-[10px] text-studio-creamMuted line-clamp-1 font-mono">
                  14-piece kinetic drum rig
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* ---------------- AMBIENT AUDIO-REACTIVE SPECTRUM VISUALIZER ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-4 shadow-xl flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-studio-gold" />
            <span className="text-xs font-mono font-bold text-studio-cream tracking-wider">
              REAL-TIME KINETIC & AUDIO SPECTRUM VISUALIZER
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono text-studio-creamMuted">
            <span>24 BANDS</span>
            <span className="text-studio-green font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-studio-green animate-pulse" /> REACTIVE
            </span>
          </div>
        </div>

        {/* 24-Band LED Spectrum Display */}
        <div className="bg-[#0b0d12] p-3 rounded-xl border border-studio-border shadow-proInset flex items-end justify-between gap-1.5 h-20">
          {visualizerBars.map((height, i) => {
            const isHigh = height > 70;
            const isMid = height > 40;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col justify-end h-full rounded-sm overflow-hidden bg-[#141722]"
              >
                <div
                  className={`w-full transition-all duration-75 rounded-t-sm ${
                    isHigh
                      ? 'bg-studio-amber shadow-glowAmber'
                      : isMid
                      ? 'bg-studio-gold'
                      : 'bg-studio-gold/60'
                  }`}
                  style={{ height: `${height}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------- HARDWARE & ARCHITECTURE SNAPSHOT ---------------- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4">
        <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-4 flex items-center gap-3.5 shadow-xl">
          <div className="w-10 h-10 rounded-xl bg-studio-gold/15 border border-studio-gold/30 text-studio-gold flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-studio-creamMuted uppercase tracking-wider">
              CONTROLLER
            </span>
            <span className="text-xs font-mono font-bold text-studio-cream">
              ESP32 Tensilica Dual-Core
            </span>
          </div>
        </div>

        <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-4 flex items-center gap-3.5 shadow-xl">
          <div className="w-10 h-10 rounded-xl bg-studio-green/15 border border-studio-green/30 text-studio-green flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-studio-creamMuted uppercase tracking-wider">
              LATENCY PIPELINE
            </span>
            <span className="text-xs font-mono font-bold text-studio-cream">
              USB Serial & WiFi UDP
            </span>
          </div>
        </div>

        <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-4 flex items-center gap-3.5 shadow-xl">
          <div className="w-10 h-10 rounded-xl bg-studio-amber/15 border border-studio-amber/30 text-studio-amber flex items-center justify-center shrink-0">
            <Music className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-studio-creamMuted uppercase tracking-wider">
              MIDI OUTPUT
            </span>
            <span className="text-xs font-mono font-bold text-studio-cream">
              GM Channel 10 Standard
            </span>
          </div>
        </div>

        <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-4 flex items-center gap-3.5 shadow-xl">
          <div className="w-10 h-10 rounded-xl bg-studio-gold/15 border border-studio-gold/30 text-studio-gold flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-studio-creamMuted uppercase tracking-wider">
              IMU FUSION FILTER
            </span>
            <span className="text-xs font-mono font-bold text-studio-cream">
              α = 0.98 Complementary
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
