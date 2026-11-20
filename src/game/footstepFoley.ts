import { PIER_ZONES, RECREATION_ZONES } from './cityLayout';
import { isPointOnRoadway } from './simulation';

export type FootstepSurface = 'concrete' | 'asphalt' | 'grass' | 'wood' | 'gravel' | 'wet';

export type FootstepGaitKind = 'walk' | 'run' | 'landing' | 'scuff';

export interface FootstepAudioOptions {
  /** Normalized 0.25..1.15 impact weight (auto-derived from speedMps if omitted) */
  intensity?: number;
  /** Player horizontal movement speed in m/s (0..10+) for realistic walk vs run articulation */
  speedMps?: number;
  surface?: FootstepSurface;
  /** Continuous surface wetness 0..1 from rain/puddles */
  wetness?: number;
  foot?: 'left' | 'right';
  isLanding?: boolean;
  isScuff?: boolean;
  isHeels?: boolean;
}

export interface FootstepAcousticProfile {
  gait: FootstepGaitKind;
  effectiveSurface: Exclude<FootstepSurface, 'wet'>;
  wetness: number;
  gain: number;
  /** Time between heel strike and forefoot roll-down in seconds (shorter when sprinting) */
  heelToToeDelaySec: number;
  /** Stereo pan: left foot slightly left, right foot slightly right */
  pan: number;
  /** Spectral brightness multiplier (higher during faster/harder impacts) */
  brightness: number;
  /** Low-end body thump gain */
  thumpGain: number;
  /** Hard crisp surface tap transient gain */
  tapGain: number;
  /** Granular grit/foliage texture duration in seconds */
  textureDurationSec: number;
  /** Granular grit/foliage texture gain */
  textureGain: number;
  /** Puddle/wet splash overlay gain */
  splashGain: number;
  /** Subtle urban street early-reflection gain (concrete/asphalt/wood) */
  reflectionGain: number;
}

// ---------------------------------------------------------------------------
// PURE TESTABLE SURFACE DETECTION & ACOUSTIC PROFILE LOGIC
// ---------------------------------------------------------------------------

/**
 * Resolves the exact physical ground material under (x, z) in New York City
 * along with continuous surface wetness from active rain.
 */
export function resolveFootstepSurfaceAt(
  x: number,
  z: number,
  rainIntensity = 0,
): { surface: Exclude<FootstepSurface, 'wet'>; wetness: number } {
  const wetness = Math.max(0, Math.min(1, rainIntensity));

  // 1. Hudson River wooden boardwalk piers
  for (const pier of PIER_ZONES) {
    if (x >= pier.minX && x <= pier.maxX && z >= pier.minZ && z <= pier.maxZ) {
      return { surface: 'wood', wetness };
    }
  }

  // 2. Parks, stadiums, playgrounds, and blacktop streetball courts
  for (const zone of RECREATION_ZONES) {
    if (Math.abs(x - zone.cx) <= zone.width * 0.5 && Math.abs(z - zone.cz) <= zone.depth * 0.5) {
      if (zone.kind === 'park' || zone.kind === 'stadium') {
        return { surface: 'grass', wetness };
      }
      if (zone.kind === 'playground') {
        return { surface: 'gravel', wetness };
      }
      if (zone.kind === 'courts') {
        return { surface: 'asphalt', wetness };
      }
    }
  }

  // 3. NYC asphalt avenues & crosswalks
  if (isPointOnRoadway(x, z, 0.2)) {
    return { surface: 'asphalt', wetness };
  }

  // 4. Default NYC concrete sidewalks & stone plazas
  return { surface: 'concrete', wetness };
}

/**
 * Computes physical acoustic parameters for a single footstep based on speed,
 * surface material, rain wetness, gait state, and left/right foot placement.
 */
