import { useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { ProjectAsset } from '../../types';

interface AssetCardProps {
  asset: ProjectAsset;
  onUpdateTags: (tags: string) => void;
  onDelete: () => void;
}

export function AssetCard({ asset, onUpdateTags, onDelete }: AssetCardProps) {
  const [editingTags, setEditingTags] = useState(false);
  const [tagValue, setTagValue] = useState(asset.tags);

  const commitTags = () => {
    setEditingTags(false);
    if (tagValue !== asset.tags) {
      onUpdateTags(tagValue);
    }
  };

  const handleOpen = () => {
    // Open the file with the system default application
    openUrl(asset.stored_path);
  };

  const handleReveal = () => {
    // Open the parent directory in Explorer
    const dir = asset.stored_path.replace(/[/\\][^/\\]+$/, '');
    openUrl(dir);
  };

  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 overflow-hidden group">
      {/* Preview area */}
      <div className="h-32 bg-neutral-900 flex items-center justify-center">
        {asset.asset_type === 'image' ? (
          <img
            src={convertFileSrc(asset.stored_path)}
            alt={asset.original_filename}
            className="h-full w-full object-cover"
          />
        ) : asset.asset_type === 'audio' ? (
          <svg className="h-12 w-12 text-neutral-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
          </svg>
        ) : (
          <svg className="h-12 w-12 text-neutral-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="p-2 space-y-1">
        <p className="text-xs font-medium text-white truncate" title={asset.original_filename}>
          {asset.original_filename}
        </p>
        <p className="text-[10px] text-neutral-500">
          {asset.asset_type} &middot; {new Date(asset.created_at + 'Z').toLocaleDateString()}
        </p>

        {/* Tags */}
        {editingTags ? (
          <input
            value={tagValue}
            onChange={(e) => setTagValue(e.target.value)}
            onBlur={commitTags}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTags();
              if (e.key === 'Escape') { setTagValue(asset.tags); setEditingTags(false); }
            }}
            autoFocus
            placeholder="Tags (comma-separated)"
            className="w-full rounded border border-neutral-600 bg-neutral-900 px-1 py-0.5 text-[10px] text-white focus:border-blue-500 focus:outline-none"
          />
        ) : (
          <div
            onClick={() => { setEditingTags(true); setTagValue(asset.tags); }}
            className="flex flex-wrap gap-1 cursor-pointer min-h-[16px]"
          >
            {asset.tags ? (
              asset.tags.split(',').map((tag, i) => (
                <span
                  key={i}
                  className="rounded-full bg-neutral-700 px-1.5 py-0.5 text-[10px] text-neutral-300"
                >
                  {tag.trim()}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-neutral-600">+ tags</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleOpen}
            className="rounded bg-neutral-700 px-2 py-0.5 text-[10px] text-neutral-300 hover:bg-neutral-600 transition-colors"
          >
            Open
          </button>
          <button
            onClick={handleReveal}
            className="rounded bg-neutral-700 px-2 py-0.5 text-[10px] text-neutral-300 hover:bg-neutral-600 transition-colors"
          >
            Reveal
          </button>
          <button
            onClick={onDelete}
            className="rounded bg-red-600/20 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-600/30 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
