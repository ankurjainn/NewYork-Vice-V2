import * as THREE from 'three';
import type { RecreationZoneDef } from './cityLayout';
import { BRONX_STADIUM_BLUEPRINT } from './recreationCollisions';

export type BirdSpecies = 'seagull' | 'pigeon' | 'hawk';

export interface DetailedBirdRig {
  root: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
  leftWingTip: THREE.Group;
  rightWingTip: THREE.Group;
  tail: THREE.Group;
  species: BirdSpecies;
}

// ============================================================================
// CACHED PROCEDURAL CANVAS TEXTURES (zero external URLs, SRGBColorSpace)
// ============================================================================

let cachedSidewalkTex: THREE.CanvasTexture | null = null;
let cachedParkTurfTex: THREE.CanvasTexture | null = null;
let cachedParkPathTex: THREE.CanvasTexture | null = null;
let cachedBarkTex: THREE.CanvasTexture | null = null;
let cachedFoliageTex: THREE.CanvasTexture | null = null;
let cachedStadiumTurfTex: THREE.CanvasTexture | null = null;
let cachedStadiumRibbonTex: THREE.CanvasTexture | null = null;
let cachedStadiumFacadeTex: THREE.CanvasTexture | null = null;
let cachedTreeShadowTex: THREE.CanvasTexture | null = null;

function seededRand(seedRef: { v: number }): number {
  seedRef.v = (seedRef.v * 16807) % 2147483647;
  return (seedRef.v - 1) / 2147483646;
}

export function getNycSidewalkTexture(maxAniso = 4): THREE.CanvasTexture {
  if (cachedSidewalkTex) return cachedSidewalkTex;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#a5a098';
  ctx.fillRect(0, 0, size, size);

  const rng = { v: 4129 };
  const tiles = 4;
  const step = size / tiles;

  // Individual Manhattan concrete slab tone variation
  for (let gx = 0; gx < tiles; gx++) {
    for (let gy = 0; gy < tiles; gy++) {
      const shade = 152 + Math.floor((seededRand(rng) - 0.5) * 20);
      const warm = Math.floor((seededRand(rng) - 0.5) * 8);
      ctx.fillStyle = `rgb(${shade + warm}, ${shade + Math.floor(warm * 0.6)}, ${shade - 5})`;
      ctx.fillRect(gx * step + 2, gy * step + 2, step - 4, step - 4);

      // Subtle inner brushed concrete bevel highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      ctx.strokeRect(gx * step + 4, gy * step + 4, step - 8, step - 8);
    }
  }

  // Fine aggregate concrete speckles & weathering
  for (let i = 0; i < 4200; i++) {
    const x = seededRand(rng) * size;
    const y = seededRand(rng) * size;
    const dark = seededRand(rng) > 0.45;
    ctx.fillStyle = dark ? 'rgba(65,60,54,0.14)' : 'rgba(240,236,228,0.16)';
    ctx.fillRect(x, y, 1.8, 1.8);
  }

  // Crisp concrete expansion joint seams
  ctx.strokeStyle = 'rgba(58, 54, 49, 0.58)';
  ctx.lineWidth = 3;
  for (let g = 0; g <= tiles; g++) {
    const pos = g * step;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(size, pos);
    ctx.stroke();
  }

  // Occasional subtle sidewalk crack / joint weathering
  ctx.strokeStyle = 'rgba(48, 44, 40, 0.25)';
  ctx.lineWidth = 1.2;
  for (let c = 0; c < 6; c++) {
    const cx = seededRand(rng) * size;
    const cy = seededRand(rng) * size;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + (seededRand(rng) - 0.5) * 52, cy + (seededRand(rng) - 0.5) * 52);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(96, 100);
  tex.anisotropy = Math.min(8, maxAniso);
  tex.needsUpdate = true;
  cachedSidewalkTex = tex;
  return tex;
}

export function getParkTurfTexture(): THREE.CanvasTexture {
  if (cachedParkTurfTex) return cachedParkTurfTex;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base deep lush park green
  ctx.fillStyle = '#337a3b';
  ctx.fillRect(0, 0, size, size);

  // Subtle mowed park lawn bands
  const stripes = 8;
  const sw = size / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(84, 162, 74, 0.24)' : 'rgba(28, 78, 36, 0.18)';
    ctx.fillRect(i * sw, 0, sw, size);
  }

  const rng = { v: 7813 };
  // Organic mossy / sunlit grass patches
  for (let p = 0; p < 80; p++) {
    const px = seededRand(rng) * size;
    const py = seededRand(rng) * size;
    const pr = 14 + seededRand(rng) * 34;
    const grad = ctx.createRadialGradient(px, py, 2, px, py, pr);
    if (p % 3 === 0) {
      grad.addColorStop(0, 'rgba(116, 178, 72, 0.22)');
    } else if (p % 3 === 1) {
      grad.addColorStop(0, 'rgba(34, 88, 42, 0.24)');
    } else {
      grad.addColorStop(0, 'rgba(92, 128, 56, 0.18)');
    }
    grad.addColorStop(1, 'rgba(51, 122, 59, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Thousands of fine layered grass-blade strokes
  for (let i = 0; i < 6500; i++) {
    const x = seededRand(rng) * size;
    const y = seededRand(rng) * size;
    const h = 3 + seededRand(rng) * 6;
    const pick = seededRand(rng);
    if (pick < 0.35) ctx.strokeStyle = 'rgba(24, 68, 30, 0.42)';
    else if (pick < 0.72) ctx.strokeStyle = 'rgba(78, 152, 64, 0.42)';
    else ctx.strokeStyle = 'rgba(142, 194, 86, 0.32)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (seededRand(rng) - 0.5) * 3.5, y - h);
    ctx.stroke();
  }

  // Tiny scattered white/gold clover & daisy specks
  for (let f = 0; f < 95; f++) {
    const fx = seededRand(rng) * size;
    const fy = seededRand(rng) * size;
    ctx.fillStyle = f % 3 === 0 ? 'rgba(254, 240, 138, 0.52)' : 'rgba(248, 250, 252, 0.45)';
    ctx.fillRect(fx, fy, 2.2, 2.2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.needsUpdate = true;
  cachedParkTurfTex = tex;
  return tex;
}

export function getParkPathTexture(): THREE.CanvasTexture {
  if (cachedParkPathTex) return cachedParkPathTex;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c4b49c';
  ctx.fillRect(0, 0, size, size);

  const rng = { v: 2231 };
  const cols = 4;
  const rows = 8;
  const cw = size / cols;
  const ch = size / rows;

  // NYC park flagstone/brick paver pattern
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (cw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const shade = 188 + Math.floor((seededRand(rng) - 0.5) * 28);
      ctx.fillStyle = `rgb(${shade + 8}, ${shade - 4}, ${shade - 22})`;
      ctx.fillRect(c * cw + off + 2, r * ch + 2, cw - 4, ch - 4);
      ctx.strokeStyle = 'rgba(84, 72, 58, 0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(c * cw + off + 1, r * ch + 1, cw - 2, ch - 2);
    }
  }

  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle = seededRand(rng) > 0.5 ? 'rgba(72,62,50,0.16)' : 'rgba(255,250,240,0.15)';
    ctx.fillRect(seededRand(rng) * size, seededRand(rng) * size, 1.5, 1.5);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 1.2);
  tex.needsUpdate = true;
  cachedParkPathTex = tex;
  return tex;
}

export function getTreeBarkTexture(): THREE.CanvasTexture {
  if (cachedBarkTex) return cachedBarkTex;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#4e3928';
  ctx.fillRect(0, 0, size, size);

  const rng = { v: 9901 };
  // Vertical bark furrows and weathered ridges
  for (let i = 0; i < 160; i++) {
    const x = seededRand(rng) * size;
    const w = 2 + seededRand(rng) * 7;
    const dark = seededRand(rng) < 0.52;
    ctx.fillStyle = dark ? 'rgba(34, 23, 15, 0.55)' : 'rgba(116, 90, 64, 0.36)';
    ctx.fillRect(x, 0, w, size);
  }
  for (let i = 0; i < 240; i++) {
    const x = seededRand(rng) * size;
    const y = seededRand(rng) * size;
    const len = 18 + seededRand(rng) * 60;
    ctx.strokeStyle = seededRand(rng) < 0.6 ? 'rgba(22, 15, 10, 0.6)' : 'rgba(132, 108, 82, 0.28)';
    ctx.lineWidth = 1.5 + seededRand(rng) * 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (seededRand(rng) - 0.5) * 6, y + len);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 3);
  tex.needsUpdate = true;
  cachedBarkTex = tex;
  return tex;
}

