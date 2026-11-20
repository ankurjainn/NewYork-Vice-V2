import * as THREE from 'three';
import type { BuildingArchVariant, BuildingCollider, ParkSportKind, StreetStallDef } from './types';

// Shared geometry caches to keep memory and draw setup ultra-fast
const facadeTexCache = new Map<string, THREE.CanvasTexture>();
const sharedMatCache = new Map<string, THREE.MeshStandardMaterial>();
const billboardTexCache = new Map<string, THREE.CanvasTexture>();

function getStdMat(
  key: string,
  params: THREE.MeshStandardMaterialParameters,
): THREE.MeshStandardMaterial {
  let m = sharedMatCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial(params);
    sharedMatCache.set(key, m);
  }
  return m;
}

/**
 * Generates distinct high-contrast architectural NYC facade textures per archVariant.
 */
export function createNycFacadeTexture(
  variant: BuildingArchVariant,
  baseHex: number,
  accentHex: number,
): THREE.CanvasTexture {
  const key = `${variant}_${baseHex.toString(16)}_${accentHex.toString(16)}`;
  const cached = facadeTexCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const base = '#' + baseHex.toString(16).padStart(6, '0');
  const accent = '#' + accentHex.toString(16).padStart(6, '0');

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 512);

  if (variant === 'glass_supertall') {
    // Sleek curtain-wall reflective blue-silver glass mullion grid with golden sky-lobby band
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#3a668a');
    grad.addColorStop(0.45, base);
    grad.addColorStop(1, '#142638');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 512);

    for (let y = 8; y < 504; y += 22) {
      for (let x = 6; x < 250; x += 28) {
        const lit = ((x * 7 + y * 13) % 11) < 4;
        ctx.fillStyle = lit ? 'rgba(254, 240, 180, 0.72)' : 'rgba(135, 195, 235, 0.34)';
        ctx.fillRect(x, y, 22, 16);
      }
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.fillRect(0, y + 17, 256, 4);
    }
    // Diagonal structural cross-bracing accent
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.22)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(256, 256);
    ctx.moveTo(256, 0);
    ctx.lineTo(0, 256);
    ctx.moveTo(0, 256);
    ctx.lineTo(256, 512);
    ctx.stroke();

    // Glowing sky lobby band
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.75;
    ctx.fillRect(0, 246, 256, 12);
    ctx.globalAlpha = 1;
  } else if (variant === 'artdeco_spire' || variant === 'flatiron_wedge') {
    // Vertical limestone pilasters + recessed warm art-deco bronze spandrel windows
    ctx.fillStyle = 'rgba(255, 250, 240, 0.14)';
    for (let x = 0; x < 256; x += 32) {
      ctx.fillRect(x, 0, 10, 512);
    }
    for (let y = 16; y < 490; y += 28) {
      for (let x = 12; x < 244; x += 32) {
        const lit = ((x * 5 + y * 11) % 7) < 3;
        ctx.fillStyle = '#3b332b';
        ctx.fillRect(x - 1, y - 1, 20, 20);
        ctx.fillStyle = lit ? '#fde68a' : '#4a5d6e';
        ctx.fillRect(x + 1, y + 1, 16, 16);
      }
      // Bronze spandrel bar
      ctx.fillStyle = '#6c5a44';
      ctx.fillRect(0, y + 20, 256, 4);
    }
    // Art Deco crown chevron band at top
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 256, 10);
  } else if (variant === 'brownstone') {
    // Warm carved brownstone masonry courses + arched parlor windows with white lintels
    ctx.strokeStyle = 'rgba(30, 14, 10, 0.25)';
    ctx.lineWidth = 2;
    for (let y = 0; y < 512; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
    for (let y = 36; y < 460; y += 84) {
      for (let x = 22; x < 230; x += 68) {
        // Ornate stone lintel
        ctx.fillStyle = '#c8a890';
        ctx.fillRect(x - 4, y - 8, 44, 7);
        // Tall sash window
        ctx.fillStyle = '#1f1916';
        ctx.fillRect(x, y, 36, 54);
        const lit = ((x + y) % 5) < 3;
        ctx.fillStyle = lit ? '#fcd992' : '#32404d';
        ctx.fillRect(x + 3, y + 3, 30, 48);
        // Window muntin crossbars
        ctx.fillStyle = '#f5efe6';
        ctx.fillRect(x + 17, y + 3, 2, 48);
        ctx.fillRect(x + 3, y + 25, 30, 2);
        // Stone sill
        ctx.fillStyle = '#c8a890';
        ctx.fillRect(x - 4, y + 54, 44, 5);
      }
    }
  } else if (variant === 'tenement_fireescape' || variant === 'dumbo_warehouse') {
    // Classic NYC red/terracotta brick texture + dark factory/tenement sash windows
    for (let row = 0; row < 64; row++) {
      const y = row * 8;
      ctx.fillStyle = row % 2 === 0 ? 'rgba(0,0,0,0.08)' : 'rgba(255,220,190,0.05)';
      ctx.fillRect(0, y, 256, 7);
    }
    const stepY = variant === 'dumbo_warehouse' ? 68 : 54;
    const stepX = variant === 'dumbo_warehouse' ? 62 : 48;
    for (let y = 26; y < 470; y += stepY) {
      for (let x = 14; x < 236; x += stepX) {
        const w = variant === 'dumbo_warehouse' ? 44 : 28;
        const h = variant === 'dumbo_warehouse' ? 44 : 36;
        ctx.fillStyle = '#d6c8b8';
        ctx.fillRect(x - 2, y - 5, w + 4, 4);
        ctx.fillStyle = '#18181b';
        ctx.fillRect(x, y, w, h);
        const lit = ((x * 3 + y * 7) % 9) < 4;
        ctx.fillStyle = lit ? '#fbcf7a' : '#2c3947';
        ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
        // Industrial multi-pane mullions
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x + Math.floor(w * 0.5) - 1, y + 3, 2, h - 6);
        ctx.fillRect(x + 3, y + Math.floor(h * 0.5) - 1, w - 6, 2);
      }
    }
  } else if (variant === 'cast_iron_loft') {
    // SoHo pale cream cast-iron arched columns & giant loft windows
    for (let y = 20; y < 480; y += 76) {
      // Horizontal cornice ledge per floor
      ctx.fillStyle = '#b9afa0';
      ctx.fillRect(0, y - 8, 256, 6);
      for (let x = 14; x < 240; x += 58) {
        // Fluted column between windows
        ctx.fillStyle = '#f5f0e8';
        ctx.fillRect(x - 10, y - 4, 8, 66);
        // Arched tall studio window
        ctx.fillStyle = '#1c2430';
        ctx.fillRect(x, y, 42, 56);
        const lit = ((x + y) % 4) < 2;
        ctx.fillStyle = lit ? '#fde68a' : '#435b73';
        ctx.fillRect(x + 3, y + 4, 36, 48);
        ctx.fillStyle = '#e7e0d4';
        ctx.fillRect(x + 20, y + 4, 2, 48);
      }
    }
  } else if (variant === 'times_square_neon') {
    // Dark charcoal tower facade + bright glowing Times Square digital window bands
    for (let y = 14; y < 490; y += 26) {
      for (let x = 10; x < 246; x += 30) {
        const lit = ((x * 11 + y * 5) % 8) < 5;
        ctx.fillStyle = lit ? '#e0f2fe' : '#1e293b';
        ctx.fillRect(x, y, 22, 16);
      }
    }
    // Glowing neon ticker stripes integrated on the building skin
    ctx.fillStyle = accent;
    ctx.fillRect(0, 120, 256, 26);
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEW YORK LIVE · 24/7', 128, 139);

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, 310, 256, 22);
    ctx.fillStyle = '#082f49';
    ctx.font = '800 15px sans-serif';
    ctx.fillText('BROADWAY · MIDTOWN NYC', 128, 326);
  } else {
    // Pre-war limestone with refined recessed sash grids and stone stringcourses
    for (let y = 24; y < 480; y += 44) {
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(0, y - 5, 256, 3);
      for (let x = 16; x < 240; x += 44) {
        ctx.fillStyle = '#252b34';
        ctx.fillRect(x, y, 28, 30);
        const lit = ((x * 7 + y * 3) % 7) < 3;
        ctx.fillStyle = lit ? '#fef08a' : '#3a4f63';
        ctx.fillRect(x + 3, y + 3, 22, 24);
      }
    }
  }

  // Distinct warm street-level storefront base band
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 476, 256, 36);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 472, 256, 5);
  for (let x = 14; x < 240; x += 58) {
    ctx.fillStyle = 'rgba(254, 240, 138, 0.72)';
    ctx.fillRect(x, 482, 42, 24);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  facadeTexCache.set(key, tex);
  return tex;
}

