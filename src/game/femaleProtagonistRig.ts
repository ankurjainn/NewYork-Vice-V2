import * as THREE from 'three';
import {
  BODY_BUILD_METRICS,
  getWeatherClothingState,
  type CharacterAppearanceSpec,
} from './characterModels';
import type { CharacterRig } from './proceduralModels';
import type { WeatherKind } from './types';

/**
 * Builds a seamless curved wavy hair-sheet geometry (no chunky capsules or spheres!).
 * Sweeps gracefully down from the crown/nape across the upper back with soft S-wave ripples
 * and a feathered V-tapered silhouette.
 */
function createFlowingHairSheetGeometry(
  widthTop: number,
  widthMid: number,
  widthBottom: number,
  length: number,
  depthCurve: number,
): THREE.BufferGeometry {
  const segU = 14; // across width
  const segV = 16; // down length
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV; // 0 = top nape, 1 = feathered tips
    // Smooth width envelope: full across shoulder blades, softly tapered at tips
    const w =
      v < 0.45
        ? THREE.MathUtils.lerp(widthTop, widthMid, Math.sin((v / 0.45) * (Math.PI * 0.5)))
        : THREE.MathUtils.lerp(widthMid, widthBottom, Math.pow((v - 0.45) / 0.55, 1.35));

    // Organic blowout S-wave down the length of the hair
    const sWaveZ = Math.sin(v * Math.PI * 2.4) * 0.014 * (0.3 + v * 0.7);
    const sweepBackZ = -Math.sin(v * Math.PI * 0.72) * depthCurve - v * 0.032;

    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU; // 0..1 left to right
      const s = u * 2 - 1; // -1..+1
      const x = s * w * 0.5;
      // Soft V-cut feathered hemline: center hair hangs slightly longer than outer edges
      const edgeLift = (s * s) * 0.055 * v;
      const y = -v * length + edgeLift;
      // Wrap smoothly around the curve of the skull & shoulders
      const wrapZ = (s * s) * (0.048 - v * 0.018);
      // Gentle longitudinal wave ripples across strands
      const strandRipple = Math.cos(s * Math.PI * 3.0 + v * 3.2) * 0.006 * (0.4 + v);
      const z = sweepBackZ + wrapZ + sWaveZ + strandRipple;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * (segU + 1) + iu;
      const b = a + 1;
      const c = (iv + 1) * (segU + 1) + iu;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a sleek, second-skin contoured bikini bottom mesh flush over the pelvis & glutes
 * (zero floating torus rings or protruding cones!).
 */
function createContouredBikiniBottomMesh(
  hipScale: number,
  bellyScale: number,
  mat: THREE.Material,
): THREE.Mesh {
  const segU = 28;
  const segV = 10;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV; // 0 = bottom leg-cut edge, 1 = high-cut V-waist edge
    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const theta = u * Math.PI * 2; // 0 = +Z front, PI/2 = +X right hip, PI = -Z back
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      const isSide = Math.abs(sinT); // 1 at hips, 0 at front/back center
      const isBack = Math.max(0, -cosT);

      // High-cut Brazilian V-shape: rises higher at the sides of the hips, dips cleanly at center front/back
      const yBottom = -0.102 + isSide * 0.132;
      const yTop = 0.036 + isSide * 0.036 - isBack * 0.012;
      const y = THREE.MathUtils.lerp(yBottom, yTop, v);

      // Match the exact pelvis Lathe radius + tiny 0.005m second-skin offset so it hugs tightly with zero gap
      const baseR =
        y < -0.05
          ? THREE.MathUtils.lerp(0.118, 0.146, (y + 0.105) / 0.055) * hipScale
          : y < 0.0
            ? THREE.MathUtils.lerp(0.146, 0.164, (y + 0.05) / 0.05) * hipScale
            : y < 0.048
              ? THREE.MathUtils.lerp(0.164, 0.15, y / 0.048) * hipScale
              : THREE.MathUtils.lerp(0.15 * hipScale, 0.118 * bellyScale, (y - 0.048) / 0.055);

      // Smooth glute fullness in the back (-Z)
      const gluteBulge = isBack * isBack * Math.max(0, 1 - Math.abs(y + 0.025) / 0.095) * 0.042;
      const rx = (baseR + 0.005) * 1.07;
      const rz = (baseR + 0.005) * 0.78 + gluteBulge;

      const x = sinT * rx;
      const z = cosT * rz;
      positions.push(x, y, z);
    }
  }

  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * (segU + 1) + iu;
      const b = a + 1;
      const c = (iv + 1) * (segU + 1) + iu;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

/**
 * Builds a high-detail, sculpted hourglass Latina female protagonist rig in Three.js
 * with natural matte-satin skin, smooth 24-segment curves, velvety bodycon dresses &
 * flush-fitting two-piece bikinis, realistic flowing wavy hair sheets, gold jewelry & heels.
 */
