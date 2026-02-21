import { useState, useMemo } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useAssets, useUploadAsset, useUpdateAsset, useDeleteAsset } from '../../hooks/useAssets';
import { useMoodBoard, usePinToMoodBoard, useUnpinFromMoodBoard, useSetCoverFromMoodboard } from '../../hooks/useCovers';
import { AssetCard } from './AssetCard';
import type { AssetType } from '../../types';

interface AssetsTabProps {
  projectId: number;
}

export function AssetsTab({ projectId }: AssetsTabProps) {
  const { data: assets = [] } = useAssets(projectId);
  const uploadAsset = useUploadAsset(projectId);
  const updateAsset = useUpdateAsset(projectId);
  const deleteAsset = useDeleteAsset(projectId);
  const { data: moodBoardPins = [] } = useMoodBoard(projectId);
  const pinToMoodBoard = usePinToMoodBoard(projectId);
  const unpinFromMoodBoard = useUnpinFromMoodBoard(projectId);
  const setCoverFromMoodboard = useSetCoverFromMoodboard(projectId);
  const [typeFilter, setTypeFilter] = useState<AssetType | 'all'>('all');
  const [search, setSearch] = useState('');

  const pinnedAssetIds = useMemo(
    () => new Set(moodBoardPins.map((p) => p.asset_id)),
    [moodBoardPins]
  );

  const filtered = useMemo(() => {
    let result = assets;
    if (typeFilter !== 'all') {
      result = result.filter((a) => a.asset_type === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.original_filename.toLowerCase().includes(q) ||
          a.tags.toLowerCase().includes(q)
      );
    }
    return result;
  }, [assets, typeFilter, search]);

  const handleUpload = async () => {
    const selected = await open({
      multiple: false,
      title: 'Select Asset',
    });
    if (!selected) return;
    uploadAsset.mutate(selected as string);
  };

  const handleTogglePin = (assetId: number) => {
    if (pinnedAssetIds.has(assetId)) {
      const pin = moodBoardPins.find((p) => p.asset_id === assetId);
      if (pin) unpinFromMoodBoard.mutate(pin.id);
    } else {
      pinToMoodBoard.mutate(assetId);
    }
  };

  const typeFilters: { value: AssetType | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'image', label: 'Images' },
    { value: 'audio', label: 'Audio' },
    { value: 'generic', label: 'Files' },
  ];

  return (
    <div className="space-y-4">
      {/* Mood Board Section */}
      {moodBoardPins.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider">Mood Board</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {moodBoardPins.map((pin) => (
              <div
                key={pin.id}
                className="relative shrink-0 w-24 h-24 rounded-lg overflow-hidden group border border-border-default"
              >
                <img
                  src={convertFileSrc(pin.stored_path)}
                  alt={pin.original_filename}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                  <button
                    onClick={() => setCoverFromMoodboard.mutate(pin.asset_id)}
                    className="rounded bg-brand-600 px-2 py-0.5 text-[10px] text-white hover:bg-brand-500"
                  >
                    Set Cover
                  </button>
                  <button
                    onClick={() => unpinFromMoodBoard.mutate(pin.id)}
                    className="rounded bg-bg-surface px-2 py-0.5 text-[10px] text-text-secondary hover:bg-bg-surface"
                  >
                    Unpin
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {typeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                typeFilter === f.value
                  ? 'bg-brand-600/20 text-brand-300'
                  : 'bg-bg-elevated text-text-muted hover:text-text-secondary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets..."
            className="rounded border border-border-default bg-bg-elevated px-3 py-1 text-sm text-text-primary placeholder-text-muted focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={handleUpload}
            disabled={uploadAsset.isPending}
            className="rounded bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-500 transition-colors disabled:opacity-50"
          >
            {uploadAsset.isPending ? 'Uploading...' : 'Upload Asset'}
          </button>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-secondary mb-1">No assets yet</p>
          <p className="text-xs text-text-muted">
            Upload images, audio files, or other project assets
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onUpdateTags={(tags) => updateAsset.mutate({ id: asset.id, tags })}
              onDelete={() => deleteAsset.mutate(asset.id)}
              isPinned={pinnedAssetIds.has(asset.id)}
              onTogglePin={() => handleTogglePin(asset.id)}
              onSetAsCover={
                asset.asset_type === 'image'
                  ? () => setCoverFromMoodboard.mutate(asset.id)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
