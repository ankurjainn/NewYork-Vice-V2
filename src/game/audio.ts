import { DistrictAmbientManager } from './ambientAudio';
import {
  FootstepFoleySynth,
  type FootstepAudioOptions,
  type FootstepSurface,
} from './footstepFoley';
import {
  ViceMusicEngine,
  type MusicStationId,
  type MusicStationMeta,
} from './gameMusic';
import type { DistrictId, VehicleType } from './types';

export type { FootstepAudioOptions, FootstepSurface, MusicStationId, MusicStationMeta };

export class MumbaiAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private driftGain: GainNode | null = null;
  private footstepFoley = new FootstepFoleySynth();
  private ambient = new DistrictAmbientManager();
  private music = new ViceMusicEngine();
  private muted = false;
  private unlocked = false;
  private sirenPhase = 0;

  public isMuted(): boolean {
    return this.muted;
  }

  public unlock(): void {
    if (this.unlocked) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.32;
      this.masterGain.connect(this.ctx.destination);

      // Continuous engine oscillator
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      const engineFilter = this.ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 240;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(engineFilter);
      engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);
      this.engineOsc.start();

      // Continuous police siren oscillator
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenOsc.frequency.value = 660;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.masterGain);
      this.sirenOsc.start();

      // Tire drift hiss via noise buffer
      const bufferSize = this.ctx.sampleRate * 1.5;
      const noiseBuf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const out = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        out[i] = Math.random() * 2 - 1;
      }
      const noiseSrc = this.ctx.createBufferSource();
      noiseSrc.buffer = noiseBuf;
      noiseSrc.loop = true;
      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1400;
      bandpass.Q.value = 3.2;
      this.driftGain = this.ctx.createGain();
      this.driftGain.gain.value = 0;
      noiseSrc.connect(bandpass);
      bandpass.connect(this.driftGain);
      this.driftGain.connect(this.masterGain);
      noiseSrc.start();

      // Realistic physical Foley footstep engine (concrete, asphalt, grass, wood, gravel + rain wetness)
      this.footstepFoley.init(this.ctx, this.masterGain);

      // Dynamic district ambient soundscape manager
      this.ambient.init(this.ctx, this.masterGain);

      // Copyright-free GTA VI / Vice-Wave procedural dynamic radio music engine
      this.music.init(this.ctx, this.masterGain);

      this.unlocked = true;
    } catch {
      // Ignore Web Audio restriction errors in headless environments
    }
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.32, this.ctx.currentTime, 0.04);
    }
  }

  public silenceLoops(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engineGain?.gain.setTargetAtTime(0, t, 0.05);
    this.sirenGain?.gain.setTargetAtTime(0, t, 0.05);
    this.driftGain?.gain.setTargetAtTime(0, t, 0.05);
    this.ambient.silence();
    this.music.silence();
  }

  public updateAmbient(dt: number, district: DistrictId, active: boolean, rainIntensity = 0): void {
    if (!this.ctx || !this.unlocked) return;
    this.ambient.update(dt, district, active, this.muted, rainIntensity);
  }

  public updateMusic(
    dt: number,
    opts: { inVehicle: boolean; speedMps: number; isSprinting: boolean; active: boolean },
  ): void {
    this.music.update(dt, {
      ...opts,
      muted: this.muted,
    });
  }

  public cycleRadioStation(): MusicStationMeta {
    return this.music.cycleStation();
  }

  public getRadioState(): { meta: MusicStationMeta; playing: boolean } {
    return {
      meta: this.music.getStationMeta(),
      playing: this.music.isPlaying(),
    };
  }

  public playThunder(): void {
    if (!this.ctx || !this.unlocked || this.muted) return;
    this.ambient.playThunder();
  }

  public updateContinuous(
    dt: number,
    inVehicle: boolean,
    vehicleType: VehicleType | null,
    speedMps: number,
    isDrifting: boolean,
    isBoosting: boolean,
    policeActive: boolean,
    nearestPoliceDist: number,
  ): void {
    if (!this.ctx || !this.unlocked || this.muted) return;
    const t = this.ctx.currentTime;

    if (inVehicle && vehicleType && this.engineOsc && this.engineGain) {
      const absSpd = Math.abs(speedMps);
      const baseFreq =
        vehicleType === 'ferry'
          ? 34
          : vehicleType === 'speedboat'
            ? 68
            : vehicleType === 'auto'
              ? 74
              : vehicleType === 'bus'
                ? 40
                : vehicleType === 'hypercar'
                  ? 82
                  : vehicleType === 'muscle'
                    ? 48
                    : vehicleType === 'suv_lux'
                      ? 50
                      : vehicleType === 'sports'
                        ? 64
                        : 52;
      const pitchMult =
        vehicleType === 'ferry'
          ? 1.9
          : vehicleType === 'speedboat'
            ? 3.8
            : vehicleType === 'hypercar'
              ? 5.2
              : vehicleType === 'muscle'
                ? 3.7
                : vehicleType === 'suv_lux'
                  ? 3.1
                  : vehicleType === 'sports'
                    ? 4.2
                    : vehicleType === 'auto'
                      ? 3.5
                      : 2.8;
      const targetFreq = baseFreq + absSpd * pitchMult + (isBoosting ? 28 : 0);
      this.engineOsc.frequency.setTargetAtTime(targetFreq, t, 0.06);
      this.engineGain.gain.setTargetAtTime(0.11 + Math.min(0.14, absSpd * 0.005), t, 0.06);
    } else if (this.engineGain) {
      this.engineGain.gain.setTargetAtTime(0, t, 0.08);
    }

    if (this.driftGain) {
      const isWaterWake =
        inVehicle && (vehicleType === 'ferry' || vehicleType === 'speedboat') && Math.abs(speedMps) > 4;
      const targetDrift = isWaterWake
        ? Math.min(0.16, Math.abs(speedMps) * 0.006)
        : inVehicle && isDrifting && Math.abs(speedMps) > 5
          ? 0.14
          : 0;
      this.driftGain.gain.setTargetAtTime(targetDrift, t, 0.05);
    }

    if (this.sirenOsc && this.sirenGain) {
      if (policeActive && nearestPoliceDist < 68) {
        this.sirenPhase += dt * 3.8;
        const wail = 640 + Math.sin(this.sirenPhase) * 240;
        const vol = Math.max(0.02, (1 - nearestPoliceDist / 68) * 0.11);
        this.sirenOsc.frequency.setTargetAtTime(wail, t, 0.04);
        this.sirenGain.gain.setTargetAtTime(vol, t, 0.08);
      } else {
        this.sirenGain.gain.setTargetAtTime(0, t, 0.1);
      }
    }
  }

  public playHorn(vehicleType: VehicleType | null): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    if (vehicleType === 'ferry' || vehicleType === 'speedboat') {
      // Deep resonant Mumbai harbor foghorn / marine horn
      const base = vehicleType === 'ferry' ? 96 : 185;
      const dur = vehicleType === 'ferry' ? 0.95 : 0.42;
      for (const mult of [1, 1.498]) {
        const osc = this.ctx.createOscillator();
        const filt = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(base * mult, t);
        osc.frequency.linearRampToValueAtTime(base * mult * 0.94, t + dur);
        filt.type = 'lowpass';
        filt.frequency.value = vehicleType === 'ferry' ? 380 : 720;
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.16, t + 0.07);
        gain.gain.setValueAtTime(0.14, t + dur * 0.72);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(filt);
        filt.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + dur + 0.04);
      }
      return;
    }

    const isAuto = vehicleType === 'auto';
    const isBus = vehicleType === 'bus';
    const f1 = isAuto ? 540 : isBus ? 210 : 395;
    const f2 = isAuto ? 680 : isBus ? 265 : 495;

    for (const freq of [f1, f2]) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = isAuto ? 'square' : 'sawtooth';
      osc.frequency.setValueAtTime(freq * (0.97 + Math.random() * 0.06), t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
      gain.gain.setValueAtTime(0.12, t + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.3);
    }
  }

  public playCrash(intensity = 0.7): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const clamped = Math.max(0.2, Math.min(1, intensity));

    // Low thud
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140 * clamped + 50, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.22);
    g.gain.setValueAtTime(0.32 * clamped, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  public playFootstep(opts?: FootstepAudioOptions): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    this.footstepFoley.play(opts);
  }

  public playJump(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, t);
    osc.frequency.exponentialRampToValueAtTime(360, t + 0.14);
    g.gain.setValueAtTime(0.11, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  public playChime(notes: number[] = [523.25, 659.25, 783.99]): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const start = t + i * 0.085;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0.001, start);
      g.gain.linearRampToValueAtTime(0.18, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.34);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  }

  public playDefeatSting(): void {
    this.playChime([311.13, 277.18, 220, 164.81]);
  }

  public dispose(): void {
    try {
      this.footstepFoley.dispose();
      this.ambient.dispose();
      this.music.dispose();
      this.engineOsc?.stop();
      this.sirenOsc?.stop();
      void this.ctx?.close();
    } catch {
      // Ignore cleanup errors
    }
    this.ctx = null;
    this.unlocked = false;
  }
}
