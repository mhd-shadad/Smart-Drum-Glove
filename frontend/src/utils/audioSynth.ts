/**
 * Web Audio API Drum Synthesizer
 * Zero-dependency synthesized drum sounds (Kick, Snare, Hi-Hats, Toms, Cymbals, Cowbell, Clap)
 * mapped to standard General MIDI Channel 10 drum notes.
 */

class DrumSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public playNote(note: number, velocity: number = 100) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const gainRatio = Math.max(0.1, Math.min(1.0, velocity / 127));
    const now = this.ctx.currentTime;

    switch (note) {
      case 36: // Bass Drum 1 / Kick
        this.playKick(now, gainRatio);
        break;
      case 38: // Acoustic Snare
        this.playSnare(now, gainRatio);
        break;
      case 42: // Closed Hi-Hat
        this.playHiHat(now, gainRatio, false);
        break;
      case 46: // Open Hi-Hat
        this.playHiHat(now, gainRatio, true);
        break;
      case 45: // Low Floor Tom
        this.playTom(now, 85, gainRatio);
        break;
      case 47: // Low-Mid Tom
        this.playTom(now, 120, gainRatio);
        break;
      case 50: // High Tom
        this.playTom(now, 160, gainRatio);
        break;
      case 49: // Crash Cymbal 1
        this.playCymbal(now, gainRatio, 1.2, 3500);
        break;
      case 51: // Ride Cymbal 1
        this.playCymbal(now, gainRatio * 0.9, 0.8, 4500);
        break;
      case 53: // Ride Bell
        this.playRideBell(now, gainRatio);
        break;
      case 52: // Chinese Cymbal
        this.playCymbal(now, gainRatio, 1.0, 2800);
        break;
      case 55: // Splash Cymbal
        this.playCymbal(now, gainRatio, 0.4, 6000);
        break;
      case 56: // Cowbell
        this.playCowbell(now, gainRatio);
        break;
      case 39: // Hand Clap
        this.playClap(now, gainRatio);
        break;
      default:
        this.playTom(now, 110, gainRatio);
        break;
    }
  }

  private playKick(now: number, gainRatio: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.12);

    gain.gain.setValueAtTime(1.0 * gainRatio, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  private playSnare(now: number, gainRatio: number) {
    if (!this.ctx) return;
    // Tone component
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
    oscGain.gain.setValueAtTime(0.7 * gainRatio, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);

    // Noise component
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8 * gainRatio, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.21);
  }

  private playHiHat(now: number, gainRatio: number, isOpen: boolean) {
    if (!this.ctx) return;
    const duration = isOpen ? 0.35 : 0.06;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6 * gainRatio, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + duration + 0.01);
  }

  private playTom(now: number, baseFreq: number, gainRatio: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.5, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.12);

    gain.gain.setValueAtTime(0.9 * gainRatio, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  private playCymbal(now: number, gainRatio: number, duration: number, cutoff: number) {
    if (!this.ctx) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * Math.min(2.5, duration));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(cutoff, now);
    filter.Q.setValueAtTime(1.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.65 * gainRatio, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + duration + 0.05);
  }

  private playRideBell(now: number, gainRatio: number) {
    if (!this.ctx) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(780, now);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1240, now);

    gain.gain.setValueAtTime(0.7 * gainRatio, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.46);
    osc2.stop(now + 0.46);
  }

  private playCowbell(now: number, gainRatio: number) {
    if (!this.ctx) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(560, now);
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(845, now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.Q.setValueAtTime(3.0, now);

    gain.gain.setValueAtTime(0.6 * gainRatio, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.26);
    osc2.stop(now + 0.26);
  }

  private playClap(now: number, gainRatio: number) {
    if (!this.ctx) return;
    // 3 quick noise bursts + decaying burst
    const burstTimes = [0, 0.015, 0.03, 0.045];
    burstTimes.forEach((offset, idx) => {
      const dur = idx === burstTimes.length - 1 ? 0.18 : 0.02;
      const bufferSize = Math.floor(this.ctx!.sampleRate * dur);
      const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx!.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now + offset);
      filter.Q.setValueAtTime(2.0, now + offset);

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime((idx === burstTimes.length - 1 ? 0.7 : 0.4) * gainRatio, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx!.destination);

      noise.start(now + offset);
      noise.stop(now + offset + dur + 0.01);
    });
  }
}

export const audioSynth = new DrumSynthesizer();