function createNeonPanelTexture(text: string, accentHex: number): THREE.CanvasTexture {
  const key = `${text}_${accentHex.toString(16)}`;
  const cached = billboardTexCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const accent = '#' + accentHex.toString(16).padStart(6, '0');

  const grad = ctx.createLinearGradient(0, 0, 256, 128);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(0.5, accent);
  grad.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 128);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.strokeRect(5, 5, 246, 118);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.slice(0, 16), 128, 52);

  ctx.fillStyle = '#fef08a';
  ctx.font = '700 15px monospace';
  ctx.fillText('NEW YORK VICE · NYC', 128, 92);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  billboardTexCache.set(key, tex);
  return tex;
}

/**
 * Adds iconic NYC cylindrical cedar rooftop water tower on 4 steel stilts with conical tin cap.
 */
function addNycWoodenWaterTower(group: THREE.Group, x: number, roofY: number, z: number): void {
  const steelMat = getStdMat('wt_steel', { color: 0x334155, roughness: 0.7, metalness: 0.45 });
  const woodMat = getStdMat('wt_cedar', { color: 0x7c5338, roughness: 0.88 });
  const capMat = getStdMat('wt_cap', { color: 0x475569, roughness: 0.6, metalness: 0.35 });

  // 4 stilts
  for (const sx of [-0.75, 0.75]) {
    for (const sz of [-0.75, 0.75]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 5), steelMat);
      leg.position.set(x + sx, roofY + 1.1, z + sz);
      group.add(leg);
    }
  }
  // Cedar tank barrel
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.28, 2.4, 10), woodMat);
  tank.position.set(x, roofY + 3.25, z);
  group.add(tank);
  // Conical roof
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.42, 1.15, 10), capMat);
  cone.position.set(x, roofY + 5.0, z);
  group.add(cone);
}

/**
 * Builds a genuinely distinct multi-part 3D NYC building based on `b.archVariant`.
 * Returns the group + main raycast collider mesh (for camera wall pull-in).
 */