export function computeFootstepAcousticProfile(opts: FootstepAudioOptions = {}): FootstepAcousticProfile {
  const rawSurface = opts.surface ?? 'concrete';
  const effectiveSurface: Exclude<FootstepSurface, 'wet'> =
    rawSurface === 'wet' ? 'concrete' : rawSurface;
  const wetness = Math.max(
    rawSurface === 'wet' ? 0.78 : 0,
    Math.min(1, opts.wetness ?? 0),
  );

  const speedMps = Math.max(0, opts.speedMps ?? (opts.intensity !== undefined ? opts.intensity * 8.5 : 4.8));
  const speedNorm = Math.max(0, Math.min(1, (speedMps - 0.8) / 8.8));

  const gait: FootstepGaitKind = opts.isLanding
    ? 'landing'
    : opts.isScuff
      ? 'scuff'
      : speedMps >= 6.1
        ? 'run'
        : 'walk';

  const baseIntensity =
    opts.intensity !== undefined
      ? Math.max(0.28, Math.min(1.25, opts.intensity))
      : gait === 'landing'
        ? 1.15
        : gait === 'scuff'
          ? 0.72
          : 0.42 + speedNorm * 0.62;

  // Real human heel-to-toe roll compresses dramatically from walk (~56ms) to sprint (~19ms)
  const heelToToeDelaySec =
    gait === 'landing'
      ? 0.028
      : gait === 'scuff'
        ? 0.015
        : Math.max(0.018, 0.064 - speedNorm * 0.044);

  const pan =
    gait === 'landing'
      ? 0
      : opts.foot === 'left'
        ? -0.13
        : opts.foot === 'right'
          ? 0.13
          : 0;

  const brightness = 0.84 + speedNorm * 0.42 + (gait === 'landing' ? 0.14 : 0);

  // Surface-specific physical energy balance
  let thumpGain = 0.56;
  let tapGain = 0.74;
  let textureGain = 0.42;
  let textureDurationSec = 0.055;
  let reflectionGain = 0.14;

  switch (effectiveSurface) {
    case 'concrete':
      thumpGain = 0.56;
      tapGain = 0.86;
      textureGain = 0.36;
      textureDurationSec = gait === 'run' ? 0.042 : 0.054;
      reflectionGain = 0.18;
      break;
    case 'asphalt':
      thumpGain = 0.64;
      tapGain = 0.72;
      textureGain = 0.62;
      textureDurationSec = gait === 'run' ? 0.052 : 0.068;
      reflectionGain = 0.14;
      break;
    case 'grass':
      thumpGain = 0.48;
      tapGain = 0.1; // grass absorbs sharp heel click almost completely
      textureGain = 0.88;
      textureDurationSec = gait === 'run' ? 0.105 : 0.145;
      reflectionGain = 0.0; // turf doesn't slapback echo
      break;
    case 'wood':
      thumpGain = 0.82;
      tapGain = 0.78;
      textureGain = 0.34;
      textureDurationSec = 0.065;
      reflectionGain = 0.16;
      break;
    case 'gravel':
      thumpGain = 0.44;
      tapGain = 0.42;
      textureGain = 0.94;
      textureDurationSec = gait === 'run' ? 0.088 : 0.118;
      reflectionGain = 0.05;
      break;
  }

  const splashGain = wetness > 0.12 ? wetness * (0.45 + speedNorm * 0.45) * (gait === 'landing' ? 1.35 : 1.0) : 0;

  return {
    gait,
    effectiveSurface,
    wetness,
    gain: baseIntensity * (gait === 'run' ? 1.16 : gait === 'landing' ? 1.32 : 1.0),
    heelToToeDelaySec,
    pan,
    brightness,
    thumpGain: thumpGain * baseIntensity,
    tapGain: tapGain * baseIntensity,
    textureDurationSec,
    textureGain: textureGain * baseIntensity,
    splashGain,
    reflectionGain: reflectionGain * baseIntensity,
  };
}

// ---------------------------------------------------------------------------
// STUDIO PROCEDURAL FOLEY SYNTHESIZER (WEB AUDIO API)
// ---------------------------------------------------------------------------

