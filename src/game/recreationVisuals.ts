import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { RecreationZoneDef } from './cityLayout';
import {
  getParkLayoutBlueprint,
  getPlaygroundLayoutBlueprint,
  getCourtLayoutBlueprint,
  type PerimeterSegmentSpec,
} from './recreationCollisions';
import {
  getParkTurfTexture,
  getParkPathTexture,
  addLayeredParkTree,
  addParkFlowerbedAndShrubs,
  addCentralParkLamp,
} from './nycEnvironment';

// ============================================================================
// STATIC GEOMETRY BATCHING HELPER (Merges static park/court meshes by material)
// ============================================================================

function normalizeGeometryForMerge(sourceGeo: THREE.BufferGeometry): THREE.BufferGeometry {
  const geo = sourceGeo.index ? sourceGeo.toNonIndexed() : sourceGeo.clone();
  geo.clearGroups();

  if (!geo.attributes.normal) {
    geo.computeVertexNormals();
  }
  const posAttr = geo.attributes.position;
  if (!geo.attributes.uv && posAttr) {
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(posAttr.count * 2), 2));
  }
  for (const attrName of Object.keys(geo.attributes)) {
    if (attrName !== 'position' && attrName !== 'normal' && attrName !== 'uv') {
      geo.deleteAttribute(attrName);
    }
  }
  return geo;
}

/**
 * Collapses a static THREE.Group (park, playground, court, or plaza) into one merged
 * BufferGeometry per unique (Material, receiveShadow) bucket while preserving any
 * InstancedMesh children intact. Cuts park draw calls by ~90% with identical visuals.
 */
