import type { DistrictId } from './types';

export interface AmbientDistrictProfile {
  label: string;
  traffic: number;
  sea: number;
  construction: number;
  bazaar: number;
  hornRate: number;
  seagullRate: number;
  hammerRate: number;
  foghornRate: number;
}

export const DISTRICT_AMBIENT_PROFILES: Record<DistrictId, AmbientDistrictProfile> = {
  'Battery Park': {
    label: 'Harbor Breeze & Traffic',
    traffic: 0.45,
    sea: 0.72,
    construction: 0.0,
    bazaar: 0.3,
    hornRate: 0.14,
    seagullRate: 0.2,
    hammerRate: 0.0,
    foghornRate: 0.08,
  },
  'Wall Street': {
    label: 'Financial District Rush',
    traffic: 0.82,
    sea: 0.12,
    construction: 0.25,
    bazaar: 0.35,
    hornRate: 0.36,
    seagullRate: 0.02,
    hammerRate: 0.1,
    foghornRate: 0.0,
  },
  'Washington Square': {
    label: 'Village Plaza & Street Music',
    traffic: 0.55,
    sea: 0.1,
    construction: 0.04,
    bazaar: 0.65,
    hornRate: 0.22,
    seagullRate: 0.05,
    hammerRate: 0.0,
    foghornRate: 0.0,
  },
  'Battery Ferry Pier': {
    label: 'Ferry Slips & Hudson Swell',
    traffic: 0.2,
    sea: 0.92,
    construction: 0.05,
    bazaar: 0.22,
    hornRate: 0.06,
    seagullRate: 0.32,
    hammerRate: 0.0,
    foghornRate: 0.16,
  },
  'Hudson Harbor': {
    label: 'Open Hudson Harbor',
    traffic: 0.05,
    sea: 1.0,
    construction: 0.0,
    bazaar: 0.0,
    hornRate: 0.0,
    seagullRate: 0.35,
    hammerRate: 0.0,
    foghornRate: 0.22,
  },
  'Union Square': {
    label: 'Central Park & Pickup Cricket',
    traffic: 0.5,
    sea: 0.05,
    construction: 0.05,
    bazaar: 0.72,
    hornRate: 0.2,
    seagullRate: 0.08,
    hammerRate: 0.0,
    foghornRate: 0.0,
  },
  'SoHo Lofts': {
    label: 'SoHo Cast-Iron Bustle',
    traffic: 0.7,
    sea: 0.08,
    construction: 0.12,
    bazaar: 0.65,
    hornRate: 0.28,
    seagullRate: 0.02,
    hammerRate: 0.05,
    foghornRate: 0.0,
  },
  'Financial District': {
    label: 'FiDi Skyscraper Wind',
    traffic: 0.85,
    sea: 0.2,
    construction: 0.3,
    bazaar: 0.28,
    hornRate: 0.38,
    seagullRate: 0.04,
    hammerRate: 0.12,
    foghornRate: 0.02,
  },
  'Lower East Side': {
    label: 'LES Tenements & Deli Crowd',
    traffic: 0.68,
    sea: 0.08,
    construction: 0.28,
    bazaar: 0.8,
    hornRate: 0.3,
    seagullRate: 0.02,
    hammerRate: 0.14,
    foghornRate: 0.0,
  },
  'Midtown West': {
    label: 'Times Square Cabs & Neon',
    traffic: 0.96,
    sea: 0.08,
    construction: 0.18,
    bazaar: 0.78,
    hornRate: 0.48,
    seagullRate: 0.0,
    hammerRate: 0.08,
    foghornRate: 0.0,
  },
  'Brooklyn Bridge': {
    label: 'East River Bridge Highway',
    traffic: 0.84,
    sea: 0.45,
    construction: 0.32,
    bazaar: 0.15,
    hornRate: 0.3,
    seagullRate: 0.16,
    hammerRate: 0.16,
    foghornRate: 0.06,
  },
  Chinatown: {
    label: 'Canal Street Market Buzz',
    traffic: 0.72,
    sea: 0.05,
    construction: 0.2,
    bazaar: 0.95,
    hornRate: 0.34,
    seagullRate: 0.0,
    hammerRate: 0.08,
    foghornRate: 0.0,
  },
  'Chelsea Piers': {
    label: 'West Side Waterfront Piers',
    traffic: 0.42,
    sea: 0.85,
    construction: 0.1,
    bazaar: 0.35,
    hornRate: 0.14,
    seagullRate: 0.28,
    hammerRate: 0.04,
    foghornRate: 0.12,
  },
  Williamsburg: {
    label: 'Brooklyn Loft & Construction',
    traffic: 0.62,
    sea: 0.25,
    construction: 0.75,
    bazaar: 0.55,
    hornRate: 0.24,
    seagullRate: 0.08,
    hammerRate: 0.45,
    foghornRate: 0.04,
  },
  'Coney Island': {
    label: 'Atlantic Boardwalk & Surf',
    traffic: 0.28,
    sea: 0.9,
    construction: 0.08,
    bazaar: 0.55,
    hornRate: 0.08,
    seagullRate: 0.32,
    hammerRate: 0.02,
    foghornRate: 0.1,
  },
  'Midtown East': {
    label: 'Fifth Avenue & Spire Roar',
    traffic: 0.92,
    sea: 0.05,
    construction: 0.22,
    bazaar: 0.62,
    hornRate: 0.44,
    seagullRate: 0.0,
    hammerRate: 0.1,
    foghornRate: 0.0,
  },
  'Bronx Stadium': {
    label: 'Bronx Ballpark Crowd Roar',
    traffic: 0.65,
    sea: 0.05,
    construction: 0.2,
    bazaar: 0.88,
    hornRate: 0.24,
    seagullRate: 0.04,
    hammerRate: 0.1,
    foghornRate: 0.0,
  },
  'Harlem Rucker': {
    label: 'Rucker Park Courts & Uptown',
    traffic: 0.56,
    sea: 0.05,
    construction: 0.16,
    bazaar: 0.82,
    hornRate: 0.22,
    seagullRate: 0.02,
    hammerRate: 0.06,
    foghornRate: 0.0,
  },
  'Flushing Meadows': {
    label: 'Queens Park Cricket & Breeze',
    traffic: 0.4,
    sea: 0.18,
    construction: 0.14,
    bazaar: 0.74,
    hornRate: 0.14,
    seagullRate: 0.12,
    hammerRate: 0.05,
    foghornRate: 0.0,
  },
};