/**
 * Generates realistic, tactile, multi-layered footstep Foley using pre-baked
 * micro-impulse, granular grit, grass foliage, and water droplet buffers routed
 * through physical surface resonant filter banks and subtle stereo panning.
 */
export class FootstepFoleySynth {
  private ctx: AudioContext | null = null;
  private busInput: GainNode | null = null;
  private impactClickBuf: AudioBuffer | null = null;
  private gritScuffBuf: AudioBuffer | null = null;
  private foliageBrushBuf: AudioBuffer | null = null;
  private splashDropletBuf: AudioBuffer | null = null;
  private stepCounter = 0;

  public init(ctx: AudioContext, destination: AudioNode): void {
    this.ctx = ctx;

    // Dedicated footstep bus with soft limiting compressor so footsteps are
    // crisp and audible over NYC traffic without ever clipping on landings
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.002;
    comp.release.value = 0.09;

    const bus = ctx.createGain();
    bus.gain.value = 1.65; // lifts realistic Foley clearly out of the ambient street bed
    bus.connect(comp);
    comp.connect(destination);
    this.busInput = bus;

    this.bakeFoleyBuffers(ctx);
  }

  private bakeFoleyBuffers(ctx: AudioContext): void {
    const sr = ctx.sampleRate;

    // 1. Sharp shoe-sole contact impulse (75ms): sub-ms attack + micro-bounce tail
    const clickLen = Math.floor(sr * 0.075);
    const clickBuf = ctx.createBuffer(1, clickLen, sr);
    const clickData = clickBuf.getChannelData(0);
    let lp = 0;
    for (let i = 0; i < clickLen; i++) {
      const t = i / sr;
      const white = Math.random() * 2 - 1;
      lp = lp * 0.28 + white * 0.72;
      // Fast physical contact transient + tiny secondary sole micro-chatter
      const mainEnv = Math.exp(-t * 95);
      const bodyEnv = Math.exp(-t * 32) * 0.55;
      const microSpike = t < 0.0025 ? 1.0 : Math.random() < 0.03 ? 0.65 : 0.35;
      clickData[i] = Math.max(-1, Math.min(1, (white * mainEnv * 0.95 + lp * bodyEnv) * microSpike * 1.45));
    }
    this.impactClickBuf = clickBuf;

    // 2. Granular asphalt/gravel grit buffer (480ms): pink friction + discrete mineral micro-pops
    const gritLen = Math.floor(sr * 0.48);
    const gritBuf = ctx.createBuffer(1, gritLen, sr);
    const gritData = gritBuf.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < gritLen; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + w * 0.029;
      b1 = 0.985 * b1 + w * 0.032;
      b2 = 0.95 * b2 + w * 0.048;
      const pink = (b0 + b1 + b2 + w * 0.18) * 1.5;
      gritData[i] = pink * 0.48;
    }
    // Inject ~140 crisp sand/pebble grain micro-clicks across the buffer
    for (let g = 0; g < 140; g++) {
      const start = Math.floor(Math.random() * (gritLen - 90));
      const grainLen = 12 + Math.floor(Math.random() * 55);
      const amp = 0.35 + Math.random() * 0.65;
      const sign = Math.random() < 0.5 ? 1 : -1;
      for (let j = 0; j < grainLen && start + j < gritLen; j++) {
        const env = Math.sin((j / grainLen) * Math.PI) * Math.exp(-j / (grainLen * 0.45));
        gritData[start + j] = Math.max(-1, Math.min(1, gritData[start + j] + (Math.random() * 2 - 1) * amp * env * sign));
      }
    }
    this.gritScuffBuf = gritBuf;

