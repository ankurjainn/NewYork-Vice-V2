/**
 * Original copyright-free GTA VI / Vice-Wave Dynamic Game Music Engine.
 *
 * Synthesizes 3 full-arrangement, 8-bar Web Audio API radio stations in real time
 * with zero copyrighted audio files or external network dependencies:
 *  - Vice Nights FM (108 BPM Retro-Miami Synthwave / Outrun)
 *  - Midtown Drift (94 BPM Smooth NYC Night-Cruise Hip-Hop / Lo-Fi)
 *  - Hudson Electro (118 BPM Neon Nu-Disco / Sprint Chase)
 *
 * Context-reactive dynamics:
 *  - Smoothly fades in at a comfortably low background volume when sitting/driving in a vehicle
 *    or running/sprinting on foot.
 *  - Gently ducks back out after a short hold when standing still or strolling slowly on foot
 *    so footsteps and city ambience breathe naturally.
 *  - Also gives a brief preview window whenever the player manually switches stations ([R]).
 */

export type MusicStationId = 'vice_nights' | 'midtown_drift' | 'hudson_electro' | 'off';

export interface MusicStationMeta {
  id: MusicStationId;
  label: string;
  shortLabel: string;
  vibe: string;
  bpm: number;
  accentHex: string;
}

export const MUSIC_STATIONS: readonly MusicStationMeta[] = [
  {
    id: 'vice_nights',
    label: 'Vice Nights FM',
    shortLabel: 'Vice Nights',
    vibe: 'Sunset Synthwave · 108 BPM',
    bpm: 108,
    accentHex: '#f472b6',
  },
  {
    id: 'midtown_drift',
    label: 'Midtown Drift',
    shortLabel: 'Midtown Drift',
    vibe: 'NYC Night Cruise · 94 BPM',
    bpm: 94,
    accentHex: '#fbbf24',
  },
  {
    id: 'hudson_electro',
    label: 'Hudson Electro',
    shortLabel: 'Hudson Electro',
    vibe: 'Neon Chase Electro · 118 BPM',
    bpm: 118,
    accentHex: '#38bdf8',
  },
  {
    id: 'off',
    label: 'Radio Off',
    shortLabel: 'Radio Off',
    vibe: 'Ambient City Audio Only',
    bpm: 0,
    accentHex: '#94a3b8',
  },
] as const;

export function getMusicStationMeta(id: MusicStationId): MusicStationMeta {
  return MUSIC_STATIONS.find((s) => s.id === id) ?? MUSIC_STATIONS[0];
}

export function cycleMusicStation(currentId: MusicStationId): MusicStationId {
  const idx = MUSIC_STATIONS.findIndex((s) => s.id === currentId);
  return MUSIC_STATIONS[(idx + 1) % MUSIC_STATIONS.length].id;
}

export interface DynamicMusicMixInput {
  stationId: MusicStationId;
  inVehicle: boolean;
  speedMps: number;
  isSprinting: boolean;
  muted: boolean;
  active: boolean;
  /** Seconds since the last vehicle or running trigger while standing/walking slowly on foot. */
  idleHoldSec: number;
  /** Remaining manual station-switch audition preview seconds (> 0 keeps radio audible briefly). */
  previewHoldSec?: number;
}

export interface DynamicMusicMixTarget {
  /** Target gain routed into MumbaiAudioEngine masterGain (intentionally kept comfortably low). */
  gain: number;
  /** Master music lowpass cutoff Hz (warmer cabin resonance inside car vs open air on foot). */
  filterHz: number;
  /** Whether music is currently audible / playing for HUD indicators. */
  playing: boolean;
}

export const MUSIC_GAIN_VEHICLE = 0.21;
export const MUSIC_GAIN_RUNNING = 0.15;
export const MUSIC_GAIN_PREVIEW = 0.16;
export const MUSIC_RUN_SPEED_THRESHOLD_MPS = 4.4;
export const MUSIC_IDLE_HOLD_SECONDS = 2.4;

/**
 * Pure dynamic mix calculator — unit-tested directly without Web Audio.
 */
