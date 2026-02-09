import { useState, useMemo } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useAssets, useUploadAsset, useUpdateAsset, useDeleteAsset } from '../../hooks/useAssets';
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
  const [typeFilter, setTypeFilter] = useState<AssetType | 'all'>('all');
  const [search, setSearch] = useState('');

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

  const typeFilters: { value: AssetType | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'image', label: 'Images' },
    { value: 'audio', label: 'Audio' },
    { value: 'generic', label: 'Files' },
  ];

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {typeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                typeFilter === f.value
                  ? 'bg-blue-600/20 text-blue-300'
                  : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300'
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
            className="rounded border border-neutral-600 bg-neutral-800 px-3 py-1 text-sm text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleUpload}
            disabled={uploadAsset.isPending}
            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            {uploadAsset.isPending ? 'Uploading...' : 'Upload Asset'}
          </button>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-neutral-400 mb-1">No assets yet</p>
          <p className="text-xs text-neutral-600">
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
