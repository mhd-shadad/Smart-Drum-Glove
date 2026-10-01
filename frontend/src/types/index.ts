export interface SensorData {
  side: 'rh' | 'lh';
  f1: number;
  f2: number;
  f3: number;
  f4: number;
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
  movement: number;
  bend: {
    f1: number;
    f2: number;
    f3: number;
    f4: number;
  };
}

export interface DrumHit {
  side: string;
  name: string;
  note: number;
  velocity: number;
  timestamp: number;
}

export interface GloveState {
  connected: boolean;
  f1: number;
  f2: number;
  f3: number;
  f4: number;
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
  movement: number;
  bend: {
    f1: number;
    f2: number;
    f3: number;
    f4: number;
  };
  calibPct: number;
  isCalibrating: boolean;
  calibDone: boolean;
  lastUpdated: number;
}

export interface GloveSettings {
  flex1_threshold: number;
  flex2_threshold: number;
  flex3_threshold: number;
  flex4_threshold: number;
  movement_threshold: number;
  gesture_cooldown: number;
  smoothing: number;
  velocity_sensitivity: number;
  min_velocity: number;
  max_velocity: number;
}

export interface PortInfo {
  serial: string[];
  midi: string[];
}

export interface MidiState {
  connected: boolean;
  name: string;
}

export interface InboundMessage {
  type:
    | 'sensor_data'
    | 'drum_hit'
    | 'connection_changed'
    | 'calibration_progress'
    | 'calibration_done'
    | 'log'
    | 'ports'
    | 'settings_update'
    | 'midi_status';
  payload?: any;
}