export function computeDynamicMusicMix(input: DynamicMusicMixInput): DynamicMusicMixTarget {
  if (!input.active || input.muted || input.stationId === 'off') {
    return { gain: 0, filterHz: 2400, playing: false };
  }

  if (input.inVehicle) {
    // Slightly brighter filter as vehicle accelerates, cozy warm car-stereo tone at idle
    const speedBoost = Math.min(1, Math.abs(input.speedMps) / 22);
    return {
      gain: MUSIC_GAIN_VEHICLE,
      filterHz: 3400 + speedBoost * 1800,
      playing: true,
    };
  }

  const running = input.isSprinting || Math.abs(input.speedMps) >= MUSIC_RUN_SPEED_THRESHOLD_MPS;
  if (running) {
    return {
      gain: MUSIC_GAIN_RUNNING,
      filterHz: 4600,
      playing: true,
    };
  }

  // Brief preview when player just tuned a radio station on foot
  if ((input.previewHoldSec ?? 0) > 0) {
    return {
      gain: MUSIC_GAIN_PREVIEW,
      filterHz: 3800,
      playing: true,
    };
  }

  // Smooth hold & fade-out tail after slowing down on foot so crosswalk pauses feel natural
  if (input.idleHoldSec < MUSIC_IDLE_HOLD_SECONDS) {
    const t = Math.max(0, Math.min(1, input.idleHoldSec / MUSIC_IDLE_HOLD_SECONDS));
    const fade = t < 0.45 ? 1 : 1 - (t - 0.45) / 0.55;
    const gain = Number((MUSIC_GAIN_RUNNING * fade).toFixed(4));
    return {
      gain,
      filterHz: 3200 - t * 1400,
      playing: gain > 0.025,
    };
  }

  return { gain: 0, filterHz: 1800, playing: false };
}

// ============== PROCEDURAL WEB AUDIO SYNTHWAVE & CRUISE SEQUENCER ==============

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

interface StationPattern {
  bpm: number;
  swing: number; // 0..0.25 16th-note swing amount
  /** 4 chords across 8 bars (each chord lasts 2 bars = 32 steps). */
  chords: number[][];
  /** Bass root MIDI per chord. */
  bassRoots: number[];
  /** 16-step kick pattern (0..1 velocity). */
  kick: number[];
  /** 16-step snare/clap pattern (0..1 velocity). */
  snare: number[];
  /** 16-step hi-hat pattern (0..1 velocity). */
  hat: number[];
  /** 16-step bass octave/accent pattern: 0 = rest, 1 = root, 2 = octave up, 3 = fifth up. */
  bassSeq: number[];
  /** 16-step arp index into chord tones (-1 = rest). */
  arpSeq: number[];
  /** 32-step melodic lead hook offsets relative to chord root (null = rest), enters on bars 5-8. */
  leadHook: Array<number | null>;
  padWave: OscillatorType;
  bassWave: OscillatorType;
  leadWave: OscillatorType;
}