export function getFoliageLeafTexture(): THREE.CanvasTexture {
  if (cachedFoliageTex) return cachedFoliageTex;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Neutral grayscale-white foliage value texture so per-instance color tinting works richly!
  ctx.fillStyle = '#9e9e9e';
  ctx.fillRect(0, 0, size, size);

  const rng = { v: 5517 };
  // Deep interior shadow pockets
  for (let i = 0; i < 120; i++) {
    const x = seededRand(rng) * size;
    const y = seededRand(rng) * size;
    const r = 8 + seededRand(rng) * 18;
    ctx.fillStyle = 'rgba(52, 52, 52, 0.52)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Layered overlapping leaf clusters (mid + bright sunlit tips)
  for (let i = 0; i < 520; i++) {
    const x = seededRand(rng) * size;
    const y = seededRand(rng) * size;
    const rx = 5 + seededRand(rng) * 9;
    const ry = 3 + seededRand(rng) * 5;
    const ang = seededRand(rng) * Math.PI * 2;
    const v = 135 + Math.floor(seededRand(rng) * 115);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.needsUpdate = true;
  cachedFoliageTex = tex;
  return tex;
}

export function getTreeDappledShadowTexture(): THREE.CanvasTexture {
  if (cachedTreeShadowTex) return cachedTreeShadowTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, size * 0.48);
  grad.addColorStop(0, 'rgba(12, 24, 12, 0.48)');
  grad.addColorStop(0.55, 'rgba(12, 24, 12, 0.28)');
  grad.addColorStop(1, 'rgba(12, 24, 12, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  cachedTreeShadowTex = tex;
  return tex;
}

export function getStadiumTurfTexture(): THREE.CanvasTexture {
  if (cachedStadiumTurfTex) return cachedStadiumTurfTex;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1f7a34';
  ctx.fillRect(0, 0, size, size);

  // Classic championship stadium criss-cross diamond mowing pattern
  const band = 32;
  for (let i = 0; i < size; i += band) {
    if ((i / band) % 2 === 0) {
      ctx.fillStyle = 'rgba(72, 178, 76, 0.28)';
      ctx.fillRect(i, 0, band, size);
    }
  }
  for (let j = 0; j < size; j += band) {
    if ((j / band) % 2 === 0) {
      ctx.fillStyle = 'rgba(20, 88, 36, 0.18)';
      ctx.fillRect(0, j, size, band);
    }
  }

  // Concentric circular warning-track clay rim at the outer perimeter of the circular cylinder cap
  const cx = size / 2;
  const cy = size / 2;
  ctx.strokeStyle = '#b47448';
  ctx.lineWidth = 24;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.478, 0, Math.PI * 2);
  ctx.stroke();

  // Crisp 30-yard dashed white inner fielding ring
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.78)';
  ctx.lineWidth = 3.5;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Subtle turf grass grain
  const rng = { v: 3341 };
  for (let i = 0; i < 3200; i++) {
    ctx.fillStyle = seededRand(rng) > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(seededRand(rng) * size, seededRand(rng) * size, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedStadiumTurfTex = tex;
  return tex;
}

export function getStadiumRibbonTexture(): THREE.CanvasTexture {
  if (cachedStadiumRibbonTex) return cachedStadiumRibbonTex;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 1024, 0);
  bg.addColorStop(0, '#091a44');
  bg.addColorStop(0.25, '#1d4ed8');
  bg.addColorStop(0.5, '#b91c1c');
  bg.addColorStop(0.75, '#0f2a66');
  bg.addColorStop(1, '#091a44');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 128);

  // Top and bottom gleaming LED gold trim strips
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(0, 0, 1024, 10);
  ctx.fillRect(0, 118, 1024, 10);

  // Bright arena text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★  BRONX BALLPARK & ARENA   ·   NYC CHAMPIONSHIP   ·   LIVE  ★', 512, 66);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  tex.needsUpdate = true;
  cachedStadiumRibbonTex = tex;
  return tex;
}

export function getStadiumFacadeTexture(): THREE.CanvasTexture {
  if (cachedStadiumFacadeTex) return cachedStadiumFacadeTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Monumental limestone base
  ctx.fillStyle = '#d6cfc2';
  ctx.fillRect(0, 0, 512, 256);

  // Lower stone rustication courses
  ctx.strokeStyle = 'rgba(110, 102, 92, 0.4)';
  ctx.lineWidth = 2;
  for (let y = 160; y < 256; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Warm illuminated arched concourse windows across middle band
  const bays = 8;
  const bw = 512 / bays;
  for (let i = 0; i < bays; i++) {
    const bx = i * bw + 10;
    const ww = bw - 20;

    // Dark bronze architectural window frame
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bx, 58, ww, 114);

    // Warm backlit stadium concourse glow
    const glow = ctx.createLinearGradient(bx, 62, bx, 168);
    glow.addColorStop(0, '#fde68a');
    glow.addColorStop(0.55, '#fbbf24');
    glow.addColorStop(1, '#d97706');
    ctx.fillStyle = glow;
    ctx.fillRect(bx + 4, 64, ww - 8, 102);

    // Mullion crossbars
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bx + ww * 0.5 - 1.5, 62, 3, 106);
    ctx.fillRect(bx + 3, 110, ww - 6, 3);
  }

  // Upper navy architectural frieze & gold pinstripe
  ctx.fillStyle = '#10244d';
  ctx.fillRect(0, 0, 512, 48);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 44, 512, 6);
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(0, 178, 512, 10);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(6, 1);
  tex.needsUpdate = true;
  cachedStadiumFacadeTex = tex;
  return tex;
}

function createStadiumMarqueeTexture(name: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#0a1c46');
  grad.addColorStop(0.5, '#132d69');
  grad.addColorStop(1, '#081533');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 256);

  // Ornate gold outer frame & stadium marquee bulb border
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 1004, 236);
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, 976, 208);

  for (let x = 42; x <= 982; x += 36) {
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(x, 12, 5, 0, Math.PI * 2);
    ctx.arc(x, 244, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★  NEW YORK CITY LANDMARK  ·  MAIN ENTRANCE  ★', 512, 72);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 62px sans-serif';
  ctx.fillText(name.toUpperCase().slice(0, 24), 512, 152);

  ctx.fillStyle = '#93c5fd';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('GATES OPEN   ·   LOWER BOWL   ·   CLUB SUITES   ·   UPPER DECK', 512, 208);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createVipSkyboxTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 128);

  const suites = 8;
  const sw = 512 / suites;
  for (let i = 0; i < suites; i++) {
    const x = i * sw + 4;
    const g = ctx.createLinearGradient(x, 14, x, 114);
    g.addColorStop(0, '#fef3c7');
    g.addColorStop(0.6, '#f59e0b');
    g.addColorStop(1, '#78350f');
    ctx.fillStyle = g;
    ctx.fillRect(x, 16, sw - 8, 96);

    // Interior suite ceiling lights
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 8, 22, sw - 24, 6);
    // Glass reflection slash
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.moveTo(x + 6, 112);
    ctx.lineTo(x + 24, 16);
    ctx.lineTo(x + 34, 16);
    ctx.lineTo(x + 16, 112);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(8, 1);
  tex.needsUpdate = true;
  return tex;
}

// ============================================================================
// MULTI-LAYERED REALISTIC TREES (Instanced Street Trees + Detailed Park Trees)
// ============================================================================

export function buildLayeredNycStreetTrees(
  scene: THREE.Scene,
  spots: Array<[number, number, number]>,
): void {
  const count = spots.length;
  if (count === 0) return;

  const barkTex = getTreeBarkTexture();
  const leafTex = getFoliageLeafTexture();

  // 1. Cast-iron NYC sidewalk tree grates & dark mulch soil bed
  const grateGeo = new THREE.BoxGeometry(1.78, 0.07, 1.78);
  grateGeo.translate(0, 0.035, 0);
  const grateMat = new THREE.MeshStandardMaterial({ color: 0x26292e, roughness: 0.72, metalness: 0.55 });
  const grates = new THREE.InstancedMesh(grateGeo, grateMat, count);

  const soilGeo = new THREE.CylinderGeometry(0.66, 0.72, 0.09, 10);
  soilGeo.translate(0, 0.055, 0);
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x3b2c20, roughness: 0.96 });
  const soils = new THREE.InstancedMesh(soilGeo, soilMat, count);

  // 2. Flared root collar + bark-textured tapered main trunk
  const rootGeo = new THREE.CylinderGeometry(0.24, 0.42, 0.85, 8);
  rootGeo.translate(0, 0.42, 0);
  const barkMat = new THREE.MeshStandardMaterial({ map: barkTex, color: 0x8f7763, roughness: 0.94 });
  const roots = new THREE.InstancedMesh(rootGeo, barkMat, count);

  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.27, 3.55, 8);
  trunkGeo.translate(0, 1.77, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, barkMat, count);

  // 3. Angled primary woody boughs / Y-branches (3 limbs per tree)
  const limbGeo = new THREE.CylinderGeometry(0.06, 0.13, 1.85, 6);
  limbGeo.translate(0, 0.92, 0);
  const limbs = new THREE.InstancedMesh(limbGeo, barkMat, count * 3);

  // 4. Three layered foliage crown levels (shaded skirt, main cluster puffs, sunlit upper crown)
  const leafMat = new THREE.MeshStandardMaterial({
    map: leafTex,
    color: 0xffffff,
    roughness: 0.84,
    metalness: 0.02,
  });
  const skirtGeo = new THREE.DodecahedronGeometry(1.75, 1);
  const skirts = new THREE.InstancedMesh(skirtGeo, leafMat, count);

  const puffGeo = new THREE.IcosahedronGeometry(1.38, 1);
  const midPuffs = new THREE.InstancedMesh(puffGeo, leafMat, count * 3);

  const crownGeo = new THREE.IcosahedronGeometry(1.18, 1);
  const topCrowns = new THREE.InstancedMesh(crownGeo, leafMat, count * 2);

  // Rich NYC street-tree palette: [underShadeHex, midCrownHex, sunlitTopHex]
  const treePalettes: Array<[number, number, number]> = [
    [0x1d4b29, 0x2f753d, 0x4ca153], // Central Park Elm emerald
    [0x225430, 0x3b8648, 0x62b45e], // Bright Honey Locust
    [0x194225, 0x266537, 0x3f8c4d], // Deep Manhattan Oak
    [0x7a3c16, 0xb85f24, 0xdf8934], // Golden Autumn Maple
    [0x864c16, 0xc78226, 0xe8b13e], // Amber Ginkgo
    [0x6e241b, 0xa83b28, 0xd45a39], // Crimson Red Maple
  ];

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  spots.forEach(([x, z, sc], i) => {
    const yaw = (i * 1.37) % (Math.PI * 2);
    const [shadeHex, midHex, topHex] = treePalettes[i % treePalettes.length];

    // Grate & soil
    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(sc, 1, sc);
    dummy.updateMatrix();
    grates.setMatrixAt(i, dummy.matrix);
    soils.setMatrixAt(i, dummy.matrix);

    // Flared roots & trunk
    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    roots.setMatrixAt(i, dummy.matrix);
    trunks.setMatrixAt(i, dummy.matrix);

    // 3 angled woody boughs emerging near trunk top
    for (let b = 0; b < 3; b++) {
      const ba = yaw + b * ((Math.PI * 2) / 3) + 0.35;
      dummy.position.set(x, 2.85 * sc, z);
      dummy.rotation.set(0.56, ba, 0);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      limbs.setMatrixAt(i * 3 + b, dummy.matrix);
    }

    // Lower shaded under-canopy skirt
    dummy.position.set(x, 3.95 * sc, z);
    dummy.rotation.set(0.12, yaw, 0.08);
    dummy.scale.set(sc * 1.18, sc * 0.62, sc * 1.14);
    dummy.updateMatrix();
    skirts.setMatrixAt(i, dummy.matrix);
    color.setHex(shadeHex);
    skirts.setColorAt(i, color);

    // 3 staggered mid-crown foliage clusters
    for (let m = 0; m < 3; m++) {
      const ma = yaw + m * ((Math.PI * 2) / 3);
      const rad = 0.92 * sc;
      dummy.position.set(x + Math.cos(ma) * rad, (4.65 + (m % 2) * 0.28) * sc, z + Math.sin(ma) * rad);
      dummy.rotation.set(m * 0.5, ma, m * 0.3);
      dummy.scale.set(sc * (1.04 + (m % 2) * 0.1), sc * 0.78, sc * 1.02);
      dummy.updateMatrix();
      midPuffs.setMatrixAt(i * 3 + m, dummy.matrix);
      color.setHex(midHex);
      midPuffs.setColorAt(i * 3 + m, color);
    }

    // 2 sunlit upper crown puffs
    for (let t = 0; t < 2; t++) {
      const ta = yaw + 0.8 + t * Math.PI;
      const rad = 0.42 * sc;
      dummy.position.set(x + Math.cos(ta) * rad, (5.55 + t * 0.32) * sc, z + Math.sin(ta) * rad);
      dummy.rotation.set(t * 0.6, ta, 0.2);
      dummy.scale.set(sc * 0.95, sc * 0.72, sc * 0.92);
      dummy.updateMatrix();
      topCrowns.setMatrixAt(i * 2 + t, dummy.matrix);
      color.setHex(topHex);
      topCrowns.setColorAt(i * 2 + t, color);
    }
  });

  const allMeshes = [grates, soils, roots, trunks, limbs, skirts, midPuffs, topCrowns];
  for (const m of allMeshes) {
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
    scene.add(m);
  }
}