export function createVariedNycBuilding(
  b: BuildingCollider,
  castShadow: boolean,
): { group: THREE.Group; colliderMesh: THREE.Mesh; rooftopFan?: THREE.Object3D } {
  const group = new THREE.Group();
  group.position.set(b.x, 0, b.z);

  const tex = createNycFacadeTexture(b.archVariant, b.colorHex, b.accentHex);
  const facadeMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: b.archVariant === 'glass_supertall' ? 0.24 : 0.76,
    metalness: b.archVariant === 'glass_supertall' ? 0.42 : 0.08,
  });
  const roofMat = getStdMat('nyc_roof_tar', { color: 0x3b3835, roughness: 0.92 });
  const trimMat = getStdMat(`trim_${b.accentHex.toString(16)}`, {
    color: b.accentHex,
    roughness: 0.45,
    metalness: 0.2,
  });
  const stoneMat = getStdMat('nyc_limestone', { color: 0xd8cbb8, roughness: 0.8 });
  const ironMat = getStdMat('nyc_iron', { color: 0x18181b, roughness: 0.55, metalness: 0.5 });

  let colliderMesh: THREE.Mesh;
  let rooftopFan: THREE.Object3D | undefined;

  if (b.archVariant === 'artdeco_spire') {
    // 3-tier Art Deco setback skyscraper (Empire State / Chrysler silhouette) + illuminated spire!
    const h1 = b.height * 0.56;
    const h2 = b.height * 0.28;
    const h3 = b.height * 0.16;

    const base = new THREE.Mesh(new THREE.BoxGeometry(b.width, h1, b.depth), [
      facadeMat, facadeMat, roofMat, roofMat, facadeMat, facadeMat,
    ]);
    base.position.y = h1 * 0.5;
    base.castShadow = castShadow;
    base.receiveShadow = true;
    group.add(base);
    colliderMesh = base;

    const mid = new THREE.Mesh(new THREE.BoxGeometry(b.width * 0.74, h2, b.depth * 0.74), [
      facadeMat, facadeMat, roofMat, roofMat, facadeMat, facadeMat,
    ]);
    mid.position.y = h1 + h2 * 0.5;
    mid.castShadow = castShadow;
    group.add(mid);

    const crown = new THREE.Mesh(new THREE.BoxGeometry(b.width * 0.48, h3, b.depth * 0.48), [
      facadeMat, facadeMat, trimMat, roofMat, facadeMat, facadeMat,
    ]);
    crown.position.y = h1 + h2 + h3 * 0.5;
    group.add(crown);

    // Glowing Art Deco lantern collar + tall silver needle spire
    const glowMat = new THREE.MeshStandardMaterial({
      color: b.accentHex,
      emissive: b.accentHex,
      emissiveIntensity: 1.4,
      roughness: 0.25,
    });
    const lantern = new THREE.Mesh(
      new THREE.CylinderGeometry(b.width * 0.14, b.width * 0.2, 2.8, 8),
      glowMat,
    );
    lantern.position.y = b.height + 1.4;
    group.add(lantern);

    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.55, 9.5, 6),
      getStdMat('spire_steel', { color: 0xe2e8f0, metalness: 0.75, roughness: 0.25 }),
    );
    spire.position.y = b.height + 7.2;
    group.add(spire);
  } else if (b.archVariant === 'glass_supertall') {
    // Sleek modern glass tower with beveled angled crown & glowing rooftop frame
    const main = new THREE.Mesh(new THREE.BoxGeometry(b.width, b.height, b.depth), [
      facadeMat, facadeMat, roofMat, roofMat, facadeMat, facadeMat,
    ]);
    main.position.y = b.height * 0.5;
    main.castShadow = castShadow;
    main.receiveShadow = true;
    group.add(main);
    colliderMesh = main;

    // Angled glass prism crown (One WTC / Hudson Yards vibe)
    const prism = new THREE.Mesh(
      new THREE.CylinderGeometry(b.width * 0.34, b.width * 0.56, 5.2, 4),
      getStdMat('glass_crown', {
        color: 0x38bdf8,
        emissive: 0x0c4a6e,
        emissiveIntensity: 0.65,
        roughness: 0.15,
        metalness: 0.65,
      }),
    );
    prism.rotation.y = Math.PI * 0.25;
    prism.position.y = b.height + 2.6;
    group.add(prism);

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.22, 7.0, 6),
      getStdMat('spire_steel', { color: 0xe2e8f0, metalness: 0.75, roughness: 0.25 }),
    );
    mast.position.y = b.height + 8.4;
    group.add(mast);
  } else if (b.archVariant === 'brownstone') {
    // Classic NYC Brownstone with sculpted overhang cornice, protruding bay window & front stoop stairs!
    const main = new THREE.Mesh(new THREE.BoxGeometry(b.width, b.height, b.depth), [
      facadeMat, facadeMat, roofMat, roofMat, facadeMat, facadeMat,
    ]);
    main.position.y = b.height * 0.5;
    main.castShadow = castShadow;
    main.receiveShadow = true;
    group.add(main);
    colliderMesh = main;

    // Heavy carved stone roof cornice
    const cornice = new THREE.Mesh(
      new THREE.BoxGeometry(b.width + 0.9, 1.05, b.depth + 0.9),
      getStdMat('brownstone_cornice', { color: 0x5c3224, roughness: 0.85 }),
    );
    cornice.position.y = b.height + 0.45;
    group.add(cornice);

    // Front protruding parlor bay window
    const bay = new THREE.Mesh(
      new THREE.BoxGeometry(b.width * 0.44, b.height * 0.72, 1.35),
      facadeMat,
    );
    bay.position.set(-b.width * 0.18, b.height * 0.48, b.depth * 0.5 + 0.55);
    group.add(bay);

    // Classic front brownstone stoop steps + dark iron handrail
    const stoopMat = getStdMat('stoop_stone', { color: 0x8f6b58, roughness: 0.9 });
    for (let s = 0; s < 3; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.35, 0.65), stoopMat);
      step.position.set(b.width * 0.22, 0.18 + s * 0.34, b.depth * 0.5 + 1.55 - s * 0.52);
      group.add(step);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.95, 1.9), ironMat);
    rail.position.set(b.width * 0.22 + 1.35, 0.95, b.depth * 0.5 + 0.9);
    group.add(rail);
  } else if (b.archVariant === 'tenement_fireescape') {
    // Classic Lower East Side / Chinatown brick tenement with external iron zigzag fire escapes + wooden water tower!
    const main = new THREE.Mesh(new THREE.BoxGeometry(b.width, b.height, b.depth), [
      facadeMat, facadeMat, roofMat, roofMat, facadeMat, facadeMat,
    ]);
    main.position.y = b.height * 0.5;
    main.castShadow = castShadow;
    main.receiveShadow = true;
    group.add(main);
    colliderMesh = main;

    // Parapet trim
    const parapet = new THREE.Mesh(
      new THREE.BoxGeometry(b.width + 0.35, 0.65, b.depth + 0.35),
      getStdMat('brick_cap', { color: 0x5c3024, roughness: 0.9 }),
    );
    parapet.position.y = b.height + 0.3;
    group.add(parapet);

    // External black iron fire-escape balconies + diagonal zigzag stairs on front & side
    const floors = Math.min(4, Math.max(2, Math.floor(b.height / 4.2)));
    for (let fl = 1; fl <= floors; fl++) {
      const fy = fl * 3.6;
      if (fy > b.height - 1.5) break;
      const balc = new THREE.Mesh(new THREE.BoxGeometry(b.width * 0.48, 0.16, 1.15), ironMat);
      balc.position.set(0, fy, b.depth * 0.5 + 0.55);
      group.add(balc);

      const railFront = new THREE.Mesh(new THREE.BoxGeometry(b.width * 0.48, 0.72, 0.08), ironMat);
      railFront.position.set(0, fy + 0.42, b.depth * 0.5 + 1.08);
      group.add(railFront);

      if (fl < floors) {
        const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.1, 0.12), ironMat);
        ladder.position.set(fl % 2 === 0 ? -0.9 : 0.9, fy + 1.8, b.depth * 0.5 + 0.78);
        ladder.rotation.z = fl % 2 === 0 ? -0.45 : 0.45;
        group.add(ladder);
      }
    }

    // Iconic NYC wooden rooftop water tower!
    addNycWoodenWaterTower(group, b.width * 0.22, b.height, -b.depth * 0.18);
  } else if (b.archVariant === 'cast_iron_loft') {
    // SoHo cast-iron loft with ornamental columns, recessed top penthouse & classical roof pediment
    const main = new THREE.Mesh(new THREE.BoxGeometry(b.width, b.height, b.depth), [
      facadeMat, facadeMat, roofMat, roofMat, facadeMat, facadeMat,
    ]);
    main.position.y = b.height * 0.5;
    main.castShadow = castShadow;
    main.receiveShadow = true;
    group.add(main);
    colliderMesh = main;

    // Classical rooftop cornice + triangular pediment arch
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(b.width + 0.7, 0.85, b.depth + 0.7), stoneMat);
    cornice.position.y = b.height + 0.4;
    group.add(cornice);

    const pediment = new THREE.Mesh(new THREE.ConeGeometry(b.width * 0.32, 2.2, 4), stoneMat);
    pediment.rotation.y = Math.PI * 0.25;
    pediment.scale.set(1.2, 1, 0.35);
    pediment.position.set(0, b.height + 1.8, b.depth * 0.5 - 0.5);
    group.add(pediment);

    // Rooftop glass penthouse studio
    const studio = new THREE.Mesh(
      new THREE.BoxGeometry(b.width * 0.55, 2.6, b.depth * 0.55),
      getStdMat('loft_penthouse', { color: 0x334155, roughness: 0.35, metalness: 0.4 }),
    );
    studio.position.set(0, b.height + 1.5, -0.6);
    group.add(studio);
  } else if (b.archVariant === 'times_square_neon') {
    // Times Square tower wrapped in huge glowing neon LED billboards!
    const main = new THREE.Mesh(new THREE.BoxGeometry(b.width, b.height, b.depth), [
      facadeMat, facadeMat, roofMat, roofMat, facadeMat, facadeMat,
    ]);
    main.position.y = b.height * 0.5;
    main.castShadow = castShadow;
    main.receiveShadow = true;
    group.add(main);
    colliderMesh = main;

    const panelTex = createNeonPanelTexture(b.billboardText ?? 'TIMES SQUARE', b.accentHex);
    const panelMat = new THREE.MeshBasicMaterial({ map: panelTex });
    const altTex = createNeonPanelTexture('BROADWAY LIVE', 0x38bdf8);
    const altMat = new THREE.MeshBasicMaterial({ map: altTex });

    // Huge front, back & side glowing Times Square LED billboards facing all avenues
    const frontBoard = new THREE.Mesh(new THREE.BoxGeometry(b.width * 0.94, 6.8, 0.45), panelMat);
    frontBoard.position.set(0, Math.min(b.height * 0.44, 12.5), b.depth * 0.5 + 0.34);
    group.add(frontBoard);

    const backBoard = new THREE.Mesh(new THREE.BoxGeometry(b.width * 0.94, 6.2, 0.45), altMat);
    backBoard.position.set(0, Math.min(b.height * 0.46, 13.0), -b.depth * 0.5 - 0.34);
    group.add(backBoard);

    const sideBoardE = new THREE.Mesh(new THREE.BoxGeometry(0.45, 6.4, b.depth * 0.88), panelMat);
    sideBoardE.position.set(b.width * 0.5 + 0.34, Math.min(b.height * 0.56, 16.5), 0);
    group.add(sideBoardE);

    const sideBoardW = new THREE.Mesh(new THREE.BoxGeometry(0.45, 6.4, b.depth * 0.88), altMat);
    sideBoardW.position.set(-b.width * 0.5 - 0.34, Math.min(b.height * 0.42, 11.5), 0);
    group.add(sideBoardW);

    // Bright glowing rooftop beacon strip
    const crownBar = new THREE.Mesh(
      new THREE.BoxGeometry(b.width + 0.4, 1.2, b.depth + 0.4),
      new THREE.MeshBasicMaterial({ color: b.accentHex }),
    );
    crownBar.position.y = b.height + 0.6;
    group.add(crownBar);
  } else if (b.archVariant === 'flatiron_wedge') {
    // Iconic triangular/beveled corner limestone tower (Flatiron Building silhouette!)
    const main = new THREE.Mesh(
      new THREE.CylinderGeometry(
        Math.min(b.width, b.depth) * 0.52,
        Math.min(b.width, b.depth) * 0.58,
        b.height,
        3,
      ),
      [facadeMat, roofMat, roofMat],
    );
    main.position.y = b.height * 0.5;
    main.rotation.y = Math.PI / 6;
    main.castShadow = castShadow;
    main.receiveShadow = true;
    group.add(main);
    colliderMesh = main;

    // Ornate triangular cornice cap + brass flagpole
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(
        Math.min(b.width, b.depth) * 0.56,
        Math.min(b.width, b.depth) * 0.53,
        1.1,
        3,
      ),
      stoneMat,
    );
    cap.position.y = b.height + 0.55;
    cap.rotation.y = Math.PI / 6;
    group.add(cap);

    const flagpole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 5.5, 6),
      trimMat,
    );
    flagpole.position.y = b.height + 3.6;
    group.add(flagpole);
  } else if (b.archVariant === 'prewar_limestone') {
    // Upper Manhattan pre-war apartment block with verdigris copper mansard roof!
    const main = new THREE.Mesh(new THREE.BoxGeometry(b.width, b.height, b.depth), [
      facadeMat, facadeMat, roofMat, roofMat, facadeMat, facadeMat,
    ]);
    main.position.y = b.height * 0.5;
    main.castShadow = castShadow;
    main.receiveShadow = true;
    group.add(main);
    colliderMesh = main;

    // Verdigris copper sloping mansard roof
    const copperMat = getStdMat('copper_mansard', { color: 0x2b6e63, roughness: 0.55, metalness: 0.3 });
    const mansard = new THREE.Mesh(
      new THREE.CylinderGeometry(
        Math.min(b.width, b.depth) * 0.52,
        Math.min(b.width, b.depth) * 0.68,
        3.2,
        4,
      ),
      copperMat,
    );
    mansard.rotation.y = Math.PI * 0.25;
    mansard.scale.set(b.width / Math.min(b.width, b.depth), 1, b.depth / Math.min(b.width, b.depth));
    mansard.position.y = b.height + 1.6;
    group.add(mansard);
  } else {
    // DUMBO Industrial Red-Brick Warehouse with sawtooth skylight roof & riveted water tank!
    const main = new THREE.Mesh(new THREE.BoxGeometry(b.width, b.height, b.depth), [
      facadeMat, facadeMat, roofMat, roofMat, facadeMat, facadeMat,
    ]);
    main.position.y = b.height * 0.5;
    main.castShadow = castShadow;
    main.receiveShadow = true;
    group.add(main);
    colliderMesh = main;

    // Industrial sawtooth roof ridges
    const roofMetalMat = getStdMat('sawtooth_metal', { color: 0x475569, roughness: 0.55, metalness: 0.4 });
    const ridges = 3;
    const ridgeD = b.depth / ridges;
    for (let r = 0; r < ridges; r++) {
      const prism = new THREE.Mesh(
        new THREE.BoxGeometry(b.width * 0.94, 1.8, ridgeD * 0.72),
        roofMetalMat,
      );
      prism.position.set(0, b.height + 0.75, -b.depth * 0.5 + (r + 0.5) * ridgeD);
      prism.rotation.x = 0.24;
      group.add(prism);
    }

    addNycWoodenWaterTower(group, -b.width * 0.24, b.height, b.depth * 0.18);
  }

  // Optional rooftop HVAC spinning turbine on tall mid-rises
  if (b.height > 18 && b.archVariant !== 'artdeco_spire' && b.archVariant !== 'flatiron_wedge') {
    const fanGroup = new THREE.Group();
    fanGroup.position.set(-b.width * 0.2, b.height + 1.2, b.depth * 0.2);
    const housing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.05, 0.7, 8),
      getStdMat('hvac_box', { color: 0x64748b, roughness: 0.65 }),
    );
    fanGroup.add(housing);
    const blades = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.08, 0.24),
      ironMat,
    );
    blades.position.y = 0.42;
    fanGroup.add(blades);
    const blades2 = blades.clone();
    blades2.rotation.y = Math.PI * 0.5;
    fanGroup.add(blades2);
    group.add(fanGroup);
    rooftopFan = fanGroup;
  }

  // Optional rooftop billboard sign
  if (b.hasRoofBillboard && b.billboardText && b.archVariant !== 'times_square_neon') {
    const bTex = createNeonPanelTexture(b.billboardText, b.accentHex);
    const bMat = new THREE.MeshStandardMaterial({
      map: bTex,
      emissive: b.accentHex,
      emissiveMap: bTex,
      emissiveIntensity: 0.75,
      roughness: 0.3,
    });
    const board = new THREE.Mesh(new THREE.BoxGeometry(Math.min(11, b.width * 0.8), 3.6, 0.4), bMat);
    board.position.set(0, b.height + 3.1, b.depth * 0.32);
    group.add(board);

    for (const sx of [-2.4, 2.4]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 2.2, 5), ironMat);
      post.position.set(sx, b.height + 1.1, b.depth * 0.32);
      group.add(post);
    }
  }

  return { group, colliderMesh, rooftopFan };
}