const STATION_PATTERNS: Record<Exclude<MusicStationId, 'off'>, StationPattern> = {
  // GTA VI / Vice City Sunset Outrun Synthwave (Am9 -> Fmaj7 -> Cmaj7 -> G6)
  vice_nights: {
    bpm: 108,
    swing: 0.02,
    chords: [
      [57, 60, 64, 67, 71], // Am9
      [53, 57, 60, 64, 69], // Fmaj7
      [48, 55, 60, 64, 71], // Cmaj7
      [55, 59, 62, 64, 67], // G6
    ],
    bassRoots: [33, 29, 36, 31], // A1, F1, C2, G1
    kick:  [1, 0, 0, 0, 0, 0, 0, 0, 0.95, 0, 0.45, 0, 0, 0, 0.35, 0],
    snare: [0, 0, 0, 0, 0.95, 0, 0, 0, 0, 0, 0, 0, 0.95, 0, 0, 0.25],
    hat:   [0.5, 0.22, 0.65, 0.24, 0.45, 0.25, 0.72, 0.28, 0.5, 0.24, 0.68, 0.25, 0.48, 0.26, 0.78, 0.35],
    bassSeq: [1, 0, 2, 0, 1, 0, 2, 1, 1, 0, 2, 0, 3, 0, 2, 0],
    arpSeq:  [0, 2, 3, 4, 2, 3, 4, 1, 0, 2, 4, 3, 2, 1, 3, 2],
    leadHook: [
      12, null, 15, null, 19, null, 17, 15,
      14, null, 12, null, 10, null, null, null,
      12, null, 15, null, 22, null, 19, 17,
      15, null, 14, null, 12, null, null, null,
    ],
    padWave: 'sawtooth',
    bassWave: 'sawtooth',
    leadWave: 'triangle',
  },

  // Smooth NYC Night Cruise Hip-Hop / Lo-Fi West Coast (Dm9 -> Bbmaj7 -> Gm7 -> A7sus4)
  midtown_drift: {
    bpm: 94,
    swing: 0.14,
    chords: [
      [50, 53, 57, 60, 64], // Dm9
      [46, 53, 57, 62, 65], // Bbmaj7
      [55, 58, 62, 65, 69], // Gm9
      [57, 62, 64, 67, 71], // A7sus4
    ],
    bassRoots: [38, 34, 31, 33], // D2, Bb1, G1, A1
    kick:  [1, 0, 0, 0.55, 0, 0, 0.75, 0, 0, 0, 0.9, 0, 0, 0, 0, 0.4],
    snare: [0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0, 0, 0.92, 0, 0, 0],
    hat:   [0.45, 0, 0.55, 0.32, 0.42, 0, 0.62, 0.28, 0.48, 0.35, 0.58, 0.32, 0.42, 0, 0.66, 0.38],
    bassSeq: [1, 0, 0, 1, 0, 0, 3, 0, 0, 0, 1, 0, 0, 0, 2, 0],
    arpSeq:  [0, -1, 2, -1, -1, 3, -1, 1, 0, -1, -1, 4, -1, 2, -1, -1],
    leadHook: [
      19, null, null, 17, 15, null, 12, null,
      null, null, 10, 12, 15, null, null, null,
      19, null, 22, null, 24, null, 19, null,
      17, null, 15, null, 14, null, null, null,
    ],
    padWave: 'triangle',
    bassWave: 'sine',
    leadWave: 'sine',
  },

  // Upbeat Neon Nu-Disco / Sprint Chase Electro (Em9 -> Cmaj7 -> Am9 -> B7)
  hudson_electro: {
    bpm: 118,
    swing: 0.04,
    chords: [
      [52, 55, 59, 62, 66], // Em9
      [48, 55, 59, 64, 67], // Cmaj7
      [57, 60, 64, 67, 71], // Am9
      [47, 54, 59, 63, 66], // B7
    ],
    bassRoots: [28, 36, 33, 35], // E1, C2, A1, B1
    kick:  [1, 0, 0, 0, 0.95, 0, 0, 0, 1, 0, 0, 0, 0.95, 0, 0, 0.3],
    snare: [0, 0, 0, 0, 0.95, 0, 0, 0.22, 0, 0, 0, 0, 0.95, 0, 0.25, 0],
    hat:   [0.35, 0.28, 0.78, 0.32, 0.35, 0.28, 0.82, 0.35, 0.35, 0.28, 0.78, 0.32, 0.35, 0.3, 0.85, 0.4],
    bassSeq: [1, 0, 2, 1, 0, 2, 1, 0, 1, 0, 2, 0, 3, 2, 1, 0],
    arpSeq:  [0, 1, 2, 4, 3, 2, 1, 2, 0, 2, 3, 4, 2, 4, 3, 1],
    leadHook: [
      12, 14, 15, null, 19, null, 15, null,
      14, null, 12, null, 11, null, 12, null,
      15, 17, 19, null, 24, null, 22, 19,
      17, null, 15, null, 14, null, null, null,
    ],
    padWave: 'sawtooth',
    bassWave: 'triangle',
    leadWave: 'sawtooth',
  },
};

export interface MusicUpdateOptions {
  inVehicle: boolean;
  speedMps: number;
  isSprinting: boolean;
  muted: boolean;
  active: boolean;
}

export const MUSIC_OFFLINE_SAMPLE_RATE = 22050;

export class ViceMusicEngine {
  private ctx: AudioContext | null = null;
  private busGain: GainNode | null = null;
  private busFilter: BiquadFilterNode | null = null;
  private activeSource: AudioBufferSourceNode | null = null;
  private activeSourceStation: Exclude<MusicStationId, 'off'> | null = null;
  private clickNoiseBuffer: AudioBuffer | null = null;

  private bufferCache = new Map<Exclude<MusicStationId, 'off'>, AudioBuffer>();
  private pendingRender = new Map<Exclude<MusicStationId, 'off'>, Promise<AudioBuffer | null>>();

