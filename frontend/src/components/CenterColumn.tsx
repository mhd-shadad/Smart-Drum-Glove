import React from 'react';
import { useGloveStore } from '../store/useGloveStore';
import RealisticHand3D from './RealisticHand3D';
import { Eye, Sparkles, Activity } from 'lucide-react';

export const CenterColumn: React.FC = () => {
  const { activeSide, setActiveSide, isHandFlashing, lastHit, rh, lh } = useGloveStore();

  const currentGlove = activeSide === 'rh' ? rh : lh;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* ---------------- 3D HAND TOP BAR & HIT PULSE ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-4 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-studio-gold" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-studio-gold font-mono">
              BIOMECHANICAL 3D HAND VIEWPORT
            </h2>
          </div>

          {/* Hand view toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-studio-creamMuted mr-1">SIDE:</span>
            <div className="flex bg-[#0b0d12] p-1 rounded-xl border border-studio-border shadow-proInset">
              <button
                onClick={() => setActiveSide('rh')}
                className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                  activeSide === 'rh'
                    ? 'bg-studio-gold text-black shadow-glowGold'
                    : 'text-studio-creamMuted hover:text-white'
                }`}
              >
                RH (RIGHT)
              </button>
              <button
                onClick={() => setActiveSide('lh')}
                className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                  activeSide === 'lh'
                    ? 'bg-studio-green text-black shadow-glowGreen'
                    : 'text-studio-creamMuted hover:text-white'
                }`}
              >
                LH (LEFT)
              </button>
            </div>
          </div>
        </div>

        {/* Live Drum Hit Pulse Ribbon */}
        <div
          className={`w-full py-2.5 px-4 rounded-xl border transition-all duration-150 flex items-center justify-between shadow-proInset ${
            isHandFlashing
              ? 'bg-studio-amber/25 border-studio-amber shadow-glowAmber scale-[1.01]'
              : 'bg-[#0b0d12] border-studio-border'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles
              className={`w-4 h-4 transition-colors ${
                isHandFlashing ? 'text-studio-amber animate-spin' : 'text-studio-creamMuted'
              }`}
            />
            <div className="flex items-center gap-2 font-mono">
              <span className="text-xs text-studio-creamMuted">LAST HIT:</span>
              <span
                className={`text-sm font-extrabold uppercase tracking-wide ${
                  isHandFlashing ? 'text-studio-amber' : 'text-studio-cream'
                }`}
              >
                {lastHit ? lastHit.name : 'NO RECENT HIT'}
              </span>
            </div>
          </div>

          {lastHit && (
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-studio-gold">NOTE: #{lastHit.note}</span>
              <span className="text-studio-green">VEL: {lastHit.velocity}</span>
              <span className="text-studio-amber uppercase">[{lastHit.side}]</span>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- 3D CANVAS VIEWPORT ---------------- */}
      <div className="relative flex-1 min-h-[460px] w-full rounded-2xl overflow-hidden border border-studio-border bg-[#0b0d12] shadow-2xl">
        <RealisticHand3D side={activeSide} />

        {/* Floating Telemetry HUD */}
        <div className="absolute top-4 left-4 flex flex-col gap-1.5 pointer-events-none">
          <div className="flex items-center gap-2 bg-[#12141a]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-studio-border text-xs font-mono shadow-xl">
            <span
              className={`w-2 h-2 rounded-full ${
                currentGlove.connected ? 'bg-studio-green shadow-glowGreen animate-pulse' : 'bg-studio-red'
              }`}
            />
            <span className="text-studio-creamMuted">FLEX STREAM:</span>
            <span className="text-studio-gold font-bold">
              F1:{currentGlove.f1} F2:{currentGlove.f2} F3:{currentGlove.f3} F4:{currentGlove.f4}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-[#12141a]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-studio-border text-xs font-mono shadow-xl">
            <Activity className="w-3.5 h-3.5 text-studio-green" />
            <span className="text-studio-creamMuted">IMU FUSION:</span>
            <span className="text-studio-cream font-bold">
              {currentGlove.movement > 5.0 ? 'DYNAMIC MOTION' : 'STEADY'} (Mv: {currentGlove.movement.toFixed(1)})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CenterColumn;
