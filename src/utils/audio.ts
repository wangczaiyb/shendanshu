/**
 * Web Audio API synthesized Christmas Music Box & Soundscape Engine
 * Features:
 * - Polyphonic Celesta / Music Box melody player ("Silent Night" & "We Wish You a Merry Christmas")
 * - Warm ambient sub-harmonic pad for deep spatial immersion
 * - Smooth fade-in, volume control, mute/unmute
 * - Tab visibility detection (auto pause/resume when switched)
 * - Concrete Christmas item interaction SFX (Bell, Gift, Cane, Star, Gather, Disperse)
 */

interface Note {
  pitch: number; // Frequency in Hz
  duration: number; // in beats
}

// Frequencies
const C3 = 130.81, D3 = 146.83, E3 = 164.81, F3 = 174.61, G3 = 196.0, A3 = 220.0, B3 = 246.94;
const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, Fs4 = 369.99, G4 = 392.0, A4 = 440.0, B4 = 493.88;
const C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, Fs5 = 739.99, G5 = 783.99, A5 = 880.0, B5 = 987.77;
const C6 = 1046.5, D6 = 1174.66, E6 = 1318.51, G6 = 1567.98;

// "Silent Night" celesta melody (3/4 time)
const SILENT_NIGHT: Note[] = [
  { pitch: G4, duration: 1.5 }, { pitch: A4, duration: 0.5 }, { pitch: G4, duration: 1.0 },
  { pitch: E4, duration: 3.0 },
  { pitch: G4, duration: 1.5 }, { pitch: A4, duration: 0.5 }, { pitch: G4, duration: 1.0 },
  { pitch: E4, duration: 3.0 },
  { pitch: D5, duration: 2.0 }, { pitch: D5, duration: 1.0 },
  { pitch: B4, duration: 3.0 },
  { pitch: C5, duration: 2.0 }, { pitch: C5, duration: 1.0 },
  { pitch: G4, duration: 3.0 },
  { pitch: A4, duration: 2.0 }, { pitch: A4, duration: 1.0 },
  { pitch: C5, duration: 1.5 }, { pitch: B4, duration: 0.5 }, { pitch: A4, duration: 1.0 },
  { pitch: G4, duration: 1.5 }, { pitch: A4, duration: 0.5 }, { pitch: G4, duration: 1.0 },
  { pitch: E4, duration: 3.0 },
  { pitch: A4, duration: 2.0 }, { pitch: A4, duration: 1.0 },
  { pitch: C5, duration: 1.5 }, { pitch: B4, duration: 0.5 }, { pitch: A4, duration: 1.0 },
  { pitch: G4, duration: 1.5 }, { pitch: A4, duration: 0.5 }, { pitch: G4, duration: 1.0 },
  { pitch: E4, duration: 3.0 },
  { pitch: D5, duration: 2.0 }, { pitch: D5, duration: 1.0 },
  { pitch: F5, duration: 1.5 }, { pitch: D5, duration: 0.5 }, { pitch: B4, duration: 1.0 },
  { pitch: C5, duration: 3.0 },
  { pitch: E5, duration: 3.0 },
  { pitch: C5, duration: 1.5 }, { pitch: G4, duration: 0.5 }, { pitch: E4, duration: 1.0 },
  { pitch: G4, duration: 1.5 }, { pitch: F4, duration: 0.5 }, { pitch: D4, duration: 1.0 },
  { pitch: C4, duration: 4.0 },
];

export class Soundscape {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;