/**
 * Iconic Washington Square Marble Triumphal Arch (drive-through monument at (0, 0, -90)).
 */
export function createWashingtonSquareArch(): THREE.Group {
  const group = new THREE.Group();
  const marbleMat = new THREE.MeshStandardMaterial({ color: 0xf1ece1, roughness: 0.52, metalness: 0.05 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xded6c5, roughness: 0.6 });
  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0xd99b26,
    emissive: 0x784808,
    emissiveIntensity: 0.35,
    metalness: 0.65,
    roughness: 0.3,
  });

  // Twin monumental marble piers framing a wide 12m drive-through roadway
  for (const side of [-1, 1]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(5.6, 15.5, 6.2), marbleMat);
    pier.position.set(side * 8.6, 7.75, 0);
    pier.receiveShadow = true;
    group.add(pier);

    // Fluted classical engaged pilasters on front & back
    for (const faceZ of [-3.2, 3.2]) {
      for (const ox of [-1.8, 1.8]) {
        const pilaster = new THREE.Mesh(new THREE.BoxGeometry(1.1, 14.2, 0.55), trimMat);
        pilaster.position.set(side * 8.6 + ox, 7.3, faceZ);
        group.add(pilaster);
      }
      // Bronze relief medallion on pier
      const relief = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.35, 14), bronzeMat);
      relief.rotation.x = Math.PI * 0.5;
      relief.position.set(side * 8.6, 11.2, faceZ + (faceZ > 0 ? 0.25 : -0.25));
      group.add(relief);
    }

    // Stepped marble plinth base
    const base = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.6, 7.2), trimMat);
    base.position.set(side * 8.6, 0.8, 0);
    group.add(base);
  }

  // Semicircular triumphal arch barrel & attic entablature
  const archRing = new THREE.Mesh(
    new THREE.TorusGeometry(6.0, 1.4, 10, 24, Math.PI),
    trimMat,
  );
  archRing.position.set(0, 9.6, 0);
  group.add(archRing);

  // Upper sculpted frieze & attic block
  const entablature = new THREE.Mesh(new THREE.BoxGeometry(23.6, 4.6, 6.8), marbleMat);
  entablature.position.set(0, 17.6, 0);
  group.add(entablature);

  const cornice = new THREE.Mesh(new THREE.BoxGeometry(25.2, 1.2, 7.8), trimMat);
  cornice.position.set(0, 20.3, 0);
  group.add(cornice);

  // Illuminated NYC gold inscription plaque on both faces
  const plaqueCanvas = document.createElement('canvas');
  plaqueCanvas.width = 512;
  plaqueCanvas.height = 128;
  const ctx = plaqueCanvas.getContext('2d')!;
  ctx.fillStyle = '#e7dfd0';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#92723b';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 116);
  ctx.fillStyle = '#3b2e1e';
  ctx.font = '800 32px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WASHINGTON SQUARE · NYC', 256, 54);
  ctx.font = '700 18px sans-serif';
  ctx.fillStyle = '#7c5b24';
  ctx.fillText('NEW YORK VICE · EST. 1892', 256, 94);

  const plaqueTex = new THREE.CanvasTexture(plaqueCanvas);
  plaqueTex.colorSpace = THREE.SRGBColorSpace;
  const plaqueMat = new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.5 });

  for (const faceZ of [3.48, -3.48]) {
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(14.5, 3.2), plaqueMat);
    plaque.position.set(0, 17.7, faceZ);
    if (faceZ < 0) plaque.rotation.y = Math.PI;
    group.add(plaque);
  }

  return group;
}