  private stationId: MusicStationId = 'vice_nights';
  private currentGain = 0;
  private lastAppliedGain = -1;
  private lastAppliedFilterHz = -1;
  private silentDurationSec = 0;
  private playing = false;
  private idleHoldSec = MUSIC_IDLE_HOLD_SECONDS + 1;
  private previewHoldSec = 0;
  private wasTriggered = false;
  private disposed = false;

  public init(ctx: AudioContext, destination: AudioNode): void {
    if (this.ctx) return;
    this.ctx = ctx;
    this.disposed = false;

    // Ultra-light live playback graph: 1 BufferSource -> 1 Lowpass Filter -> 1 GainNode -> master
    // (Compression, chorus & echo are baked offline into each cached station AudioBuffer!)
    this.busFilter = ctx.createBiquadFilter();
    this.busFilter.type = 'lowpass';
    this.busFilter.frequency.value = 3600;
    this.busFilter.Q.value = 0.65;

    this.busGain = ctx.createGain();
    this.busGain.gain.value = 0;

    this.busFilter.connect(this.busGain);
    this.busGain.connect(destination);

    // Tiny 60ms noise buffer only for crisp radio dial-click SFX on [R]
    const len = Math.floor(ctx.sampleRate * 0.06);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.clickNoiseBuffer = buf;
  }

  public getStationId(): MusicStationId {
    return this.stationId;
  }

  public getStationMeta(): MusicStationMeta {
    return getMusicStationMeta(this.stationId);
  }

  public isPlaying(): boolean {
    return this.playing;
  }

  public cycleStation(): MusicStationMeta {
    this.stationId = cycleMusicStation(this.stationId);
    this.stopActiveSource();
    if (this.ctx) {
      this.playRadioTuneClick();
    }
    this.previewHoldSec = this.stationId === 'off' ? 0 : 5.5;
    if (this.stationId !== 'off') {
      this.ensureStationPlayback(this.stationId);
    }
    return getMusicStationMeta(this.stationId);
  }

  public update(dt: number, opts: MusicUpdateOptions): void {
    const running = !opts.inVehicle && (opts.isSprinting || Math.abs(opts.speedMps) >= MUSIC_RUN_SPEED_THRESHOLD_MPS);
    const triggered = opts.active && !opts.muted && this.stationId !== 'off' && (opts.inVehicle || running);

    if (triggered) {
      this.idleHoldSec = 0;
      this.wasTriggered = true;
    } else if (this.wasTriggered) {
      this.idleHoldSec += dt;
      if (this.idleHoldSec > MUSIC_IDLE_HOLD_SECONDS + 1) {
        this.wasTriggered = false;
      }
    }

    if (this.previewHoldSec > 0) {
      this.previewHoldSec = Math.max(0, this.previewHoldSec - dt);
    }

    const target = computeDynamicMusicMix({
      stationId: this.stationId,
      inVehicle: opts.inVehicle,
      speedMps: opts.speedMps,
      isSprinting: opts.isSprinting,
      muted: opts.muted,
      active: opts.active,
      idleHoldSec: this.idleHoldSec,
      previewHoldSec: this.previewHoldSec,
    });

    this.playing = target.playing;
    this.currentGain = target.gain;

    if (!this.ctx || !this.busGain || !this.busFilter) return;

    // Start single looping pre-rendered AudioBufferSourceNode only when audible
    if (target.gain > 0.004 && this.stationId !== 'off') {
      this.silentDurationSec = 0;
      if (this.ctx.state === 'running' && this.activeSourceStation !== this.stationId) {
        this.ensureStationPlayback(this.stationId);
      }
    } else {
      // Auto-release the single looping node once faded out -> 0.00% idle CPU!
      if (this.activeSource) {
        this.silentDurationSec += dt;
        if (this.silentDurationSec > 0.75) {
          this.stopActiveSource();
        }
      }
    }

    // Quantized AudioParam writes prevent 60 FPS Web Audio automation-queue overhead
    const t = this.ctx.currentTime;
    if (Math.abs(target.gain - this.lastAppliedGain) > 0.004) {
      const tau = target.gain > this.lastAppliedGain ? 0.35 : 0.42;
      this.busGain.gain.setTargetAtTime(target.gain, t, tau);
      this.lastAppliedGain = target.gain;
    }
    if (Math.abs(target.filterHz - this.lastAppliedFilterHz) > 85) {
      this.busFilter.frequency.setTargetAtTime(target.filterHz, t, 0.28);
      this.lastAppliedFilterHz = target.filterHz;
    }
  }