function mergeStaticGroupByMaterial(source: THREE.Group): THREE.Group {
  const savedPos = source.position.clone();
  const savedRot = source.rotation.clone();
  const savedScale = source.scale.clone();

  source.position.set(0, 0, 0);
  source.rotation.set(0, 0, 0);
  source.scale.set(1, 1, 1);
  source.updateMatrixWorld(true);

  const out = new THREE.Group();
  out.position.copy(savedPos);
  out.rotation.copy(savedRot);
  out.scale.copy(savedScale);

  interface Bucket {
    material: THREE.Material;
    receiveShadow: boolean;
    geometries: THREE.BufferGeometry[];
  }
  const buckets = new Map<string, Bucket>();
  const matIds = new Map<THREE.Material, number>();
  let nextMatId = 1;
  const preservedInstanced: THREE.InstancedMesh[] = [];

  source.traverse((obj) => {
    if (obj instanceof THREE.InstancedMesh) {
      preservedInstanced.push(obj);
      return;
    }
    if (!(obj instanceof THREE.Mesh)) return;
    if (Array.isArray(obj.material)) {
      out.add(obj.clone());
      return;
    }
    const mat = obj.material;
    let mId = matIds.get(mat);
    if (mId === undefined) {
      mId = nextMatId++;
      matIds.set(mat, mId);
    }
    const key = `${mId}_${obj.receiveShadow ? 1 : 0}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { material: mat, receiveShadow: obj.receiveShadow, geometries: [] };
      buckets.set(key, bucket);
    }
    const normalized = normalizeGeometryForMerge(obj.geometry);
    normalized.applyMatrix4(obj.matrixWorld);
    obj.geometry.dispose();
    bucket.geometries.push(normalized);
  });

  for (const bucket of buckets.values()) {
    if (bucket.geometries.length === 0) continue;
    const mergedGeo =
      bucket.geometries.length === 1
        ? bucket.geometries[0]
        : mergeGeometries(bucket.geometries, false);
    if (mergedGeo) {
      mergedGeo.computeBoundingBox();
      mergedGeo.computeBoundingSphere();
      const mesh = new THREE.Mesh(mergedGeo, bucket.material);
      mesh.receiveShadow = bucket.receiveShadow;
      mesh.castShadow = false;
      out.add(mesh);
    }
    if (bucket.geometries.length > 1) {
      for (const g of bucket.geometries) g.dispose();
    }
  }

  for (const inst of preservedInstanced) {
    inst.computeBoundingSphere();
    out.add(inst);
  }

  return out;
}

// ============================================================================
// PROCEDURAL CANVAS TEXTURES (100% self-contained, zero external asset URLs)
// ============================================================================

let cachedAshlarTex: THREE.CanvasTexture | null = null;
let cachedBrickWallTex: THREE.CanvasTexture | null = null;
let cachedChainLinkTex: THREE.CanvasTexture | null = null;
let cachedEpdmTex: THREE.CanvasTexture | null = null;
let cachedMulchTex: THREE.CanvasTexture | null = null;
let cachedPlazaCobbleTex: THREE.CanvasTexture | null = null;
let cachedBlacktopTex: THREE.CanvasTexture | null = null;

export function getAshlarStoneTexture(): THREE.CanvasTexture {
  if (cachedAshlarTex) return cachedAshlarTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#5e564a';
  ctx.fillRect(0, 0, 256, 128);

  const rows = 4;
  const rowH = 128 / rows;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * 32;
    for (let x = -32; x < 256; x += 64) {
      const shade = 132 + (((x * 17 + r * 31) & 15) - 8) * 3;
      ctx.fillStyle = `rgb(${shade}, ${shade - 9}, ${shade - 21})`;
      ctx.fillRect(x + offset + 2.5, r * rowH + 2.5, 59, rowH - 5);
      // Subtle top stone bevel highlight & bottom shadow lip
      ctx.fillStyle = 'rgba(255,248,236,0.22)';
      ctx.fillRect(x + offset + 2.5, r * rowH + 2.5, 59, 3);
      ctx.fillStyle = 'rgba(24,20,16,0.24)';
      ctx.fillRect(x + offset + 2.5, (r + 1) * rowH - 5, 59, 2.5);
    }
  }
  // Ground-contact dampness/moss gradient along bottom
  const grad = ctx.createLinearGradient(0, 84, 0, 128);
  grad.addColorStop(0, 'rgba(32,46,28,0)');
  grad.addColorStop(1, 'rgba(32,46,28,0.42)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 84, 256, 44);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedAshlarTex = tex;
  return tex;
}

function getBrickWallTexture(): THREE.CanvasTexture {
  if (cachedBrickWallTex) return cachedBrickWallTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#c8bfb2'; // Mortar
  ctx.fillRect(0, 0, 256, 128);

  const rows = 8;
  const rowH = 128 / rows;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * 16;
    for (let x = -16; x < 256; x += 32) {
      const v = ((x * 13 + r * 29) & 15) - 7;
      ctx.fillStyle = `rgb(${156 + v * 2}, ${78 + v}, ${58 + v})`;
      ctx.fillRect(x + off + 1.5, r * rowH + 1.5, 29, rowH - 3);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedBrickWallTex = tex;
  return tex;
}

export function getChainLinkFenceTexture(): THREE.CanvasTexture {
  if (cachedChainLinkTex) return cachedChainLinkTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);

  const step = 16;
  ctx.strokeStyle = 'rgba(210, 220, 230, 0.88)';
  ctx.lineWidth = 2.2;
  for (let i = -128; i <= 256; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 128, 128);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i, 128);
    ctx.lineTo(i + 128, 0);
    ctx.stroke();
  }
  // Subtle darker wire shadow offset for depth
  ctx.strokeStyle = 'rgba(55, 65, 81, 0.45)';
  ctx.lineWidth = 1.1;
  for (let i = -128; i <= 256; i += step) {
    ctx.beginPath();
    ctx.moveTo(i + 1.5, 0);
    ctx.lineTo(i + 129.5, 128);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 2.2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedChainLinkTex = tex;
  return tex;
}

function getEpdmPlaygroundTexture(): THREE.CanvasTexture {
  if (cachedEpdmTex) return cachedEpdmTex;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  // Base terracotta poured-rubber playground mat
  ctx.fillStyle = '#c46b3b';
  ctx.fillRect(0, 0, 512, 512);

  // Outer running track border in warm sandstone ochre
  ctx.strokeStyle = '#e5a94c';
  ctx.lineWidth = 34;
  ctx.strokeRect(32, 32, 448, 448);

  // Decorative blue & teal play-zone geometric circles
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.arc(256, 310, 96, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fef3c7';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.fillStyle = '#0d9488';
  ctx.beginPath();
  ctx.arc(145, 155, 72, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.arc(365, 155, 76, 0, Math.PI * 2);
  ctx.fill();

  // Painted hopscotch court near south-center entrance
  ctx.strokeStyle = '#fffbeb';
  ctx.lineWidth = 4;
  for (let i = 0; i < 6; i++) {
    ctx.strokeRect(236, 405 - i * 16, 40, 16);
  }

  // Fine EPDM rubber granule speckles across whole mat
  for (let i = 0; i < 2400; i++) {
    const px = (i * 97) % 512;
    const py = (i * 193) % 512;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(20,15,10,0.12)';
    ctx.fillRect(px, py, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedEpdmTex = tex;
  return tex;
}

function getWoodMulchTexture(): THREE.CanvasTexture {
  if (cachedMulchTex) return cachedMulchTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#5c3d24';
  ctx.fillRect(0, 0, 256, 256);

  const tones = ['#734c2d', '#4a301b', '#865b36', '#3d2614', '#94673f'];
  for (let i = 0; i < 900; i++) {
    const x = (i * 73 + (i % 7) * 19) % 256;
    const y = (i * 131 + (i % 5) * 23) % 256;
    const w = 6 + (i % 9);
    const h = 2 + (i % 4);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(((i * 37) % 314) / 100);
    ctx.fillStyle = tones[i % tones.length];
    ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedMulchTex = tex;
  return tex;
}

export function getPlazaCobbleTexture(): THREE.CanvasTexture {
  if (cachedPlazaCobbleTex) return cachedPlazaCobbleTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#8b8378';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 32) {
    const off = ((y / 32) % 2) * 16;
    for (let x = -16; x < 256; x += 32) {
      const shade = 178 + (((x * 11 + y * 17) & 15) - 8) * 2;
      ctx.fillStyle = `rgb(${shade}, ${shade - 5}, ${shade - 13})`;
      ctx.fillRect(x + off + 1.5, y + 1.5, 29, 29);
      ctx.strokeStyle = 'rgba(60,55,48,0.28)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + off + 1.5, y + 1.5, 29, 29);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedPlazaCobbleTex = tex;
  return tex;
}

function getBlacktopTexture(): THREE.CanvasTexture {
  if (cachedBlacktopTex) return cachedBlacktopTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#2d333b';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2200; i++) {
    const x = (i * 53) % 256;
    const y = (i * 107) % 256;
    const v = 38 + (i % 28);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    ctx.fillRect(x, y, 2, 2);
  }
  // Subtle asphalt expansion seam lines
  ctx.strokeStyle = 'rgba(15,18,22,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 128);
  ctx.lineTo(256, 128);
  ctx.moveTo(128, 0);
  ctx.lineTo(128, 256);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedBlacktopTex = tex;
  return tex;
}

function createCourtSurfaceTexture(kind: 'basketball' | 'tennis'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  if (kind === 'basketball') {
    // Authentic NYC Rucker / Cage dark-slate & burnt-terracotta acrylic court
    ctx.fillStyle = '#9c4328';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#1d3b5c';
    ctx.fillRect(16, 16, 480, 224);

    // Subtle scuffed blacktop grain
    for (let i = 0; i < 1800; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect((i * 89) % 512, (i * 137) % 256, 2, 2);
    }

    // Keys / paint zones
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(16, 78, 92, 100);
    ctx.fillRect(404, 78, 92, 100);
    // Center court NYC circle fill
    ctx.fillStyle = '#c2410c';
    ctx.beginPath();
    ctx.arc(256, 128, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 5;
    ctx.strokeRect(16, 16, 480, 224);
    ctx.strokeRect(16, 78, 92, 100);
    ctx.strokeRect(404, 78, 92, 100);
    ctx.beginPath();
    ctx.moveTo(256, 16);
    ctx.lineTo(256, 240);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(256, 128, 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(108, 128, 28, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(404, 128, 28, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(46, 128, 94, -Math.PI * 0.44, Math.PI * 0.44);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(466, 128, 94, Math.PI * 0.56, Math.PI * 1.44);
    ctx.stroke();
  } else {
    // US Open inspired Queens/Manhattan blue inner court & forest green surround
    ctx.fillStyle = '#1f5e43';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#255c8a';
    ctx.fillRect(30, 26, 452, 204);
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      ctx.fillRect((i * 71) % 512, (i * 113) % 256, 2, 2);
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4.5;
    ctx.strokeRect(30, 26, 452, 204);
    ctx.strokeRect(30, 50, 452, 156);
    ctx.beginPath();
    ctx.moveTo(256, 26);
    ctx.lineTo(256, 230);
    ctx.moveTo(132, 50);
    ctx.lineTo(132, 206);
    ctx.moveTo(380, 50);
    ctx.lineTo(380, 206);
    ctx.moveTo(132, 128);
    ctx.lineTo(380, 128);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createGatePlaqueTexture(title: string, subtitle: string, bgHex: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 96);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 5;
  ctx.strokeRect(5, 5, 502, 86);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title.toUpperCase(), 256, 38);
  ctx.fillStyle = '#fde68a';
  ctx.font = '700 16px sans-serif';
  ctx.fillText(subtitle.toUpperCase(), 256, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ============================================================================
// SHARED ARCHITECTURAL SUB-BUILDERS (Walls, Gate Piers, Fountains, Benches)
// ============================================================================

let sharedBenchWoodMat: THREE.MeshStandardMaterial | null = null;
let sharedBenchIronMat: THREE.MeshStandardMaterial | null = null;
let sharedBinBodyMat: THREE.MeshStandardMaterial | null = null;
let sharedBinRimMat: THREE.MeshStandardMaterial | null = null;
let sharedPitCurbMat: THREE.MeshStandardMaterial | null = null;
let sharedPitSoilMat: THREE.MeshStandardMaterial | null = null;

function addDetailedParkBench(parent: THREE.Group, x: number, z: number, rotY: number): void {
  const bench = new THREE.Group();
  bench.position.set(x, 0.18, z);
  bench.rotation.y = rotY;

  if (!sharedBenchWoodMat) {
    sharedBenchWoodMat = new THREE.MeshStandardMaterial({ color: 0x7c4a24, roughness: 0.78 });
    sharedBenchIronMat = new THREE.MeshStandardMaterial({ color: 0x18221e, roughness: 0.44, metalness: 0.72 });
  }

  // Streamlined 5-part NYC park bench: cedar seat, angled backrest, 2 cast-iron end frames & center brace
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.065, 0.48), sharedBenchWoodMat);
  seat.position.set(0, 0.48, 0);
  bench.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.34, 0.06), sharedBenchWoodMat);
  back.position.set(0, 0.8, -0.27);
  back.rotation.x = -0.18;
  bench.add(back);

  for (const sx of [-0.88, 0.88]) {
    const endFrame = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.68, 0.56), sharedBenchIronMat!);
    endFrame.position.set(sx, 0.34, 0);
    bench.add(endFrame);
  }
  const centerLeg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.46, 0.44), sharedBenchIronMat!);
  centerLeg.position.set(0, 0.23, 0);
  bench.add(centerLeg);

  parent.add(bench);
}

function addParkTrashBin(parent: THREE.Group, x: number, z: number): void {
  const bin = new THREE.Group();
  bin.position.set(x, 0.18, z);
  if (!sharedBinBodyMat) {
    sharedBinBodyMat = new THREE.MeshStandardMaterial({ color: 0x16422c, roughness: 0.5, metalness: 0.55 });
    sharedBinRimMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4, metalness: 0.7 });
  }
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.76, 8), sharedBinBodyMat);
  body.position.y = 0.38;
  bin.add(body);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.07, 8), sharedBinRimMat!);
  lid.position.y = 0.78;
  bin.add(lid);
  parent.add(bin);
}

function addTreeWithStonePit(parent: THREE.Group, x: number, z: number, scale: number): void {
  if (!sharedPitCurbMat) {
    sharedPitCurbMat = new THREE.MeshStandardMaterial({ color: 0x9b9284, roughness: 0.86 });
    sharedPitSoilMat = new THREE.MeshStandardMaterial({ map: getWoodMulchTexture(), roughness: 0.96 });
  }
  const pitRing = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.2, 0.16, 8), sharedPitCurbMat);
  pitRing.position.set(x, 0.22, z);
  parent.add(pitRing);
  const pitSoil = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.98, 0.18, 8), sharedPitSoilMat!);
  pitSoil.position.set(x, 0.235, z);
  parent.add(pitSoil);
  addLayeredParkTree(parent, x, z, scale, true);
}

function addMasonryAndIronFence(
  parent: THREE.Group,
  segments: PerimeterSegmentSpec[],
  wallMat: THREE.Material,
  capMat: THREE.Material,
  ironMat: THREE.Material,
  wallH: number,
  totalH: number,
): void {
  const ironBaseY = 0.14 + wallH + 0.1;
  const picketH = Math.max(0.45, totalH - ironBaseY);
  const picketMatrices: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();

  for (const seg of segments) {
    const isEW = seg.axis === 'ew';
    const len = isEW ? seg.width : seg.depth;
    const thick = isEW ? seg.depth : seg.width;

    // Solid masonry knee wall
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(isEW ? len : thick, wallH, isEW ? thick : len),
      wallMat,
    );
    wall.position.set(seg.x, 0.14 + wallH * 0.5, seg.z);
    wall.receiveShadow = true;
    parent.add(wall);

    // Beveled limestone coping cap overhanging the masonry wall
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(isEW ? len + 0.06 : thick + 0.1, 0.1, isEW ? thick + 0.1 : len + 0.06),
      capMat,
    );
    cap.position.set(seg.x, 0.14 + wallH + 0.05, seg.z);
    parent.add(cap);

    // Wrought-iron top & bottom rails + vertical spear pickets mounted on top of the stone cap
    const railSpan = len - 0.16;
    for (const ry of [ironBaseY + 0.12, ironBaseY + picketH - 0.06]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(isEW ? railSpan : 0.07, 0.06, isEW ? 0.07 : railSpan),
        ironMat,
      );
      rail.position.set(seg.x, ry, seg.z);
      parent.add(rail);
    }

    const picketCount = Math.max(4, Math.floor(railSpan / 0.72));
    for (let i = 0; i < picketCount; i++) {
      const t = picketCount === 1 ? 0 : i / (picketCount - 1) - 0.5;
      const offset = t * (railSpan - 0.3);
      dummy.position.set(
        isEW ? seg.x + offset : seg.x,
        ironBaseY + picketH * 0.5,
        isEW ? seg.z : seg.z + offset,
      );
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      picketMatrices.push(dummy.matrix.clone());
    }
  }

  // Unified single InstancedMesh for ALL perimeter fence pickets across the entire zone
  if (picketMatrices.length > 0) {
    const picketGeo = new THREE.CylinderGeometry(0.024, 0.028, picketH + 0.08, 5);
    const inst = new THREE.InstancedMesh(picketGeo, ironMat, picketMatrices.length);
    for (let i = 0; i < picketMatrices.length; i++) {
      inst.setMatrixAt(i, picketMatrices[i]);
    }
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    parent.add(inst);
  }
}

function addLimestoneGatePier(
  parent: THREE.Group,
  x: number,
  z: number,
  height: number,
  withLantern: boolean,
  stoneMat: THREE.Material,
  capMat: THREE.Material,
  bronzeMat: THREE.Material,
  lanternMat: THREE.Material,
): void {
  const pier = new THREE.Group();
  pier.position.set(x, 0.14, z);

  // Stepped plinth base
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.32, 1.04), capMat);
  plinth.position.y = 0.16;
  pier.add(plinth);

  // Main carved shaft
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.84, height - 0.54, 0.84), stoneMat);
  shaft.position.y = 0.32 + (height - 0.54) * 0.5;
  pier.add(shaft);

  // Molded cornice cap + pyramid finial
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.18, 1.02), capMat);
  cap.position.y = height - 0.13;
  pier.add(cap);

  if (withLantern) {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.18, 6), bronzeMat);
    collar.position.y = height + 0.05;
    pier.add(collar);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.21, 7, 6), lanternMat);
    globe.position.y = height + 0.3;
    pier.add(globe);
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.18, 6), bronzeMat);
    finial.position.y = height + 0.52;
    pier.add(finial);
  } else {
    const pyr = new THREE.Mesh(new THREE.ConeGeometry(0.56, 0.28, 4), capMat);
    pyr.rotation.y = Math.PI / 4;
    pyr.position.y = height + 0.1;
    pier.add(pyr);
  }

  parent.add(pier);
}

function addOrnamentalParkFountain(parent: THREE.Group, x: number, z: number, radius: number): void {
  const f = new THREE.Group();
  f.position.set(x, 0.16, z);

  const stoneMat = new THREE.MeshStandardMaterial({
    map: getAshlarStoneTexture(),
    color: 0xd8d0c2,
    roughness: 0.72,
  });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xe7e0d3, roughness: 0.62 });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0369a1,
    emissiveIntensity: 0.25,
    roughness: 0.12,
    metalness: 0.25,
    transparent: true,
    opacity: 0.86,
  });
  const foamMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0xbae6fd,
    emissiveIntensity: 0.3,
    roughness: 0.35,
    transparent: true,
    opacity: 0.72,
  });
  const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x4b6352, roughness: 0.4, metalness: 0.65 });

  // Stepped circular cobble apron around fountain
  const apron = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.55, radius + 0.65, 0.1, 14), trimMat);
  apron.position.y = 0.05;
  f.add(apron);

  // Carved stone basin rim wall + coping lip
  const basinWall = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius + 0.08, 0.66, 14),
    stoneMat,
  );
  basinWall.position.y = 0.38;
  f.add(basinWall);

  const rimTorus = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.06, 0.13, 6, 16), trimMat);
  rimTorus.rotation.x = Math.PI / 2;
  rimTorus.position.y = 0.72;
  f.add(rimTorus);

  // Shimmering basin water disc
  const water = new THREE.Mesh(new THREE.CylinderGeometry(radius - 0.16, radius - 0.16, 0.08, 14), waterMat);
  water.position.y = 0.64;
  f.add(water);

  // Central sculpted stone pedestal + 2 overflowing bowls
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.44, 1.35, 10), trimMat);
  ped.position.y = 1.15;
  f.add(ped);

  const lowerBowl = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 0.38, 0.32, 12), trimMat);
  lowerBowl.position.y = 1.38;
  f.add(lowerBowl);
  const lowerWater = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.05, 12), waterMat);
  lowerWater.position.y = 1.54;
  f.add(lowerWater);

  const upperPed = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.65, 8), trimMat);
  upperPed.position.y = 1.82;
  f.add(upperPed);

  const upperBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.22, 0.24, 10), trimMat);
  upperBowl.position.y = 2.08;
  f.add(upperBowl);

  // Patinated bronze finial + central sparkling water plume & 2 graceful crossing arcs
  const spout = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.36, 6), bronzeMat);
  spout.position.y = 2.34;
  f.add(spout);

  const plume = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.22, 0.68, 6), foamMat);
  plume.position.y = 2.66;
  f.add(plume);

  for (let a = 0; a < 2; a++) {
    const ang = a * Math.PI * 0.5 + Math.PI * 0.25;
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 5, 10, Math.PI), foamMat);
    arc.position.set(0, 1.5, 0);
    arc.rotation.y = ang;
    f.add(arc);
  }

  parent.add(f);
}

function addParkShadePergola(
  parent: THREE.Group,
  x: number,
  z: number,
  width: number,
  depth: number,
): void {
  const p = new THREE.Group();
  p.position.set(x, 0.16, z);

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xbfb5a5, roughness: 0.78 });
  const cedarMat = new THREE.MeshStandardMaterial({ color: 0x6f4324, roughness: 0.76 });
  const copperMat = new THREE.MeshStandardMaterial({ color: 0x3b7a68, roughness: 0.42, metalness: 0.55 });

  // Flagstone floor pad underneath pergola
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.5, 0.08, depth + 0.5),
    new THREE.MeshStandardMaterial({ map: getPlazaCobbleTexture(), color: 0xd9d1c3, roughness: 0.84 }),
  );
  pad.position.y = 0.04;
  p.add(pad);

  // 4 stone plinths + chamfered timber posts
  for (const sx of [-width * 0.46, width * 0.46]) {
    for (const sz of [-depth * 0.44, depth * 0.44]) {
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.42), stoneMat);
      plinth.position.set(sx, 0.28, sz);
      p.add(plinth);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.45, 0.22), cedarMat);
      post.position.set(sx, 1.75, sz);
      p.add(post);
    }
  }

  // Heavy longitudinal beams + copper trim fascia
  for (const sz of [-depth * 0.44, depth * 0.44]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(width + 0.45, 0.22, 0.2), cedarMat);
    beam.position.set(0, 2.98, sz);
    p.add(beam);
    const flash = new THREE.Mesh(new THREE.BoxGeometry(width + 0.5, 0.06, 0.24), copperMat);
    flash.position.set(0, 3.12, sz);
    p.add(flash);
  }

  // Slatted overhead timber rafters casting rhythmic shade (5 clean rafters)
  const rafterCount = 5;
  for (let i = 0; i < rafterCount; i++) {
    const rx = -width * 0.46 + (i / (rafterCount - 1)) * width * 0.92;
    const rafter = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.15, depth + 0.55), cedarMat);
    rafter.position.set(rx, 3.14, 0);
    p.add(rafter);
  }

  // Interior bench centered cleanly along back edge
  addDetailedParkBench(p, 0, -depth * 0.16, 0);
  parent.add(p);
}

// ============================================================================
// 1. MULTI-LAYERED NYC PARK (Central Park Great Lawn & Flushing Meadows)
// ============================================================================

export function createLayeredParkMesh(zone: RecreationZoneDef): THREE.Group {
  const g = new THREE.Group();
  g.position.set(zone.cx, 0, zone.cz);
  const bp = getParkLayoutBlueprint(zone);
  const hw = zone.width * 0.5;
  const hd = zone.depth * 0.5;

  const graniteMat = new THREE.MeshStandardMaterial({ color: 0x9b9284, roughness: 0.84 });
  const stoneWallMat = new THREE.MeshStandardMaterial({ map: getAshlarStoneTexture(), roughness: 0.82 });
  const stoneCapMat = new THREE.MeshStandardMaterial({ color: 0xcfc5b6, roughness: 0.72 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1a2621, roughness: 0.44, metalness: 0.74 });
  const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x5c4728, roughness: 0.38, metalness: 0.7 });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xffd98a,
    emissiveIntensity: 1.7,
    roughness: 0.22,
  });
  const grassMat = new THREE.MeshStandardMaterial({ map: getParkTurfTexture(), roughness: 0.9 });
  const bermGrassMat = new THREE.MeshStandardMaterial({
    map: getParkTurfTexture(),
    color: 0xd4f0c2,
    roughness: 0.92,
  });
  const pathMat = new THREE.MeshStandardMaterial({
    map: getParkPathTexture(),
    color: 0xd9cebc,
    roughness: 0.84,
  });
  const apronMat = new THREE.MeshStandardMaterial({
    map: getPlazaCobbleTexture(),
    color: 0xd5cab8,
    roughness: 0.82,
  });

  // Layer 1: Raised granite block plinth (y = 0..0.14)
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(zone.width, 0.14, zone.depth), graniteMat);
  plinth.position.y = 0.07;
  plinth.receiveShadow = true;
  g.add(plinth);

  // Layer 2: Lush textured Great Lawn turf (y = 0.14..0.18)
  const lawn = new THREE.Mesh(new THREE.BoxGeometry(zone.width - 0.8, 0.05, zone.depth - 0.8), grassMat);
  lawn.position.y = 0.165;
  lawn.receiveShadow = true;
  g.add(lawn);

  // Layer 2b: Subtle landscaped 3D rolling grass berms framing outer lawn corners (clear of flat central cricket pitch!)
  const moundSpots: Array<[number, number, number, number]> = [
    [-hw + 5.0, -hd + 5.2, 3.2, 0.42],
    [hw - 5.2, hd - 5.0, 3.2, 0.4],
  ];
  for (const [mx, mz, mr, mh] of moundSpots) {
    const mound = new THREE.Mesh(new THREE.SphereGeometry(mr, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), bermGrassMat);
    mound.scale.set(1.1, mh / mr, 0.95);
    mound.position.set(mx, 0.17, mz);
    mound.receiveShadow = true;
    g.add(mound);
  }

  // Layer 3: Perimeter flagstone promenade loop + raised stone path edging (y = 0.19)
  const loopOffset = hw - 3.6;
  const pathW = 2.6;
  for (const ez of [-loopOffset, loopOffset]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(zone.width - 5.4, 0.04, pathW), pathMat);
    strip.position.set(0, 0.2, ez);
    strip.receiveShadow = true;
    g.add(strip);
  }
  for (const ex of [-loopOffset, loopOffset]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(pathW, 0.04, zone.depth - 5.4), pathMat);
    strip.position.set(ex, 0.2, 0);
    strip.receiveShadow = true;
    g.add(strip);
  }

  // 4 Wide Cobblestone Entrance Aprons leading cleanly through the N, S, E, W gates
  const gateApronW = bp.gateHalf * 2 + 0.6;
  for (const sz of [-hd + 2.4, hd - 2.4]) {
    const ap = new THREE.Mesh(new THREE.BoxGeometry(gateApronW, 0.048, 4.9), apronMat);
    ap.position.set(0, 0.205, sz);
    ap.receiveShadow = true;
    g.add(ap);
  }
  for (const sx of [-hw + 2.4, hw - 2.4]) {
    const ap = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.048, gateApronW), apronMat);
    ap.position.set(sx, 0.205, 0);
    ap.receiveShadow = true;
    g.add(ap);
  }

  // Layer 4: Full 4-sided ashlar stone knee-wall + wrought-iron picket railing + carved gate piers
  addMasonryAndIronFence(g, bp.wallSegments, stoneWallMat, stoneCapMat, ironMat, 0.72, 1.55);
  for (const gp of bp.gatePiers) {
    addLimestoneGatePier(g, gp.x, gp.z, 2.05, true, stoneWallMat, stoneCapMat, bronzeMat, lanternMat);
  }
  for (const cp of bp.cornerPiers) {
    addLimestoneGatePier(g, cp.x, cp.z, 1.75, false, stoneWallMat, stoneCapMat, bronzeMat, lanternMat);
  }

  // Layer 5: Signature Park Landmarks — Tiered Limestone Fountain + Cedar/Copper Shade Pergola
  addOrnamentalParkFountain(g, bp.fountain.x, bp.fountain.z, bp.fountain.radius);
  addParkShadePergola(g, bp.pergola.x, bp.pergola.z, bp.pergola.width, bp.pergola.depth);

  // Trees in granite/mulch pits, raised flowerbeds, benches + trash bins, Central Park lamps
  for (const t of bp.trees) {
    addTreeWithStonePit(g, t.x, t.z, t.scale);
  }
  for (const fb of bp.flowerbeds) {
    addParkFlowerbedAndShrubs(g, fb.x, fb.z, fb.rotY);
  }
  bp.benches.forEach((b, idx) => {
    addDetailedParkBench(g, b.x, b.z, b.rotY);
    // Tuck NYC Parks green litter bins beside the primary opposite benches
    if (idx % 2 === 0) {
      addParkTrashBin(g, b.x, b.z + (b.z > 0 ? 1.55 : -1.55));
    }
  });
  for (const l of bp.lamps) {
    addCentralParkLamp(g, l.x, l.z);
  }

  return mergeStaticGroupByMaterial(g);
}

// ============================================================================
// 2. MULTI-LAYERED NYC PLAYGROUND (Washington Sq & Astoria Family Playground)
// ============================================================================

export function createLayeredPlaygroundMesh(zone: RecreationZoneDef): THREE.Group {
  const g = new THREE.Group();
  g.position.set(zone.cx, 0, zone.cz);
  const bp = getPlaygroundLayoutBlueprint(zone);
  const hw = zone.width * 0.5;
  const hd = zone.depth * 0.5;

  const graniteMat = new THREE.MeshStandardMaterial({ color: 0x9b9284, roughness: 0.84 });
  const brickMat = new THREE.MeshStandardMaterial({ map: getBrickWallTexture(), roughness: 0.84 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0xd6cdc0, roughness: 0.72 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x163226, roughness: 0.45, metalness: 0.68 });
  const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x5c4728, roughness: 0.4, metalness: 0.68 });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xffd98a,
    emissiveIntensity: 1.5,
    roughness: 0.25,
  });
  const grassMat = new THREE.MeshStandardMaterial({ map: getParkTurfTexture(), roughness: 0.92 });
  const mulchMat = new THREE.MeshStandardMaterial({ map: getWoodMulchTexture(), roughness: 0.96 });
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.84 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.38, metalness: 0.76 });
  const redPlayMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.34 });
  const bluePlayMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.36 });
  const yellowPlayMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.34 });
  const tealPlayMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.36 });

  // Layer 1: Raised granite block plinth + border grass
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(zone.width, 0.14, zone.depth), graniteMat);
  plinth.position.y = 0.07;
  plinth.receiveShadow = true;
  g.add(plinth);

  const borderGrass = new THREE.Mesh(new THREE.BoxGeometry(zone.width - 0.8, 0.05, zone.depth - 0.8), grassMat);
  borderGrass.position.y = 0.16;
  borderGrass.receiveShadow = true;
  g.add(borderGrass);

  // Layer 2: Multi-zone poured EPDM safety rubber pad with concrete bumper curb (y = 0.19)
  const padW = zone.width - 6.6;
  const padD = zone.depth - 6.6;
  const rubberCurb = new THREE.Mesh(new THREE.BoxGeometry(padW + 0.55, 0.08, padD + 0.55), capMat);
  rubberCurb.position.y = 0.185;
  g.add(rubberCurb);

  const epdmPad = new THREE.Mesh(
    new THREE.BoxGeometry(padW, 0.06, padD),
    new THREE.MeshStandardMaterial({ map: getEpdmPlaygroundTexture(), roughness: 0.86 }),
  );
  epdmPad.position.y = 0.205;
  epdmPad.receiveShadow = true;
  g.add(epdmPad);

  // Cobble gate aprons connecting perimeter gates to the EPDM play surface
  const apronMat = new THREE.MeshStandardMaterial({ map: getPlazaCobbleTexture(), color: 0xd7cdc0, roughness: 0.84 });
  for (const sz of [-hd + 2.1, hd - 2.1]) {
    const ap = new THREE.Mesh(new THREE.BoxGeometry(bp.gateHalf * 2 + 0.4, 0.05, 4.0), apronMat);
    ap.position.set(0, 0.2, sz);
    g.add(ap);
  }
  for (const sx of [-hw + 2.1, hw - 2.1]) {
    const ap = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.05, bp.gateHalf * 2 + 0.4), apronMat);
    ap.position.set(sx, 0.2, 0);
    g.add(ap);
  }

  // Layer 3: Timber-bordered cedar woodchip mulch safety pits under Fort, Swings, and Dome (y = 0.24)
  const addMulchPit = (px: number, pz: number, pw: number, pd: number) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.36, 0.12, pd + 0.36), timberMat);
    frame.position.set(px, 0.25, pz);
    g.add(frame);
    const fill = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.13, pd), mulchMat);
    fill.position.set(px, 0.26, pz);
    fill.receiveShadow = true;
    g.add(fill);
  };
  addMulchPit(bp.fort.x - 0.5, bp.fort.z + 1.4, 6.2, 7.6);
  addMulchPit(6.5, -5.0, 7.4, 4.4);
  addMulchPit(bp.dome.x, bp.dome.z, 6.0, 6.0);

  // Layer 4: Full 4-sided brick knee-wall + wrought-iron safety fence + brick gate piers
  addMasonryAndIronFence(g, bp.wallSegments, brickMat, capMat, ironMat, 0.58, 1.45);
  for (const gp of bp.gatePiers) {
    addLimestoneGatePier(g, gp.x, gp.z, 1.85, true, brickMat, capMat, bronzeMat, lanternMat);
  }
  for (const cp of bp.cornerPiers) {
    addLimestoneGatePier(g, cp.x, cp.z, 1.65, false, brickMat, capMat, bronzeMat, lanternMat);
  }

  // Layer 5a: Multi-Tier Wooden & Steel Adventure Fort + Guardrails + Stairs + Contoured Slide
  const fort = new THREE.Group();
  fort.position.set(bp.fort.x, 0.3, bp.fort.z);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.2, 2.7), timberMat);
  deck.position.y = 2.25;
  fort.add(deck);
  const lowerPlatform = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 2.6), bluePlayMat);
  lowerPlatform.position.y = 0.92;
  fort.add(lowerPlatform);

  for (const [px, pz] of [
    [-1.25, -1.25],
    [1.25, -1.25],
    [-1.25, 1.25],
    [1.25, 1.25],
  ]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.15, 0.18), timberMat);
    post.position.set(px, 2.08, pz);
    fort.add(post);
  }
  // Safety guardrails around deck (leaving south slide exit & west stair entry open)
  const northRail = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.85, 0.12), bluePlayMat);
  northRail.position.set(0, 2.78, -1.25);
  fort.add(northRail);
  const eastRail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 2.5), bluePlayMat);
  eastRail.position.set(1.25, 2.78, 0);
  fort.add(eastRail);
  // Safety crossbar over slide entrance
  const slideBar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8), steelMat);
  slideBar.rotation.z = Math.PI / 2;
  slideBar.position.set(0, 3.1, 1.25);
  fort.add(slideBar);

  // Gabled playhouse canopy roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.25, 1.35, 4), yellowPlayMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 4.78;
  fort.add(roof);

  // Stepped climbing stairs with twin safety handrails on West side (matches bp.stairs!)
  for (let s = 0; s < 4; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 1.28), timberMat);
    step.position.set(-2.55 + s * 0.4, 0.3 + s * 0.52, 0);
    fort.add(step);
  }
  for (const hz of [-0.66, 0.66]) {
    const handRail = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.08), redPlayMat);
    handRail.position.set(-2.05, 1.65, hz);
    handRail.rotation.z = 0.88;
    fort.add(handRail);
  }

  // Contoured high-sidewall slide chute projecting South (matches bp.slide!)
  const chute = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.12, 4.15), redPlayMat);
  chute.position.set(0, 1.22, 3.05);
  chute.rotation.x = 0.56;
  fort.add(chute);
  for (const sx of [-0.54, 0.54]) {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 4.18), yellowPlayMat);
    sideWall.position.set(sx, 1.35, 3.05);
    sideWall.rotation.x = 0.56;
    fort.add(sideWall);
  }
  g.add(fort);

  // Layer 5b: Reinforced Dual A-Frame Swing Set with Rubber Landing Pads
  const crossBar = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 6.4, 7), bluePlayMat);
  crossBar.rotation.z = Math.PI / 2;
  crossBar.position.set(6.5, 3.65, -5.0);
  g.add(crossBar);
  for (const sx of [3.5, 9.5]) {
    for (const rz of [-0.36, 0.36]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 3.9, 6), steelMat);
      leg.position.set(sx, 1.9, -5.0 + rz * 2.5);
      leg.rotation.x = rz;
      g.add(leg);
    }
  }
  const rubberBlackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
  for (const seatX of [5.15, 7.85]) {
    for (const chainOff of [-0.34, 0.34]) {
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.6, 5), steelMat);
      chain.position.set(seatX + chainOff, 2.3, -5.0);
      g.add(chain);
    }
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.08, 0.34), rubberBlackMat);
    seat.position.set(seatX, 1.0, -5.0);
    g.add(seat);
    const wearMat = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.04, 1.8), rubberBlackMat);
    wearMat.position.set(seatX, 0.34, -5.0);
    g.add(wearMat);
  }

  // Layer 5c: Solid Multi-Bar Geodesic Climbing Dome with Colored Grip Nodes
  const domeGroup = new THREE.Group();
  domeGroup.position.set(bp.dome.x, 0.32, bp.dome.z);
  const domeR = bp.dome.radius - 0.1;
  // Base steel anchor ring + mid & top horizontal rings + 4 arched tubular ribs
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(domeR, 0.07, 6, 14), steelMat);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.06;
  domeGroup.add(baseRing);
  const midRing = new THREE.Mesh(new THREE.TorusGeometry(domeR * 0.78, 0.055, 6, 12), tealPlayMat);
  midRing.rotation.x = Math.PI / 2;
  midRing.position.y = 1.25;
  domeGroup.add(midRing);
  const topRing = new THREE.Mesh(new THREE.TorusGeometry(domeR * 0.38, 0.05, 6, 10), yellowPlayMat);
  topRing.rotation.x = Math.PI / 2;
  topRing.position.y = 2.02;
  domeGroup.add(topRing);
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI;
    const arch = new THREE.Mesh(new THREE.TorusGeometry(domeR, 0.055, 6, 12, Math.PI), bluePlayMat);
    arch.rotation.y = ang;
    domeGroup.add(arch);
  }
  // Colored climbing grip holds at dome intersections
  const gripMats = [redPlayMat, yellowPlayMat, tealPlayMat];
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const grip = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), gripMats[i % 3]);
    grip.position.set(Math.cos(ang) * domeR * 0.78, 1.25, Math.sin(ang) * domeR * 0.78);
    domeGroup.add(grip);
  }
  g.add(domeGroup);

  // Layer 5d: Classic Seesaw with Tire Bumpers + 2 Spring Riders
  const seesawGroup = new THREE.Group();
  seesawGroup.position.set(bp.seesaw.x, 0.24, bp.seesaw.z);
  const fulcrum = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.38, 0.72, 8), steelMat);
  fulcrum.position.y = 0.36;
  seesawGroup.add(fulcrum);
  const plank = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.14, 0.42), redPlayMat);
  plank.position.y = 0.78;
  plank.rotation.z = 0.13;
  seesawGroup.add(plank);
  for (const sx of [-1.75, 1.75]) {
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.1, 6, 12), rubberBlackMat);
    tire.rotation.x = Math.PI / 2;
    tire.position.set(sx, 0.1, 0);
    seesawGroup.add(tire);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.32, 6), yellowPlayMat);
    handle.position.set(sx * 0.76, 0.96 + (sx > 0 ? 0.18 : -0.18), 0);
    seesawGroup.add(handle);
  }
  g.add(seesawGroup);

  bp.springRiders.forEach((sr, idx) => {
    const rider = new THREE.Group();
    rider.position.set(sr.x, 0.24, sr.z);
    const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.42, 8), steelMat);
    coil.position.y = 0.21;
    rider.add(coil);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.36, 0.28),
      idx % 2 === 0 ? yellowPlayMat : tealPlayMat,
    );
    body.position.y = 0.62;
    rider.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.22), redPlayMat);
    head.position.set(0.32, 0.88, 0);
    rider.add(head);
    g.add(rider);
  });

  // Shade trees in stone pits, benches, lamps
  for (const t of bp.trees) addTreeWithStonePit(g, t.x, t.z, t.scale);
  for (const b of bp.benches) {
    addDetailedParkBench(g, b.x, b.z, b.rotY);
  }
  for (const [lx, lz] of [
    [-hw + 2.6, -hd + 2.6],
    [hw - 2.6, -hd + 2.6],
    [-hw + 2.6, hd - 2.6],
    [hw - 2.6, hd - 2.6],
  ]) {
    addCentralParkLamp(g, lx, lz);
  }

  return mergeStaticGroupByMaterial(g);
}

// ============================================================================
// 3. MULTI-LAYERED NYC CAGE COURTS (Harlem Rucker & West 4th St Cage)
// ============================================================================

export function createLayeredCourtMesh(zone: RecreationZoneDef): THREE.Group {
  const g = new THREE.Group();
  g.position.set(zone.cx, 0, zone.cz);
  const bp = getCourtLayoutBlueprint(zone);
  const hw = zone.width * 0.5;
  const hd = zone.depth * 0.5;

  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x8e959c, roughness: 0.85 });
  const blacktopMat = new THREE.MeshStandardMaterial({ map: getBlacktopTexture(), roughness: 0.84 });
  const galvSteelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.38, metalness: 0.78 });
  const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.42, metalness: 0.72 });
  const chainLinkMat = new THREE.MeshStandardMaterial({
    map: getChainLinkFenceTexture(),
    transparent: true,
    alphaTest: 0.25,
    side: THREE.DoubleSide,
    roughness: 0.4,
    metalness: 0.65,
  });
  const windscreenMat = new THREE.MeshStandardMaterial({
    color: 0x14532d,
    roughness: 0.88,
    side: THREE.DoubleSide,
  });
  const aluminumMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.34, metalness: 0.68 });
  const safetyYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });

  // Layer 1: Raised concrete perimeter foundation slab (y = 0..0.14)
  const slab = new THREE.Mesh(new THREE.BoxGeometry(zone.width, 0.14, zone.depth), concreteMat);
  slab.position.y = 0.07;
  slab.receiveShadow = true;
  g.add(slab);

  // Layer 2: Textured NYC blacktop asphalt court deck (y = 0.15..0.18)
  const blacktop = new THREE.Mesh(
    new THREE.BoxGeometry(zone.width - 1.1, 0.05, zone.depth - 1.1),
    blacktopMat,
  );
  blacktop.position.y = 0.165;
  blacktop.receiveShadow = true;
  g.add(blacktop);

  // Layer 3: Championship Basketball Court (z = -8.5) + Hardcourt Tennis Court (z = +11.2, clear of streetball crease!)
  const bballCourt = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 13.4),
    new THREE.MeshStandardMaterial({ map: createCourtSurfaceTexture('basketball'), roughness: 0.72 }),
  );
  bballCourt.rotation.x = -Math.PI / 2;
  bballCourt.position.set(0, 0.205, -8.5);
  bballCourt.receiveShadow = true;
  g.add(bballCourt);

  const tennisCourt = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 9.2),
    new THREE.MeshStandardMaterial({ map: createCourtSurfaceTexture('tennis'), roughness: 0.76 }),
  );
  tennisCourt.rotation.x = -Math.PI / 2;
  tennisCourt.position.set(0, 0.205, 11.2);
  tennisCourt.receiveShadow = true;
  g.add(tennisCourt);

  // Layer 4: Full 4-Sided 3.6m NYC Chain-Link Cage Enclosure with Open Walk-In Portal Gates
  const fenceH = 3.55;
  for (const seg of bp.fenceSegments) {
    const isEW = seg.axis === 'ew';
    const len = isEW ? seg.width : seg.depth;

    // Continuous concrete cage curb
    const curb = new THREE.Mesh(
      new THREE.BoxGeometry(isEW ? len : 0.34, 0.28, isEW ? 0.34 : len),
      concreteMat,
    );
    curb.position.set(seg.x, 0.26, seg.z);
    g.add(curb);

    // Top, mid & bottom galvanized tension rails
    for (const ry of [0.45, 1.95, fenceH]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(isEW ? len : 0.07, 0.07, isEW ? 0.07 : len),
        galvSteelMat,
      );
      rail.position.set(seg.x, ry, seg.z);
      g.add(rail);
    }

    // Galvanized fence line posts
    const postCount = Math.max(3, Math.floor(len / 4.5) + 1);
    for (let i = 0; i < postCount; i++) {
      const t = postCount === 1 ? 0 : i / (postCount - 1) - 0.5;
      const off = t * len;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, fenceH, 6), galvSteelMat);
      post.position.set(isEW ? seg.x + off : seg.x, fenceH * 0.5 + 0.14, isEW ? seg.z : seg.z + off);
      g.add(post);
    }

    // Semi-transparent diamond chain-link mesh sheet
    const meshPlane = new THREE.Mesh(new THREE.PlaneGeometry(len, fenceH - 0.35), chainLinkMat);
    meshPlane.position.set(seg.x, 0.35 + (fenceH - 0.35) * 0.5, seg.z);
    if (!isEW) meshPlane.rotation.y = Math.PI / 2;
    g.add(meshPlane);

    // Dark-green tennis windscreen strapped to lower half of South court segments
    if (seg.z > 10 || (!isEW && seg.z > 4)) {
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(len - 0.3, 1.65), windscreenMat);
      screen.position.set(
        isEW ? seg.x : seg.x + (seg.x > 0 ? -0.05 : 0.05),
        1.25,
        isEW ? seg.z - 0.05 : seg.z,
      );
      if (!isEW) screen.rotation.y = Math.PI / 2;
      g.add(screen);
    }
  }

  // Open Walk-In Cage Gate Portals with Overhead Steel Crossbars & Iconic NYC Cage Sign Plaques!
  const gateSpan = bp.gateHalf * 2 + 0.7;
  const edgeX = hw - bp.inset;
  const edgeZ = hd - bp.inset;
  const plaqueTex = createGatePlaqueTexture(
    zone.id.includes('rucker') ? 'RUCKER PARK CAGE' : 'WEST 4TH ST · THE CAGE',
    'NYC PARKS STREETBALL & TENNIS',
    '#0f2557',
  );
  const plaqueMat = new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.45 });

  for (const gp of bp.gatePosts) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, fenceH + 0.25, 8), darkSteelMat);
    post.position.set(gp.x, (fenceH + 0.25) * 0.5 + 0.14, gp.z);
    g.add(post);
  }
  // Overhead gate crossbars on N, S, E, W (y = 3.65m — players walk smoothly underneath!)
  for (const sz of [-edgeZ, edgeZ]) {
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(gateSpan, 0.18, 0.18), darkSteelMat);
    lintel.position.set(0, fenceH + 0.22, sz);
    g.add(lintel);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.78, 0.12), plaqueMat);
    sign.position.set(0, fenceH + 0.66, sz);
    g.add(sign);
  }
  for (const sx of [-edgeX, edgeX]) {
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, gateSpan), darkSteelMat);
    lintel.position.set(sx, fenceH + 0.22, 0);
    g.add(lintel);
  }

  // Layer 5a: Gooseneck Basketball Stanchions with Padded Poles, Glass Backboards & White Nets
  const padMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.7 });
  const glassBoardMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    transparent: true,
    opacity: 0.56,
    roughness: 0.12,
    metalness: 0.2,
  });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3, metalness: 0.65 });
  const netMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    wireframe: true,
    transparent: true,
    opacity: 0.85,
  });

  for (const hp of bp.hoopPoles) {
    const sign = hp.x < 0 ? 1 : -1;
    const hoop = new THREE.Group();
    hoop.position.set(hp.x, 0.18, hp.z);

    // Concrete footing + padded vertical steel pole + cantilevered gooseneck arm
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.24, 0.68), concreteMat);
    foot.position.y = 0.12;
    hoop.add(foot);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 3.65, 10), darkSteelMat);
    pole.position.y = 1.9;
    hoop.add(pole);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.85, 10), padMat);
    pad.position.y = 1.15;
    hoop.add(pad);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.12, 0.12), darkSteelMat);
    arm.position.set(sign * 0.38, 3.45, 0);
    hoop.add(arm);

    // Steel-framed acrylic glass backboard + orange rim + net basket
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.32, 1.98), darkSteelMat);
    frame.position.set(sign * 0.72, 3.45, 0);
    hoop.add(frame);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.18, 1.84), glassBoardMat);
    glass.position.set(sign * 0.72, 3.45, 0);
    hoop.add(glass);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.036, 8, 16), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(sign * 1.06, 3.08, 0);
    hoop.add(rim);
    const net = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.16, 0.48, 10, 2, true), netMat);
    net.position.set(sign * 1.06, 2.84, 0);
    hoop.add(net);

    g.add(hoop);
  }

  // Layer 5b: Pro Tennis Net with Steel Crank Posts & Crisp White Top Tape
  const netH = 1.06;
  const netSpan = bp.tennisNet.depth;
  const netBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, netH, netSpan),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, transparent: true, opacity: 0.72 }),
  );
  netBody.position.set(bp.tennisNet.x, 0.2 + netH * 0.5, bp.tennisNet.z);
  g.add(netBody);
  const netTape = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.1, netSpan + 0.06),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
  );
  netTape.position.set(bp.tennisNet.x, 0.2 + netH, bp.tennisNet.z);
  g.add(netTape);
  for (const nz of [bp.tennisNet.z - netSpan * 0.5, bp.tennisNet.z + netSpan * 0.5]) {
    const np = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 1.24, 8), darkSteelMat);
    np.position.set(bp.tennisNet.x, 0.8, nz);
    g.add(np);
  }

  // Layer 5c: 4-Tier Aluminum Spectator Bleachers with Support Risers & Safety Guardrails
  const bl = new THREE.Group();
  bl.position.set(bp.bleachers.x, 0.18, bp.bleachers.z);
  const bLen = bp.bleachers.depth;
  for (let tier = 0; tier < 4; tier++) {
    const tx = -0.82 + tier * 0.55;
    const ty = 0.36 + tier * 0.42;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, bLen), aluminumMat);
    seat.position.set(tx, ty, 0);
    bl.add(seat);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, bLen), concreteMat);
    foot.position.set(tx - 0.12, ty - 0.22, 0);
    bl.add(foot);
  }
  // Structural steel undercarriage risers
  for (const rz of [-bLen * 0.4, 0, bLen * 0.4]) {
    const riser = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.9, 0.12), darkSteelMat);
    riser.position.set(0.05, 0.45, rz);
    bl.add(riser);
  }
  // Rear & side tubular safety guardrails
  const backRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, bLen), safetyYellowMat);
  backRail.position.set(1.06, 2.38, 0);
  bl.add(backRail);
  for (let p = -1; p <= 1; p++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.35, 6), darkSteelMat);
    post.position.set(1.06, 1.18, p * (bLen * 0.42));
    bl.add(post);
  }
  g.add(bl);

  // Layer 5d: Courtside Team Benches + Orange Water Cooler Jugs
  const coolerMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 });
  const lidMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  for (const sb of bp.sidelineBenches) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.09, sb.depth), aluminumMat);
    bench.position.set(sb.x, 0.62, sb.z);
    g.add(bench);
    for (const lz of [-sb.depth * 0.36, sb.depth * 0.36]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.44, 0.1), darkSteelMat);
      leg.position.set(sb.x, 0.38, sb.z + lz);
      g.add(leg);
    }
    // Courtside water cooler beside bench
    const jug = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.46, 8), coolerMat);
    jug.position.set(sb.x, 0.44, sb.z + sb.depth * 0.5 + 0.42);
    g.add(jug);
    const jugLid = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.08, 8), lidMat);
    jugLid.position.set(sb.x, 0.7, sb.z + sb.depth * 0.5 + 0.42);
    g.add(jugLid);
  }

  // Layer 5e: 4 Tall Galvanized Stadium-Grade LED Court Light Masts
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: 0xffe49e,
    emissiveIntensity: 1.9,
    roughness: 0.2,
  });
  for (const lm of bp.lightMasts) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.75, 6), concreteMat);
    base.position.set(lm.x, 0.52, lm.z);
    g.add(base);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 8.6, 6), galvSteelMat);
    pole.position.set(lm.x, 4.6, lm.z);
    g.add(pole);
    const crossArm = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.16, 0.16), darkSteelMat);
    crossArm.position.set(lm.x, 8.85, lm.z);
    crossArm.rotation.y = Math.atan2(-lm.x, -lm.z);
    g.add(crossArm);
    const lamps = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.36, 0.28), ledMat);
    lamps.position.set(lm.x, 8.75, lm.z);
    lamps.rotation.y = Math.atan2(-lm.x, -lm.z);
    g.add(lamps);
  }

  return mergeStaticGroupByMaterial(g);
}

// ============================================================================
// 4. WASHINGTON SQUARE MARBLE ARCH MULTI-LAYERED CIVIC PLAZA
// ============================================================================

export function createWashingtonSquarePlazaMesh(): THREE.Group {
  const g = new THREE.Group();
  g.position.set(0, 0, -86);

  const cobbleMat = new THREE.MeshStandardMaterial({
    map: getPlazaCobbleTexture(),
    color: 0xd4ccbe,
    roughness: 0.8,
  });
  const graniteTrimMat = new THREE.MeshStandardMaterial({ color: 0x9b9284, roughness: 0.84 });
  const medallionMat = new THREE.MeshStandardMaterial({ color: 0xbcb2a2, roughness: 0.75 });
  const soilMat = new THREE.MeshStandardMaterial({ map: getWoodMulchTexture(), roughness: 0.96 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1c2824, roughness: 0.45, metalness: 0.72 });

  // Layer 1: Textured Belgian-block granite plaza deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(46, 0.08, 36), cobbleMat);
  deck.position.y = 0.04;
  deck.receiveShadow = true;
  g.add(deck);

  // Layer 2: Decorative concentric limestone medallion ring right under/south of the Arch
  const ringOuter = new THREE.Mesh(new THREE.RingGeometry(6.8, 8.4, 32), graniteTrimMat);
  ringOuter.rotation.x = -Math.PI / 2;
  ringOuter.position.set(0, 0.095, -4);
  g.add(ringOuter);

  const ringInner = new THREE.Mesh(new THREE.RingGeometry(4.4, 5.2, 28), medallionMat);
  ringInner.rotation.x = -Math.PI / 2;
  ringInner.position.set(0, 0.095, -4);
  g.add(ringInner);

  // Layer 3: Raised granite tree-pit curbs with iron tree-guards around the 8 Arch framing elms
  // (World coords: x = ±18, ±11.5, z = -76 & -101 -> local z = +10 & -15)
  for (const tx of [-18, -11.5, 11.5, 18]) {
    for (const tz of [10, -15]) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.24, 2.3), graniteTrimMat);
      curb.position.set(tx, 0.14, tz);
      g.add(curb);
      const soil = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.26, 1.95), soilMat);
      soil.position.set(tx, 0.15, tz);
      g.add(soil);
      // Low decorative iron corner tree-guard rail
      const guard = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.05, 2.1), ironMat);
      guard.position.set(tx, 0.46, tz);
      g.add(guard);
    }
  }

  return mergeStaticGroupByMaterial(g);
}