// Shared materials for detailed park trees, flowerbeds & lamps (enables material-batched merging per park)
let sharedBarkMat: THREE.MeshStandardMaterial | null = null;
let sharedMulchMat: THREE.MeshStandardMaterial | null = null;
let sharedDappledShadowMat: THREE.MeshBasicMaterial | null = null;
const cachedTreePaletteMats = new Map<
  number,
  [THREE.MeshStandardMaterial, THREE.MeshStandardMaterial, THREE.MeshStandardMaterial]
>();
let sharedFlowerStoneMat: THREE.MeshStandardMaterial | null = null;
let sharedFlowerSoilMat: THREE.MeshStandardMaterial | null = null;
let sharedShrubDarkMat: THREE.MeshStandardMaterial | null = null;
let sharedShrubLightMat: THREE.MeshStandardMaterial | null = null;
let sharedBlossomMats: THREE.MeshStandardMaterial[] | null = null;
let sharedLampIronMat: THREE.MeshStandardMaterial | null = null;
let sharedLampGlobeMat: THREE.MeshStandardMaterial | null = null;

export function addLayeredParkTree(
  parent: THREE.Group,
  x: number,
  z: number,
  scale = 1,
  skipMulch = false,
): void {
  if (!sharedBarkMat) {
    sharedBarkMat = new THREE.MeshStandardMaterial({
      map: getTreeBarkTexture(),
      color: 0x8b705b,
      roughness: 0.94,
    });
  }
  if (!sharedMulchMat) {
    sharedMulchMat = new THREE.MeshStandardMaterial({ color: 0x422d1e, roughness: 0.98 });
  }
  if (!sharedDappledShadowMat) {
    sharedDappledShadowMat = new THREE.MeshBasicMaterial({
      map: getTreeDappledShadowTexture(),
      transparent: true,
      depthWrite: false,
    });
  }

  const tree = new THREE.Group();
  tree.position.set(x, 0.16, z);

  // Dappled ground contact shadow beneath canopy
  const shadowDisc = new THREE.Mesh(new THREE.PlaneGeometry(5.4 * scale, 5.4 * scale), sharedDappledShadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.025;
  tree.add(shadowDisc);

  // Raised dark mulch bed ring (skipped when already seated inside a granite stone tree pit)
  if (!skipMulch) {
    const mulch = new THREE.Mesh(new THREE.CylinderGeometry(0.92 * scale, 1.06 * scale, 0.14, 8), sharedMulchMat);
    mulch.position.y = 0.06;
    tree.add(mulch);
  }

  // Tapered bark-textured trunk (wider flared base built into taper)
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18 * scale, 0.44 * scale, 3.85 * scale, 7),
    sharedBarkMat,
  );
  trunk.position.y = 1.92 * scale;
  tree.add(trunk);

  // 2 sculptural angled primary limbs
  const seed = Math.abs(Math.round(x * 7 + z * 13));
  const yaw = (seed % 12) * 0.52;
  for (let b = 0; b < 2; b++) {
    const ba = yaw + b * Math.PI + 0.35;
    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07 * scale, 0.14 * scale, 1.95 * scale, 5),
      sharedBarkMat,
    );
    branch.position.set(Math.cos(ba) * 0.46 * scale, 3.25 * scale, Math.sin(ba) * 0.46 * scale);
    branch.rotation.set(Math.sin(ba) * 0.56, 0, -Math.cos(ba) * 0.56);
    tree.add(branch);
  }

  // Seasonal NYC park foliage color triad: shaded underside, vibrant body, sunlit crown (cached per palette)
  const palettes: Array<[number, number, number]> = [
    [0x1b4d28, 0x2e7d3d, 0x52ad56], // Central Park Emerald
    [0x245930, 0x3f8f47, 0x6fc264], // Lush Spring Oak
    [0x7d3a15, 0xc26523, 0xe89438], // Autumn Amber Maple
    [0x6b221a, 0xa83825, 0xd95b38], // Crimson Park Maple
    [0x825517, 0xc99228, 0xedd14c], // Golden Elm
  ];
  const paletteIdx = seed % palettes.length;
  let mats = cachedTreePaletteMats.get(paletteIdx);
  if (!mats) {
    const [darkHex, midHex, lightHex] = palettes[paletteIdx];
    const leafTex = getFoliageLeafTexture();
    mats = [
      new THREE.MeshStandardMaterial({ map: leafTex, color: darkHex, roughness: 0.88 }),
      new THREE.MeshStandardMaterial({ map: leafTex, color: midHex, roughness: 0.84 }),
      new THREE.MeshStandardMaterial({ map: leafTex, color: lightHex, roughness: 0.8 }),
    ];
    cachedTreePaletteMats.set(paletteIdx, mats);
  }
  const [darkLeafMat, midLeafMat, lightLeafMat] = mats;

  // Layer 1: Wide shaded lower canopy skirt (2 fuller overlapping lobes)
  for (let i = 0; i < 2; i++) {
    const a = yaw + i * Math.PI;
    const skirt = new THREE.Mesh(new THREE.DodecahedronGeometry(1.65 * scale, 0), darkLeafMat);
    skirt.scale.set(1.24, 0.66, 1.18);
    skirt.position.set(Math.cos(a) * 0.85 * scale, 3.88 * scale, Math.sin(a) * 0.85 * scale);
    tree.add(skirt);
  }

  // Layer 2: Lush mid-crown foliage clusters (2 staggered puffs)
  for (let i = 0; i < 2; i++) {
    const a = yaw + Math.PI * 0.5 + i * Math.PI;
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1.62 * scale, 0), midLeafMat);
    puff.scale.set(1.18, 0.84, 1.12);
    puff.position.set(Math.cos(a) * 0.72 * scale, (4.72 + i * 0.22) * scale, Math.sin(a) * 0.72 * scale);
    tree.add(puff);
  }

  // Layer 3: Sun-kissed upper crown dome
  const topMain = new THREE.Mesh(new THREE.IcosahedronGeometry(1.48 * scale, 0), lightLeafMat);
  topMain.scale.set(1.14, 0.78, 1.08);
  topMain.position.set(0, 5.62 * scale, 0);
  tree.add(topMain);

  parent.add(tree);
}