  public silence(): void {
    this.playing = false;
    this.currentGain = 0;
    this.previewHoldSec = 0;
    this.lastAppliedGain = 0;
    if (this.ctx && this.busGain) {
      this.busGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    }
    this.stopActiveSource();
  }

  private stopActiveSource(): void {
    if (this.activeSource) {
      try {
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch {
        // Ignore already-stopped source
      }
      this.activeSource = null;
      this.activeSourceStation = null;
    }
  }

  private ensureStationPlayback(station: Exclude<MusicStationId, 'off'>): void {
    if (this.disposed || !this.ctx || !this.busFilter) return;
    if (this.activeSource && this.activeSourceStation === station) return;

    const cached = this.bufferCache.get(station);
    if (cached) {
      this.startLoopingBuffer(station, cached);
      return;
    }

    let promise = this.pendingRender.get(station);
    if (!promise) {
      promise = this.renderStationBufferOffline(station);
      this.pendingRender.set(station, promise);
    }

    void promise.then((buf) => {
      if (this.disposed || !buf) return;
      if (this.stationId !== station || this.currentGain <= 0.004) return;
      if (this.activeSource && this.activeSourceStation === station) return;
      this.startLoopingBuffer(station, buf);
    });
  }

  private startLoopingBuffer(station: Exclude<MusicStationId, 'off'>, buffer: AudioBuffer): void {
    if (!this.ctx || !this.busFilter || this.disposed) return;
    this.stopActiveSource();
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(this.busFilter);
    src.start(this.ctx.currentTime + 0.01);
    this.activeSource = src;
    this.activeSourceStation = station;
  }

  /**
   * Renders a seamless 8-bar stereo arrangement ONCE off the main JS thread using
   * Web Audio OfflineAudioContext. Zero runtime node creation or timers during gameplay!
   */
  private async renderStationBufferOffline(
    station: Exclude<MusicStationId, 'off'>,
  ): Promise<AudioBuffer | null> {
    if (typeof OfflineAudioContext === 'undefined') return null;
    try {
      const pattern = STATION_PATTERNS[station];
      const stepDur = 60 / pattern.bpm / 4; // 16th-note duration
      const totalSteps = 128; // full 8-bar verse + chorus loop
      const loopDurationSec = totalSteps * stepDur;
      const sampleRate = MUSIC_OFFLINE_SAMPLE_RATE;
      const lengthFrames = Math.ceil(loopDurationSec * sampleRate);

      const offCtx = new OfflineAudioContext(2, lengthFrames, sampleRate);

      // Bake gentle mastering compression + Vice echo directly into the cached loop buffer
      const comp = offCtx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 18;
      comp.ratio.value = 3.0;
      comp.attack.value = 0.008;
      comp.release.value = 0.16;
      comp.connect(offCtx.destination);

      const delay = offCtx.createDelay(0.6);
      delay.delayTime.value = stepDur * 3; // synced dotted-eighth echo
      const delayFilter = offCtx.createBiquadFilter();
      delayFilter.type = 'bandpass';
      delayFilter.frequency.value = 1650;
      delayFilter.Q.value = 0.85;
      const delayFeedback = offCtx.createGain();
      delayFeedback.gain.value = 0.3;
      const delayReturn = offCtx.createGain();
      delayReturn.gain.value = 0.22;
      const delaySend = offCtx.createGain();
      delaySend.gain.value = 1;
      delaySend.connect(delay);
      delay.connect(delayFilter);
      delayFilter.connect(delayFeedback);
      delayFeedback.connect(delay);
      delayFilter.connect(delayReturn);
      delayReturn.connect(comp);

      // Shared white noise buffer inside offline context
      const noiseLen = Math.floor(sampleRate * 0.25);
      const noiseBuf = offCtx.createBuffer(1, noiseLen, sampleRate);
      const nData = noiseBuf.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) {
        nData[i] = Math.random() * 2 - 1;
      }

      for (let step128 = 0; step128 < totalSteps; step128++) {
        const swingOffset = step128 % 2 === 1 ? stepDur * pattern.swing : 0;
        const time = step128 * stepDur + swingOffset;
        const step16 = step128 % 16;
        const step32 = step128 % 32;
        const chordIdx = Math.floor(step128 / 32) % pattern.chords.length;
        const barIdx = Math.floor(step128 / 16);
        const chord = pattern.chords[chordIdx];
        const bassRoot = pattern.bassRoots[chordIdx];

        // 1. Warm Juno/Rhodes pad chord
        if (step32 === 0 || (station === 'midtown_drift' && step32 === 18)) {
          const dur = Math.min(loopDurationSec - time - 0.03, stepDur * (step32 === 0 ? 30 : 12));
          if (dur > 0.08) {
            this.renderOfflineChord(offCtx, comp, delaySend, chord, time, dur, pattern.padWave);
          }
        }

        // 2. Kick
        const kickVel = pattern.kick[step16];
        if (kickVel > 0) {
          this.renderOfflineKick(offCtx, comp, time, kickVel);
        }

        // 3. Snare
        const snareVel = pattern.snare[step16];
        if (snareVel > 0) {
          this.renderOfflineSnare(offCtx, comp, delaySend, noiseBuf, time, snareVel);
        }

        // 4. Hi-Hat
        const hatVel = pattern.hat[step16];
        if (hatVel > 0) {
          this.renderOfflineHat(offCtx, comp, noiseBuf, time, hatVel, step16 % 4 === 2);
        }

        // 5. Rolling synth bassline
        const bassCode = pattern.bassSeq[step16];
        if (bassCode > 0) {
          const midi = bassCode === 2 ? bassRoot + 12 : bassCode === 3 ? bassRoot + 7 : bassRoot;
          this.renderOfflineBass(offCtx, comp, midiToHz(midi), time, stepDur * 1.7, pattern.bassWave);
        }

        // 6. Neon arpeggio (bars 2-8)
        const arpTone = pattern.arpSeq[step16];
        if (arpTone >= 0 && barIdx >= 1) {
          const midi = chord[arpTone % chord.length] + 12;
          this.renderOfflineArp(offCtx, comp, delaySend, midiToHz(midi), time, stepDur * 1.2);
        }

        // 7. Vice City melodic lead hook (bars 5-8)
        if (barIdx >= 4) {
          const leadOffset = pattern.leadHook[step32];
          if (leadOffset !== null) {
            this.renderOfflineLead(
              offCtx,
              comp,
              delaySend,
              midiToHz(chord[0] + leadOffset),
              time,
              Math.min(loopDurationSec - time - 0.02, stepDur * 2.35),
              pattern.leadWave,
            );
          }
        }
      }

      const rendered = await offCtx.startRendering();
      // Tiny 6ms edge crossfade so the 8-bar loop wraps with zero click
      const fadeSamples = Math.min(128, Math.floor(rendered.length * 0.01));
      for (let ch = 0; ch < rendered.numberOfChannels; ch++) {
        const samples = rendered.getChannelData(ch);
        for (let i = 0; i < fadeSamples; i++) {
          const gain = i / fadeSamples;
          samples[i] *= gain;
          samples[samples.length - 1 - i] *= gain;
        }
      }
      this.bufferCache.set(station, rendered);
      return rendered;
    } catch {
      return null;
    }
  }