/**
 * Liberty Island & Statue of Liberty monument at (-205, -178) in Hudson Harbor.
 */
export function createLibertyIsland(): { group: THREE.Group; torchBeacon: THREE.Object3D } {
  const group = new THREE.Group();

  // Island sandy bank & green park grass crown
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xcbb692, roughness: 0.92 });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x3b7a44, roughness: 0.88 });
  const graniteMat = new THREE.MeshStandardMaterial({ color: 0xb8afa3, roughness: 0.78 });
  const patinaMat = new THREE.MeshStandardMaterial({
    color: 0x56b89e,
    roughness: 0.45,
    metalness: 0.32,
  });
  const torchMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xf59e0b,
    emissiveIntensity: 2.8,
    roughness: 0.15,
  });

  const islandBase = new THREE.Mesh(new THREE.CylinderGeometry(35, 39, 2.4, 24), sandMat);
  islandBase.position.y = -0.5;
  group.add(islandBase);

  const lawn = new THREE.Mesh(new THREE.CylinderGeometry(31, 33, 1.0, 24), grassMat);
  lawn.position.y = 0.7;
  group.add(lawn);

  // Star-fort granite pedestal (Fort Wood base)
  const fort = new THREE.Mesh(new THREE.CylinderGeometry(13.5, 15.2, 4.8, 10), graniteMat);
  fort.position.y = 3.2;
  group.add(fort);

  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(9.6, 13.5, 9.6), graniteMat);
  pedestal.position.y = 12.2;
  group.add(pedestal);

  const pedCap = new THREE.Mesh(new THREE.BoxGeometry(10.8, 1.4, 10.8), graniteMat);
  pedCap.position.y = 19.3;
  group.add(pedCap);

  // Lady Liberty sculpted verdigris copper statue
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 4.1, 16.5, 14), patinaMat);
  robe.position.y = 28.0;
  group.add(robe);

  const torso = new THREE.Mesh(new THREE.SphereGeometry(2.85, 12, 10), patinaMat);
  torso.scale.set(1.05, 1.25, 0.85);
  torso.position.y = 35.8;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(1.65, 12, 10), patinaMat);
  head.position.y = 39.8;
  group.add(head);

  // Iconic 7-spike radiant crown
  for (let i = 0; i < 7; i++) {
    const ang = -Math.PI * 0.42 + (i / 6) * Math.PI * 0.84;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.22, 2.2, 5), patinaMat);
    spike.position.set(Math.sin(ang) * 1.9, 41.2 + Math.cos(ang) * 0.9, 0.2);
    spike.rotation.z = -ang;
    group.add(spike);
  }

  // Left arm holding tablet
  const tablet = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.5), patinaMat);
  tablet.position.set(-2.9, 34.5, 1.2);
  tablet.rotation.z = 0.25;
  group.add(tablet);

  // Right arm raised high holding the glowing golden torch
  const raisedArm = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.78, 9.5, 8), patinaMat);
  raisedArm.position.set(2.4, 41.5, 0.4);
  raisedArm.rotation.z = -0.16;
  group.add(raisedArm);

  const torchCup = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.6, 1.6, 10), patinaMat);
  torchCup.position.set(3.1, 46.2, 0.4);
  group.add(torchCup);

  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.95, 2.4, 8), torchMat);
  flame.position.set(3.1, 48.0, 0.4);
  group.add(flame);

  // Rotating golden harbor lighthouse beam from Liberty's torch!
  const torchBeacon = new THREE.Group();
  torchBeacon.position.set(3.1, 48.0, 0.4);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(12, 85, 10, 1, true), beamMat);
  beam.rotation.z = Math.PI * 0.5;
  beam.position.x = 42.5;
  torchBeacon.add(beam);
  group.add(torchBeacon);

  // Wooden ferry landing pier on east shore of Liberty Island
  const pierWood = new THREE.Mesh(
    new THREE.BoxGeometry(15, 0.7, 6.5),
    getStdMat('pier_wood', { color: 0x7c5338, roughness: 0.9 }),
  );
  pierWood.position.set(34, 0.65, 2);
  group.add(pierWood);

  return { group, torchBeacon };
}

