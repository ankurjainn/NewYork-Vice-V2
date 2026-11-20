import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { HumanGaitPose } from './simulation';

export type CharacterAnimSlot = 'idle' | 'walk' | 'run' | 'jump' | 'punch';

export type HumanoidBoneRole =
  | 'hips'
  | 'spine'
  | 'chest'
  | 'neck'
  | 'head'
  | 'leftUpperLeg'
  | 'leftLowerLeg'
  | 'leftFoot'
  | 'rightUpperLeg'
  | 'rightLowerLeg'
  | 'rightFoot'
  | 'leftUpperArm'
  | 'leftLowerArm'
  | 'rightUpperArm'
  | 'rightLowerArm';

export interface ModelBounds3D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface ModelNormalizationResult {
  scale: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  rawHeight: number;
}

export interface CustomGlbSummary {
  id: string;
  name: string;
  facingFlip: boolean;
  isRigged: boolean;
  boneCount: number;
  animationMode: 'clips' | 'procedural_rig' | 'static_preview';
  slots: Record<CharacterAnimSlot, string | null>;
  clipNames: string[];
  extraAnimCount: number;
}

export interface StoredGlbAnimClip {
  id: string;
  fileName: string;
  slotHint?: CharacterAnimSlot;
  buffer: ArrayBuffer;
}

export interface StoredGlbCharacterRecord {
  id: string;
  name: string;
  fileName: string;
  buffer: ArrayBuffer;
  facingFlip: boolean;
  extraAnims: StoredGlbAnimClip[];
  createdAt: number;
}

// ---------------------------------------------------------------------------
// PURE TESTABLE LOGIC (no WebGL required)
// ---------------------------------------------------------------------------

/**
 * Classifies Meshy.ai, Mixamo, Ready Player Me, and Blender animation clip names
 * into canonical third-person protagonist locomotion slots.
 */
export function classifyAnimationClipName(name: string): CharacterAnimSlot | null {
  const n = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!n) return null;

  if (/(punch|boxing|jab|hook|kick|attack|melee|fight|hit|slap|strike|combat)/.test(n)) {
    return 'punch';
  }
  if (/(jump|leap|fall|airborne|land|hop)/.test(n)) {
    return 'jump';
  }
  if (/(sprint|run|jog|dash|fast run|running)/.test(n)) {
    return 'run';
  }
  if (/(walk|catwalk|strut|stride|stroll|walking|locomotion|move)/.test(n)) {
    return 'walk';
  }
  if (/(idle|stand|breath|wait|pose|rest|breathing|relaxed)/.test(n)) {
    return 'idle';
  }
  return null;
}

/** Default standing height (in world meters) for the main protagonist (+18% over 1.70m to match NYC NPC scale) */
export const PLAYER_GLB_TARGET_HEIGHT = 2.0;

/** Canonical main-game HUD names for the 2 protagonist looks */
export const PLAYER_GLB_DISPLAY_LABELS = ['Red Dress', 'Jeans Top'] as const;

/**
 * Resolves the clean main-game display name ('Red Dress' or 'Jeans Top') for
 * up to 2 stored protagonist .GLB files regardless of raw Meshy/Mixamo filenames.
 */
export function resolveGlbCharacterDisplayName(
  index: number,
  rawName: string,
  fileName = '',
): string {
  const combined = `${rawName} ${fileName}`.toLowerCase();
  const hintsJeans = /(jeans|denim|crop|top|casual|pant|trouser|blue)/.test(combined);
  const hintsRedDress = /(red|dress|crimson|gown|satin|scarlet|mini)/.test(combined);

  if (hintsJeans && !hintsRedDress) return PLAYER_GLB_DISPLAY_LABELS[1];
  if (hintsRedDress && !hintsJeans) return PLAYER_GLB_DISPLAY_LABELS[0];
  return PLAYER_GLB_DISPLAY_LABELS[Math.abs(index) % PLAYER_GLB_DISPLAY_LABELS.length];
}