  private renderOfflineKick(ctx: OfflineAudioContext, dest: AudioNode, time: number, vel: number): void {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(132, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.11);
    osc.frequency.exponentialRampToValueAtTime(34, time + 0.24);
    g.gain.setValueAtTime(0.001, time);
    g.gain.linearRampToValueAtTime(0.64 * vel, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
    osc.connect(g);
    g.connect(dest);
    osc.start(time);
    osc.stop(time + 0.26);
  }

  private renderOfflineSnare(
    ctx: OfflineAudioContext,
    dest: AudioNode,
    delaySend: AudioNode,
    noiseBuf: AudioBuffer,
    time: number,
    vel: number,
  ): void {
    const nSrc = ctx.createBufferSource();
    nSrc.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1850;
    bp.Q.value = 0.85;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.001, time);
    ng.gain.linearRampToValueAtTime(0.3 * vel, time + 0.006);
    ng.gain.exponentialRampToValueAtTime(0.001, time + 0.17);
    nSrc.connect(bp);
    bp.connect(ng);
    ng.connect(dest);
    ng.connect(delaySend);
    nSrc.start(time);
    nSrc.stop(time + 0.19);

    const body = ctx.createOscillator();
    const bg = ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(215, time);
    body.frequency.exponentialRampToValueAtTime(118, time + 0.09);
    bg.gain.setValueAtTime(0.22 * vel, time);
    bg.gain.exponentialRampToValueAtTime(0.001, time + 0.11);
    body.connect(bg);
    bg.connect(dest);
    body.start(time);
    body.stop(time + 0.12);
  }