/**
 * Authentic NYC Street & Park Vendor Carts (Hot Dog Umbrella Cart, Halal Platter Cart, Soft Pretzel Cart, Coffee/Bagel Cart).
 */
export function createNycCartStall(stall: StreetStallDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(stall.x, 0, stall.z);
  group.rotation.y = stall.facing;

  const steelMat = getStdMat('cart_steel', { color: 0xdbe2ea, roughness: 0.28, metalness: 0.72 });
  const wheelMat = getStdMat('cart_wheel', { color: 0x18181b, roughness: 0.85 });
  const awningMat = new THREE.MeshStandardMaterial({ color: stall.awningHex, roughness: 0.65 });

  // Stainless steel rolling NYC cart body
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.12, 1.18), steelMat);
  body.position.y = 0.82;
  group.add(body);

  // Colored brand skirt around cart front
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.48, 1.22), awningMat);
  skirt.position.y = 0.62;
  group.add(skirt);

  // 2 big spoked cart wheels
  for (const sx of [-0.95, 0.95]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.14, 12), wheelMat);
    wheel.rotation.x = Math.PI * 0.5;
    wheel.position.set(sx, 0.34, 0.56);
    group.add(wheel);
  }

  // Top food props depending on NYC cart kind
  if (stall.kind === 'hotdog') {
    // Classic Sabrett blue & yellow striped NYC Hot Dog Umbrella!
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), steelMat);
    pole.position.set(0, 2.05, 0);
    group.add(pole);

    const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.85, 0.68, 8), awningMat);
    canopy.position.set(0, 3.05, 0);
    group.add(canopy);

    const yellowStripe = new THREE.Mesh(
      new THREE.CylinderGeometry(1.45, 1.88, 0.2, 8, 1, true),
      getStdMat('sabrett_yellow', { color: 0xfacc15, roughness: 0.6, side: THREE.DoubleSide }),
    );
    yellowStripe.position.set(0, 2.75, 0);
    group.add(yellowStripe);

    // Steaming hot dog tray + mustard/ketchup bottles
    const tray = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.65), steelMat);
    tray.position.set(-0.2, 1.46, 0);
    group.add(tray);
    const mustard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.24, 6),
      getStdMat('mustard_bot', { color: 0xfacc15, roughness: 0.4 }),
    );
    mustard.position.set(0.65, 1.5, 0.15);
    group.add(mustard);
    const ketchup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.24, 6),
      getStdMat('ketchup_bot', { color: 0xdc2626, roughness: 0.4 }),
    );
    ketchup.position.set(0.82, 1.5, -0.1);
    group.add(ketchup);
  } else {
    // Full rectangular NYC Halal / Coffee / Pretzel food cart canopy with 4 corner poles
    for (const sx of [-1.05, 1.05]) {
      for (const sz of [-0.52, 0.52]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.55, 5), steelMat);
        post.position.set(sx, 2.08, sz);
        group.add(post);
      }
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.26, 1.55), awningMat);
    roof.position.set(0, 2.88, 0);
    group.add(roof);

    // Warm food display glow under canopy
    const display = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.34, 0.72),
      new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.55,
        roughness: 0.3,
      }),
    );
    display.position.set(0, 1.54, 0);
    group.add(display);
  }

  // Readable NYC vendor menu sign banner
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 256;
  signCanvas.height = 64;
  const ctx = signCanvas.getContext('2d')!;
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.strokeRect(3, 3, 250, 58);
  ctx.fillStyle = '#fef08a';
  ctx.font = '800 21px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(stall.name.slice(0, 22).toUpperCase(), 128, 32);

  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.15, 0.52),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.35 }),
  );
  sign.position.set(0, stall.kind === 'hotdog' ? 0.66 : 2.88, stall.kind === 'hotdog' ? 0.63 : 0.79);
  group.add(sign);

  return group;
}