  private userVolume: number = 0.5;
  private isPlayingBgm: boolean = false;
  private sequenceTimer: number | null = null;
  private currentNoteIndex: number = 0;
  private tempoBpm: number = 72; // gentle, cozy tempo
  private warmPadNodes: OscillatorNode[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pauseOnHidden();
        } else {
          this.resumeOnVisible();
        }
      });
    }
  }

  private initContext() {
    if (this.ctx) return;
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.userVolume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    this.bgmGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);
  }

  /**
   * Unlock AudioContext on first user click and start BGM smoothly
   */
  startOnFirstInteraction() {
    this.initContext();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.isMuted) {
      this.unmute(1.5);
    }
  }

  toggle(): boolean {
    this.initContext();
    if (!this.ctx || !this.masterGain) return false;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.isMuted) {
      this.unmute(0.8);
    } else {
      this.mute(0.5);
    }
    return !this.isMuted;
  }

  mute(fadeTime = 0.4) {
    if (!this.masterGain || !this.ctx) return;
    this.isMuted = true;
    this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, fadeTime);
  }

  unmute(fadeTime = 0.8) {
    this.initContext();
    if (!this.masterGain || !this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isMuted = false;
    this.masterGain.gain.setTargetAtTime(this.userVolume, this.ctx.currentTime, fadeTime);
    this.startBgmLoop();
  }

  setVolume(volume: number) {
    this.userVolume = Math.max(0, Math.min(1, volume));
    if (!this.isMuted && this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.userVolume, this.ctx.currentTime, 0.05);
    }
  }

  getVolume(): number {
    return this.userVolume;
  }

  getIsPlaying(): boolean {
    return !this.isMuted;
  }

  private pauseOnHidden() {
    if (this.ctx && this.ctx.state === 'running' && !this.isMuted) {
      this.masterGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    }
  }

  private resumeOnVisible() {
    if (this.ctx && !this.isMuted) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.masterGain?.gain.setTargetAtTime(this.userVolume, this.ctx.currentTime, 0.5);
    }
  }

  /**
   * Synthesize a single Music Box / Celesta Bell chime with natural acoustic overtone
   */
  private playCelestaNote(freq: number, durationSec: number, velocity = 0.3) {
    if (!this.ctx || !this.bgmGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;

      // 1. Fundamental chime (Sine wave)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(velocity, now + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      osc1.connect(gain1);
      gain1.connect(this.bgmGain);

      osc1.start(now);
      osc1.stop(now + durationSec + 0.1);

      // 2. Crystal overtone (2.76x frequency for bell chime resonance)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2.76, now);

      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.linearRampToValueAtTime(velocity * 0.25, now + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(durationSec, 0.8));

      osc2.connect(gain2);
      gain2.connect(this.bgmGain);

      osc2.start(now);
      osc2.stop(now + 0.9);
    } catch {
      // Audio might not be authorized yet
    }
  }

  /**
   * Continuous looping BGM sequence
   */
  private startBgmLoop() {
    if (this.isPlayingBgm) return;
    this.isPlayingBgm = true;

    this.startWarmPad();
    this.scheduleNextNote();
  }

  private scheduleNextNote = () => {
    if (!this.isPlayingBgm) return;

    const note = SILENT_NIGHT[this.currentNoteIndex];
    const beatSeconds = 60 / this.tempoBpm;
    const noteDurationSec = note.duration * beatSeconds;

    if (!this.isMuted) {
      this.playCelestaNote(note.pitch, Math.max(noteDurationSec * 1.4, 1.8), 0.22);
    }

    this.currentNoteIndex = (this.currentNoteIndex + 1) % SILENT_NIGHT.length;
    this.sequenceTimer = window.setTimeout(this.scheduleNextNote, noteDurationSec * 1000);
  };

  /**
   * Soft ambient pad providing cinematic warmth
   */
  private startWarmPad() {
    if (!this.ctx || !this.bgmGain || this.warmPadNodes.length > 0) return;

    try {
      const padFreqs = [C3, G3, E4];
      padFreqs.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);

        gain.gain.setValueAtTime(0.001, this.ctx!.currentTime);
        gain.gain.linearRampToValueAtTime(0.035, this.ctx!.currentTime + 3.0);

        osc.connect(gain);
        gain.connect(this.bgmGain!);
        osc.start();
        this.warmPadNodes.push(osc);
      });
    } catch {
      // Ignore
    }
  }

  // ==========================================
  // Interactive Christmas SFX
  // ==========================================

  /**
   * Bell ringing sound: sweet multi-tone bell ring
   */
  playBellRing() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const frequencies = [880, 1760, 2640];
    frequencies.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2 / (idx + 1), now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 1.9);
    });
  }

  /**
   * Gift box open sound: shimmering ascending arpeggio
   */
  playGiftOpen() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const arpeggio = [C5, E5, G5, C6, E6];
    arpeggio.forEach((f, i) => {
      setTimeout(() => {
        this.playCelestaNote(f, 1.2, 0.28);
      }, i * 65);
    });
  }

  /**
   * Candy cane spin sound: playful high-pitch twirl
   */
  playCandySpin() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const twirl = [G5, A5, B5, C6];
    twirl.forEach((f, i) => {
      setTimeout(() => {
        this.playCelestaNote(f, 0.8, 0.22);
      }, i * 50);
    });
  }

  /**
   * Star sparkle sound: ethereal cosmic high chime
   */
  playStarSparkle() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const sparkleNotes = [C6, D6, E6, G6];
    sparkleNotes.forEach((f, i) => {
      setTimeout(() => {
        this.playCelestaNote(f, 2.5, 0.3);
      }, i * 80);
    });
  }

  /**
   * Exploded mode sound: cosmic dispersion wave
   */
  playDisperse() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const chord = [C4, G4, C5, E5, G5, C6];
    chord.forEach((f, idx) => {
      setTimeout(() => this.playCelestaNote(f, 2.8, 0.25), idx * 70);
    });
  }

  /**
   * Reassembling sound: converging harmonic chime
   */
  playGather() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const chord = [C6, G5, E5, C5, G4, C4];
    chord.forEach((f, idx) => {
      setTimeout(() => this.playCelestaNote(f, 2.5, 0.22), idx * 80);
    });
  }
}

export const soundscape = new Soundscape();
