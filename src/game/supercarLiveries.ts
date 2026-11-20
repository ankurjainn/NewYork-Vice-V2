import * as THREE from 'three';

export type DecalStyle =
  | 'twin_stripe'
  | 'carbon_hood'
  | 'vice_cyber'
  | 'gt_slash'
  | 'clean_metallic';

export interface SupercarLivery {
  id: string;
  name: string;
  bodyHex: number;
  accentHex: number;
  stripeCss: string;
  bodyCss: string;
  caliperHex: number;
  rimHex: number;
  decalStyle: DecalStyle;
  raceNumber?: string;
}

export const SUPERCAR_LIVERIES: readonly SupercarLivery[] = [
  {
    id: 'rosso_corsa',
    name: 'Rosso Corsa GT',
    bodyHex: 0xdc1c2e,
    accentHex: 0xf8fafc,
    bodyCss: '#dc1c2e',
    stripeCss: '#f8fafc',
    caliperHex: 0xfacc15,
    rimHex: 0x1e222b,
    decalStyle: 'twin_stripe',
    raceNumber: '07',
  },
  {
    id: 'miami_vice_cyan',
    name: 'Miami Vice Cyan',
    bodyHex: 0x06b6d4,
    accentHex: 0xf43f8e,
    bodyCss: '#06b6d4',
    stripeCss: '#f43f8e',
    caliperHex: 0xf43f8e,
    rimHex: 0xe2e8f0,
    decalStyle: 'vice_cyber',
    raceNumber: '86',
  },
  {
    id: 'verde_mantis',
    name: 'Verde Mantis Lime',
    bodyHex: 0x5ee619,
    accentHex: 0x14171d,
    bodyCss: '#5ee619',
    stripeCss: '#14171d',
    caliperHex: 0x84cc16,
    rimHex: 0x15181f,
    decalStyle: 'carbon_hood',
    raceNumber: '24',
  },
  {
    id: 'sunset_mclaren',
    name: 'Papaya Sunset GT',
    bodyHex: 0xf96316,
    accentHex: 0x151922,
    bodyCss: '#f96316',
    stripeCss: '#151922',
    caliperHex: 0xf97316,
    rimHex: 0x1c2028,
    decalStyle: 'gt_slash',
    raceNumber: '04',
  },
  {
    id: 'midnight_amethyst',
    name: 'Midnight Amethyst',
    bodyHex: 0x7c3aed,
    accentHex: 0xfbbf24,
    bodyCss: '#7c3aed',
    stripeCss: '#fbbf24',
    caliperHex: 0xfbbf24,
    rimHex: 0xd4a843,
    decalStyle: 'twin_stripe',
    raceNumber: '99',
  },
  {
    id: 'pearl_motorsport',
    name: 'Pearl White Aero',
    bodyHex: 0xf1f5f9,
    accentHex: 0xe11d48,
    bodyCss: '#f1f5f9',
    stripeCss: '#e11d48',
    caliperHex: 0xe11d48,
    rimHex: 0x181c24,
    decalStyle: 'gt_slash',
    raceNumber: '11',
  },
  {
    id: 'stealth_obsidian',
    name: 'Stealth Carbon Acid',
    bodyHex: 0x191d26,
    accentHex: 0xd9f99d,
    bodyCss: '#191d26',
    stripeCss: '#bef264',
    caliperHex: 0xbef264,
    rimHex: 0x11141a,
    decalStyle: 'vice_cyber',
    raceNumber: '01',
  },
  {
    id: 'electric_cobalt',
    name: 'Electric Cobalt',
    bodyHex: 0x2563eb,
    accentHex: 0xe2e8f0,
    bodyCss: '#2563eb',
    stripeCss: '#e2e8f0',
    caliperHex: 0x38bdf8,
    rimHex: 0xdbeafe,
    decalStyle: 'twin_stripe',
    raceNumber: '66',
  },
  {
    id: 'solar_gold',
    name: 'Solar Gold Carbon',
    bodyHex: 0xeab308,
    accentHex: 0x18181b,
    bodyCss: '#eab308',
    stripeCss: '#18181b',
    caliperHex: 0xef4444,
    rimHex: 0x18181b,
    decalStyle: 'carbon_hood',
    raceNumber: '77',
  },
  {
    id: 'hot_pink_vice',
    name: 'Vice Flamingo Pink',
    bodyHex: 0xec4899,
    accentHex: 0xffffff,
    bodyCss: '#ec4899',
    stripeCss: '#ffffff',
    caliperHex: 0xfef08a,
    rimHex: 0xf8fafc,
    decalStyle: 'vice_cyber',
    raceNumber: '06',
  },
] as const;

export function getSupercarLivery(index: number): SupercarLivery {
  const safe = ((Math.floor(index) % SUPERCAR_LIVERIES.length) + SUPERCAR_LIVERIES.length) % SUPERCAR_LIVERIES.length;
  return SUPERCAR_LIVERIES[safe];
}