/**
 * Adds a live pickup cricket pitch (mown clay strip, wooden wickets/stumps, crease markings,
 * boundary cones, and glowing interactive join halo) inside Central Park & Flushing Meadows!
 */
export function createParkCricketPitchProps(cx: number, cz: number): {
  group: THREE.Group;
  markerRing: THREE.Mesh;
} {
  const group = new THREE.Group();
  group.position.set(cx, 0.175, cz);

  // Clay cricket pitch strip (16.5m long x 3.2m wide) sitting cleanly atop park turf
  const pitchStrip = new THREE.Mesh(
    new THREE.BoxGeometry(3.3, 0.05, 16.8),
    getStdMat('cricket_clay', { color: 0xd9b37c, roughness: 0.92 }),
  );
  pitchStrip.position.y = 0.025;
  group.add(pitchStrip);

  // White popping crease lines at both ends
  const whiteMat = getStdMat('crease_white', { color: 0xffffff, roughness: 0.5 });
  for (const ez of [-6.4, 6.4]) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.06, 0.18), whiteMat);
    line.position.set(0, 0.045, ez);
    group.add(line);
  }

  // Wooden cricket wickets (3 stumps + bails at both ends)
  const woodMat = getStdMat('stump_wood', { color: 0xfde68a, roughness: 0.55 });
  for (const ez of [-7.4, 7.4]) {
    for (const sx of [-0.18, 0, 0.18]) {
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.035, 0.92, 6), woodMat);
      stump.position.set(sx, 0.48, ez);
      group.add(stump);
    }
    const bail = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.04), woodMat);
    bail.position.set(0, 0.96, ez);
    group.add(bail);
  }

  // Bright orange park boundary cones encircling the pickup pitch
  const coneMat = getStdMat('boundary_cone', { color: 0xf97316, roughness: 0.5 });
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.52, 7), coneMat);
    cone.position.set(Math.cos(ang) * 14.2, 0.26, Math.sin(ang) * 14.2);
    group.add(cone);
  }

  // Subtle glowing gold/emerald interactive match circle around the batting crease
  const markerRing = new THREE.Mesh(
    new THREE.RingGeometry(1.75, 2.15, 24),
    new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    }),
  );
  markerRing.rotation.x = -Math.PI * 0.5;
  markerRing.position.set(0, 0.09, 6.0);
  group.add(markerRing);

  return { group, markerRing };
}

export function createParkSportBallMesh(sport: ParkSportKind): THREE.Mesh {
  if (sport === 'cricket') {
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 8),
      new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        emissive: 0x7f1d1d,
        emissiveIntensity: 0.35,
        roughness: 0.3,
      }),
    );
    return ball;
  }
  return new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0xea580c,
      emissive: 0x7c2d12,
      emissiveIntensity: 0.25,
      roughness: 0.45,
    }),
  );
}

/**
 * Wooden cricket bat mesh that attaches to the batter's right hand!
 */
export function createCricketBatMesh(): THREE.Group {
  const bat = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.035, 0.36, 6),
    getStdMat('bat_grip', { color: 0x18181b, roughness: 0.8 }),
  );
  handle.position.y = -0.18;
  bat.add(handle);

  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.68, 0.055),
    getStdMat('bat_willow', { color: 0xe7c896, roughness: 0.5 }),
  );
  blade.position.y = -0.66;
  bat.add(blade);
  return bat;
}

/**
 * High-performance Instanced Curved Human Crowd System!
 * Renders 290+ animated curved NYC pedestrians across the entire 11x11 city in ONLY 7 draw calls!
 */
export interface InstancedCrowdRig {
  group: THREE.Group;
  count: number;
  torsoMesh: THREE.InstancedMesh;
  headMesh: THREE.InstancedMesh;
  hairMesh: THREE.InstancedMesh;
  leftLegMesh: THREE.InstancedMesh;
  rightLegMesh: THREE.InstancedMesh;
  leftArmMesh: THREE.InstancedMesh;
  rightArmMesh: THREE.InstancedMesh;
  updateAgentPose: (
    index: number,
    x: number,
    y: number,
    z: number,
    heading: number,
    gaitPhase: number,
    speedRatio: number,
    heightScale: number,
    fleeing: boolean,
    fallAngle?: number,
    hitFlash?: number,
  ) => void;
  commitMatrices: () => void;
}

const _m4 = new THREE.Matrix4();
const _mPart = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scl = new THREE.Vector3();
const _euler = new THREE.Euler();
const _col = new THREE.Color();