  private renderOfflineHat(
    ctx: OfflineAudioContext,
    dest: AudioNode,
    noiseBuf: AudioBuffer,
    time: number,
    vel: number,
    open: boolean,
  ): void {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6400;
    const g = ctx.createGain();
    const dur = open ? 0.09 : 0.036;
    g.gain.setValueAtTime(0.1 * vel, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    src.connect(hp);
    hp.connect(g);
    g.connect(dest);
    src.start(time);
    src.stop(time + dur + 0.01);
  }

  private renderOfflineBass(
    ctx: OfflineAudioContext,
    dest: AudioNode,
    freq: number,
    time: number,
    dur: number,
    wave: OscillatorType,
  ): void {
    const osc = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, time);
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(wave === 'sine' ? 420 : 900, time);
    filt.frequency.exponentialRampToValueAtTime(240, time + dur);
    filt.Q.value = 1.5;
    g.gain.setValueAtTime(0.001, time);
    g.gain.linearRampToValueAtTime(0.31, time + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(filt);
    filt.connect(g);
    g.connect(dest);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private renderOfflineChord(
    ctx: OfflineAudioContext,
    dest: AudioNode,
    delaySend: AudioNode,
    midis: number[],
    time: number,
    dur: number,
    wave: OscillatorType,
  ): void {
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(650, time);
    filt.frequency.linearRampToValueAtTime(1600, time + Math.min(0.6, dur * 0.35));
    filt.frequency.exponentialRampToValueAtTime(580, time + dur);
    filt.Q.value = 1.05;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, time);
    g.gain.linearRampToValueAtTime(0.11, time + 0.14);
    g.gain.setValueAtTime(0.095, time + dur * 0.65);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);

    filt.connect(g);
    g.connect(dest);
    g.connect(delaySend);

    for (let i = 0; i < Math.min(4, midis.length); i++) {
      const osc = ctx.createOscillator();
      osc.type = wave;
      osc.frequency.setValueAtTime(midiToHz(midis[i]), time);
      osc.detune.setValueAtTime(i % 2 === 0 ? -6 : 6, time);
      osc.connect(filt);
      osc.start(time);
      osc.stop(time + dur + 0.03);
    }
  }

  private renderOfflineArp(
    ctx: OfflineAudioContext,
    dest: AudioNode,
    delaySend: AudioNode,
    freq: number,
    time: number,
    dur: number,
  ): void {
    const osc = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(2800, time);
    filt.frequency.exponentialRampToValueAtTime(900, time + dur);
    g.gain.setValueAtTime(0.001, time);
    g.gain.linearRampToValueAtTime(0.105, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(filt);
    filt.connect(g);
    g.connect(dest);
    g.connect(delaySend);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private renderOfflineLead(
    ctx: OfflineAudioContext,
    dest: AudioNode,
    delaySend: AudioNode,
    freq: number,
    time: number,
    dur: number,
    wave: OscillatorType,
  ): void {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = wave;
    osc2.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq, time);
    osc.detune.setValueAtTime(5, time);
    osc2.detune.setValueAtTime(-5, time);

    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(2500, time);
    filt.frequency.exponentialRampToValueAtTime(1100, time + dur);
    filt.Q.value = 1.35;

    g.gain.setValueAtTime(0.001, time);
    g.gain.linearRampToValueAtTime(0.125, time + 0.025);
    g.gain.setValueAtTime(0.095, time + dur * 0.65);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filt);
    osc2.connect(filt);
    filt.connect(g);
    g.connect(dest);
    g.connect(delaySend);

    osc.start(time);
    osc2.start(time);
    osc.stop(time + dur + 0.03);
    osc2.stop(time + dur + 0.03);
  }

  private playRadioTuneClick(): void {
    if (!this.ctx || !this.busGain || !this.clickNoiseBuffer) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.clickNoiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400;
    bp.Q.value = 2.4;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.08, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.busGain);
    src.start(t);
    src.stop(t + 0.06);
  }

  public dispose(): void {
    this.disposed = true;
    this.silence();
    this.bufferCache.clear();
    this.pendingRender.clear();
    this.ctx = null;
    this.busGain = null;
    this.busFilter = null;
    this.clickNoiseBuffer = null;
  }
}
