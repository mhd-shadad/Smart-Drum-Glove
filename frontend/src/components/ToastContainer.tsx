import React from 'react';
import { useGloveStore } from '../store/useGloveStore';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useGloveStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {toasts.map((toast) => {
        let icon = <Info className="w-4 h-4 text-studio-gold shrink-0" />;
        let borderColor = 'border-studio-gold/40';
        let bgGlow = 'shadow-glowGold';

        if (toast.type === 'success') {
          icon = <CheckCircle2 className="w-4 h-4 text-studio-green shrink-0" />;
          borderColor = 'border-studio-green/40';
          bgGlow = 'shadow-glowGreen';
        } else if (toast.type === 'warning') {
          icon = <AlertTriangle className="w-4 h-4 text-studio-amber shrink-0" />;
          borderColor = 'border-studio-amber/40';
          bgGlow = 'shadow-glowAmber';
        } else if (toast.type === 'error') {
          icon = <AlertCircle className="w-4 h-4 text-studio-red shrink-0" />;
          borderColor = 'border-studio-red/40';
          bgGlow = 'shadow-glowRed';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#12141a]/95 backdrop-blur-md border ${borderColor} text-studio-cream text-xs font-mono shadow-2xl transition-all ${bgGlow}`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              {icon}
              <span className="truncate">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-studio-creamMuted hover:text-white transition-colors p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