/**
 * Computes uniform scale and ground-planted offsets so any uploaded GLB character
 * (whether exported in meters, centimeters, or arbitrary Meshy units) stands at
 * `targetHeight` meters with feet planted flush on y = 0 and centered on X/Z.
 */
export function computeModelNormalization(
  bounds: ModelBounds3D,
  targetHeight = PLAYER_GLB_TARGET_HEIGHT,
): ModelNormalizationResult {
  const rawHeight = Math.max(0.0001, bounds.maxY - bounds.minY);
  const scale = targetHeight / rawHeight;
  const centerX = (bounds.minX + bounds.maxX) * 0.5;
  const centerZ = (bounds.minZ + bounds.maxZ) * 0.5;

  return {
    scale,
    offsetX: -centerX * scale,
    offsetY: -bounds.minY * scale,
    offsetZ: -centerZ * scale,
    rawHeight,
  };
}

/**
 * Matches Mixamo, Meshy.ai, VRM, Ready Player Me, and Blender humanoid bone names
 * to canonical limb roles for procedural animation fallback when a rigged GLB has no clips.
 */
export function matchHumanoidBoneRole(boneName: string): HumanoidBoneRole | null {
  const raw = boneName.toLowerCase();
  // Strip common rig prefixes like mixamorig:, Armature|, etc.
  const n = raw.replace(/^.*[:|]/, '').replace(/^mixamorig\d*_?/, '').replace(/[^a-z0-9]/g, '');
  if (!n) return null;

  const isLeft =
    /^l(?=[A-Z_]|eft|eg|arm|up|fore|thigh|shin|calf|foot|hand|shoulder)/.test(boneName.replace(/^.*[:|]/, '').replace(/^mixamorig\d*_?/i, '')) ||
    n.includes('left') ||
    /(^|_)l$/.test(raw) ||
    raw.endsWith('.l') ||
    raw.endsWith('_l');
  const isRight =
    !isLeft &&
    (/^r(?=[A-Z_]|ight|eg|arm|up|fore|thigh|shin|calf|foot|hand|shoulder)/.test(boneName.replace(/^.*[:|]/, '').replace(/^mixamorig\d*_?/i, '')) ||
      n.includes('right') ||
      /(^|_)r$/.test(raw) ||
      raw.endsWith('.r') ||
      raw.endsWith('_r'));

  if (n === 'hips' || n === 'pelvis' || n === 'rootpelvis' || n === 'hip') return 'hips';
  if (n === 'spine2' || n === 'spine02' || n === 'upperchest' || n === 'chest') return 'chest';
  if (n === 'spine' || n === 'spine1' || n === 'spine01') return 'spine';
  if (n.includes('neck')) return 'neck';
  if (n === 'head' || n === 'headtop') return 'head';

  if (isLeft) {
    if (n.includes('upleg') || n.includes('upperleg') || n.includes('thigh')) return 'leftUpperLeg';
    if (n.includes('forearm') || n.includes('lowerarm') || n.includes('elbow')) return 'leftLowerArm';
    if ((n.includes('arm') || n.includes('upperarm')) && !n.includes('shoulder') && !n.includes('clavicle') && !n.includes('hand')) {
      return 'leftUpperArm';
    }
    if (n.includes('foot') || n.includes('ankle')) return 'leftFoot';
    if (n.includes('leg') || n.includes('shin') || n.includes('calf') || n.includes('knee')) return 'leftLowerLeg';
  }

  if (isRight) {
    if (n.includes('upleg') || n.includes('upperleg') || n.includes('thigh')) return 'rightUpperLeg';
    if (n.includes('forearm') || n.includes('lowerarm') || n.includes('elbow')) return 'rightLowerArm';
    if ((n.includes('arm') || n.includes('upperarm')) && !n.includes('shoulder') && !n.includes('clavicle') && !n.includes('hand')) {
      return 'rightUpperArm';
    }
    if (n.includes('foot') || n.includes('ankle')) return 'rightFoot';
    if (n.includes('leg') || n.includes('shin') || n.includes('calf') || n.includes('knee')) return 'rightLowerLeg';
  }

  return null;
}