export function addParkFlowerbedAndShrubs(parent: THREE.Group, x: number, z: number, rotY = 0): void {
  const bed = new THREE.Group();
  bed.position.set(x, 0.16, z);
  bed.rotation.y = rotY;

  if (!sharedFlowerStoneMat) {
    sharedFlowerStoneMat = new THREE.MeshStandardMaterial({ color: 0x94897c, roughness: 0.88 });
    sharedFlowerSoilMat = new THREE.MeshStandardMaterial({ color: 0x3b2a1d, roughness: 0.98 });
    const leafTex = getFoliageLeafTexture();
    sharedShrubDarkMat = new THREE.MeshStandardMaterial({ map: leafTex, color: 0x1e5c2c, roughness: 0.86 });
    sharedShrubLightMat = new THREE.MeshStandardMaterial({ map: leafTex, color: 0x388e42, roughness: 0.82 });
    const blossomHexes = [0xf43f5e, 0xfbbf24, 0xa855f7, 0xfb923c];
    sharedBlossomMats = blossomHexes.map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.65 }),
    );
  }

  // Raised stone planter box
  const border = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.34, 1.75), sharedFlowerStoneMat);
  border.position.y = 0.17;
  bed.add(border);

  const soil = new THREE.Mesh(new THREE.BoxGeometry(3.26, 0.36, 1.42), sharedFlowerSoilMat!);
  soil.position.y = 0.19;
  bed.add(soil);

  // Streamlined layered evergreen shrubs (3 fuller mounds)
  for (const sx of [-0.95, 0.95]) {
    const s1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 0), sharedShrubDarkMat!);
    s1.scale.set(1.18, 0.72, 0.94);
    s1.position.set(sx, 0.56, 0);
    bed.add(s1);
  }
  const centerShrub = new THREE.Mesh(new THREE.DodecahedronGeometry(0.64, 0), sharedShrubLightMat!);
  centerShrub.scale.set(1.22, 0.78, 0.96);
  centerShrub.position.set(0, 0.64, 0);
  bed.add(centerShrub);

  // Colorful NYC park seasonal flower blossom clusters (4 vibrant clusters)
  for (let b = 0; b < 4; b++) {
    const fl = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), sharedBlossomMats![b]);
    fl.position.set(-1.15 + b * 0.76, 0.76 + (b % 2) * 0.12, (b % 2 === 0 ? 1 : -1) * 0.26);
    bed.add(fl);
  }

  parent.add(bed);
}

export function addCentralParkLamp(parent: THREE.Group, x: number, z: number): void {
  const lamp = new THREE.Group();
  lamp.position.set(x, 0.16, z);

  if (!sharedLampIronMat) {
    sharedLampIronMat = new THREE.MeshStandardMaterial({ color: 0x1a2822, roughness: 0.45, metalness: 0.72 });
    sharedLampGlobeMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: 0xffdf99,
      emissiveIntensity: 1.75,
      roughness: 0.25,
    });
  }

  // Fluted cast-iron base plinth + pole
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.75, 6), sharedLampIronMat);
  base.position.y = 0.38;
  lamp.add(base);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.11, 3.65, 6), sharedLampIronMat);
  pole.position.y = 2.45;
  lamp.add(pole);

  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), sharedLampGlobeMat!);
  globe.scale.set(1, 1.18, 1);
  globe.position.y = 4.56;
  lamp.add(globe);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.24, 6), sharedLampIronMat);
  cap.position.y = 4.9;
  lamp.add(cap);

  parent.add(lamp);
}

// ============================================================================
// MULTI-LAYERED ARTICULATED REALISTIC BIRDS (Seagull, Pigeon, Red-Tailed Hawk)
// ============================================================================

export function createRealisticBirdRig(species: BirdSpecies = 'seagull'): DetailedBirdRig {
  const root = new THREE.Group();

  const palette =
    species === 'hawk'
      ? {
          body: 0x6b4226,
          belly: 0xe6d5b8,
          head: 0x5c361d,
          innerWing: 0x7c4d2b,
          outerWing: 0x3b2313,
          tail: 0xa63a21,
          beak: 0xeab308,
          scale: 1.52,
        }
      : species === 'pigeon'
        ? {
            body: 0x64748b,
            belly: 0x94a3b8,
            head: 0x334155,
            innerWing: 0x7c8ca1,
            outerWing: 0x1e293b,
            tail: 0x334155,
            beak: 0x475569,
            scale: 0.86,
          }
        : {
            body: 0xf8fafc,
            belly: 0xffffff,
            head: 0xf8fafc,
            innerWing: 0xcbd5e1,
            outerWing: 0x1e293b,
            tail: 0xf1f5f9,
            beak: 0xf59e0b,
            scale: 1.24,
          };

  const bodyMat = new THREE.MeshStandardMaterial({ color: palette.body, roughness: 0.65 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: palette.belly, roughness: 0.68 });
  const headMat = new THREE.MeshStandardMaterial({ color: palette.head, roughness: 0.62 });
  const innerWingMat = new THREE.MeshStandardMaterial({ color: palette.innerWing, roughness: 0.66 });
  const outerWingMat = new THREE.MeshStandardMaterial({ color: palette.outerWing, roughness: 0.72 });
  const tailMat = new THREE.MeshStandardMaterial({ color: palette.tail, roughness: 0.68 });
  const beakMat = new THREE.MeshStandardMaterial({ color: palette.beak, roughness: 0.45 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.15 });

  // 1. Streamlined teardrop torso + curved breast belly
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), bodyMat);
  torso.scale.set(0.88, 0.72, 2.35);
  root.add(torso);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.145, 8, 6), bellyMat);
  belly.scale.set(0.85, 0.64, 1.85);
  belly.position.set(0, -0.045, 0.04);
  root.add(belly);

  // Subtle pigeon iridescent neck collar
  if (species === 'pigeon') {
    const neckRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.105, 0.12, 8),
      new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.35, metalness: 0.35 }),
    );
    neckRing.rotation.x = Math.PI * 0.38;
    neckRing.position.set(0, 0.04, 0.34);
    root.add(neckRing);
  }

  // 2. Sculpted head, pointed beak & glossy eyes
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), headMat);
  head.scale.set(0.92, 0.88, 1.15);
  head.position.set(0, 0.065, 0.44);
  root.add(head);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.19, 6), beakMat);
  beak.rotation.x = Math.PI * 0.52;
  beak.position.set(0, 0.045, 0.6);
  root.add(beak);

  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), eyeMat);
    eye.position.set(sx * 0.075, 0.09, 0.48);
    root.add(eye);
  }

  // 3. Fanned multi-feather layered tail group
  const tail = new THREE.Group();
  tail.position.set(0, 0.01, -0.36);
  for (let f = -1; f <= 1; f++) {
    const feather = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.024, 0.36), tailMat);
    feather.position.set(f * 0.075, 0, -0.15);
    feather.rotation.y = -f * 0.24;
    tail.add(feather);
  }
  root.add(tail);

  // 4. Two-segment articulated swept wings (inner airfoil + secondary coverts + articulated feathered outer wingtip)
  const makeArticulatedWing = (side: -1 | 1): { wing: THREE.Group; tip: THREE.Group } => {
    const wing = new THREE.Group();
    wing.position.set(side * 0.13, 0.05, 0.06);

    // Leading-edge muscular wing arm
    const leadingEdge = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.055, 0.16), bodyMat);
    leadingEdge.position.set(side * 0.31, 0.01, 0.04);
    leadingEdge.rotation.y = -side * 0.08;
    wing.add(leadingEdge);

    // Inner secondary feather deck (layered slightly lower & trailing)
    const innerDeck = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.032, 0.26), innerWingMat);
    innerDeck.position.set(side * 0.33, -0.008, -0.05);
    innerDeck.rotation.y = -side * 0.11;
    wing.add(innerDeck);

    // Articulated outer wingtip group hinged at the wrist joint!
    const tip = new THREE.Group();
    tip.position.set(side * 0.64, 0, 0.0);

    // Swept outer primary wing blade
    const outerBlade = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.028, 0.21), outerWingMat);
    outerBlade.position.set(side * 0.22, -0.01, -0.07);
    outerBlade.rotation.y = -side * 0.26;
    tip.add(outerBlade);

    // Individual stepped primary flight feather tips for crisp realistic silhouette against the sky!
    for (let p = 0; p < 3; p++) {
      const prim = new THREE.Mesh(new THREE.BoxGeometry(0.24 - p * 0.03, 0.02, 0.065), outerWingMat);
      prim.position.set(side * (0.44 + p * 0.055), -0.014, -0.07 - p * 0.068);
      prim.rotation.y = -side * (0.28 + p * 0.12);
      tip.add(prim);
    }

    wing.add(tip);
    return { wing, tip };
  };

  const left = makeArticulatedWing(-1);
  const right = makeArticulatedWing(1);
  root.add(left.wing, right.wing);
  root.scale.setScalar(palette.scale);

  return {
    root,
    leftWing: left.wing,
    rightWing: right.wing,
    leftWingTip: left.tip,
    rightWingTip: right.tip,
    tail,
    species,
  };
}

// ============================================================================
// MONUMENTAL BRONX BALLPARK & ARENA (Detailed Exterior + Multi-Tier Interior)
// ============================================================================