export function createInstancedCrowdRig(
  count: number,
  palette: Array<{ shirtHex: number; pantsHex: number; skinHex: number; hairHex: number }>,
): InstancedCrowdRig {
  const group = new THREE.Group();

  // Realistic adult human proportions for instanced pedestrians
  const torsoGeo = new THREE.CapsuleGeometry(0.18, 0.44, 4, 8);
  const headGeo = new THREE.SphereGeometry(0.125, 10, 8);
  const hairGeo = new THREE.SphereGeometry(0.136, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.58);
  const legGeo = new THREE.CapsuleGeometry(0.072, 0.56, 3, 6);
  legGeo.translate(0, -0.34, 0); // pivot at hip
  const armGeo = new THREE.CapsuleGeometry(0.052, 0.4, 3, 6);
  armGeo.translate(0, -0.24, 0); // pivot at shoulder

  const baseMat = () =>
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.03,
    });

  const torsoMesh = new THREE.InstancedMesh(torsoGeo, baseMat(), count);
  const headMesh = new THREE.InstancedMesh(headGeo, baseMat(), count);
  const hairMesh = new THREE.InstancedMesh(hairGeo, baseMat(), count);
  const leftLegMesh = new THREE.InstancedMesh(legGeo, baseMat(), count);
  const rightLegMesh = new THREE.InstancedMesh(legGeo, baseMat(), count);
  const leftArmMesh = new THREE.InstancedMesh(armGeo, baseMat(), count);
  const rightArmMesh = new THREE.InstancedMesh(armGeo, baseMat(), count);

  const meshes = [torsoMesh, headMesh, hairMesh, leftLegMesh, rightLegMesh, leftArmMesh, rightArmMesh];
  for (const m of meshes) {
    m.frustumCulled = false;
    group.add(m);
  }

  const baseShirts = new Uint32Array(count);
  const flashActive = new Uint8Array(count);
  let colorsDirty = false;

  for (let i = 0; i < count; i++) {
    const p = palette[i % palette.length];
    baseShirts[i] = p.shirtHex;
    torsoMesh.setColorAt(i, _col.setHex(p.shirtHex));
    headMesh.setColorAt(i, _col.setHex(p.skinHex));
    hairMesh.setColorAt(i, _col.setHex(p.hairHex));
    leftLegMesh.setColorAt(i, _col.setHex(p.pantsHex));
    rightLegMesh.setColorAt(i, _col.setHex(p.pantsHex));
    leftArmMesh.setColorAt(i, _col.setHex(p.shirtHex));
    rightArmMesh.setColorAt(i, _col.setHex(p.shirtHex));
  }
  for (const m of meshes) {
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }

  const updateAgentPose = (
    index: number,
    x: number,
    y: number,
    z: number,
    heading: number,
    gaitPhase: number,
    speedRatio: number,
    heightScale: number,
    fleeing: boolean,
    fallAngle = 0,
    hitFlash = 0,
  ) => {
    const isDown = Math.abs(fallAngle) > 0.05;
    const bob = isDown ? 0 : Math.abs(Math.sin(gaitPhase)) * 0.048 * speedRatio;
    const swing = isDown ? 0 : Math.sin(gaitPhase) * 0.68 * speedRatio;

    // Brief hurt red-white flash on torso when struck
    const wantsFlash = hitFlash > 0.01 ? 1 : 0;
    if (flashActive[index] !== wantsFlash) {
      flashActive[index] = wantsFlash;
      _col.setHex(wantsFlash ? 0xff6b6b : baseShirts[index]);
      torsoMesh.setColorAt(index, _col);
      leftArmMesh.setColorAt(index, _col);
      rightArmMesh.setColorAt(index, _col);
      colorsDirty = true;
    }

    // Root transform (pivots near pavement when toppling over from punch or car impact!)
    const groundLieOffset = isDown ? Math.min(0.24, Math.abs(fallAngle) * 0.16) : 0;
    _pos.set(x, y + bob + groundLieOffset, z);
    _euler.set(fallAngle, heading, 0, 'YXZ');
    _quat.setFromEuler(_euler);
    _scl.set(heightScale, heightScale, heightScale);
    _m4.compose(_pos, _quat, _scl);

    // Torso
    _pos.set(0, 1.22, 0);
    _euler.set(isDown ? 0 : speedRatio * 0.06, 0, 0);
    _quat.setFromEuler(_euler);
    _scl.set(1.12, 1.0, 0.72);
    _mPart.compose(_pos, _quat, _scl).premultiply(_m4);
    torsoMesh.setMatrixAt(index, _mPart);

    // Head
    _pos.set(0, 1.71, 0.01);
    _euler.set(0, 0, 0);
    _quat.setFromEuler(_euler);
    _scl.set(0.9, 1.08, 0.96);
    _mPart.compose(_pos, _quat, _scl).premultiply(_m4);
    headMesh.setMatrixAt(index, _mPart);

    // Hair / Cap crown
    _pos.set(0, 1.74, -0.005);
    _scl.set(0.94, 1.05, 1.0);
    _mPart.compose(_pos, _quat, _scl).premultiply(_m4);
    hairMesh.setMatrixAt(index, _mPart);

    // Left Leg
    _pos.set(-0.1, 0.88, 0);
    _euler.set(isDown ? -0.35 : swing, 0, isDown ? 0.22 : 0);
    _quat.setFromEuler(_euler);
    _scl.set(1, 1, 1);
    _mPart.compose(_pos, _quat, _scl).premultiply(_m4);
    leftLegMesh.setMatrixAt(index, _mPart);

    // Right Leg
    _pos.set(0.1, 0.88, 0);
    _euler.set(isDown ? 0.28 : -swing, 0, isDown ? -0.26 : 0);
    _quat.setFromEuler(_euler);
    _mPart.compose(_pos, _quat, _scl).premultiply(_m4);
    rightLegMesh.setMatrixAt(index, _mPart);

    // Left Arm
    _pos.set(-0.23, 1.44, 0);
    _euler.set(
      isDown ? -1.15 : fleeing ? -2.2 + swing * 0.35 : -swing * 0.78,
      0,
      isDown ? 0.65 : 0.09,
    );
    _quat.setFromEuler(_euler);
    _mPart.compose(_pos, _quat, _scl).premultiply(_m4);
    leftArmMesh.setMatrixAt(index, _mPart);

    // Right Arm
    _pos.set(0.23, 1.44, 0);
    _euler.set(
      isDown ? -0.85 : fleeing ? -2.2 - swing * 0.35 : swing * 0.78,
      0,
      isDown ? -0.72 : -0.09,
    );
    _quat.setFromEuler(_euler);
    _mPart.compose(_pos, _quat, _scl).premultiply(_m4);
    rightArmMesh.setMatrixAt(index, _mPart);
  };

  const commitMatrices = () => {
    for (const m of meshes) {
      m.instanceMatrix.needsUpdate = true;
    }
    if (colorsDirty) {
      if (torsoMesh.instanceColor) torsoMesh.instanceColor.needsUpdate = true;
      if (leftArmMesh.instanceColor) leftArmMesh.instanceColor.needsUpdate = true;
      if (rightArmMesh.instanceColor) rightArmMesh.instanceColor.needsUpdate = true;
      colorsDirty = false;
    }
  };

  return {
    group,
    count,
    torsoMesh,
    headMesh,
    hairMesh,
    leftLegMesh,
    rightLegMesh,
    leftArmMesh,
    rightArmMesh,
    updateAgentPose,
    commitMatrices,
  };
}
