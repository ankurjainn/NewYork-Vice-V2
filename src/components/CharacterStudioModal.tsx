import React, { useRef, useState } from 'react';
import type { CharacterAnimSlot, CustomGlbSummary } from '../game/glbCharacter';

export interface SavedGlbRosterItem {
  id: string;
  name: string;
  facingFlip: boolean;
  extraAnimCount: number;
}

interface CharacterStudioModalProps {
  activeModel: CustomGlbSummary | null;
  savedModels: SavedGlbRosterItem[];
  onImportModel: (file: File) => Promise<void>;
  onImportExtraAnimation: (file: File, slotHint?: CharacterAnimSlot) => Promise<void>;
  onSelectModel: (id: string | null) => Promise<void>;
  onToggleFacingFlip: () => Promise<void>;
  onDeleteModel: (id: string) => Promise<void>;
  onClose: () => void;
}

const ANIM_SLOTS: Array<{ slot: CharacterAnimSlot; label: string }> = [
  { slot: 'idle', label: 'Idle' },
  { slot: 'walk', label: 'Walk' },
  { slot: 'run', label: 'Run / Sprint' },
  { slot: 'jump', label: 'Jump' },
  { slot: 'punch', label: 'Punch' },
];

export const CharacterStudioModal: React.FC<CharacterStudioModalProps> = ({
  activeModel,
  savedModels,
  onImportModel,
  onImportExtraAnimation,
  onSelectModel,
  onToggleFacingFlip,
  onDeleteModel,
  onClose,
}) => {
  const modelInputRef = useRef<HTMLInputElement | null>(null);
  const animInputRef = useRef<HTMLInputElement | null>(null);
  const [targetAnimSlot, setTargetAnimSlot] = useState<CharacterAnimSlot | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const handleModelFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!/\.(glb|gltf)$/i.test(file.name)) {
      setStatusError('Please select a .glb file exported from Meshy.ai, Mixamo, or Blender.');
      return;
    }
    setBusy(true);
    setStatusError(null);
    try {
      await onImportModel(file);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Could not parse 3D model file.');
    } finally {
      setBusy(false);
      if (modelInputRef.current) modelInputRef.current.value = '';
    }
  };

  const handleAnimFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!/\.(glb|gltf)$/i.test(file.name)) {
      setStatusError('Animation files must be .glb format (export GLB with Animation from Meshy or Mixamo).');
      return;
    }
    setBusy(true);
    setStatusError(null);
    try {
      await onImportExtraAnimation(file, targetAnimSlot);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Could not load animation clip from GLB.');
    } finally {
      setBusy(false);
      setTargetAnimSlot(undefined);
      if (animInputRef.current) animInputRef.current.value = '';
    }
  };

  return (
    <div
      data-testid="character-studio-modal"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-[#161014] border border-[#f43f5e]/45 shadow-2xl text-[#fff7eb]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#fff0d6]/12 bg-[#1f131b]">
          <div>
            <div className="text-[11px] font-display uppercase tracking-[0.2em] text-[#fb7185]">
              New York Vice · 3D Protagonist Studio
            </div>
            <h2 className="text-xl font-display font-bold tracking-wide text-[#fff8eb] mt-0.5">
              Custom 3D Character (.GLB)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-[#2a1d24] hover:bg-[#3a2631] border border-[#fff0d6]/20 text-xs font-display uppercase tracking-wider cursor-pointer"
          >
            Close [ESC]
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Drag-and-drop / File Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void handleModelFiles(e.dataTransfer.files);
            }}
            className={`rounded-md border-2 border-dashed p-5 text-center transition-colors ${
              dragOver
                ? 'border-[#fb7185] bg-[#fb7185]/15'
                : 'border-[#fff0d6]/25 bg-[#1d141a]'
            }`}
          >
            <input
              ref={modelInputRef}
              type="file"
              accept=".glb,.gltf"
              className="hidden"
              onChange={(e) => void handleModelFiles(e.target.files)}
            />
            <input
              ref={animInputRef}
              type="file"
              accept=".glb,.gltf"
              className="hidden"
              onChange={(e) => void handleAnimFiles(e.target.files)}
            />

            <div className="text-sm font-display uppercase tracking-wider text-[#fbbf24]">
              Drop your Meshy.ai / Mixamo .GLB here
            </div>
            <p className="text-xs text-[#d6c5ab] mt-1.5 max-w-md mx-auto leading-relaxed">
              Automatically scales to 2.00m to match NYC crowds, plants feet on sidewalks, binds Walk / Run / Idle / Jump / Punch animations, and saves locally in your browser.
            </p>
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => modelInputRef.current?.click()}
                data-testid="upload-glb-btn"
                className="px-4 py-2 rounded bg-[#f43f5e] hover:bg-[#fb7185] disabled:opacity-50 text-white font-display font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
              >
                {busy ? 'Loading 3D Model...' : 'Import Character .GLB'}
              </button>
              {activeModel && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setTargetAnimSlot(undefined);
                    animInputRef.current?.click();
                  }}
                  className="px-3.5 py-2 rounded bg-[#271b22] hover:bg-[#372430] border border-[#f59e0b]/50 text-[#fbbf24] font-display font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
                >
                  + Add Animation .GLB
                </button>
              )}
            </div>
            {statusError && (
              <div className="mt-3 text-xs text-[#f87171] bg-[#ef4444]/10 border border-[#ef4444]/35 rounded px-3 py-2">
                {statusError}
              </div>
            )}
          </div>

          {/* Active Custom Model Status & Controls */}
          {activeModel && (
            <div className="rounded-md bg-[#1d141a] border border-[#2dd4bf]/35 p-4 flex flex-col gap-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-display uppercase tracking-[0.18em] text-[#2dd4bf]">
                    Active 3D Protagonist
                  </div>
                  <div className="text-base font-display font-bold text-[#fff8eb]">
                    {activeModel.name}
                  </div>
                  <div className="text-xs text-[#cbb89d] mt-0.5">
                    {activeModel.animationMode === 'clips'
                      ? `Rigged (${activeModel.boneCount} bones) · Playing embedded/imported skeletal clips`
                      : activeModel.animationMode === 'procedural_rig'
                        ? `Rigged (${activeModel.boneCount} bones) · Procedural humanoid gait active (add Walk/Idle .GLB clips for mocap)`
                        : 'Static mesh preview · Tip: Click "Rig" in Meshy.ai and export rigged .GLB for full body animation'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onToggleFacingFlip()}
                    className="px-3 py-1.5 rounded bg-[#2a1f26] hover:bg-[#3a2a34] border border-[#fff0d6]/20 text-xs font-display uppercase tracking-wider cursor-pointer"
                  >
                    {activeModel.facingFlip ? 'Facing: Flipped 180°' : 'Flip Facing 180°'}
                  </button>
                </div>
              </div>

              {/* Animation Slot Bindings */}
              <div>
                <div className="text-[10px] font-display uppercase tracking-[0.16em] text-[#f5b942] mb-2">
                  Skeletal Animation Slots (Click any slot to load a separate Meshy/Mixamo .GLB clip)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {ANIM_SLOTS.map(({ slot, label }) => {
                    const bound = activeModel.slots[slot];
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setTargetAnimSlot(slot);
                          animInputRef.current?.click();
                        }}
                        className={`rounded px-2.5 py-2 text-left border cursor-pointer transition-colors ${
                          bound
                            ? 'bg-[#122723] border-[#2dd4bf]/50 hover:border-[#2dd4bf]'
                            : 'bg-[#22181e] border-[#fff0d6]/15 hover:border-[#f59e0b]/60'
                        }`}
                      >
                        <div className="text-[10px] font-display uppercase tracking-wider text-[#f5b942]">
                          {label}
                        </div>
                        <div className="text-[11px] truncate mt-0.5 text-[#fff7eb]">
                          {bound ? bound : '+ Assign .GLB'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Saved Wardrobe / Character Roster */}
          <div className="rounded-md bg-[#1a1317] border border-[#fff0d6]/12 p-4">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[11px] font-display uppercase tracking-[0.16em] text-[#f5b942]">
                Saved 3D Outfits ({savedModels.length})
              </div>
              <span className="text-[11px] text-[#cbb89d]">
                Upload multiple .GLB outfits &amp; switch anytime
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between rounded px-3 py-2 bg-[#231920] border border-[#fff0d6]/10">
                <div>
                  <div className="text-xs font-display uppercase tracking-wider text-[#fff8eb]">
                    Built-in Camila (Procedural 6-Outfit Wardrobe)
                  </div>
                  <div className="text-[11px] text-[#cbb89d]">
                    Press [O] in-game to cycle built-in dresses &amp; bikinis
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy || !activeModel}
                  onClick={() => void onSelectModel(null)}
                  className={`px-3 py-1 rounded text-[11px] font-display uppercase tracking-wider cursor-pointer ${
                    !activeModel
                      ? 'bg-[#2dd4bf]/20 text-[#2dd4bf] border border-[#2dd4bf]/40 cursor-default'
                      : 'bg-[#31232c] hover:bg-[#43303c] text-[#fff7eb]'
                  }`}
                >
                  {!activeModel ? 'Active' : 'Switch'}
                </button>
              </div>

              {savedModels.map((item) => {
                const isActive = activeModel?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-2 rounded px-3 py-2 border ${
                      isActive
                        ? 'bg-[#261622] border-[#f43f5e]/60'
                        : 'bg-[#231920] border-[#fff0d6]/10'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-display uppercase tracking-wider text-[#fff8eb] truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-[#cbb89d]">
                        Saved locally{item.extraAnimCount > 0 ? ` · +${item.extraAnimCount} extra anims` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={busy || isActive}
                        onClick={() => void onSelectModel(item.id)}
                        className={`px-3 py-1 rounded text-[11px] font-display uppercase tracking-wider cursor-pointer ${
                          isActive
                            ? 'bg-[#f43f5e] text-white cursor-default'
                            : 'bg-[#31232c] hover:bg-[#43303c] text-[#fff7eb]'
                        }`}
                      >
                        {isActive ? 'Active' : 'Equip'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onDeleteModel(item.id)}
                        className="px-2.5 py-1 rounded bg-[#2d161b] hover:bg-[#4a1c25] text-[#f87171] text-[11px] font-display uppercase tracking-wider cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Meshy.ai Quick Guide */}
          <div className="rounded-md bg-[#191318] border border-[#f59e0b]/25 px-4 py-3 text-xs text-[#e3cfb2] leading-relaxed">
            <div className="font-display uppercase tracking-wider text-[#fbbf24] text-[11px] mb-1">
              Meshy.ai Export Checklist (Best Results)
            </div>
            <ol className="list-decimal list-inside space-y-1">
              <li>Finish generating &amp; texturing your character in Meshy (A-pose or T-pose works best).</li>
              <li>Click <span className="text-[#fff8eb] font-semibold">Rig</span> in Meshy (Humanoid auto-rig), then apply a <span className="text-[#fff8eb] font-semibold">Walk</span> or <span className="text-[#fff8eb] font-semibold">Idle</span> animation.</li>
              <li>Download as <span className="text-[#fff8eb] font-semibold">.GLB</span> and drop it above — optionally add separate <span className="text-[#fff8eb] font-semibold">Idle / Walk / Run / Jump / Punch</span> .GLB clips into the slots!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