/**
 * Strips X and Z horizontal root-motion drift from root/hips position tracks so
 * walking/running mocap clips stay cleanly locked to our gameplay physics collider.
 */
export function stripHorizontalRootMotion(clip: THREE.AnimationClip): THREE.AnimationClip {
  const cloned = clip.clone();
  for (const track of cloned.tracks) {
    if (!track.name.endsWith('.position')) continue;
    const bonePart = track.name.slice(0, -'.position'.length).toLowerCase();
    const isRootOrHips =
      bonePart.includes('hips') ||
      bonePart.includes('pelvis') ||
      bonePart === 'root' ||
      bonePart.endsWith('.root') ||
      bonePart.endsWith('/root') ||
      bonePart.includes('armature');
    if (!isRootOrHips) continue;
    if (track.values.length < 3) continue;

    const baseX = track.values[0];
    const baseZ = track.values[2];
    for (let i = 0; i < track.values.length; i += 3) {
      track.values[i] = baseX;
      track.values[i + 2] = baseZ;
    }
  }
  return cloned;
}

// ---------------------------------------------------------------------------
// THREE.JS GLB CHARACTER CONTROLLER
// ---------------------------------------------------------------------------

const _eulerTmp = new THREE.Euler();
const _quatDelta = new THREE.Quaternion();

export interface CustomGlbUpdateInput {
  dt: number;
  speed: number;
  grounded: boolean;
  vy: number;
  punchTimer: number;
  punchDuration: number;
  pose: HumanGaitPose;
  simTime: number;
}

export class CustomGlbCharacterController {
  public readonly root: THREE.Group;
  private readonly facingPivot: THREE.Group;
  private readonly modelContainer: THREE.Group;
  private readonly shadowMesh: THREE.Mesh;
  private readonly loader = new GLTFLoader();

  private loadedScene: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private actions: Partial<Record<CharacterAnimSlot, THREE.AnimationAction>> = {};
  private slotClipNames: Record<CharacterAnimSlot, string | null> = {
    idle: null,
    walk: null,
    run: null,
    jump: null,
    punch: null,
  };
  private allClipNames: string[] = [];
  private activeSlot: CharacterAnimSlot | null = null;

  // Rigged bone map for procedural animation fallback when a GLB has bones but 0 clips
  private boneMap: Partial<Record<HumanoidBoneRole, THREE.Bone>> = {};
  private restQuats: Partial<Record<HumanoidBoneRole, THREE.Quaternion>> = {};
  private restHipsY = 0;
  private totalBones = 0;
  private isRigged = false;
  private extraAnimCount = 0;
  private modelId = '';
  private modelName = '';
  private facingFlip = false;
  private wasPunching = false;

