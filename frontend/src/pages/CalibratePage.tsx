import React from 'react';
import { useGloveStore } from '../store/useGloveStore';
import {
  Sliders,
  CheckCircle2,
  Sparkles,
  Info,
  Activity,
  RotateCw,
} from 'lucide-react';

export const CalibratePage: React.FC = () => {
  const {
    activeSide,
    setActiveSide,
    rh,
    lh,
    settings,
    calibrate,
    suggestThresholds,
    updateSetting,
  } = useGloveStore();

  const currentGlove = activeSide === 'rh' ? rh : lh;

  const fingers = [
    { key: 'f1', label: 'Index Finger (F1)', thrKey: 'flex1_threshold' as const },
    { key: 'f2', label: 'Middle Finger (F2)', thrKey: 'flex2_threshold' as const },
    { key: 'f3', label: 'Ring Finger (F3)', thrKey: 'flex3_threshold' as const },
    { key: 'f4', label: 'Pinky Finger (F4)', thrKey: 'flex4_threshold' as const },
  ];

  // Circumference for 32 radius circle: 2 * PI * 32 ~= 201.06
  const strokeCircumference = 201;
  const strokeOffset = strokeCircumference - (strokeCircumference * currentGlove.calibPct) / 100;

  return (
    <div className="flex flex-col gap-5 h-full max-w-5xl mx-auto overflow-y-auto pr-1">
      {/* ---------------- WIZARD HEADER & GLOVE SELECTOR ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-studio-gold/20 border border-studio-gold/40 flex items-center justify-center text-studio-gold shadow-glowGold">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold font-mono text-studio-cream flex items-center gap-2">
              CALIBRATION WIZARD
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-studio-gold/15 text-studio-gold border border-studio-gold/30">
                FLEX BASELINE
              </span>
            </h2>
            <p className="text-xs font-mono text-studio-creamMuted">
              Sample rest baseline & calculate optimal trigger thresholds
            </p>
          </div>
        </div>

        {/* Hand Side Toggle */}
        <div className="flex bg-[#0b0d12] p-1 rounded-xl border border-studio-border font-mono text-xs shadow-proInset">
          <button
            onClick={() => setActiveSide('rh')}
            className={`px-4 py-1.5 rounded-lg font-bold transition-all ${
              activeSide === 'rh'
                ? 'bg-studio-gold text-black shadow-glowGold'
                : 'text-studio-creamMuted hover:text-white'
            }`}
          >
            RIGHT HAND (RH)
          </button>
          <button
            onClick={() => setActiveSide('lh')}
            className={`px-4 py-1.5 rounded-lg font-bold transition-all ${
              activeSide === 'lh'
                ? 'bg-studio-green text-black shadow-glowGreen'
                : 'text-studio-creamMuted hover:text-white'
            }`}
          >
            LEFT HAND (LH)
          </button>
        </div>
      </div>

      {/* ---------------- STEP 1: REST POSITION SAMPLING ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-5 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-6 h-6 rounded-full bg-studio-gold/20 border border-studio-gold text-studio-gold flex items-center justify-center text-xs font-bold shadow-glowGold">
              1
            </span>
            <span className="text-sm font-bold text-studio-cream">RECORD REST BASELINE</span>
          </div>

          <span
            className={`text-xs font-mono font-bold px-3 py-1 rounded-xl border ${
              currentGlove.calibDone
                ? 'bg-studio-green/15 text-studio-green border-studio-green/40 shadow-glowGreen'
                : currentGlove.isCalibrating
                ? 'bg-studio-amber/15 text-studio-amber border-studio-amber/40 animate-pulse shadow-glowAmber'
                : 'bg-studio-surface text-studio-creamMuted border-studio-border'
            }`}
          >
            {currentGlove.isCalibrating
              ? `CALIBRATING (${currentGlove.calibPct}%)`
              : currentGlove.calibDone
              ? 'CALIBRATION COMPLETE'
              : 'READY TO SAMPLE'}
          </span>
        </div>

        <div className="bg-[#0b0d12] p-5 rounded-xl border border-studio-border flex flex-col md:flex-row items-center gap-5 font-mono text-xs shadow-proInset">
          {/* Circular SVG Calibration Progress Gauge */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg className="w-24 h-24 -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="38"
                stroke="#171a23"
                strokeWidth="7"
                fill="transparent"
              />
              <circle
                cx="48"
                cy="48"
                r="38"
                stroke={currentGlove.calibDone ? '#10b981' : '#d4a373'}
                strokeWidth="7"
                fill="transparent"
                strokeDasharray={238}
                strokeDashoffset={238 - (238 * currentGlove.calibPct) / 100}
                strokeLinecap="round"
                className="transition-all duration-150"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-base font-bold text-studio-cream">
                {currentGlove.calibPct}%
              </span>
              <span className="text-[9px] text-studio-creamMuted">SAMPLE</span>
            </div>
          </div>

          {/* Description & Action */}
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-start gap-2.5 text-studio-creamMuted">
              <Info className="w-4 h-4 text-studio-gold shrink-0 mt-0.5" />
              <p>
                Keep fingers fully extended and rest your hand flat on the desk surface.
                Clicking <strong>START CALIBRATION</strong> takes 40 consecutive 12-bit ADC readings per finger to establish accurate rest offsets.
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => calibrate(activeSide)}
                disabled={currentGlove.isCalibrating}
                className={`flex-1 py-2.5 rounded-xl font-mono text-xs font-bold transition-all border ${
                  currentGlove.isCalibrating
                    ? 'bg-studio-surface border-studio-border text-studio-creamMuted cursor-not-allowed'
                    : 'bg-studio-gold text-black hover:bg-studio-goldBright shadow-glowGold'
                }`}
              >
                {currentGlove.isCalibrating ? 'RECORDING SAMPLES (HOLD STILL)...' : 'START CALIBRATION (SPACE)'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- STEP 2: AUTO-SUGGEST & FINE-TUNE ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-5 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-6 h-6 rounded-full bg-studio-gold/20 border border-studio-gold text-studio-gold flex items-center justify-center text-xs font-bold shadow-glowGold">
              2
            </span>
            <span className="text-sm font-bold text-studio-cream">TRIGGER THRESHOLDS</span>
          </div>

          <button
            onClick={() => suggestThresholds(activeSide)}
            className="px-3.5 py-1.5 rounded-xl bg-studio-surface hover:bg-studio-elevated border border-studio-border hover:border-studio-gold/40 text-studio-cream font-mono text-xs font-bold transition-all shadow-proInset flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-studio-gold" />
            AUTO-SUGGEST THRESHOLDS
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {fingers.map((f, i) => {
            const rawVal = currentGlove[f.key as keyof typeof currentGlove] as number;
            const deltaVal = currentGlove.bend[f.key as keyof typeof currentGlove.bend];
            const thrVal = settings[f.thrKey];
            const isFired = deltaVal >= thrVal;

            return (
              <div
                key={f.key}
                className="bg-[#0b0d12] p-4 rounded-xl border border-studio-border flex flex-col gap-2.5 font-mono shadow-proInset"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-studio-cream">{f.label}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                      isFired
                        ? 'bg-studio-amber/20 border-studio-amber text-studio-amber shadow-glowAmber animate-pulse'
                        : 'bg-studio-surface border-studio-border text-studio-creamMuted'
                    }`}
                  >
                    Δ {deltaVal} / THRESH {thrVal}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-studio-creamMuted">
                  <span>RAW ADC: {rawVal}</span>
                  <span>THRESHOLD: {thrVal}</span>
                </div>

                <input
                  type="range"
                  min="5"
                  max="100"
                  value={thrVal}
                  onChange={(e) => updateSetting(f.thrKey, Number(e.target.value))}
                  className="w-full"
                />

                <div className="w-full bg-[#171a23] h-2 rounded-full overflow-hidden relative">
                  <div
                    className={`h-full transition-all duration-75 ${
                      isFired ? 'bg-studio-amber shadow-glowAmber' : 'bg-studio-gold'
                    }`}
                    style={{ width: `${Math.min(100, (deltaVal / 100) * 100)}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-studio-red z-10"
                    style={{ left: `${Math.min(100, (thrVal / 100) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------- STEP 3: LIVE VERIFICATION ---------------- */}
      <div className="bg-[#12141a]/95 border border-studio-border rounded-2xl p-5 shadow-xl flex flex-col gap-4">
        <div className="flex items-center gap-2 font-mono">
          <span className="w-6 h-6 rounded-full bg-studio-gold/20 border border-studio-gold text-studio-gold flex items-center justify-center text-xs font-bold shadow-glowGold">
            3
          </span>
          <span className="text-sm font-bold text-studio-cream">LIVE SENSOR VERIFICATION</span>
        </div>

        <div className="bg-[#0b0d12] p-4 rounded-xl border border-studio-border flex flex-col gap-2 font-mono text-xs shadow-proInset">
          <div className="flex items-center gap-2 text-studio-cream">
            <CheckCircle2 className="w-4 h-4 text-studio-green" />
            <span>Flex each finger individually. The corresponding meter should pulse amber when triggered.</span>
          </div>
          <div className="flex items-center gap-2 text-studio-creamMuted text-[11px] mt-1">
            <Activity className="w-4 h-4 text-studio-gold" />
            <span>Current glove: {activeSide.toUpperCase()} | Movement Energy: {currentGlove.movement.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalibratePage;