export function getAmbientProfile(district: DistrictId): AmbientDistrictProfile {
  return DISTRICT_AMBIENT_PROFILES[district] ?? DISTRICT_AMBIENT_PROFILES['Battery Park'];
}

export class AmbientAudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  private trafficGain: GainNode | null = null;
  private seaGain: GainNode | null = null;
  private seaFilter: BiquadFilterNode | null = null;
  private constructionGain: GainNode | null = null;
  private bazaarGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private loopSources: AudioBufferSourceNode[] = [];

  private wavePhase = 0;
  private hornCooldown = 2.4;
  private seagullCooldown = 3.2;
  private hammerCooldown = 1.6;
  private foghornCooldown = 7.5;
  private activeDistrict: DistrictId = 'Battery Park';

  public init(ctx: AudioContext, destination: AudioNode): void {
    if (this.initialized) return;
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0.42;
    master.connect(destination);
    this.masterGain = master;

    const sr = ctx.sampleRate;
    const noiseLen = sr * 3;
    const noiseBuf = ctx.createBuffer(1, noiseLen, sr);
    const data = noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < noiseLen; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.06 * white) / 1.06;
      data[i] = last * 2.4;
    }

    const trafficSrc = ctx.createBufferSource();
    trafficSrc.buffer = noiseBuf;
    trafficSrc.loop = true;
    const trafficFilter = ctx.createBiquadFilter();
    trafficFilter.type = 'bandpass';
    trafficFilter.frequency.value = 185;
    trafficFilter.Q.value = 0.7;
    const trafficGain = ctx.createGain();
    trafficGain.gain.value = 0.0001;
    trafficSrc.connect(trafficFilter);
    trafficFilter.connect(trafficGain);
    trafficGain.connect(master);
    trafficSrc.start();
    this.trafficGain = trafficGain;

    const seaSrc = ctx.createBufferSource();
    seaSrc.buffer = noiseBuf;
    seaSrc.loop = true;
    const seaFilter = ctx.createBiquadFilter();
    seaFilter.type = 'lowpass';
    seaFilter.frequency.value = 420;
    seaFilter.Q.value = 0.9;
    const seaGain = ctx.createGain();
    seaGain.gain.value = 0.0001;
    seaSrc.connect(seaFilter);
    seaFilter.connect(seaGain);
    seaGain.connect(master);
    seaSrc.start();
    this.seaFilter = seaFilter;
    this.seaGain = seaGain;

    const consSrc = ctx.createBufferSource();
    consSrc.buffer = noiseBuf;
    consSrc.loop = true;
    const consFilter = ctx.createBiquadFilter();
    consFilter.type = 'bandpass';
    consFilter.frequency.value = 340;
    consFilter.Q.value = 1.6;
    const consGain = ctx.createGain();
    consGain.gain.value = 0.0001;
    consSrc.connect(consFilter);
    consFilter.connect(consGain);
    consGain.connect(master);
    consSrc.start();
    this.constructionGain = consGain;

    const bazSrc = ctx.createBufferSource();
    bazSrc.buffer = noiseBuf;
    bazSrc.loop = true;
    const bazFilter = ctx.createBiquadFilter();
    bazFilter.type = 'bandpass';
    bazFilter.frequency.value = 780;
    bazFilter.Q.value = 1.1;
    const bazGain = ctx.createGain();
    bazGain.gain.value = 0.0001;
    bazSrc.connect(bazFilter);
    bazFilter.connect(bazGain);
    bazGain.connect(master);
    bazSrc.start();
    this.bazaarGain = bazGain;

    const rainBuf = ctx.createBuffer(1, sr * 2, sr);
    const rData = rainBuf.getChannelData(0);
    for (let i = 0; i < rData.length; i++) {
      rData[i] = (Math.random() * 2 - 1) * 0.65;
    }
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = rainBuf;
    rainSrc.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1950;
    rainFilter.Q.value = 0.65;
    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.0001;
    rainSrc.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(master);
    rainSrc.start();
    this.rainFilter = rainFilter;
    this.rainGain = rainGain;
    this.loopSources = [trafficSrc, seaSrc, consSrc, bazSrc, rainSrc];

    this.initialized = true;
  }

  public getActiveDistrict(): DistrictId {
    return this.activeDistrict;
  }

  private isSilenced = false;
  private paramUpdateAcc = 0.2;

  public silence(): void {
    if (!this.ctx || !this.initialized || this.isSilenced) return;
    this.isSilenced = true;
    const now = this.ctx.currentTime;
    this.trafficGain?.gain.setTargetAtTime(0.0001, now, 0.12);
    this.seaGain?.gain.setTargetAtTime(0.0001, now, 0.12);
    this.constructionGain?.gain.setTargetAtTime(0.0001, now, 0.12);
    this.bazaarGain?.gain.setTargetAtTime(0.0001, now, 0.12);
    this.rainGain?.gain.setTargetAtTime(0.0001, now, 0.12);
  }

  public update(dt: number, district: DistrictId, active: boolean, muted: boolean, rainIntensity = 0): void {
    const districtChanged = this.activeDistrict !== district;
    this.activeDistrict = district;
    if (!this.ctx || !this.initialized) return;

    if (!active || muted) {
      this.silence();
      return;
    }

    const profile = getAmbientProfile(district);
    this.wavePhase += dt * 0.72;
    this.paramUpdateAcc += dt;

    if (this.isSilenced || districtChanged || this.paramUpdateAcc >= 0.18) {
      this.isSilenced = false;
      this.paramUpdateAcc = 0;
      const now = this.ctx.currentTime;
      const surfSwell = 0.65 + 0.35 * Math.sin(this.wavePhase);

      this.trafficGain?.gain.setTargetAtTime(Math.max(0.0001, profile.traffic * 0.24), now, 0.45);
      this.seaGain?.gain.setTargetAtTime(Math.max(0.0001, profile.sea * surfSwell * 0.32), now, 0.35);
      this.seaFilter?.frequency.setTargetAtTime(280 + surfSwell * 420, now, 0.35);
      this.constructionGain?.gain.setTargetAtTime(Math.max(0.0001, profile.construction * 0.18), now, 0.45);
      this.bazaarGain?.gain.setTargetAtTime(Math.max(0.0001, profile.bazaar * 0.12), now, 0.45);

      const rainTarget = Math.max(0.0001, rainIntensity * 0.28);
      this.rainGain?.gain.setTargetAtTime(rainTarget, now, 0.35);
      this.rainFilter?.frequency.setTargetAtTime(1400 + rainIntensity * 1400, now, 0.35);
    }

    if (profile.hornRate > 0.02) {
      this.hornCooldown -= dt;
      if (this.hornCooldown <= 0) {
        this.playDistantTrafficHorn(profile.traffic);
        this.hornCooldown = (1.6 + Math.random() * 2.8) / Math.max(0.15, profile.hornRate);
      }
    }

    if (profile.seagullRate > 0.02) {
      this.seagullCooldown -= dt;
      if (this.seagullCooldown <= 0) {
        this.playSeagullCall(profile.sea);
        this.seagullCooldown = (2.4 + Math.random() * 3.8) / Math.max(0.12, profile.seagullRate);
      }
    }

    if (profile.hammerRate > 0.02) {
      this.hammerCooldown -= dt;
      if (this.hammerCooldown <= 0) {
        this.playConstructionClang(profile.construction);
        this.hammerCooldown = (0.9 + Math.random() * 1.9) / Math.max(0.2, profile.hammerRate);
      }
    }

    if (profile.foghornRate > 0.02) {
      this.foghornCooldown -= dt;
      if (this.foghornCooldown <= 0) {
        this.playShipFoghorn(profile.sea);
        this.foghornCooldown = (4.5 + Math.random() * 5.0) / Math.max(0.1, profile.foghornRate);
      }
    }
  }

  private playDistantTrafficHorn(intensity: number): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const isDouble = Math.random() < 0.55;
    const baseFreq = 320 + Math.random() * 150;
    const pulses = isDouble ? [0, 0.15] : [0];

    for (const offset of pulses) {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq, now + offset);
      filter.type = 'bandpass';
      filter.frequency.value = baseFreq * 2.0;
      filter.Q.value = 2.1;

      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.linearRampToValueAtTime(0.055 * intensity, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.13);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.15);
    }
  }

  private playSeagullCall(seaIntensity: number): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    const startFreq = 1650 + Math.random() * 350;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 1.24, now + 0.09);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 0.72, now + 0.34);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.042 * seaIntensity, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  private playConstructionClang(intensity: number): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const strikes = Math.random() < 0.65 ? [0, 0.24, 0.48] : [0, 0.28];
    const metallicFreq = 490 + Math.random() * 210;

    for (const offset of strikes) {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc1.type = 'square';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(metallicFreq, now + offset);
      osc2.frequency.setValueAtTime(metallicFreq * 1.47, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.linearRampToValueAtTime(0.05 * intensity, now + offset + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.14);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);
      osc1.start(now + offset);
      osc2.start(now + offset);
      osc1.stop(now + offset + 0.16);
      osc2.stop(now + offset + 0.16);
    }
  }

  private playShipFoghorn(seaIntensity: number): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(94, now);
    osc2.frequency.setValueAtTime(141, now);
    filter.type = 'lowpass';
    filter.frequency.value = 260;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.08 * seaIntensity, now + 0.22);
    gain.gain.setValueAtTime(0.075 * seaIntensity, now + 0.85);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.55);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.6);
    osc2.stop(now + 1.6);
  }

  public playThunder(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const dur = 2.1;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const env = Math.pow(1 - i / len, 1.8);
      last = (last + 0.08 * (Math.random() * 2 - 1)) / 1.08;
      data[i] = last * 3.4 * env;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(160, now);
    filter.frequency.exponentialRampToValueAtTime(52, now + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
    src.stop(now + dur + 0.05);
  }

  public dispose(): void {
    for (const src of this.loopSources) {
      try {
        src.stop();
      } catch {
        // Ignore already stopped sources
      }
    }
    this.loopSources = [];
    this.initialized = false;
    this.ctx = null;
  }
}

export const DistrictAmbientManager = AmbientAudioManager;
export const getAmbientSoundscapeProfile = getAmbientProfile;

