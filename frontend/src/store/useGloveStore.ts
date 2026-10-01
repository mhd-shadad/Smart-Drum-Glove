import { create } from 'zustand';
import { GloveState, GloveSettings, DrumHit, PortInfo, MidiState, InboundMessage } from '../types';
import { audioSynth } from '../utils/audioSynth';

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

const defaultGloveState = (): GloveState => ({
  connected: false,
  f1: 0,
  f2: 0,
  f3: 0,
  f4: 0,
  ax: 0,
  ay: 0,
  az: 0,
  gx: 0,
  gy: 0,
  gz: 0,
  movement: 0,
  bend: { f1: 0, f2: 0, f3: 0, f4: 0 },
  calibPct: 0,
  isCalibrating: false,
  calibDone: false,
  lastUpdated: 0,
});

interface GloveStore {
  wsConnected: boolean;
  activeSide: 'rh' | 'lh';
  rh: GloveState;
  lh: GloveState;
  settings: GloveSettings;
  ports: PortInfo;
  midi: MidiState;
  lastHit: DrumHit | null;
  activePads: Record<number, boolean>;
  isHandFlashing: boolean;
  logs: string[];

  // Extended UI & Audio State
  audioEnabled: boolean;
  toasts: ToastItem[];
  activeDrumAnimations: Record<number, number>;
  cameraPreset: 'front' | 'top' | 'pov';

  // Actions
  connectWebSocket: () => void;
  send: (msg: any) => void;
  setActiveSide: (side: 'rh' | 'lh') => void;
  updateSetting: (key: keyof GloveSettings, value: number) => void;
  triggerTestNote: (note: number, velocity?: number) => void;
  connectGlove: (side: 'rh' | 'lh', mode: string, port: string | number) => void;
  disconnectGlove: (side: 'rh' | 'lh') => void;
  calibrate: (side: 'rh' | 'lh') => void;
  suggestThresholds: (side: 'rh' | 'lh') => void;
  openMidi: (name: string) => void;
  listPorts: () => void;
  clearLogs: () => void;

  // Extended Actions
  toggleAudio: () => void;
  addToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
  setCameraPreset: (preset: 'front' | 'top' | 'pov') => void;
}

let socket: WebSocket | null = null;
let reconnectTimer: any = null;
let handFlashTimer: any = null;
const padFlashTimers: Record<number, any> = {};