export function createDetailedBronxStadium(
  zone: RecreationZoneDef,
  scoreboardTex: THREE.CanvasTexture,
): THREE.Group {
  const g = new THREE.Group();
  const outfieldR = 29.0;
  const gapHalf = 0.23; // Open South main gate centered at phi = 0 (+z)
  const phiStart = gapHalf;
  const phiLength = Math.PI * 2 - gapHalf * 2;

  // Shared materials
  const plazaMat = new THREE.MeshStandardMaterial({
    map: getParkPathTexture(),
    color: 0xc9c2b8,
    roughness: 0.85,
  });
  const limestoneMat = new THREE.MeshStandardMaterial({ color: 0xd9d2c5, roughness: 0.78 });
  const darkNavyMat = new THREE.MeshStandardMaterial({ color: 0x0f2557, roughness: 0.56, metalness: 0.18 });
  const royalBlueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.58 });
  const crimsonMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.55 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.65 });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.86 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.42, metalness: 0.72 });
  const brightWhiteRoofMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.42, metalness: 0.12 });
  const warmLedMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xffe49e,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });
  const cyanLedMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.5,
    roughness: 0.25,
  });
  const redBeaconMat = new THREE.MeshStandardMaterial({
    color: 0xfecaca,
    emissive: 0xef4444,
    emissiveIntensity: 2.4,
  });

  // --------------------------------------------------------------------------
  // 1. GRANITE CONCOURSE PLAZA APRON + MANICURED CHAMPIONSHIP TURF & PITCH
  // --------------------------------------------------------------------------
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(zone.width, 0.16, zone.depth), plazaMat);
  plaza.position.y = 0.08;
  plaza.receiveShadow = true;
  g.add(plaza);

  // Subtle decorative colored sidewalk paving ring outside the stadium colonnade
  const entryPlazaRing = new THREE.Mesh(
    new THREE.RingGeometry(42.0, 46.8, 48),
    new THREE.MeshStandardMaterial({ color: 0x8f887d, roughness: 0.88 }),
  );
  entryPlazaRing.rotation.x = -Math.PI / 2;
  entryPlazaRing.position.y = 0.17;
  g.add(entryPlazaRing);

  // Criss-cross mowed emerald outfield turf with terracotta warning track
  const outfield = new THREE.Mesh(
    new THREE.CylinderGeometry(outfieldR, outfieldR, 0.24, 48),
    new THREE.MeshStandardMaterial({ map: getStadiumTurfTexture(), roughness: 0.84 }),
  );
  outfield.position.y = 0.16;
  outfield.receiveShadow = true;
  g.add(outfield);

  // Crisp white boundary rope
  const boundary = new THREE.Mesh(
    new THREE.TorusGeometry(outfieldR - 2.1, 0.14, 6, 48),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 }),
  );
  boundary.rotation.x = Math.PI / 2;
  boundary.position.y = 0.31;
  g.add(boundary);

  // Central arena cricket / championship pitch + white popping creases + stumps
  const pitch = new THREE.Mesh(
    new THREE.BoxGeometry(3.1, 0.26, 14.0),
    new THREE.MeshStandardMaterial({ color: 0xd6b584, roughness: 0.92 }),
  );
  pitch.position.y = 0.18;
  g.add(pitch);

  const creaseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const cz of [-5.8, 5.8]) {
    const crease = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.12), creaseMat);
    crease.rotation.x = -Math.PI / 2;
    crease.position.set(0, 0.32, cz);
    g.add(crease);
  }
  const stumpMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.5 });
  for (const sz of [-6.0, 6.0]) {
    for (const sx of [-0.22, 0, 0.22]) {
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.88, 6), stumpMat);
      stump.position.set(sx, 0.72, sz);
      g.add(stump);
    }
  }

  // East & West recessed team dugouts with protective roofs, player benches & chain-link safety railings
  const dugoutRailMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.72 });
  for (const sx of [-1, 1]) {
    const dugout = new THREE.Group();
    dugout.position.set(sx * (outfieldR - 0.9), 0.28, 0);
    dugout.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.18, 2.2), darkNavyMat);
    roof.position.set(0, 2.25, 0);
    dugout.add(roof);
    const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.08, 0.14), goldMat);
    roofTrim.position.set(0, 2.34, 1.06);
    dugout.add(roofTrim);
    const back = new THREE.Mesh(new THREE.BoxGeometry(8.5, 2.2, 0.22), concreteMat);
    back.position.set(0, 1.1, -1.0);
    dugout.add(back);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.14, 0.55), goldMat);
    bench.position.set(0, 0.52, -0.35);
    dugout.add(bench);
    // Protective front knee-wall + horizontal safety rail along dugout edge
    const frontKnee = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.78, 0.18), darkNavyMat);
    frontKnee.position.set(0, 0.39, 0.92);
    dugout.add(frontKnee);
    const frontRail = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.06, 0.06), dugoutRailMat);
    frontRail.position.set(0, 1.08, 0.92);
    dugout.add(frontRail);
    for (const px of [-3.8, -1.9, 0, 1.9, 3.8]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 2.2, 6), steelMat);
      post.position.set(px, 1.1, 0.92);
      dugout.add(post);
    }
    g.add(dugout);
  }

  // Terracotta gravel warning track ring bordering the emerald outfield turf (y = 0.295, no z-fighting)
  const warningTrack = new THREE.Mesh(
    new THREE.RingGeometry(outfieldR - 2.0, outfieldR + 0.05, 48),
    new THREE.MeshStandardMaterial({ color: 0x9c5a3c, roughness: 0.95 }),
  );
  warningTrack.rotation.x = -Math.PI / 2;
  warningTrack.position.y = 0.295;
  warningTrack.receiveShadow = true;
  g.add(warningTrack);

  // North Center-Field Batter's Eye Monumental Green Backdrop + Distance Sign (matches BRONX_STADIUM_BLUEPRINT.battersEye!)
  const bp = BRONX_STADIUM_BLUEPRINT;
  const battersEyeGroup = new THREE.Group();
  battersEyeGroup.position.set(bp.battersEye.x, 0.16, bp.battersEye.z);
  const eyeWall = new THREE.Mesh(
    new THREE.BoxGeometry(bp.battersEye.width, 5.8, bp.battersEye.depth),
    new THREE.MeshStandardMaterial({ color: 0x0b3a26, roughness: 0.85 }),
  );
  eyeWall.position.y = 2.9;
  battersEyeGroup.add(eyeWall);
  const eyeCap = new THREE.Mesh(new THREE.BoxGeometry(bp.battersEye.width + 0.3, 0.28, bp.battersEye.depth + 0.2), goldMat);
  eyeCap.position.y = 5.92;
  battersEyeGroup.add(eyeCap);
  // Crisp "408 FT" distance plaque on the Batter's Eye wall
  const distCanvas = document.createElement('canvas');
  distCanvas.width = 256;
  distCanvas.height = 96;
  const dCtx = distCanvas.getContext('2d')!;
  dCtx.fillStyle = '#0f2557';
  dCtx.fillRect(0, 0, 256, 96);
  dCtx.strokeStyle = '#f59e0b';
  dCtx.lineWidth = 6;
  dCtx.strokeRect(4, 4, 248, 88);
  dCtx.fillStyle = '#fef08a';
  dCtx.font = '900 44px sans-serif';
  dCtx.textAlign = 'center';
  dCtx.textBaseline = 'middle';
  dCtx.fillText('408 FT', 128, 50);
  const distTex = new THREE.CanvasTexture(distCanvas);
  distTex.colorSpace = THREE.SRGBColorSpace;
  const distSign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 1.28),
    new THREE.MeshStandardMaterial({ map: distTex, roughness: 0.4 }),
  );
  distSign.position.set(0, 1.9, bp.battersEye.depth * 0.5 + 0.04);
  battersEyeGroup.add(distSign);
  g.add(battersEyeGroup);

  // Twin Iconic Yellow Stadium Foul Poles with Wire Mesh Fair/Foul Screens at NE & NW outfield corners
  const foulPoleMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.45 });
  const foulWingMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    wireframe: true,
    transparent: true,
    opacity: 0.72,
  });
  for (const sx of [-1, 1]) {
    const fpx = sx * 20.5;
    const fpz = -20.5;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 15.2, 8), foulPoleMat);
    pole.position.set(fpx, 7.8, fpz);
    g.add(pole);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.08, 10.5, 1.35), foulWingMat);
    wing.position.set(fpx - sx * 0.48, 9.6, fpz + 0.48);
    wing.rotation.y = sx * Math.PI * 0.25;
    g.add(wing);
  }

  // Upper Panoramic Broadcast & Press Box Suite positioned cleanly below the HD Jumbotron (zero overlap!)
  const pressBox = new THREE.Group();
  pressBox.position.set(0, 11.45, -35.2);
  const pbShell = new THREE.Mesh(new THREE.BoxGeometry(14.8, 2.2, 2.8), darkNavyMat);
  pressBox.add(pbShell);
  const pbGlass = new THREE.Mesh(
    new THREE.BoxGeometry(13.6, 1.22, 0.16),
    new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      emissive: 0xffd580,
      emissiveIntensity: 0.55,
      roughness: 0.15,
      metalness: 0.55,
    }),
  );
  pbGlass.position.set(0, 0.08, 1.42);
  pressBox.add(pbGlass);
  const pbRoofTrim = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.2, 3.1), goldMat);
  pbRoofTrim.position.y = 1.18;
  pressBox.add(pbRoofTrim);
  g.add(pressBox);

  // --------------------------------------------------------------------------
  // 2. MULTI-TIER INTERIOR BOWL + PADDED WALL + VIP SKYBOXES + LED RIBBON
  // --------------------------------------------------------------------------
  // Deep ballpark green padded outfield wall + yellow top rail
  const fieldWallPts = [
    new THREE.Vector2(outfieldR + 0.1, 0.15),
    new THREE.Vector2(outfieldR + 0.1, 1.65),
    new THREE.Vector2(outfieldR + 0.65, 1.65),
    new THREE.Vector2(outfieldR + 0.65, 0.15),
  ];
  const fieldWall = new THREE.Mesh(
    new THREE.LatheGeometry(fieldWallPts, 40, phiStart, phiLength),
    new THREE.MeshStandardMaterial({ color: 0x0d4a2f, roughness: 0.78 }),
  );
  g.add(fieldWall);

  // Yellow boundary wall cap strip
  const yellowRailPts = [
    new THREE.Vector2(outfieldR + 0.08, 1.64),
    new THREE.Vector2(outfieldR + 0.68, 1.64),
    new THREE.Vector2(outfieldR + 0.68, 1.82),
    new THREE.Vector2(outfieldR + 0.08, 1.82),
  ];
  const yellowRail = new THREE.Mesh(
    new THREE.LatheGeometry(yellowRailPts, 40, phiStart, phiLength),
    goldMat,
  );
  g.add(yellowRail);

  // Stepped concrete seating bowl structure (Lower bowl + Club terrace + Upper deck)
  const bowlPts = [
    new THREE.Vector2(outfieldR + 0.6, 1.5),
    new THREE.Vector2(30.4, 2.1),
    new THREE.Vector2(31.4, 3.0),
    new THREE.Vector2(32.4, 3.9),
    new THREE.Vector2(33.4, 4.8),
    new THREE.Vector2(34.3, 5.7),
    // Club fascia & VIP suite recessed gallery
    new THREE.Vector2(34.3, 8.6),
    new THREE.Vector2(35.2, 8.8),
    // Upper deck steeper seating steps
    new THREE.Vector2(36.2, 10.1),
    new THREE.Vector2(37.2, 11.4),
    new THREE.Vector2(38.2, 12.7),
    new THREE.Vector2(39.2, 14.0),
    new THREE.Vector2(40.2, 15.3),
    new THREE.Vector2(40.7, 16.0),
    // Back outer structural shell down to ground
    new THREE.Vector2(40.7, 0.15),
  ];
  const concreteBowl = new THREE.Mesh(
    new THREE.LatheGeometry(bowlPts, 44, phiStart, phiLength),
    concreteMat,
  );
  concreteBowl.receiveShadow = true;
  g.add(concreteBowl);

  // 360° Glowing Digital LED Ribbon Board wrapping the mid-tier fascia!
  const ribbonTex = getStadiumRibbonTexture();
  const ribbonCyl = new THREE.Mesh(
    new THREE.CylinderGeometry(34.2, 34.2, 1.15, 44, 1, true, phiStart, phiLength),
    new THREE.MeshStandardMaterial({
      map: ribbonTex,
      emissiveMap: ribbonTex,
      emissive: 0xffffff,
      emissiveIntensity: 1.05,
      side: THREE.BackSide,
      roughness: 0.25,
    }),
  );
  ribbonCyl.position.y = 6.35;
  g.add(ribbonCyl);

  // Glowing Panoramic VIP Glass Skybox Suite Ring right above the LED ribbon!
  const skyboxTex = createVipSkyboxTexture();
  const skyboxCyl = new THREE.Mesh(
    new THREE.CylinderGeometry(34.26, 34.26, 1.85, 44, 1, true, phiStart, phiLength),
    new THREE.MeshStandardMaterial({
      map: skyboxTex,
      emissiveMap: skyboxTex,
      emissive: 0xffd580,
      emissiveIntensity: 0.78,
      side: THREE.BackSide,
      roughness: 0.2,
      metalness: 0.4,
    }),
  );
  skyboxCyl.position.y = 7.85;
  g.add(skyboxCyl);

  // --------------------------------------------------------------------------
  // 3. INSTANCED 3D COLORED STADIUM SEATS + RADIAL STAIR AISLES + CROWD DOTS
  // --------------------------------------------------------------------------
  interface SeatSpec {
    r: number;
    y: number;
    phi: number;
    colorHex: number;
    hasFan: boolean;
    fanHex: number;
  }

  const lowerRows: Array<[number, number]> = [
    [30.15, 2.25],
    [31.1, 3.15],
    [32.05, 4.05],
    [33.0, 4.95],
    [33.9, 5.75],
  ];
  const upperRows: Array<[number, number]> = [
    [35.85, 9.65],
    [36.8, 10.95],
    [37.75, 12.25],
    [38.7, 13.55],
    [39.65, 14.85],
  ];
  const fanColors = [0xfef08a, 0xef4444, 0x38bdf8, 0xf8fafc, 0xf97316, 0x22c55e, 0xe879f9];
  const seats: SeatSpec[] = [];
  const totalSections = 12;
  const sectionArc = phiLength / totalSections;

  // Build lower & upper seat coordinates with clean radial stair aisles between sections!
  const buildTierSeats = (rows: Array<[number, number]>, isUpper: boolean) => {
    rows.forEach(([r, y], rowIdx) => {
      const colsPerSec = isUpper ? 6 : 5;
      for (let sec = 0; sec < totalSections; sec++) {
        const secStart = phiStart + sec * sectionArc;
        const aislePad = 0.036;
        const usable = sectionArc - aislePad * 2;
        for (let c = 0; c < colsPerSec; c++) {
          const t = (c + 0.5) / colsPerSec;
          const phi = secStart + aislePad + t * usable;
          // Distinct colored seating sections (NYC Navy, Royal Blue, Gold Club, Crimson Upper)
          let seatHex = 0x1d4ed8;
          if (!isUpper) {
            seatHex = rowIdx === 0 ? 0xf59e0b : sec % 2 === 0 ? 0x1e3a8a : 0x2563eb;
          } else {
            seatHex = sec % 3 === 0 ? 0xdc2626 : sec % 3 === 1 ? 0x1d4ed8 : 0x0f766e;
          }
          const hash = (sec * 31 + rowIdx * 17 + c * 13) % 10;
          seats.push({
            r,
            y,
            phi,
            colorHex: seatHex,
            hasFan: hash < 7, // ~70% lively game-day crowd occupancy!
            fanHex: fanColors[(sec * 7 + rowIdx * 5 + c * 3) % fanColors.length],
          });
        }
      }
    });
  };
  buildTierSeats(lowerRows, false);
  buildTierSeats(upperRows, true);

  // Instanced continuous stadium seat rows (backrest + seat pan)
  const seatBackGeo = new THREE.BoxGeometry(1.92, 0.54, 0.16);
  const seatPanGeo = new THREE.BoxGeometry(1.92, 0.15, 0.46);
  const seatMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.48 });
  const seatBacks = new THREE.InstancedMesh(seatBackGeo, seatMat, seats.length);
  const seatPans = new THREE.InstancedMesh(seatPanGeo, seatMat, seats.length);

  const fanCount = seats.filter((s) => s.hasFan).length;
  const fanGeo = new THREE.CapsuleGeometry(0.18, 0.34, 4, 6);
  const fanMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72 });
  const fans = new THREE.InstancedMesh(fanGeo, fanMat, Math.max(1, fanCount));

  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  let fanIdx = 0;

  seats.forEach((s, i) => {
    const sx = Math.sin(s.phi) * s.r;
    const sz = Math.cos(s.phi) * s.r;
    const faceYaw = s.phi + Math.PI; // Facing inward toward pitch center (0, 0)

    // Backrest positioned slightly behind seat pan
    dummy.position.set(sx + Math.sin(s.phi) * 0.18, s.y + 0.26, sz + Math.cos(s.phi) * 0.18);
    dummy.rotation.set(0, faceYaw, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    seatBacks.setMatrixAt(i, dummy.matrix);
    col.setHex(s.colorHex);
    seatBacks.setColorAt(i, col);

    dummy.position.set(sx, s.y, sz);
    dummy.rotation.set(0, faceYaw, 0);
    dummy.updateMatrix();
    seatPans.setMatrixAt(i, dummy.matrix);
    seatPans.setColorAt(i, col);

    if (s.hasFan && fanIdx < fanCount) {
      // Slightly jittered spectator sitting in the row
      const sideJitter = ((i % 3) - 1) * 0.24;
      const tx = Math.cos(s.phi) * sideJitter;
      const tz = -Math.sin(s.phi) * sideJitter;
      dummy.position.set(sx + tx, s.y + 0.42, sz + tz);
      dummy.rotation.set(0, faceYaw, 0);
      dummy.scale.set(1, 0.92 + (i % 3) * 0.08, 1);
      dummy.updateMatrix();
      fans.setMatrixAt(fanIdx, dummy.matrix);
      col.setHex(s.fanHex);
      fans.setColorAt(fanIdx, col);
      fanIdx++;
    }
  });

  seatBacks.instanceMatrix.needsUpdate = true;
  seatPans.instanceMatrix.needsUpdate = true;
  if (seatBacks.instanceColor) seatBacks.instanceColor.needsUpdate = true;
  if (seatPans.instanceColor) seatPans.instanceColor.needsUpdate = true;
  seatBacks.computeBoundingSphere();
  seatPans.computeBoundingSphere();
  g.add(seatBacks, seatPans);

  if (fanCount > 0) {
    fans.instanceMatrix.needsUpdate = true;
    if (fans.instanceColor) fans.instanceColor.needsUpdate = true;
    fans.computeBoundingSphere();
    g.add(fans);
  }

  // Bright yellow/concrete radial stair aisle strips dividing the 12 seating sections
  const stairGeo = new THREE.BoxGeometry(0.65, 0.18, 4.9);
  const stairMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.78 });
  const lowerStairs = new THREE.InstancedMesh(stairGeo, stairMat, totalSections + 1);
  const upperStairs = new THREE.InstancedMesh(stairGeo, stairMat, totalSections + 1);
  for (let s = 0; s <= totalSections; s++) {
    const phi = phiStart + s * sectionArc;
    // Lower stair ramp
    dummy.position.set(Math.sin(phi) * 32.1, 3.85, Math.cos(phi) * 32.1);
    dummy.rotation.set(0, phi, 0);
    dummy.rotateX(-0.76);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    lowerStairs.setMatrixAt(s, dummy.matrix);

    // Upper stair ramp
    dummy.position.set(Math.sin(phi) * 37.8, 12.15, Math.cos(phi) * 37.8);
    dummy.rotation.set(0, phi, 0);
    dummy.rotateX(-0.92);
    dummy.updateMatrix();
    upperStairs.setMatrixAt(s, dummy.matrix);
  }
  lowerStairs.instanceMatrix.needsUpdate = true;
  upperStairs.instanceMatrix.needsUpdate = true;
  g.add(lowerStairs, upperStairs);

  // --------------------------------------------------------------------------
  // 4. MONUMENTAL EXTERIOR FACADE: ILLUMINATED DRUM, 36 FLUTED PILLARS,
  //    COLORED RIBBONS, HANGING BANNERS & ARCHITECTURAL EXTERIOR LIGHTS
  // --------------------------------------------------------------------------
  // Backlit architectural concourse & limestone exterior drum behind the columns
  const facadeTex = getStadiumFacadeTexture();
  const exteriorDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(40.9, 41.0, 15.8, 44, 1, true, phiStart, phiLength),
    new THREE.MeshStandardMaterial({
      map: facadeTex,
      emissiveMap: facadeTex,
      emissive: 0xffd27d,
      emissiveIntensity: 0.32,
      roughness: 0.65,
    }),
  );
  exteriorDrum.position.y = 8.05;
  g.add(exteriorDrum);

  // Colored architectural exterior fascia bands (Crimson lower trim, Navy upper frieze, Gold cornice)
  const addExteriorBand = (r: number, y: number, h: number, mat: THREE.Material) => {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, h, 44, 1, true, phiStart, phiLength),
      mat,
    );
    band.position.y = y;
    g.add(band);
  };
  addExteriorBand(41.25, 1.3, 2.3, limestoneMat);
  addExteriorBand(41.35, 4.4, 0.55, crimsonMat);
  addExteriorBand(41.4, 10.6, 0.65, goldMat);
  addExteriorBand(41.5, 14.9, 2.3, darkNavyMat);
  addExteriorBand(41.7, 16.05, 0.55, goldMat);

  // Glowing perimeter exterior LED light rings wrapping the stadium facade!
  addExteriorBand(41.65, 4.75, 0.24, cyanLedMat);
  addExteriorBand(41.72, 13.7, 0.28, warmLedMat);
  addExteriorBand(41.82, 16.45, 0.26, cyanLedMat);

  // 36 Monumental Exterior Fluted Pillars / Columns with Base Plinths & Ornate Capitals!
  const pillarCount = 36;
  const pillarR = 42.35;
  const shaftGeo = new THREE.CylinderGeometry(0.48, 0.56, 15.4, 10);
  const plinthGeo = new THREE.BoxGeometry(1.45, 1.15, 1.45);
  const capGeo = new THREE.BoxGeometry(1.55, 0.72, 1.55);
  const uplightGeo = new THREE.BoxGeometry(0.62, 0.22, 0.35);

  const pillarShafts = new THREE.InstancedMesh(shaftGeo, limestoneMat, pillarCount);
  const pillarPlinths = new THREE.InstancedMesh(plinthGeo, darkNavyMat, pillarCount);
  const pillarCaps = new THREE.InstancedMesh(capGeo, goldMat, pillarCount);
  const pillarUplights = new THREE.InstancedMesh(uplightGeo, warmLedMat, pillarCount);

  // Colorful vertical stadium team banners hanging on alternating pillars!
  const bannerCount = Math.floor(pillarCount / 2);
  const bannerGeo = new THREE.BoxGeometry(1.05, 4.6, 0.12);
  const bannerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
  const banners = new THREE.InstancedMesh(bannerGeo, bannerMat, bannerCount);
  const bannerPalette = [0x1d4ed8, 0xdc2626, 0xf59e0b, 0x0ea5e9];

  let bannerIdx = 0;
  for (let p = 0; p < pillarCount; p++) {
    const t = p / (pillarCount - 1);
    const phi = phiStart + t * phiLength;
    const px = Math.sin(phi) * pillarR;
    const pz = Math.cos(phi) * pillarR;

    dummy.position.set(px, 8.15, pz);
    dummy.rotation.set(0, phi, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    pillarShafts.setMatrixAt(p, dummy.matrix);

    dummy.position.set(px, 0.72, pz);
    dummy.updateMatrix();
    pillarPlinths.setMatrixAt(p, dummy.matrix);

    dummy.position.set(px, 16.05, pz);
    dummy.updateMatrix();
    pillarCaps.setMatrixAt(p, dummy.matrix);

    // Warm architectural exterior uplight mounted on outer side of plinth
    dummy.position.set(Math.sin(phi) * (pillarR + 0.72), 1.38, Math.cos(phi) * (pillarR + 0.72));
    dummy.rotation.set(0, phi, 0);
    dummy.updateMatrix();
    pillarUplights.setMatrixAt(p, dummy.matrix);

    if (p % 2 === 1 && bannerIdx < bannerCount) {
      const bx = Math.sin(phi) * (pillarR + 0.62);
      const bz = Math.cos(phi) * (pillarR + 0.62);
      dummy.position.set(bx, 9.2, bz);
      dummy.rotation.set(0, phi, 0);
      dummy.updateMatrix();
      banners.setMatrixAt(bannerIdx, dummy.matrix);
      col.setHex(bannerPalette[bannerIdx % bannerPalette.length]);
      banners.setColorAt(bannerIdx, col);
      bannerIdx++;
    }
  }
  for (const im of [pillarShafts, pillarPlinths, pillarCaps, pillarUplights, banners]) {
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    g.add(im);
  }

  // --------------------------------------------------------------------------
  // 5. GRAND SOUTH MAIN ENTRANCE PORTAL (Twin Pylons, Backlit Marquee & Ticket Booths)
  // --------------------------------------------------------------------------
  const gateZ = 41.6;
  const gateHalfX = 8.4;

  for (const sx of [-1, 1]) {
    // Monumental ribbed entrance tower pylon
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(3.4, 18.2, 3.8), limestoneMat);
    pylon.position.set(sx * gateHalfX, 9.1, gateZ);
    g.add(pylon);

    const pylonRibbon = new THREE.Mesh(new THREE.BoxGeometry(3.55, 2.2, 3.95), darkNavyMat);
    pylonRibbon.position.set(sx * gateHalfX, 15.2, gateZ);
    g.add(pylonRibbon);

    const pylonGoldCap = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.65, 4.1), goldMat);
    pylonGoldCap.position.set(sx * gateHalfX, 18.3, gateZ);
    g.add(pylonGoldCap);

    // Vertical glowing light strips on entrance pylon face
    const pylonGlow = new THREE.Mesh(new THREE.BoxGeometry(0.32, 13.8, 0.25), warmLedMat);
    pylonGlow.position.set(sx * gateHalfX, 8.2, gateZ + 1.98);
    g.add(pylonGlow);

    // Flanking illuminated Ticket Booths / Box Office outside main gate
    const booth = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.1, 2.4), darkNavyMat);
    booth.position.set(sx * (gateHalfX + 4.0), 1.65, gateZ + 0.8);
    g.add(booth);
    const boothWin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.25, 0.16), warmLedMat);
    boothWin.position.set(sx * (gateHalfX + 4.0), 1.85, gateZ + 2.02);
    g.add(boothWin);
    const boothRoof = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.28, 3.1), crimsonMat);
    boothRoof.position.set(sx * (gateHalfX + 4.0), 3.3, gateZ + 1.0);
    g.add(boothRoof);
  }

  // Grand overhead entrance bridge spanning the South gate (open clearance y = 0..8.0m!)
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(gateHalfX * 2 + 2.2, 4.5, 2.6), darkNavyMat);
  bridge.position.set(0, 10.6, gateZ);
  g.add(bridge);

  const bridgeTopTrim = new THREE.Mesh(new THREE.BoxGeometry(gateHalfX * 2 + 2.6, 0.45, 2.85), goldMat);
  bridgeTopTrim.position.set(0, 13.0, gateZ);
  g.add(bridgeTopTrim);

  // Backlit Main Entrance Marquee Sign (visible from the street outside!)
  const marqueeTex = createStadiumMarqueeTexture(zone.name);
  const marqueeMat = new THREE.MeshStandardMaterial({
    map: marqueeTex,
    emissiveMap: marqueeTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.44,
    roughness: 0.42,
  });
  const frontMarquee = new THREE.Mesh(new THREE.PlaneGeometry(14.8, 3.65), marqueeMat);
  frontMarquee.position.set(0, 10.6, gateZ + 1.36);
  g.add(frontMarquee);

  // Inner welcome sign facing the pitch from the South bridge
  const backMarquee = new THREE.Mesh(new THREE.PlaneGeometry(14.8, 3.65), marqueeMat);
  backMarquee.rotation.y = Math.PI;
  backMarquee.position.set(0, 10.6, gateZ - 1.36);
  g.add(backMarquee);

  // Monumental South Entrance Concourse Tunnel Side-Walls with Architectural Pilasters & Warm Sconces
  const tunnelStoneMat = new THREE.MeshStandardMaterial({ color: 0xc2b8a8, roughness: 0.8 });
  const tunnelBaseMat = new THREE.MeshStandardMaterial({ color: 0x7a7368, roughness: 0.86 });
  for (const sx of [-1, 1]) {
    const wallX = sx * (bp.gateHalfWidth + 0.55);
    const tunnelWall = new THREE.Mesh(new THREE.BoxGeometry(1.1, 8.6, 12.8), tunnelStoneMat);
    tunnelWall.position.set(wallX, 4.45, 34.8);
    tunnelWall.receiveShadow = true;
    g.add(tunnelWall);
    // Dark granite wainscot base & championship navy/gold band
    const wainscot = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.35, 12.9), tunnelBaseMat);
    wainscot.position.set(wallX, 0.82, 34.8);
    g.add(wainscot);
    const tunnelStripe = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.52, 12.9), darkNavyMat);
    tunnelStripe.position.set(wallX, 2.3, 34.8);
    g.add(tunnelStripe);
    const tunnelTrim = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 12.9), goldMat);
    tunnelTrim.position.set(wallX, 2.66, 34.8);
    g.add(tunnelTrim);
    // Engaged limestone pilasters + glowing bronze architectural sconces lining the concourse tunnel
    for (const pz of [30.2, 34.8, 39.4]) {
      const pilaster = new THREE.Mesh(new THREE.BoxGeometry(1.42, 8.4, 0.72), limestoneMat);
      pilaster.position.set(wallX, 4.35, pz);
      g.add(pilaster);
      const sconce = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.95, 0.34), warmLedMat);
      sconce.position.set(wallX - sx * 0.72, 4.2, pz);
      g.add(sconce);
    }
  }

  // Tiered Granite Pedestrian Entry Carpet + 5 Solid Steel Security Bollards (pedestrians walk through; cars stop!)
  const entryCarpet = new THREE.Mesh(
    new THREE.BoxGeometry(14.4, 0.08, 19.2),
    new THREE.MeshStandardMaterial({ color: 0xb4ab9e, roughness: 0.78 }),
  );
  entryCarpet.position.set(0, 0.2, 38.2);
  entryCarpet.receiveShadow = true;
  g.add(entryCarpet);

  for (const sb of bp.securityBollards) {
    const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.21, 0.96, 10), darkNavyMat);
    bollard.position.set(sb.x, 0.66, sb.z);
    g.add(bollard);
    const bCap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), goldMat);
    bCap.position.set(sb.x, 1.14, sb.z);
    g.add(bCap);
    const bBand = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.195, 0.12, 10), warmLedMat);
    bBand.position.set(sb.x, 0.96, sb.z);
    g.add(bBand);
  }

  // 4 Corner Landscaped Granite Plaza Planters with Shade Trees & Shrubs (matches bp.cornerPlanters!)
  const cornerSoilMat = new THREE.MeshStandardMaterial({ color: 0x3b2a1d, roughness: 0.96 });
  for (const cp of bp.cornerPlanters) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(cp.width, 0.62, cp.depth), limestoneMat);
    curb.position.set(cp.x, 0.45, cp.z);
    curb.receiveShadow = true;
    g.add(curb);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(cp.width + 0.22, 0.12, cp.depth + 0.22), darkNavyMat);
    cap.position.set(cp.x, 0.78, cp.z);
    g.add(cap);
    const soil = new THREE.Mesh(new THREE.BoxGeometry(cp.width - 0.55, 0.66, cp.depth - 0.55), cornerSoilMat);
    soil.position.set(cp.x, 0.48, cp.z);
    g.add(soil);
    addLayeredParkTree(g, cp.x, cp.z, 1.08);
  }

  // --------------------------------------------------------------------------
  // 6. CANTILEVERED STEEL ROOF HALO + 32 RADIAL ROOF TRUSSES + CANOPY LIGHTS
  // --------------------------------------------------------------------------
  const roofPts = [
    new THREE.Vector2(34.0, 17.1),
    new THREE.Vector2(38.6, 17.8),
    new THREE.Vector2(43.2, 16.9),
    new THREE.Vector2(43.2, 16.4),
    new THREE.Vector2(38.6, 17.2),
    new THREE.Vector2(34.0, 16.65),
  ];
  const roofCanopy = new THREE.Mesh(
    new THREE.LatheGeometry(roofPts, 44, phiStart, phiLength),
    brightWhiteRoofMat,
  );
  g.add(roofCanopy);

  // Inner blue/gold tension ring edge along the stadium roof opening
  const tensionRing = new THREE.Mesh(
    new THREE.CylinderGeometry(34.0, 34.0, 0.55, 44, 1, true, phiStart, phiLength),
    royalBlueMat,
  );
  tensionRing.position.y = 16.9;
  g.add(tensionRing);

  // 32 Radial Steel Roof Trusses + Underside Warm Stadium Canopy Downlights
  const trussCount = 32;
  const trussGeo = new THREE.BoxGeometry(0.32, 0.55, 9.4);
  const canopyLightGeo = new THREE.BoxGeometry(1.1, 0.22, 0.45);
  const trusses = new THREE.InstancedMesh(trussGeo, steelMat, trussCount);
  const canopyLights = new THREE.InstancedMesh(canopyLightGeo, warmLedMat, trussCount);

  for (let r = 0; r < trussCount; r++) {
    const phi = phiStart + (r / (trussCount - 1)) * phiLength;
    dummy.position.set(Math.sin(phi) * 38.6, 16.95, Math.cos(phi) * 38.6);
    dummy.rotation.set(0, phi, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    trusses.setMatrixAt(r, dummy.matrix);

    dummy.position.set(Math.sin(phi) * 34.8, 16.55, Math.cos(phi) * 34.8);
    dummy.rotation.set(0, phi, 0);
    dummy.updateMatrix();
    canopyLights.setMatrixAt(r, dummy.matrix);
  }
  trusses.instanceMatrix.needsUpdate = true;
  canopyLights.instanceMatrix.needsUpdate = true;
  g.add(trusses, canopyLights);

  // --------------------------------------------------------------------------
  // 7. 4 DETAILED LATTICE FLOODLIGHT TOWERS + SOFT VOLUMETRIC LIGHT BEAMS
  // --------------------------------------------------------------------------
  const towerR = 42.1;
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff5cc,
    transparent: true,
    opacity: 0.085,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  for (let t = 0; t < 4; t++) {
    const ang = Math.PI * 0.25 + t * (Math.PI * 0.5);
    const tx = Math.sin(ang) * towerR;
    const tz = Math.cos(ang) * towerR;

    const tower = new THREE.Group();
    tower.position.set(tx, 0, tz);
    // Point tower local +Z straight toward stadium center (0, 0)
    tower.rotation.y = ang + Math.PI;

    // Twin tapered steel lattice legs + horizontal cross-braces
    for (const lx of [-0.72, 0.72]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 29.0, 7), steelMat);
      leg.position.set(lx, 14.5, 0);
      tower.add(leg);
    }
    for (const cy of [6, 12, 18, 23, 27]) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.24, 0.28), steelMat);
      brace.position.set(0, cy, 0);
      tower.add(brace);
    }

    // Floodlight housing head angled down toward the emerald pitch
    const head = new THREE.Group();
    head.position.set(0, 28.4, 0.3);
    head.rotation.x = 0.52;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(5.6, 3.2, 0.55), darkNavyMat);
    head.add(frame);

    const lampGrid = new THREE.Mesh(new THREE.BoxGeometry(5.1, 2.7, 0.18), warmLedMat);
    lampGrid.position.z = 0.28;
    head.add(lampGrid);

    // Subtle glowing stadium light-beam cone projecting softly onto the field
    const beamCone = new THREE.Mesh(new THREE.ConeGeometry(8.5, 28, 12, 1, true), beamMat);
    beamCone.rotation.x = -Math.PI / 2;
    beamCone.position.z = 14.2;
    head.add(beamCone);

    tower.add(head);

    // Red FAA aviation warning beacon atop each floodlight tower
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), redBeaconMat);
    beacon.position.set(0, 30.4, 0);
    tower.add(beacon);

    g.add(tower);
  }

  // --------------------------------------------------------------------------
  // 8. MONUMENTAL NORTH END HD JUMBOTRON SCOREBOARD WITH FLANK SCREENS
  // --------------------------------------------------------------------------
  const jumbotron = new THREE.Group();
  jumbotron.position.set(0, 17.6, -38.8);

  // Twin steel structural support masts
  for (const sx of [-5.8, 5.8]) {
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.85, 9.2, 0.85), steelMat);
    mast.position.set(sx, -1.6, -0.35);
    jumbotron.add(mast);
  }

  // Main architectural scoreboard housing with gold trim
  const mainFrame = new THREE.Mesh(new THREE.BoxGeometry(14.8, 6.2, 1.0), darkNavyMat);
  jumbotron.add(mainFrame);
  const goldTrimTop = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.42, 1.15), goldMat);
  goldTrimTop.position.y = 3.25;
  jumbotron.add(goldTrimTop);
  const goldTrimBot = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.35, 1.15), crimsonMat);
  goldTrimBot.position.y = -3.2;
  jumbotron.add(goldTrimBot);

  // Center HD Live LED Screen
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(13.8, 5.2),
    new THREE.MeshStandardMaterial({
      map: scoreboardTex,
      emissiveMap: scoreboardTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.46,
      roughness: 0.4,
    }),
  );
  screen.position.z = 0.54;
  jumbotron.add(screen);

  // Flanking angled sponsor/stats wing panels
  const wingTex = getStadiumRibbonTexture();
  const wingScreenMat = new THREE.MeshStandardMaterial({
    map: wingTex,
    emissiveMap: wingTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.42,
    roughness: 0.42,
  });
  for (const sx of [-1, 1]) {
    const wing = new THREE.Group();
    wing.position.set(sx * 9.5, -0.2, 0.55);
    wing.rotation.y = -sx * 0.28;
    const wf = new THREE.Mesh(new THREE.BoxGeometry(3.9, 4.6, 0.65), darkNavyMat);
    wing.add(wf);
    const ws = new THREE.Mesh(new THREE.PlaneGeometry(3.45, 4.05), wingScreenMat);
    ws.position.z = 0.36;
    wing.add(ws);
    jumbotron.add(wing);
  }

  g.add(jumbotron);
  return g;
}