  constructor(shadowTex: THREE.Texture) {
    this.root = new THREE.Group();
    this.root.name = 'CustomGlbPlayerRoot';

    this.facingPivot = new THREE.Group();
    this.facingPivot.name = 'CustomGlbFacingPivot';
    this.root.add(this.facingPivot);

    this.modelContainer = new THREE.Group();
    this.modelContainer.name = 'CustomGlbModelContainer';
    this.facingPivot.add(this.modelContainer);

    this.shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.28, 1.28),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      }),
    );
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.025;
    this.root.add(this.shadowMesh);
  }

  public isLoaded(): boolean {
    return this.loadedScene !== null;
  }

  public getSummary(): CustomGlbSummary | null {
    if (!this.loadedScene) return null;
    const hasClips = Object.values(this.actions).some(Boolean);
    return {
      id: this.modelId,
      name: this.modelName,
      facingFlip: this.facingFlip,
      isRigged: this.isRigged,
      boneCount: this.totalBones,
      animationMode: hasClips ? 'clips' : this.isRigged ? 'procedural_rig' : 'static_preview',
      slots: { ...this.slotClipNames },
      clipNames: [...this.allClipNames],
      extraAnimCount: this.extraAnimCount,
    };
  }

  public setFacingFlip(flipped: boolean): void {
    this.facingFlip = flipped;
    this.facingPivot.rotation.y = flipped ? Math.PI : 0;
  }

  public async loadFromBuffer(
    id: string,
    name: string,
    buffer: ArrayBuffer,
    facingFlip = false,
    extraAnims: StoredGlbAnimClip[] = [],
  ): Promise<CustomGlbSummary> {
    const gltf = await this.parseGlbBuffer(buffer);
    this.clearCurrentModel();

    this.modelId = id;
    this.modelName = name;
    this.setFacingFlip(facingFlip);

    const model = gltf.scene;
    model.updateMatrixWorld(true);

    // Inspect meshes, shadows, frustum culling, and skeleton bones
    const bonesFound = new Set<THREE.Bone>();
    model.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
          mesh.frustumCulled = false;
          const skel = (mesh as THREE.SkinnedMesh).skeleton;
          if (skel) {
            for (const b of skel.bones) bonesFound.add(b);
          }
        }
        // Tune materials cleanly for NYC golden-hour PBR lighting
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if (m && 'envMapIntensity' in m) {
            (m as THREE.MeshStandardMaterial).envMapIntensity = 0.85;
          }
        }
      } else if ((obj as THREE.Bone).isBone) {
        bonesFound.add(obj as THREE.Bone);
      }
    });

    this.totalBones = bonesFound.size;
    this.isRigged = bonesFound.size >= 8;

    // Normalize bounding box to protagonist standing height (2.00m, +18% vs 1.70m), feet on y = 0
    const box = new THREE.Box3().setFromObject(model);
    if (!box.isEmpty()) {
      const norm = computeModelNormalization(
        {
          minX: box.min.x,
          maxX: box.max.x,
          minY: box.min.y,
          maxY: box.max.y,
          minZ: box.min.z,
          maxZ: box.max.z,
        },
        PLAYER_GLB_TARGET_HEIGHT,
      );
      model.scale.multiplyScalar(norm.scale);
      model.position.set(norm.offsetX, norm.offsetY, norm.offsetZ);
    }

    this.modelContainer.add(model);
    this.loadedScene = model;

    // Map humanoid bones for procedural animation fallback if no animation clips exist
    this.boneMap = {};
    this.restQuats = {};
    for (const bone of bonesFound) {
      const role = matchHumanoidBoneRole(bone.name);
      if (role && !this.boneMap[role]) {
        this.boneMap[role] = bone;
        this.restQuats[role] = bone.quaternion.clone();
      }
    }
    if (this.boneMap.hips) {
      this.restHipsY = this.boneMap.hips.position.y;
    }

    // Build AnimationMixer & register embedded clips
    this.mixer = new THREE.AnimationMixer(model);
    this.registerClips(gltf.animations, undefined, name);

    // Load any additional separate Meshy/Mixamo animation GLB buffers
    this.extraAnimCount = 0;
    for (const extra of extraAnims) {
      try {
        await this.addAnimationsFromBuffer(extra.buffer, extra.fileName, extra.slotHint);
      } catch {
        // Ignore broken extra clip gracefully
      }
    }

    // Start in idle or walk clip if available
    const startSlot: CharacterAnimSlot | null =
      this.actions.idle ? 'idle' : this.actions.walk ? 'walk' : this.actions.run ? 'run' : null;
    if (startSlot && this.actions[startSlot]) {
      this.activeSlot = startSlot;
      this.actions[startSlot]!.reset().setEffectiveWeight(1).play();
    }

    return this.getSummary()!;
  }

  public async addAnimationsFromBuffer(
    buffer: ArrayBuffer,
    fileName: string,
    slotHint?: CharacterAnimSlot,
  ): Promise<CustomGlbSummary | null> {
    if (!this.loadedScene || !this.mixer) return null;
    const gltf = await this.parseGlbBuffer(buffer);
    if (!gltf.animations || gltf.animations.length === 0) {
      throw new Error(`No animation clips found inside "${fileName}". Export with Animation enabled in Meshy or Mixamo.`);
    }
    this.registerClips(gltf.animations, slotHint, fileName);
    this.extraAnimCount += 1;

    if (!this.activeSlot) {
      const startSlot: CharacterAnimSlot | null =
        this.actions.idle ? 'idle' : this.actions.walk ? 'walk' : this.actions.run ? 'run' : null;
      if (startSlot && this.actions[startSlot]) {
        this.activeSlot = startSlot;
        this.actions[startSlot]!.reset().setEffectiveWeight(1).play();
      }
    }
    return this.getSummary();
  }

  private registerClips(
    clips: THREE.AnimationClip[],
    slotHint?: CharacterAnimSlot,
    sourceFileName?: string,
  ): void {
    if (!this.mixer || !clips || clips.length === 0) return;

    const fileHintSlot = slotHint ?? (sourceFileName ? classifyAnimationClipName(sourceFileName) : null);

    for (const rawClip of clips) {
      const cleanClip = stripHorizontalRootMotion(rawClip);
      const displayName = rawClip.name && rawClip.name !== 'mixamo.com' ? rawClip.name : sourceFileName || rawClip.name || 'Clip';
      if (!this.allClipNames.includes(displayName)) {
        this.allClipNames.push(displayName);
      }

      let slot = slotHint ?? classifyAnimationClipName(rawClip.name);
      if (!slot && fileHintSlot) {
        slot = fileHintSlot;
      }
      // If a single generic clip like "mixamo.com" or "Armature|mixamo.com|Layer0" is uploaded
      if (!slot) {
        if (!this.actions.idle) slot = 'idle';
        else if (!this.actions.walk) slot = 'walk';
        else if (!this.actions.run) slot = 'run';
        else slot = 'walk';
      }

      const action = this.mixer.clipAction(cleanClip);
      if (slot === 'punch' || slot === 'jump') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      } else {
        action.setLoop(THREE.LoopRepeat, Infinity);
      }

      // Stop previous action bound to this slot if overriding
      const prev = this.actions[slot];
      if (prev && prev !== action) {
        prev.stop();
      }
      this.actions[slot] = action;
      this.slotClipNames[slot] = displayName;
    }
  }

  private switchToSlot(nextSlot: CharacterAnimSlot, fadeSec = 0.18, forceRestart = false): void {
    const nextAction = this.actions[nextSlot];
    if (!nextAction) return;
    if (this.activeSlot === nextSlot && !forceRestart) return;

    const prevAction = this.activeSlot ? this.actions[this.activeSlot] : null;
    nextAction.enabled = true;
    nextAction.reset();
    nextAction.setEffectiveWeight(1);
    nextAction.play();

    if (prevAction && prevAction !== nextAction) {
      prevAction.crossFadeTo(nextAction, fadeSec, false);
    } else {
      nextAction.fadeIn(fadeSec);
    }
    this.activeSlot = nextSlot;
  }

  public update(input: CustomGlbUpdateInput): void {
    if (!this.loadedScene) return;
    const { dt, speed, grounded, punchTimer, pose, simTime } = input;
    const hasClips = Object.values(this.actions).some(Boolean);

    if (hasClips && this.mixer) {
      this.modelContainer.position.set(0, 0, 0);
      this.modelContainer.rotation.set(0, 0, 0);

      const isPunching = punchTimer > 0.01;
      let desired: CharacterAnimSlot = 'idle';

      if (isPunching && this.actions.punch) {
        desired = 'punch';
      } else if (!grounded && this.actions.jump) {
        desired = 'jump';
      } else if (speed > 5.4 && (this.actions.run || this.actions.walk)) {
        desired = this.actions.run ? 'run' : 'walk';
      } else if (speed > 0.35 && (this.actions.walk || this.actions.run)) {
        desired = this.actions.walk ? 'walk' : 'run';
      } else {
        desired = this.actions.idle ? 'idle' : this.actions.walk ? 'walk' : 'run';
      }

      const forceRestart = desired === 'punch' && !this.wasPunching;
      this.wasPunching = isPunching;

      if (this.actions[desired]) {
        this.switchToSlot(desired, desired === 'punch' ? 0.08 : 0.18, forceRestart);
      }

      // Scale playback speed proportionally to real locomotion speed so feet never skate
      const activeAction = this.activeSlot ? this.actions[this.activeSlot] : null;
      if (activeAction) {
        if (this.activeSlot === 'walk') {
          activeAction.setEffectiveTimeScale(Math.max(0.65, Math.min(1.85, speed / 3.6)));
        } else if (this.activeSlot === 'run') {
          activeAction.setEffectiveTimeScale(Math.max(0.75, Math.min(1.6, speed / 7.2)));
        } else if (this.activeSlot === 'idle') {
          activeAction.setEffectiveTimeScale(1.0);
        } else {
          activeAction.setEffectiveTimeScale(1.1);
        }
      }

      this.mixer.update(dt);
      // Slight natural banking lean on turns even with mocap clips
      this.modelContainer.rotation.z = pose.spineRollZ * 0.45;
      return;
    }

    // Fallback 1: Rigged humanoid skeleton without animation clips -> drive bones procedurally!
    if (this.isRigged && Object.keys(this.boneMap).length >= 4) {
      this.modelContainer.position.set(0, 0, 0);
      this.modelContainer.rotation.set(0, 0, 0);

      const applyBoneOffset = (role: HumanoidBoneRole, rx: number, ry: number, rz: number) => {
        const bone = this.boneMap[role];
        const rest = this.restQuats[role];
        if (!bone || !rest) return;
        _eulerTmp.set(rx, ry, rz, 'XYZ');
        _quatDelta.setFromEuler(_eulerTmp);
        bone.quaternion.copy(rest).multiply(_quatDelta);
      };

      if (this.boneMap.hips) {
        this.boneMap.hips.position.y = this.restHipsY + pose.hipsOffsetY * 0.65;
      }
      applyBoneOffset('hips', 0, pose.pelvisYaw * 0.85, pose.pelvisRollZ * 0.75);
      applyBoneOffset('spine', pose.spinePitchX * 0.6, pose.spineYaw * 0.55, pose.spineRollZ * 0.5);
      applyBoneOffset('chest', pose.spinePitchX * 0.4, pose.spineYaw * 0.45, pose.spineRollZ * 0.4);
      applyBoneOffset('head', pose.headPitch * 0.75, pose.headYaw * 0.75, 0);

      applyBoneOffset('leftUpperLeg', pose.leftHipX * 0.85, 0, pose.leftHipZ * 0.5);
      applyBoneOffset('leftLowerLeg', pose.leftKneeX * 0.9, 0, 0);
      applyBoneOffset('leftFoot', pose.leftAnkleX * 0.6, 0, 0);

      applyBoneOffset('rightUpperLeg', pose.rightHipX * 0.85, 0, pose.rightHipZ * 0.5);
      applyBoneOffset('rightLowerLeg', pose.rightKneeX * 0.9, 0, 0);
      applyBoneOffset('rightFoot', pose.rightAnkleX * 0.6, 0, 0);

      // Gently lower T-pose/A-pose arms down to natural relaxed sides + swing with gait
      applyBoneOffset('leftUpperArm', pose.leftShoulderX * 0.72, pose.leftShoulderY * 0.5, 0.78 + pose.leftShoulderZ * 0.5);
      applyBoneOffset('leftLowerArm', pose.leftElbowX * 0.6, 0, 0.08);

      applyBoneOffset('rightUpperArm', pose.rightShoulderX * 0.72, pose.rightShoulderY * 0.5, -0.78 + pose.rightShoulderZ * 0.5);
      applyBoneOffset('rightLowerArm', pose.rightElbowX * 0.6, 0, -0.08);
      return;
    }

    // Fallback 2: Static unrigged Meshy preview mesh -> clean subtle grounded step bob + turn banking
    const moveRatio = Math.min(1, speed / 7.5);
    const bobY = grounded ? Math.abs(Math.sin(simTime * (5.5 + moveRatio * 4.5))) * 0.045 * moveRatio : 0;
    const swayZ = grounded ? Math.sin(simTime * (5.5 + moveRatio * 4.5)) * 0.032 * moveRatio : 0;
    this.modelContainer.position.set(0, bobY, 0);
    this.modelContainer.rotation.set(moveRatio * 0.07, 0, swayZ + pose.spineRollZ * 0.45);
  }

  private parseGlbBuffer(buffer: ArrayBuffer): Promise<GLTF> {
    // Pass a fresh slice copy so ArrayBuffer is never detached from IndexedDB storage
    const copy = buffer.slice(0);
    return new Promise((resolve, reject) => {
      this.loader.parse(
        copy,
        '',
        (gltf) => resolve(gltf),
        (err) => reject(err instanceof Error ? err : new Error(String(err))),
      );
    });
  }

  public clearCurrentModel(): void {
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }
    this.actions = {};
    this.slotClipNames = { idle: null, walk: null, run: null, jump: null, punch: null };
    this.allClipNames = [];
    this.activeSlot = null;
    this.boneMap = {};
    this.restQuats = {};
    this.totalBones = 0;
    this.isRigged = false;
    this.extraAnimCount = 0;
    this.modelId = '';
    this.modelName = '';

    if (this.loadedScene) {
      this.modelContainer.remove(this.loadedScene);
      this.loadedScene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const mat of mats) {
            if (!mat) continue;
            const std = mat as THREE.MeshStandardMaterial;
            std.map?.dispose();
            std.normalMap?.dispose();
            std.roughnessMap?.dispose();
            std.metalnessMap?.dispose();
            std.emissiveMap?.dispose();
            mat.dispose();
          }
        }
      });
      this.loadedScene = null;
    }
  }

  public dispose(): void {
    this.clearCurrentModel();
    this.shadowMesh.geometry.dispose();
    (this.shadowMesh.material as THREE.Material).dispose();
  }
}

// ---------------------------------------------------------------------------
// BROWSER INDEXEDDB PERSISTENCE FOR USER-IMPORTED MESHY / MIXAMO .GLB MODELS
// ---------------------------------------------------------------------------

const IDB_NAME = 'ny_vice_custom_characters_v1';
const IDB_STORE = 'models';
const ACTIVE_KEY = 'ny_vice_active_glb_id';

function openGlbDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function listStoredGlbCharacters(): Promise<StoredGlbCharacterRecord[]> {
  const db = await openGlbDb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => {
        const items = (req.result as StoredGlbCharacterRecord[]) ?? [];
        items.sort((a, b) => a.createdAt - b.createdAt);
        resolve(items);
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function saveStoredGlbCharacter(record: StoredGlbCharacterRecord): Promise<void> {
  const db = await openGlbDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function deleteStoredGlbCharacter(id: string): Promise<void> {
  const db = await openGlbDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function getActiveStoredGlbId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveStoredGlbId(id: string | null): void {
  try {
    if (id) window.localStorage.setItem(ACTIVE_KEY, id);
    else window.localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // ignore storage errors
  }
}
