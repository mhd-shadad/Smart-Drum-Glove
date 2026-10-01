import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './Header';
import Sidebar from './Sidebar';
import ToastContainer from './ToastContainer';
import { useGloveStore } from '../store/useGloveStore';
import { X, Keyboard, Sparkles } from 'lucide-react';

const SHORTCUT_DRUMS: Record<string, number> = {
  '1': 36, // Kick
  '2': 38, // Snare
  '3': 42, // Closed Hi-Hat
  '4': 46, // Open Hi-Hat
  '5': 45, // Low Tom
  '6': 47, // Mid Tom
  '7': 50, // High Tom
  '8': 49, // Crash
  '9': 51, // Ride
  '0': 53, // Ride Bell
  '-': 52, // China
  '=': 55, // Splash
  'q': 56, // Cowbell
  'w': 39, // Clap
};

export const Layout: React.FC = () => {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerTestNote, calibrate, activeSide } = useGloveStore();

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in input/textarea/select
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Help Modal (?)
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
        return;
      }

      // Close modal on Escape
      if (e.key === 'Escape' && showShortcuts) {
        setShowShortcuts(false);
        return;
      }

      // Drum pad hits (1-9, 0, -, =, q, w)
      if (SHORTCUT_DRUMS[key] !== undefined) {
        e.preventDefault();
        triggerTestNote(SHORTCUT_DRUMS[key], 110);
        return;
      }

      // Calibrate (Space)
      if (e.code === 'Space') {
        e.preventDefault();
        calibrate(activeSide);
        return;
      }

      // Navigation shortcuts
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        switch (key) {
          case 'h':
            navigate('/');
            break;
          case 's':
            navigate('/studio');
            break;
          case 'd':
            navigate('/drums');
            break;
          case 'c':
            navigate('/calibrate');
            break;
          case 'e':
            navigate('/settings');
            break;
          case 'l':
            navigate('/logs');
            break;
          case 'a':
            navigate('/about');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, triggerTestNote, calibrate, activeSide, showShortcuts]);

  return (
    <div className="flex h-screen w-screen bg-[#090a0f] text-studio-cream overflow-hidden font-sans select-none">
      {/* Persistent Left Sidebar */}
      <Sidebar />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Persistent Top Header */}
        <Header onOpenShortcuts={() => setShowShortcuts(true)} />

        {/* Dynamic Route View with Framer Motion Page Transition */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-5 bg-studio-grid">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="h-full w-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Toast System */}
      <ToastContainer />

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#12141c] border border-studio-border rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-studio-border pb-3">
              <div className="flex items-center gap-2 text-studio-gold font-bold text-sm">
                <Keyboard className="w-4 h-4" />
                <span>STUDIO KEYBOARD SHORTCUTS</span>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-studio-creamMuted hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Drum Triggers */}
              <div className="flex flex-col gap-1.5 bg-[#0b0d12] p-3 rounded-xl border border-studio-border shadow-proInset">
                <span className="text-studio-gold font-bold mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-studio-gold" /> DRUM PADS
                </span>
                <div className="flex justify-between"><span>1 : Kick</span> <span className="text-studio-gold">#36</span></div>
                <div className="flex justify-between"><span>2 : Snare</span> <span className="text-studio-gold">#38</span></div>
                <div className="flex justify-between"><span>3 : Closed Hat</span> <span className="text-studio-gold">#42</span></div>
                <div className="flex justify-between"><span>4 : Open Hat</span> <span className="text-studio-gold">#46</span></div>
                <div className="flex justify-between"><span>5 : Low Tom</span> <span className="text-studio-gold">#45</span></div>
                <div className="flex justify-between"><span>6 : Mid Tom</span> <span className="text-studio-gold">#47</span></div>
                <div className="flex justify-between"><span>7 : High Tom</span> <span className="text-studio-gold">#50</span></div>
                <div className="flex justify-between"><span>8 : Crash</span> <span className="text-studio-gold">#49</span></div>
                <div className="flex justify-between"><span>9 : Ride</span> <span className="text-studio-gold">#51</span></div>
                <div className="flex justify-between"><span>0 : Ride Bell</span> <span className="text-studio-gold">#53</span></div>
                <div className="flex justify-between"><span>- : China</span> <span className="text-studio-gold">#52</span></div>
                <div className="flex justify-between"><span>= : Splash</span> <span className="text-studio-gold">#55</span></div>
                <div className="flex justify-between"><span>Q : Cowbell</span> <span className="text-studio-gold">#56</span></div>
                <div className="flex justify-between"><span>W : Clap</span> <span className="text-studio-gold">#39</span></div>
              </div>

              {/* Navigation & Control */}
              <div className="flex flex-col gap-1.5 bg-[#0b0d12] p-3 rounded-xl border border-studio-border shadow-proInset">
                <span className="text-studio-green font-bold mb-1">NAVIGATION & ACTIONS</span>
                <div className="flex justify-between"><span>H</span> <span className="text-studio-creamMuted">Overview</span></div>
                <div className="flex justify-between"><span>S</span> <span className="text-studio-creamMuted">3D Studio</span></div>
                <div className="flex justify-between"><span>D</span> <span className="text-studio-creamMuted">Drum Kit</span></div>
                <div className="flex justify-between"><span>C</span> <span className="text-studio-creamMuted">Calibrate</span></div>
                <div className="flex justify-between"><span>E</span> <span className="text-studio-creamMuted">Settings</span></div>
                <div className="flex justify-between"><span>L</span> <span className="text-studio-creamMuted">Logs</span></div>
                <div className="flex justify-between"><span>A</span> <span className="text-studio-creamMuted">System Info</span></div>
                <div className="flex justify-between mt-2 pt-2 border-t border-studio-border">
                  <span className="text-studio-gold font-bold">SPACE</span>
                  <span className="text-studio-creamMuted">Calibrate Hand</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-studio-amber font-bold">?</span>
                  <span className="text-studio-creamMuted">Toggle Shortcuts</span>
                </div>
              </div>
            </div>

            <div className="text-center text-studio-creamMuted text-[10px] pt-1">
              Press <span className="text-studio-gold font-bold">ESC</span> or click outside to dismiss.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