export const useGloveStore = create<GloveStore>((set, get) => ({
  wsConnected: false,
  activeSide: 'rh',
  rh: defaultGloveState(),
  lh: defaultGloveState(),
  settings: {
    flex1_threshold: 20,
    flex2_threshold: 20,
    flex3_threshold: 20,
    flex4_threshold: 20,
    movement_threshold: 5.0,
    gesture_cooldown: 0.20,
    smoothing: 0.35,
    velocity_sensitivity: 2.0,
    min_velocity: 40,
    max_velocity: 127,
  },
  ports: {
    serial: [],
    midi: [],
  },
  midi: {
    connected: false,
    name: '',
  },
  lastHit: null,
  activePads: {},
  isHandFlashing: false,
  logs: [],

  // Extended state defaults
  audioEnabled: true,
  toasts: [],
  activeDrumAnimations: {},
  cameraPreset: 'front',

  toggleAudio: () => {
    const next = !get().audioEnabled;
    audioSynth.setMuted(!next);
    set({ audioEnabled: next });
    get().addToast(`Audio Synthesizer ${next ? 'Enabled' : 'Muted'}`, 'info');
  },

  addToast: (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    const item: ToastItem = { id, message, type, timestamp: Date.now() };
    set((state) => ({ toasts: [...state.toasts.slice(-4), item] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id: string) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  setCameraPreset: (preset) => set({ cameraPreset: preset }),

  connectWebSocket: () => {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.port === '5173' || window.location.port === '3000'
      ? `${window.location.hostname}:8765`
      : window.location.host;
    const wsUrl = `${protocol}//${wsHost}/ws`;

    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        set({ wsConnected: true });
        const timeStr = new Date().toLocaleTimeString();
        set((state) => ({
          logs: [`[${timeStr}] WebSocket connected to ${wsUrl}`, ...state.logs.slice(0, 199)]
        }));
        get().addToast('Connected to Python WebSocket Bridge', 'success');
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      };

      socket.onmessage = (event) => {
        try {
          const data: InboundMessage = JSON.parse(event.data);
          const timeStr = new Date().toLocaleTimeString();

          switch (data.type) {
            case 'sensor_data': {
              const p = data.payload;
              const side = p.side === 'lh' ? 'lh' : 'rh';
              set((state) => ({
                [side]: {
                  ...state[side],
                  f1: p.f1 ?? 0,
                  f2: p.f2 ?? 0,
                  f3: p.f3 ?? 0,
                  f4: p.f4 ?? 0,
                  ax: p.ax ?? 0,
                  ay: p.ay ?? 0,
                  az: p.az ?? 0,
                  gx: p.gx ?? 0,
                  gy: p.gy ?? 0,
                  gz: p.gz ?? 0,
                  movement: p.movement ?? 0,
                  bend: p.bend ?? { f1: 0, f2: 0, f3: 0, f4: 0 },
                  lastUpdated: Date.now(),
                }
              }));
              break;
            }

            case 'drum_hit': {
              const p = data.payload;
              const hit: DrumHit = {
                side: p.side ?? 'rh',
                name: p.name ?? 'drum',
                note: p.note ?? 36,
                velocity: p.velocity ?? 100,
                timestamp: Date.now(),
              };

              // Synthesize audio
              if (get().audioEnabled) {
                audioSynth.playNote(hit.note, hit.velocity);
              }

              // Flash 3D hand emissive amber for 150ms
              if (handFlashTimer) clearTimeout(handFlashTimer);
              set((state) => ({
                isHandFlashing: true,
                lastHit: hit,
                activeDrumAnimations: {
                  ...state.activeDrumAnimations,
                  [hit.note]: Date.now(),
                }
              }));
              handFlashTimer = setTimeout(() => {
                set({ isHandFlashing: false });
              }, 150);

              // Flash corresponding drum pad for 150ms
              if (hit.note) {
                if (padFlashTimers[hit.note]) clearTimeout(padFlashTimers[hit.note]);
                set((state) => ({
                  activePads: { ...state.activePads, [hit.note]: true }
                }));
                padFlashTimers[hit.note] = setTimeout(() => {
                  set((state) => ({
                    activePads: { ...state.activePads, [hit.note]: false }
                  }));
                }, 150);
              }
              break;
            }

            case 'connection_changed': {
              const p = data.payload;
              const side = p.side === 'lh' ? 'lh' : 'rh';
              const isConn = !!p.connected;
              set((state) => ({
                [side]: {
                  ...state[side],
                  connected: isConn
                }
              }));
              get().addToast(
                `${side.toUpperCase()} Glove ${isConn ? 'Connected' : 'Disconnected'}`,
                isConn ? 'success' : 'warning'
              );
              break;
            }

            case 'calibration_progress': {
              const p = data.payload;
              const side = p.side === 'lh' ? 'lh' : 'rh';
              set((state) => ({
                [side]: {
                  ...state[side],
                  calibPct: p.pct ?? 0,
                  isCalibrating: true
                }
              }));
              break;
            }

            case 'calibration_done': {
              const p = data.payload;
              const side = p.side === 'lh' ? 'lh' : 'rh';
              set((state) => ({
                [side]: {
                  ...state[side],
                  calibPct: 100,
                  isCalibrating: false,
                  calibDone: true
                }
              }));
              get().addToast(`Calibration completed for ${side.toUpperCase()} Glove`, 'success');
              break;
            }

            case 'ports': {
              const p = data.payload;
              set({
                ports: {
                  serial: p.serial ?? [],
                  midi: p.midi ?? [],
                }
              });
              break;
            }

            case 'settings_update': {
              const p = data.payload;
              set((state) => ({
                settings: { ...state.settings, ...p }
              }));
              break;
            }

            case 'midi_status': {
              const p = data.payload;
              const connected = !!p.connected;
              set({
                midi: {
                  connected,
                  name: p.name ?? ''
                }
              });
              if (connected) {
                get().addToast(`MIDI Output Active: ${p.name}`, 'success');
              }
              break;
            }

            case 'log': {
              const text = data.payload?.text ?? JSON.stringify(data.payload);
              set((state) => ({
                logs: [`[${timeStr}] ${text}`, ...state.logs.slice(0, 199)]
              }));
              break;
            }
          }
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      socket.onclose = () => {
        set({ wsConnected: false });
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            get().connectWebSocket();
          }, 2000);
        }
      };

      socket.onerror = () => {
        set({ wsConnected: false });
      };
    } catch (e) {
      console.error('[WS] Connection failed:', e);
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          get().connectWebSocket();
        }, 3000);
      }
    }
  },

  send: (msg: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(msg));
    }
  },

  setActiveSide: (side: 'rh' | 'lh') => set({ activeSide: side }),

  updateSetting: (key: keyof GloveSettings, value: number) => {
    set((state) => ({
      settings: { ...state.settings, [key]: value }
    }));
    get().send({
      type: 'update_setting',
      payload: { key, value }
    });
  },

  triggerTestNote: (note: number, velocity: number = 100) => {
    if (get().audioEnabled) {
      audioSynth.playNote(note, velocity);
    }

    set((state) => ({
      activeDrumAnimations: {
        ...state.activeDrumAnimations,
        [note]: Date.now(),
      }
    }));

    get().send({
      type: 'trigger_test_note',
      payload: { note, velocity }
    });
  },

  connectGlove: (side: 'rh' | 'lh', mode: string, port: string | number) => {
    get().send({
      type: 'connect_glove',
      payload: { side, mode, port }
    });
  },

  disconnectGlove: (side: 'rh' | 'lh') => {
    get().send({
      type: 'disconnect_glove',
      payload: { side }
    });
  },

  calibrate: (side: 'rh' | 'lh') => {
    set((state) => ({
      [side]: { ...state[side], isCalibrating: true, calibPct: 0 }
    }));
    get().send({
      type: 'calibrate',
      payload: { side }
    });
  },

  suggestThresholds: (side: 'rh' | 'lh') => {
    get().send({
      type: 'suggest_thresholds',
      payload: { side }
    });
  },

  openMidi: (name: string) => {
    get().send({
      type: 'open_midi',
      payload: { name }
    });
  },

  listPorts: () => {
    get().send({ type: 'list_ports' });
    get().send({ type: 'list_midi_ports' });
  },

  clearLogs: () => set({ logs: [] }),
}));