export function createFemaleProtagonistRig(
  spec: CharacterAppearanceSpec,
  shadowTex: THREE.Texture,
): CharacterRig {
  const metrics = BODY_BUILD_METRICS[spec.build] ?? BODY_BUILD_METRICS.curvy;
  const isBikini = spec.silhouette === 'bikini_set';
  const isJeansTop = spec.silhouette === 'jeans_top';
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  // +18% protagonist stature boost so the main player matches & stands confidently beside NYC NPCs
  bodyGroup.scale.setScalar(metrics.heightScale * 1.18);
  root.add(bodyGroup);

  const hitMeshes: THREE.Mesh[] = [];
  const fabricMaterials: THREE.MeshStandardMaterial[] = [];

  // Rich warm golden-bronze Latina skin (natural matte human finish — ZERO plastic glare!)
  const skinMat = new THREE.MeshStandardMaterial({
    color: spec.skinHex,
    roughness: 0.74,
    metalness: 0.01,
  });

  // Luxurious rich satin-velvet dress / top fabric (saturated color, soft sheen — never shiny latex!)
  const outfitMat = new THREE.MeshStandardMaterial({
    color: spec.shirtHex,
    roughness: isBikini ? 0.56 : isJeansTop ? 0.62 : 0.52,
    metalness: 0.06,
    side: THREE.DoubleSide,
  });
  fabricMaterials.push(outfitMat);

  // Fitted mid-wash denim material for Jeans Top silhouette
  const denimMat = new THREE.MeshStandardMaterial({
    color: spec.pantsHex,
    roughness: 0.84,
    metalness: 0.04,
  });
  fabricMaterials.push(denimMat);

  const accentFabricMat = new THREE.MeshStandardMaterial({
    color: spec.accentHex,
    roughness: 0.48,
    metalness: 0.14,
  });
  fabricMaterials.push(accentFabricMat);

  const shoeMat = new THREE.MeshStandardMaterial({
    color: spec.shoeHex,
    roughness: 0.34,
    metalness: 0.16,
  });

  const redSoleMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    roughness: 0.36,
    metalness: 0.1,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xebc04d,
    roughness: 0.24,
    metalness: 0.9,
  });

  // Silky natural dark chestnut-espresso Latina hair (soft realistic sheen, NOT glossy plastic!)
  const hairMat = new THREE.MeshStandardMaterial({
    color: spec.hairHex,
    roughness: 0.62,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  // Ground contact shadow
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 20),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.45 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.022;
  root.add(shadow);

  // ============================================================================
  // 1. SCULPTED HOURGLASS PELVIS, FLARED HIPS & ROUNDED GLUTES
  // ============================================================================
  const pelvisGroup = new THREE.Group();
  pelvisGroup.position.set(0, 0.91, 0);
  bodyGroup.add(pelvisGroup);

  const hipSurfaceMat = isBikini ? skinMat : isJeansTop ? denimMat : outfitMat;

  // Smooth 24-segment anatomical hourglass hip/pelvis contour
  const pelvisPts = [
    new THREE.Vector2(0.02, -0.105),
    new THREE.Vector2(0.144 * metrics.hipScale, -0.05),
    new THREE.Vector2(0.163 * metrics.hipScale, 0.0), // widest hourglass hip flare
    new THREE.Vector2(0.15 * metrics.hipScale, 0.048),
    new THREE.Vector2(0.114 * metrics.bellyScale, 0.095), // cinches smoothly into slim waist
    new THREE.Vector2(0.102 * metrics.bellyScale, 0.12),
  ];
  const pelvisMesh = new THREE.Mesh(new THREE.LatheGeometry(pelvisPts, 24), hipSurfaceMat);
  pelvisMesh.scale.set(1.06, 1.0, 0.77);
  pelvisMesh.castShadow = true;
  pelvisGroup.add(pelvisMesh);
  hitMeshes.push(pelvisMesh);

  // Sculpted bilateral rounded glutes seamlessly blended into hip & upper thigh curve
  for (const sx of [-1, 1]) {
    const glute = new THREE.Mesh(new THREE.SphereGeometry(0.098, 20, 16), hipSurfaceMat);
    glute.scale.set(0.96, 1.08, 1.08);
    glute.position.set(sx * 0.065 * metrics.hipScale, -0.032, -0.055);
    glute.rotation.y = sx * 0.14;
    glute.castShadow = true;
    pelvisGroup.add(glute);
    hitMeshes.push(glute);
  }

  if (isBikini) {
    // Second-skin contoured high-cut Brazilian bikini bottom (flush against skin — zero floating gaps!)
    const bikiniBottom = createContouredBikiniBottomMesh(metrics.hipScale, metrics.bellyScale, outfitMat);
    pelvisGroup.add(bikiniBottom);

    // Subtle tiny gold hardware rings nestled cleanly at hip sides
    for (const sx of [-1, 1]) {
      const sideRing = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0028, 6, 14), goldMat);
      sideRing.rotation.y = Math.PI / 2;
      sideRing.position.set(sx * 0.164 * metrics.hipScale, 0.048, 0.0);
      pelvisGroup.add(sideRing);
    }
  } else if (isJeansTop) {
    // High-waisted fitted denim waistband & subtle gold button detail
    const denimWaistband = new THREE.Mesh(
      new THREE.TorusGeometry(0.114 * metrics.bellyScale, 0.013, 8, 24),
      denimMat,
    );
    denimWaistband.rotation.x = Math.PI / 2;
    denimWaistband.scale.set(1.06, 0.78, 1.0);
    denimWaistband.position.set(0, 0.092, 0);
    pelvisGroup.add(denimWaistband);

    const jeanButton = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.008, 10), goldMat);
    jeanButton.rotation.x = Math.PI / 2;
    jeanButton.position.set(0, 0.092, 0.095);
    pelvisGroup.add(jeanButton);
  } else {
    // Sleek fitted bodycon mini-dress skirt hugging hips, rounded glutes & upper thighs cleanly
    const skirtPts = [
      new THREE.Vector2(0.126 * metrics.hipScale, -0.255), // flattering mini hemline
      new THREE.Vector2(0.146 * metrics.hipScale, -0.175),
      new THREE.Vector2(0.162 * metrics.hipScale, -0.085),
      new THREE.Vector2(0.165 * metrics.hipScale, -0.008),
      new THREE.Vector2(0.146 * metrics.hipScale, 0.055),
    ];
    const miniSkirt = new THREE.Mesh(new THREE.LatheGeometry(skirtPts, 24), outfitMat);
    miniSkirt.scale.set(1.06, 1.0, 0.85);
    miniSkirt.position.set(0, 0, -0.012);
    miniSkirt.castShadow = true;
    pelvisGroup.add(miniSkirt);
    hitMeshes.push(miniSkirt);

    // Subtle metallic gold side-slit clasp detail on left thigh
    const hipClasp = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.003, 6, 14), goldMat);
    hipClasp.rotation.y = Math.PI / 2;
    hipClasp.position.set(-0.164 * metrics.hipScale, -0.14, 0.022);
    pelvisGroup.add(hipClasp);
  }

  // ============================================================================
  // 2. TONED BARE LATINA LEGS & STRAPPY STILETTO HEELS / RESORT WEDGES
  // ============================================================================
  const legSpread = 0.092 * metrics.hipScale;
  const limbR = metrics.limbRadiusScale;

  const makeFeminineLeg = (xOff: number, isRight: boolean) => {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(xOff, -0.028, 0);

    // Curvaceous athletic tanned thigh tapering gracefully to slender knee
    const thighPts = [
      new THREE.Vector2(0.047 * limbR, 0.0), // sculpted knee top
      new THREE.Vector2(0.058 * limbR, 0.12),
      new THREE.Vector2(0.079 * limbR, 0.28), // shapely athletic thigh curve
      new THREE.Vector2(0.09 * limbR, 0.39), // full upper thigh blending cleanly into hip
      new THREE.Vector2(0.08 * limbR, 0.445),
    ];
    const legSurfaceMat = isJeansTop ? denimMat : skinMat;
    const thigh = new THREE.Mesh(new THREE.LatheGeometry(thighPts, 18), legSurfaceMat);
    thigh.scale.set(0.96, 1.0, 1.06);
    thigh.position.set(0, -0.42, 0.002);
    thigh.castShadow = true;
    hipPivot.add(thigh);
    hitMeshes.push(thigh);

    // Smooth articulated knee joint
    const kneePivot = new THREE.Group();
    kneePivot.position.set(0, -0.415, 0.004);
    hipPivot.add(kneePivot);

    const kneeCap = new THREE.Mesh(new THREE.SphereGeometry(0.048 * limbR, 12, 10), legSurfaceMat);
    kneeCap.scale.set(0.92, 0.94, 0.96);
    kneePivot.add(kneeCap);

    // Sculpted feminine calf tapering cleanly to slender ankle
    const calfPts = [
      new THREE.Vector2(0.031 * limbR, 0.0), // slender delicate ankle
      new THREE.Vector2(0.038 * limbR, 0.11),
      new THREE.Vector2(0.057 * limbR, 0.26), // shapely calf contour
      new THREE.Vector2(0.051 * limbR, 0.37),
      new THREE.Vector2(0.046 * limbR, 0.405),
    ];
    const calf = new THREE.Mesh(new THREE.LatheGeometry(calfPts, 18), legSurfaceMat);
    calf.scale.set(0.92, 1.0, 1.04);
    calf.position.set(0, -0.395, -0.006);
    calf.castShadow = true;
    kneePivot.add(calf);

    // Dainty gold anklet on right ankle
    if (isRight) {
      const anklet = new THREE.Mesh(new THREE.TorusGeometry(0.034 * limbR, 0.003, 6, 16), goldMat);
      anklet.rotation.x = Math.PI / 2 + 0.1;
      anklet.position.set(0, -0.365, -0.004);
      kneePivot.add(anklet);
    }

    // Ankle & Strappy Stiletto Heel / Beach Wedge
    const anklePivot = new THREE.Group();
    anklePivot.position.set(0, -0.39, -0.004);
    kneePivot.add(anklePivot);

    const ankleStrap = new THREE.Mesh(new THREE.TorusGeometry(0.033 * limbR, 0.005, 6, 14), shoeMat);
    ankleStrap.rotation.x = Math.PI / 2;
    ankleStrap.position.set(0, -0.004, 0);
    anklePivot.add(ankleStrap);

    const footInstep = new THREE.Mesh(new THREE.CapsuleGeometry(0.027 * limbR, 0.115, 6, 10), skinMat);
    footInstep.rotation.x = Math.PI / 2 + 0.26;
    footInstep.scale.set(1.1, 1.0, 0.72);
    footInstep.position.set(0, -0.044, 0.058);
    anklePivot.add(footInstep);

    const vampStrap = new THREE.Mesh(new THREE.BoxGeometry(0.07 * limbR, 0.02, 0.05), shoeMat);
    vampStrap.position.set(0, -0.056, 0.1);
    vampStrap.rotation.x = 0.14;
    anklePivot.add(vampStrap);

    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.07 * limbR, 0.014, 0.155), shoeMat);
    sole.position.set(0, -0.076, 0.068);
    sole.rotation.x = 0.14;
    anklePivot.add(sole);

    const soleAccent = new THREE.Mesh(new THREE.BoxGeometry(0.064 * limbR, 0.006, 0.135), isBikini ? goldMat : redSoleMat);
    soleAccent.position.set(0, -0.084, 0.066);
    soleAccent.rotation.x = 0.14;
    anklePivot.add(soleAccent);

    if (isBikini) {
      const wedge = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.021, 0.062, 10), goldMat);
      wedge.position.set(0, -0.054, -0.006);
      anklePivot.add(wedge);
    } else {
      const heelCup = new THREE.Mesh(new THREE.CylinderGeometry(0.031 * limbR, 0.027 * limbR, 0.046, 10), shoeMat);
      heelCup.position.set(0, -0.028, -0.006);
      anklePivot.add(heelCup);

      const stilettoPin = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.006, 0.068, 8), shoeMat);
      stilettoPin.position.set(0, -0.058, -0.01);
      anklePivot.add(stilettoPin);

      const heelTip = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.008, 8), goldMat);
      heelTip.position.set(0, -0.09, -0.01);
      anklePivot.add(heelTip);
    }

    return { hipPivot, kneePivot, anklePivot };
  };

  const leftLegRig = makeFeminineLeg(-legSpread, false);
  const rightLegRig = makeFeminineLeg(legSpread, true);
  pelvisGroup.add(leftLegRig.hipPivot, rightLegRig.hipPivot);

  // ============================================================================
  // 3. CINCHED SLIM WAIST, GRACEFUL BACK & NATURAL SCULPTED BUST (`spineGroup`)
  // ============================================================================
  const spineGroup = new THREE.Group();
  spineGroup.position.set(0, 0.082, 0);
  pelvisGroup.add(spineGroup);

  // Hourglass upper torso LatheGeometry (cinched slim waist -> slender ribcage -> graceful collarbones)
  const torsoPts = [
    new THREE.Vector2(0.02, -0.015),
    new THREE.Vector2(0.106 * metrics.bellyScale, 0.015),
    new THREE.Vector2(0.098 * metrics.bellyScale, 0.088), // ultra-slim sculpted waist
    new THREE.Vector2(0.122 * metrics.shoulderScale, 0.215), // slender ribcage
    new THREE.Vector2(0.14 * metrics.shoulderScale, 0.34),
    new THREE.Vector2(0.152 * metrics.shoulderScale, 0.43), // feminine shoulder line
    new THREE.Vector2(0.078 * metrics.shoulderScale, 0.486), // collarbone slope
    new THREE.Vector2(0.043, 0.514),
  ];
  const torsoGeo = new THREE.LatheGeometry(torsoPts, 24);
  const torsoBase = new THREE.Mesh(torsoGeo, skinMat);
  torsoBase.scale.set(1.12, 1.0, 0.68);
  torsoBase.position.set(0, -0.01, 0);
  torsoBase.castShadow = true;
  spineGroup.add(torsoBase);
  hitMeshes.push(torsoBase);

  if (isJeansTop) {
    // Sleek fitted cropped top above high-waisted denim jeans (flattering bare midriff!)
    const cropPts = [
      new THREE.Vector2(0.116 * metrics.shoulderScale, 0.155),
      new THREE.Vector2(0.128 * metrics.shoulderScale, 0.225),
      new THREE.Vector2(0.144 * metrics.shoulderScale, 0.335),
      new THREE.Vector2(0.129 * metrics.shoulderScale, 0.374),
    ];
    const cropTop = new THREE.Mesh(new THREE.LatheGeometry(cropPts, 24), outfitMat);
    cropTop.scale.set(1.13, 1.0, 0.7);
    cropTop.position.set(0, -0.01, 0);
    cropTop.castShadow = true;
    spineGroup.add(cropTop);
    hitMeshes.push(cropTop);

    // Crisp white ribbed hem band on cropped top
    const hemMat = new THREE.MeshStandardMaterial({
      color: spec.innerShirtHex ?? 0xfff7ed,
      roughness: 0.72,
      metalness: 0.03,
    });
    const cropHem = new THREE.Mesh(
      new THREE.TorusGeometry(0.117 * metrics.shoulderScale, 0.011, 8, 24),
      hemMat,
    );
    cropHem.rotation.x = Math.PI / 2;
    cropHem.scale.set(1.13, 0.71, 1.0);
    cropHem.position.set(0, 0.146, 0);
    spineGroup.add(cropHem);

    for (const sx of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.0055, 6, 16, Math.PI), outfitMat);
      strap.rotation.y = Math.PI / 2;
      strap.position.set(sx * 0.112 * metrics.shoulderScale, 0.386, 0.006);
      spineGroup.add(strap);
    }
  } else if (!isBikini) {
    // Curve-hugging bodycon bodice wrapping cinched waist cleanly up to sweetheart neckline
    const bodicePts = [
      new THREE.Vector2(0.11 * metrics.bellyScale, -0.025),
      new THREE.Vector2(0.102 * metrics.bellyScale, 0.088),
      new THREE.Vector2(0.126 * metrics.shoulderScale, 0.215),
      new THREE.Vector2(0.144 * metrics.shoulderScale, 0.335),
      new THREE.Vector2(0.128 * metrics.shoulderScale, 0.372),
    ];
    const bodice = new THREE.Mesh(new THREE.LatheGeometry(bodicePts, 24), outfitMat);
    bodice.scale.set(1.13, 1.0, 0.7);
    bodice.position.set(0, -0.01, 0);
    bodice.castShadow = true;
    spineGroup.add(bodice);
    hitMeshes.push(bodice);

    // Subtle delicate gold waist chain/belt accenting the slim waist
    const waistHighlight = new THREE.Mesh(
      new THREE.TorusGeometry(0.103 * metrics.bellyScale, 0.0042, 8, 24),
      goldMat,
    );
    waistHighlight.rotation.x = Math.PI / 2;
    waistHighlight.scale.set(1.13, 0.71, 1.0);
    waistHighlight.position.set(0, 0.076, 0);
    spineGroup.add(waistHighlight);

    // Delicate thin spaghetti straps arcing cleanly over bare tanned shoulders
    for (const sx of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.0045, 6, 16, Math.PI), outfitMat);
      strap.rotation.y = Math.PI / 2;
      strap.position.set(sx * 0.112 * metrics.shoulderScale, 0.386, 0.006);
      spineGroup.add(strap);
    }
  } else {
    // Dainty gold waist/belly chain hugging her slim bare midriff
    const bellyChain = new THREE.Mesh(
      new THREE.TorusGeometry(0.101 * metrics.bellyScale, 0.0032, 6, 26),
      goldMat,
    );
    bellyChain.rotation.x = Math.PI / 2 + 0.06;
    bellyChain.scale.set(1.13, 0.71, 1.0);
    bellyChain.position.set(0, 0.068, 0.002);
    spineGroup.add(bellyChain);

    // Flush bikini back strap + dainty tied bow across her bare sun-kissed back
    const backBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.125 * metrics.shoulderScale, 0.005, 6, 24, Math.PI * 1.12),
      outfitMat,
    );
    backBand.rotation.x = Math.PI / 2;
    backBand.rotation.z = Math.PI * 0.44;
    backBand.scale.set(1.12, 0.7, 1.0);
    backBand.position.set(0, 0.275, 0);
    spineGroup.add(backBand);

    const backKnot = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), outfitMat);
    backKnot.position.set(0, 0.275, -0.09);
    spineGroup.add(backKnot);
    for (const sx of [-1, 1]) {
      const ribbon = new THREE.Mesh(new THREE.CapsuleGeometry(0.0035, 0.062, 4, 6), accentFabricMat);
      ribbon.position.set(sx * 0.014, 0.232, -0.091);
      ribbon.rotation.z = sx * 0.22;
      spineGroup.add(ribbon);
    }
  }

  // Natural Sculpted Full Bust Contour (anatomical teardrop slope blending smoothly into ribcage — NO round balloons!)
  const bustPts = [
    new THREE.Vector2(0.002, -0.072),
    new THREE.Vector2(0.048, -0.062),
    new THREE.Vector2(0.074, -0.032),
    new THREE.Vector2(0.08, 0.0), // natural fullness peak
    new THREE.Vector2(0.068, 0.036),
    new THREE.Vector2(0.044, 0.068), // soft upper slope into décolletage
    new THREE.Vector2(0.014, 0.088),
    new THREE.Vector2(0.001, 0.095),
  ];
  const bustGeo = new THREE.LatheGeometry(bustPts, 20);

  for (const sx of [-1, 1]) {
    // Upper décolletage skin contour blending smoothly into collarbone & chest
    const upperSkin = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 12), skinMat);
    upperSkin.scale.set(1.04, 0.86, 0.82);
    upperSkin.position.set(sx * 0.058, 0.324, 0.064);
    spineGroup.add(upperSkin);

    // Sculpted teardrop bust wrapped smoothly in satin bodice / halter bikini cup
    const bust = new THREE.Mesh(bustGeo, outfitMat);
    bust.scale.set(1.02, 0.96, 1.12);
    bust.position.set(sx * 0.062, 0.285, 0.072);
    bust.rotation.y = sx * 0.16;
    bust.rotation.x = 0.14;
    bust.castShadow = true;
    spineGroup.add(bust);
    hitMeshes.push(bust);

    if (isBikini) {
      // Sleek halter string rising smoothly from bikini triangle peak to behind her neck
      const halterStrap = new THREE.Mesh(new THREE.CapsuleGeometry(0.0038, 0.185, 4, 8), outfitMat);
      halterStrap.position.set(sx * 0.052, 0.422, 0.058);
      halterStrap.rotation.z = sx * 0.22;
      halterStrap.rotation.x = -0.34;
      spineGroup.add(halterStrap);
    }
  }

  if (isBikini) {
    const centerRing = new THREE.Mesh(new THREE.TorusGeometry(0.01, 0.0026, 6, 14), goldMat);
    centerRing.position.set(0, 0.285, 0.118);
    spineGroup.add(centerRing);
  }

  // Delicate gold chain necklace resting gracefully on collarbones
  if (spec.hasGoldChain) {
    const necklace = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.0036, 8, 22), goldMat);
    necklace.rotation.x = Math.PI / 2 + 0.56;
    necklace.position.set(0, 0.45, 0.052);
    spineGroup.add(necklace);

    const pendant = new THREE.Mesh(new THREE.OctahedronGeometry(0.0095, 0), goldMat);
    pendant.position.set(0, 0.402, 0.092);
    spineGroup.add(pendant);
  }

  // ============================================================================
  // 4. GLAMOROUS LATINA HEAD, EXPRESSIVE FACE, GOLD HOOPS & SILKY FLOWING HAIR
  // ============================================================================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.492, 0.006);
  spineGroup.add(headGroup);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.047, 0.102, 14), skinMat);
  neck.position.set(0, 0.042, 0.002);
  neck.rotation.x = 0.05;
  headGroup.add(neck);

  // Sculpted oval feminine cranium & soft heart-shaped jawline
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.096, 18, 16), skinMat);
  cranium.scale.set(0.86, 1.03, 0.96);
  cranium.position.set(0, 0.186, -0.002);
  cranium.castShadow = true;
  headGroup.add(cranium);
  hitMeshes.push(cranium);

  const jaw = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.04, 0.08, 14), skinMat);
  jaw.scale.set(0.88, 1.0, 1.02);
  jaw.position.set(0, 0.126, 0.012);
  jaw.rotation.x = 0.08;
  headGroup.add(jaw);

  const chin = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), skinMat);
  chin.scale.set(0.86, 0.7, 0.88);
  chin.position.set(0, 0.092, 0.033);
  headGroup.add(chin);

  // Refined slender nose
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.034, 8), skinMat);
  nose.rotation.x = Math.PI * 0.42;
  nose.position.set(0, 0.166, 0.09);
  headGroup.add(nose);

  // Expressive almond eyes, subtle dark winged eyeliner & arched brows
  const scleraMat = new THREE.MeshStandardMaterial({ color: 0xfefefe, roughness: 0.28 });
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x26150d, roughness: 0.18, metalness: 0.14 });
  const linerMat = new THREE.MeshStandardMaterial({ color: 0x0c0a09, roughness: 0.48 });
  for (const sx of [-1, 1]) {
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), scleraMat);
    sclera.scale.set(1.22, 0.72, 0.55);
    sclera.position.set(sx * 0.033, 0.184, 0.081);
    headGroup.add(sclera);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), irisMat);
    iris.position.set(sx * 0.033, 0.184, 0.087);
    headGroup.add(iris);

    const liner = new THREE.Mesh(new THREE.BoxGeometry(0.033, 0.005, 0.008), linerMat);
    liner.position.set(sx * 0.036, 0.191, 0.087);
    liner.rotation.z = sx * 0.14;
    headGroup.add(liner);

    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.0036, 0.026, 4, 6), hairMat);
    brow.rotation.z = Math.PI / 2 - sx * 0.18;
    brow.position.set(sx * 0.033, 0.204, 0.087);
    headGroup.add(brow);

    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), skinMat);
    ear.scale.set(0.36, 1.04, 0.62);
    ear.position.set(sx * 0.082, 0.166, -0.004);
    headGroup.add(ear);

    // Oversized gold hoop earrings
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.023, 0.0026, 8, 18), goldMat);
    hoop.rotation.y = Math.PI / 2 - sx * 0.22;
    hoop.position.set(sx * 0.088, 0.135, 0.004);
    headGroup.add(hoop);
  }

  // Full glossy rose/crimson lips
  const lipColor = isBikini ? 0xcf3d62 : 0xb91c48;
  const lipMat = new THREE.MeshStandardMaterial({
    color: lipColor,
    roughness: 0.32,
    metalness: 0.06,
  });
  const upperLip = new THREE.Mesh(new THREE.CapsuleGeometry(0.0068, 0.023, 4, 8), lipMat);
  upperLip.rotation.z = Math.PI / 2;
  upperLip.position.set(0, 0.127, 0.078);
  headGroup.add(upperLip);

  const lowerLip = new THREE.Mesh(new THREE.CapsuleGeometry(0.0078, 0.02, 4, 8), lipMat);
  lowerLip.rotation.z = Math.PI / 2;
  lowerLip.position.set(0, 0.118, 0.077);
  headGroup.add(lowerLip);

  // Designer sunglasses (toggled on clear sunset)
  let sunglassesGroup: THREE.Group | undefined;
  if (spec.hasSunglasses) {
    sunglassesGroup = new THREE.Group();
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0x160a1e,
      roughness: 0.12,
      metalness: 0.82,
    });
    for (const sx of [-1, 1]) {
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.023, 12, 10), lensMat);
      lens.scale.set(1.36, 0.94, 0.2);
      lens.position.set(sx * 0.035, 0.184, 0.096);
      lens.rotation.y = sx * -0.16;
      lens.rotation.z = sx * 0.1;
      sunglassesGroup.add(lens);

      const temple = new THREE.Mesh(new THREE.BoxGeometry(0.0045, 0.0045, 0.09), goldMat);
      temple.position.set(sx * 0.066, 0.19, 0.05);
      sunglassesGroup.add(temple);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.004, 0.005), goldMat);
    bridge.position.set(0, 0.189, 0.1);
    sunglassesGroup.add(bridge);
    headGroup.add(sunglassesGroup);
  }

  // === SILKY SEAMLESS LONG WAVY LATINA HAIR (Zero bubble spheres or chunky tubes!) ===
  // Smooth cranial scalp dome with sleek volume wrapping the upper head cleanly
  const hairCrown = new THREE.Mesh(
    new THREE.SphereGeometry(0.108, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.66),
    hairMat,
  );
  hairCrown.scale.set(0.95, 1.08, 1.04);
  hairCrown.position.set(0, 0.196, -0.008);
  hairCrown.rotation.x = -0.18;
  hairCrown.castShadow = true;
  headGroup.add(hairCrown);

  // Subtle swept-bangs forehead wave curve framing her face naturally
  const sweptPart = new THREE.Mesh(
    new THREE.SphereGeometry(0.096, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.42),
    hairMat,
  );
  sweptPart.scale.set(0.98, 0.72, 1.06);
  sweptPart.position.set(0.008, 0.232, 0.012);
  sweptPart.rotation.set(0.16, 0, -0.14);
  headGroup.add(sweptPart);

  // Soft slender face-framing curtain strands hugging her temples & collarbones (tapered, NOT thick cylinders!)
  const sideStrandPts = [
    new THREE.Vector2(0.006, 0.0), // feathered pointed tip
    new THREE.Vector2(0.017, 0.05),
    new THREE.Vector2(0.024, 0.14),
    new THREE.Vector2(0.028, 0.23),
    new THREE.Vector2(0.016, 0.28),
  ];
  const sideStrandGeo = new THREE.LatheGeometry(sideStrandPts, 10);
  for (const sx of [-1, 1]) {
    const faceLock = new THREE.Mesh(sideStrandGeo, hairMat);
    faceLock.scale.set(0.75, 1.0, 1.15);
    faceLock.position.set(sx * 0.088, -0.035, 0.018);
    faceLock.rotation.set(0.08, 0, sx * -0.12);
    headGroup.add(faceLock);
  }

  // Articulated `hairFlowGroup` — seamless layered wavy cascade draping down her back with dynamic motion!
  const hairFlowGroup = new THREE.Group();
  hairFlowGroup.position.set(0, 0.205, -0.048);
  headGroup.add(hairFlowGroup);

  // Primary outer glossy wave curtain (wide lush cascade tapering smoothly to mid-back)
  const outerHairSheet = new THREE.Mesh(
    createFlowingHairSheetGeometry(0.215, 0.265, 0.145, 0.46, 0.048),
    hairMat,
  );
  outerHairSheet.position.set(0, 0.0, -0.012);
  outerHairSheet.castShadow = true;
  hairFlowGroup.add(outerHairSheet);

  // Secondary inner depth layer giving thick blowout volume & rich silhouette from side angles
  const innerHairSheet = new THREE.Mesh(
    createFlowingHairSheetGeometry(0.195, 0.23, 0.12, 0.41, 0.022),
    hairMat,
  );
  innerHairSheet.position.set(0, -0.012, 0.016);
  hairFlowGroup.add(innerHairSheet);

  // ============================================================================
  // 5. SLENDER BARE TANNED ARMS, HANDS & STACKED GOLD BANGLE BRACELETS
  // ============================================================================
  const armOffset = 0.168 * metrics.shoulderScale + 0.01;

  const makeFeminineArm = (xOff: number, isLeft: boolean) => {
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(xOff, 0.422, 0);

    const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.046 * limbR, 12, 10), skinMat);
    deltoid.scale.set(0.92, 1.0, 0.94);
    deltoid.position.set(isLeft ? 0.012 : -0.012, -0.008, 0);
    shoulderPivot.add(deltoid);

    const upperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.041 * limbR, 0.033 * limbR, 0.268, 12),
      skinMat,
    );
    upperArm.position.set(0, -0.138, 0);
    upperArm.castShadow = true;
    shoulderPivot.add(upperArm);
    hitMeshes.push(upperArm);

    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(0, -0.27, 0);
    shoulderPivot.add(elbowPivot);

    const elbowCap = new THREE.Mesh(new THREE.SphereGeometry(0.033 * limbR, 10, 8), skinMat);
    elbowPivot.add(elbowCap);

    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.033 * limbR, 0.022 * limbR, 0.252, 12),
      skinMat,
    );
    forearm.position.set(0, -0.128, 0.004);
    forearm.castShadow = true;
    elbowPivot.add(forearm);

    if (isLeft) {
      for (const by of [-0.22, -0.233, -0.246]) {
        const bangle = new THREE.Mesh(new THREE.TorusGeometry(0.025 * limbR, 0.0034, 6, 14), goldMat);
        bangle.rotation.x = Math.PI / 2;
        bangle.position.set(0, by, 0.004);
        elbowPivot.add(bangle);
      }
    }

    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.26, 0.007);
    elbowPivot.add(handGroup);

    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.02 * limbR, 0.062, 0.046 * limbR), skinMat);
    palm.position.set(0, -0.025, 0.002);
    handGroup.add(palm);

    const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.016 * limbR, 0.05, 0.04 * limbR), skinMat);
    fingers.position.set(isLeft ? 0.005 : -0.005, -0.072, 0.005);
    fingers.rotation.z = isLeft ? 0.18 : -0.18;
    handGroup.add(fingers);

    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.007 * limbR, 0.02, 4, 6), skinMat);
    thumb.position.set(isLeft ? 0.008 : -0.008, -0.031, 0.026);
    thumb.rotation.x = 0.44;
    thumb.rotation.z = isLeft ? 0.28 : -0.28;
    handGroup.add(thumb);

    return { shoulderPivot, elbowPivot };
  };

  const leftArmRig = makeFeminineArm(-armOffset, true);
  const rightArmRig = makeFeminineArm(armOffset, false);
  spineGroup.add(leftArmRig.shoulderPivot, rightArmRig.shoulderPivot);

  // ============================================================================
  // 6. DESIGNER WEATHER UMBRELLA
  // ============================================================================
  let umbrellaGroup: THREE.Group | undefined;
  if (spec.umbrellaHex) {
    umbrellaGroup = new THREE.Group();
    umbrellaGroup.position.set(0, -0.28, 0.03);
    umbrellaGroup.rotation.x = 0.92;

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 1.0, 6), goldMat);
    shaft.position.y = 0.5;
    umbrellaGroup.add(shaft);

    const canopyMat = new THREE.MeshStandardMaterial({
      color: spec.umbrellaHex,
      roughness: 0.32,
      metalness: 0.1,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
    });
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.58, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.44),
      canopyMat,
    );
    canopy.position.y = 0.48;
    umbrellaGroup.add(canopy);
    umbrellaGroup.visible = false;
    leftArmRig.elbowPivot.add(umbrellaGroup);
  }

  const rig: CharacterRig = {
    root,
    bodyGroup,
    pelvisGroup,
    spineGroup,
    headGroup,
    hairFlowGroup,
    torso: torsoBase,
    leftArm: leftArmRig.shoulderPivot,
    rightArm: rightArmRig.shoulderPivot,
    leftElbow: leftArmRig.elbowPivot,
    rightElbow: rightArmRig.elbowPivot,
    leftLeg: leftLegRig.hipPivot,
    rightLeg: rightLegRig.hipPivot,
    leftKnee: leftLegRig.kneePivot,
    rightKnee: rightLegRig.kneePivot,
    leftAnkle: leftLegRig.anklePivot,
    rightAnkle: rightLegRig.anklePivot,
    hitMeshes,
    umbrellaGroup,
    sunglassesGroup,
    isCarryingUmbrella: false,
    applyWeatherGear: (weather: WeatherKind, rainIntensity: number) => {
      const state = getWeatherClothingState(weather, rainIntensity, spec);
      if (umbrellaGroup) umbrellaGroup.visible = state.showUmbrella;
      if (sunglassesGroup) sunglassesGroup.visible = state.showSunglasses;
      rig.isCarryingUmbrella = state.showUmbrella;
      for (const m of fabricMaterials) {
        m.roughness = state.fabricRoughness * 0.72;
      }
    },
  };

  return rig;
}