    // 3. Organic grass/foliage brush buffer (520ms): undulating blade rustle + delicate dry-blade snaps
    const grassLen = Math.floor(sr * 0.52);
    const grassBuf = ctx.createBuffer(1, grassLen, sr);
    const grassData = grassBuf.getChannelData(0);
    let gLp1 = 0;
    let gLp2 = 0;
    for (let i = 0; i < grassLen; i++) {
      const t = i / sr;
      const w = Math.random() * 2 - 1;
      gLp1 = gLp1 * 0.65 + w * 0.35;
      gLp2 = gLp2 * 0.88 + gLp1 * 0.12;
      // Multi-rate organic rustle modulation (mimics dozens of grass blades flexing)
      const flutter = 0.58 + 0.24 * Math.sin(t * 78) + 0.18 * Math.sin(t * 134 + 1.3);
      const crispSnap = Math.random() < 0.0045 ? (Math.random() * 2 - 1) * 0.85 : 0;
      grassData[i] = Math.max(-1, Math.min(1, ((gLp1 - gLp2) * 1.9 + gLp2 * 0.55) * flutter + crispSnap));
    }
    this.foliageBrushBuf = grassBuf;

    // 4. Rain puddle splash & droplet buffer (380ms): liquid spray + bubbly high-Q micro-droplets
    const wetLen = Math.floor(sr * 0.38);
    const wetBuf = ctx.createBuffer(1, wetLen, sr);
    const wetData = wetBuf.getChannelData(0);
    let wHp = 0;
    let wPrev = 0;
    for (let i = 0; i < wetLen; i++) {
      const w = Math.random() * 2 - 1;
      wHp = w - wPrev * 0.85;
      wPrev = w;
      wetData[i] = wHp * 0.42;
    }
    for (let d = 0; d < 65; d++) {
      const start = Math.floor(Math.random() * (wetLen - 160));
      const dropFreq = 1900 + Math.random() * 4400;
      const dropLen = 35 + Math.floor(Math.random() * 110);
      const amp = 0.22 + Math.random() * 0.55;
      for (let j = 0; j < dropLen && start + j < wetLen; j++) {
        const dt = j / sr;
        const env = Math.exp(-dt * 95);
        // Upward pitch chirp typical of tiny water bubbles/droplets
        const phase = 2 * Math.PI * (dropFreq * dt + 4200 * dt * dt);
        wetData[start + j] = Math.max(-1, Math.min(1, wetData[start + j] + Math.sin(phase) * env * amp));
      }
    }
    this.splashDropletBuf = wetBuf;
  }

  public play(opts: FootstepAudioOptions = {}): void {
    if (!this.ctx || !this.busInput || !this.impactClickBuf) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const profile = computeFootstepAcousticProfile(opts);
    const stepIdx = this.stepCounter++;

    // Subtle organic variation per step (alternating left/right shoe timbre + micro-randomization)
    const footPitchBias = opts.foot === 'left' ? 0.965 : opts.foot === 'right' ? 1.035 : 1.0;
    const microVar = (0.94 + Math.random() * 0.12) * footPitchBias;

    // Create a single lightweight stereo panner for this footstep's layers
    let outNode: AudioNode = this.busInput;
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(profile.pan, now);
      panner.connect(this.busInput);
      outNode = panner;
    }

    if (profile.gait === 'scuff') {
      // Dedicated brake/pivot sole-drag scuff
      this.playTextureLayer(now, profile, microVar, outNode, 1.15, 0.085);
      return;
    }

    // 1. PRIMARY HEEL STRIKE (t = 0)
    this.playImpactLayers(now, profile, microVar, outNode, 1.0, false, Boolean(opts.isHeels));

    // 2. FOREFOOT ROLL-DOWN / TOE SLAP (or 2nd foot stagger on jump landing)
    const toeTime = now + profile.heelToToeDelaySec;
    const isSecondFootLanding = profile.gait === 'landing';
    this.playImpactLayers(
      toeTime,
      profile,
      microVar * (isSecondFootLanding ? 0.96 : 1.09),
      outNode,
      isSecondFootLanding ? 0.88 : 0.56,
      !isSecondFootLanding,
      false,
    );

    // 3. SURFACE TEXTURE / PUSH-OFF GRIT / GRASS SWISH
    const texStart = profile.effectiveSurface === 'grass' ? now + 0.006 : now + profile.heelToToeDelaySec * 0.55;
    this.playTextureLayer(texStart, profile, microVar, outNode, 1.0, profile.textureDurationSec);

    // 4. RAIN PUDDLE / WET SPLASH OVERLAY
    if (profile.splashGain > 0.04 && this.splashDropletBuf) {
      this.playWetSplash(now + 0.008, profile, microVar, outNode, stepIdx);
    }

    // 5. SUBTLE OUTDOOR NYC EARLY REFLECTION (slapback off curbs/brownstones on hard surfaces)
    if (profile.reflectionGain > 0.03) {
      this.playUrbanReflection(now + 0.022, profile, microVar, outNode);
    }
  }

  private playImpactLayers(
    startAt: number,
    profile: FootstepAcousticProfile,
    varMult: number,
    dest: AudioNode,
    weightScale: number,
    isForefoot: boolean,
    isHeels: boolean,
  ): void {
    const ctx = this.ctx!;
    const surface = profile.effectiveSurface;

    // Layer A: Grounded low-end shoe/body thump (filtered impact impulse — NO electronic sine boop!)
    if (this.impactClickBuf && profile.thumpGain > 0.02) {
      const src = ctx.createBufferSource();
      src.buffer = this.impactClickBuf;
      src.playbackRate.value = (isForefoot ? 1.12 : 0.86) * varMult;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      const thumpCutoff =
        surface === 'grass'
          ? 125
          : surface === 'wood'
            ? 240
            : surface === 'asphalt'
              ? 175
              : 195;
      lp.frequency.setValueAtTime(thumpCutoff * varMult, startAt);
      lp.Q.value = surface === 'wood' ? 2.4 : 1.15;

      const g = ctx.createGain();
      const peak = profile.thumpGain * weightScale * (isForefoot ? 0.52 : 0.92);
      const decay = surface === 'grass' ? 0.068 : surface === 'wood' ? 0.072 : 0.048;
      g.gain.setValueAtTime(0.0008, startAt);
      g.gain.linearRampToValueAtTime(peak, startAt + (surface === 'grass' ? 0.009 : 0.0025));
      g.gain.exponentialRampToValueAtTime(0.0008, startAt + decay);

      src.connect(lp);
      lp.connect(g);
      g.connect(dest);
      src.start(startAt, 0, decay + 0.015);
    }

    // Layer B: Surface-specific modal contact tap / wood plank resonance
    if (this.impactClickBuf && profile.tapGain > 0.03) {
      if (surface === 'wood') {
        // 3 resonant hollow-timber plank cavity formants (unmistakable pier boardwalk sound)
        const woodModes = [
          { freq: 182, q: 5.2, gain: 0.78, dur: 0.088 },
          { freq: 375, q: 5.8, gain: 0.58, dur: 0.068 },
          { freq: 760, q: 4.5, gain: 0.42, dur: 0.046 },
        ];
        for (const mode of woodModes) {
          const src = ctx.createBufferSource();
          src.buffer = this.impactClickBuf;
          src.playbackRate.value = varMult * (isForefoot ? 1.08 : 0.96);

          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(mode.freq * varMult * (isForefoot ? 1.07 : 1.0), startAt);
          bp.Q.value = mode.q;

          const g = ctx.createGain();
          const peak = profile.tapGain * mode.gain * weightScale * (isForefoot ? 0.65 : 1.0);
          g.gain.setValueAtTime(0.0008, startAt);
          g.gain.linearRampToValueAtTime(peak, startAt + 0.002);
          g.gain.exponentialRampToValueAtTime(0.0008, startAt + mode.dur);

          src.connect(bp);
          bp.connect(g);
          g.connect(dest);
          src.start(startAt, 0, mode.dur + 0.01);
        }
      } else {
        // Hard concrete / asphalt / gravel / soft turf sole slap
        const src = ctx.createBufferSource();
        src.buffer = this.impactClickBuf;
        src.playbackRate.value = (isForefoot ? 1.24 : 1.02) * varMult;

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        const baseFreq =
          surface === 'concrete'
            ? isForefoot
              ? 1480
              : 980
            : surface === 'asphalt'
              ? isForefoot
                ? 1180
                : 760
              : surface === 'gravel'
                ? 1650
                : 620;
        bp.frequency.setValueAtTime(baseFreq * profile.brightness * varMult, startAt);
        bp.Q.value = surface === 'concrete' ? 1.85 : surface === 'asphalt' ? 1.45 : 1.1;

        const crispShelf = ctx.createBiquadFilter();
        crispShelf.type = 'highshelf';
        crispShelf.frequency.value = 2200;
        crispShelf.gain.value = surface === 'concrete' ? 4.5 : surface === 'asphalt' ? 2.5 : -4.0;

        const g = ctx.createGain();
        const dur = surface === 'concrete' ? 0.034 : surface === 'asphalt' ? 0.04 : 0.048;
        const peak = profile.tapGain * weightScale * (isForefoot ? 0.76 : 0.95);
        g.gain.setValueAtTime(0.0008, startAt);
        g.gain.linearRampToValueAtTime(peak, startAt + 0.0018);
        g.gain.exponentialRampToValueAtTime(0.0008, startAt + dur);

        src.connect(bp);
        bp.connect(crispShelf);
        crispShelf.connect(g);
        g.connect(dest);
        src.start(startAt, 0, dur + 0.012);
      }
    }

    // Layer C: Optional sharp stiletto heel clack on hard pavement/asphalt/wood (when wearing dresses)
    if (isHeels && !isForefoot && (surface === 'concrete' || surface === 'asphalt' || surface === 'wood')) {
      const heelModes = [
        { freq: surface === 'wood' ? 1750 : 2350, q: 7.5, gain: 0.48, dur: 0.022 },
        { freq: surface === 'wood' ? 3100 : 4150, q: 6.5, gain: 0.34, dur: 0.016 },
      ];
      for (const hm of heelModes) {
        const src = ctx.createBufferSource();
        src.buffer = this.impactClickBuf!;
        src.playbackRate.value = 1.35 * varMult;

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(hm.freq * varMult, startAt);
        bp.Q.value = hm.q;

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0008, startAt);
        g.gain.linearRampToValueAtTime(profile.tapGain * hm.gain, startAt + 0.0012);
        g.gain.exponentialRampToValueAtTime(0.0008, startAt + hm.dur);

        src.connect(bp);
        bp.connect(g);
        g.connect(dest);
        src.start(startAt, 0, hm.dur + 0.008);
      }
    }
  }

  private playTextureLayer(
    startAt: number,
    profile: FootstepAcousticProfile,
    varMult: number,
    dest: AudioNode,
    gainScale: number,
    durationSec: number,
  ): void {
    const ctx = this.ctx!;
    const surface = profile.effectiveSurface;
    const buf = surface === 'grass' ? this.foliageBrushBuf : this.gritScuffBuf;
    if (!buf || profile.textureGain <= 0.02) return;

    const maxOffset = Math.max(0.01, buf.duration - durationSec - 0.03);
    const offset = Math.random() * maxOffset;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = (surface === 'grass' ? 0.94 : 1.0) * varMult * (profile.gait === 'run' ? 1.12 : 0.98);

    const filt = ctx.createBiquadFilter();
    if (surface === 'grass') {
      filt.type = 'bandpass';
      filt.frequency.setValueAtTime(1450 * profile.brightness * varMult, startAt);
      filt.Q.value = 0.85;
    } else if (surface === 'gravel') {
      filt.type = 'bandpass';
      filt.frequency.setValueAtTime(2550 * profile.brightness * varMult, startAt);
      filt.Q.value = 0.95;
    } else if (surface === 'asphalt') {
      filt.type = 'bandpass';
      filt.frequency.setValueAtTime(2950 * profile.brightness * varMult, startAt);
      filt.Q.value = 1.15;
    } else if (surface === 'wood') {
      filt.type = 'bandpass';
      filt.frequency.setValueAtTime(1600 * varMult, startAt);
      filt.Q.value = 1.3;
    } else {
      // concrete subtle fine dust grit brush
      filt.type = 'highpass';
      filt.frequency.setValueAtTime(2400 * varMult, startAt);
    }

    const g = ctx.createGain();
    const peak = profile.textureGain * gainScale * 0.72;
    const attack = surface === 'grass' ? 0.016 : surface === 'gravel' ? 0.01 : 0.005;
    g.gain.setValueAtTime(0.0008, startAt);
    g.gain.linearRampToValueAtTime(peak, startAt + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, startAt + durationSec);

    src.connect(filt);
    filt.connect(g);
    g.connect(dest);
    src.start(startAt, offset, durationSec + 0.02);

    // Extra airy high-frequency grass blade whisper layer so turf sounds unmistakably leafy
    if (surface === 'grass' && this.foliageBrushBuf) {
      const airSrc = ctx.createBufferSource();
      airSrc.buffer = this.foliageBrushBuf;
      airSrc.playbackRate.value = 1.18 * varMult;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(3400 * varMult, startAt);
      const airG = ctx.createGain();
      airG.gain.setValueAtTime(0.0008, startAt + 0.012);
      airG.gain.linearRampToValueAtTime(peak * 0.48, startAt + 0.032);
      airG.gain.exponentialRampToValueAtTime(0.0008, startAt + durationSec * 1.08);
      airSrc.connect(hp);
      hp.connect(airG);
      airG.connect(dest);
      airSrc.start(startAt + 0.01, (offset + 0.14) % maxOffset, durationSec + 0.02);
    }
  }

  private playWetSplash(
    startAt: number,
    profile: FootstepAcousticProfile,
    varMult: number,
    dest: AudioNode,
    stepIdx: number,
  ): void {
    const ctx = this.ctx!;
    if (!this.splashDropletBuf) return;

    const dur = profile.gait === 'run' || profile.gait === 'landing' ? 0.135 : 0.105;
    const maxOffset = Math.max(0.01, this.splashDropletBuf.duration - dur - 0.02);
    const offset = ((stepIdx * 0.073) % maxOffset + Math.random() * 0.04) % maxOffset;

    const src = ctx.createBufferSource();
    src.buffer = this.splashDropletBuf;
    src.playbackRate.value = (0.95 + Math.random() * 0.15) * varMult;

    // Resonant upward sweep creates the authentic wet puddle "shhlip-splash"
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1250 * varMult, startAt);
    bp.frequency.exponentialRampToValueAtTime(3100 * varMult, startAt + dur * 0.72);
    bp.Q.value = 1.35;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0008, startAt);
    g.gain.linearRampToValueAtTime(profile.splashGain * 0.65, startAt + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0008, startAt + dur);

    src.connect(bp);
    bp.connect(g);
    g.connect(dest);
    src.start(startAt, offset, dur + 0.02);
  }

  private playUrbanReflection(
    startAt: number,
    profile: FootstepAcousticProfile,
    varMult: number,
    dest: AudioNode,
  ): void {
    const ctx = this.ctx!;
    if (!this.impactClickBuf) return;

    const src = ctx.createBufferSource();
    src.buffer = this.impactClickBuf;
    src.playbackRate.value = 0.96 * varMult;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1280 * varMult, startAt);
    bp.Q.value = 1.2;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0008, startAt);
    g.gain.linearRampToValueAtTime(profile.reflectionGain * 0.34, startAt + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0008, startAt + 0.055);

    src.connect(bp);
    bp.connect(g);
    g.connect(dest);
    src.start(startAt, 0, 0.065);
  }

  public dispose(): void {
    this.ctx = null;
    this.busInput = null;
    this.impactClickBuf = null;
    this.gritScuffBuf = null;
    this.foliageBrushBuf = null;
    this.splashDropletBuf = null;
  }
}