const hoodDecalCache = new Map<string, THREE.CanvasTexture>();
const sideDecalCache = new Map<string, THREE.CanvasTexture>();

/**
 * Cached procedural hood/roof racing-stripe & carbon-weave decal texture.
 */
export function getHoodDecalTexture(livery: SupercarLivery): THREE.CanvasTexture | null {
  if (typeof document === 'undefined' || livery.decalStyle === 'clean_metallic') return null;
  const cached = hoodDecalCache.get(livery.id);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 256, 256);

  if (livery.decalStyle === 'twin_stripe') {
    // Classic twin Le Mans racing stripes with thin outer pinstripes
    ctx.fillStyle = livery.stripeCss;
    ctx.fillRect(88, 0, 28, 256);
    ctx.fillRect(140, 0, 28, 256);
    ctx.fillRect(76, 0, 6, 256);
    ctx.fillRect(174, 0, 6, 256);
  } else if (livery.decalStyle === 'carbon_hood') {
    // Exposed matte carbon-fiber weave hood center panel + sharp edge pinstripes
    ctx.fillStyle = '#14171f';
    ctx.fillRect(40, 0, 176, 256);
    ctx.fillStyle = '#232836';
    for (let y = 0; y < 256; y += 8) {
      for (let x = 40; x < 216; x += 8) {
        if (((x + y) / 8) % 2 === 0) {
          ctx.fillRect(x, y, 4, 4);
        }
      }
    }
    ctx.fillStyle = livery.bodyCss;
    ctx.fillRect(34, 0, 6, 256);
    ctx.fillRect(216, 0, 6, 256);
    // Hood vent louvers
    ctx.fillStyle = '#090b10';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(62, 76 + i * 22, 44, 9);
      ctx.fillRect(150, 76 + i * 22, 44, 9);
    }
  } else if (livery.decalStyle === 'vice_cyber') {
    // Bold Vice City asymmetric neon stripe + geometric chevron
    ctx.fillStyle = livery.stripeCss;
    ctx.fillRect(98, 0, 18, 256);
    ctx.fillRect(124, 0, 44, 256);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(172, 0, 6, 256);
  } else if (livery.decalStyle === 'gt_slash') {
    // Broad center GT band with angled front aero arrow & race number roundel
    ctx.fillStyle = livery.stripeCss;
    ctx.fillRect(94, 0, 68, 256);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(128, 134, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#11141c';
    ctx.font = '900 34px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(livery.raceNumber ?? '01', 128, 136);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  hoodDecalCache.set(livery.id, tex);
  return tex;
}

/**
 * Cached procedural side-door motorsport swoosh, aero intake graphic & race number plate.
 */
export function getSideDecalTexture(livery: SupercarLivery): THREE.CanvasTexture | null {
  if (typeof document === 'undefined' || livery.decalStyle === 'clean_metallic') return null;
  const cached = sideDecalCache.get(livery.id);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 256, 128);

  if (livery.decalStyle === 'vice_cyber') {
    // Dynamic neon Vice City swoosh + checkered speed tail
    ctx.fillStyle = livery.stripeCss;
    ctx.beginPath();
    ctx.moveTo(14, 96);
    ctx.lineTo(238, 42);
    ctx.lineTo(246, 66);
    ctx.lineTo(22, 114);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(36, 76);
    ctx.lineTo(214, 30);
    ctx.lineTo(218, 38);
    ctx.lineTo(40, 84);
    ctx.closePath();
    ctx.fill();
  } else if (livery.decalStyle === 'gt_slash') {
    // Motorsport double diagonal slash + white race number badge
    ctx.fillStyle = livery.stripeCss;
    ctx.beginPath();
    ctx.moveTo(18, 118);
    ctx.lineTo(86, 16);
    ctx.lineTo(126, 16);
    ctx.lineTo(58, 118);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(74, 118);
    ctx.lineTo(142, 16);
    ctx.lineTo(158, 16);
    ctx.lineTo(90, 118);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(156, 26, 64, 62);
    ctx.fillStyle = '#11141c';
    ctx.font = '900 36px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(livery.raceNumber ?? '04', 188, 59);
  } else if (livery.decalStyle === 'twin_stripe') {
    // Lower rocker racing stripe + subtle GT badge
    ctx.fillStyle = livery.stripeCss;
    ctx.fillRect(12, 82, 232, 18);
    ctx.fillRect(12, 106, 232, 6);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 26px "JetBrains Mono", sans-serif';
    ctx.fillText('GT', 184, 72);
  } else if (livery.decalStyle === 'carbon_hood') {
    // Matte carbon side aero intake blade + contrast stripe
    ctx.fillStyle = '#14171f';
    ctx.beginPath();
    ctx.moveTo(10, 86);
    ctx.lineTo(182, 54);
    ctx.lineTo(234, 96);
    ctx.lineTo(20, 116);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = livery.bodyCss;
    ctx.fillRect(28, 96, 188, 6);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  sideDecalCache.set(livery.id, tex);
  return tex;
}
