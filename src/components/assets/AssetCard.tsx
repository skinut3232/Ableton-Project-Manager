import { useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { formatTimestamp } from '../../lib/utils';
import type { ProjectAsset } from '../../types';

interface AssetCardProps {
  asset: ProjectAsset;
  onUpdateTags: (tags: string) => void;
  onDelete: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  onSetAsCover?: () => void;
}

export function AssetCard({ asset, onUpdateTags, onDelete, isPinned, onTogglePin, onSetAsCover }: AssetCardProps) {
  const [editingTags, setEditingTags] = useState(false);
  const [tagValue, setTagValue] = useState(asset.tags);

  const commitTags = () => {
    setEditingTags(false);
    if (tagValue !== asset.tags) {
      onUpdateTags(tagValue);
    }
  };

  const handleOpen = () => {
    openUrl(asset.stored_path);
  };

  const handleReveal = () => {
    const dir = asset.stored_path.replace(/[/\\][^/\\]+$/, '');
    openUrl(dir);
  };

  return (
    <div className="rounded-lg border border-border-default bg-bg-elevated/50 overflow-hidden group">
      {/* Preview area */}
      <div className="h-32 bg-bg-primary flex items-center justify-center relative">
        {asset.asset_type === 'image' ? (
          <img
            src={convertFileSrc(asset.stored_path)}
            alt={asset.original_filename}
            className="h-full w-full object-cover"
          />
        ) : asset.asset_type === 'audio' ? (
          <svg className="h-12 w-12 text-text-muted" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
          </svg>
        ) : (
          <svg className="h-12 w-12 text-text-muted" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
          </svg>
        )}
        {/* Pin indicator */}
        {isPinned && (
          <div className="absolute top-1 left-1 bg-brand-600/80 rounded-full p-0.5" title="Pinned to Mood Board">
            <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2 space-y-1">
        <p className="text-xs font-medium text-text-primary truncate" title={asset.original_filename}>
          {asset.original_filename}
        </p>
        <p className="text-[10px] text-text-muted">
          {asset.asset_type} &middot; {formatTimestamp(asset.created_at)}
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
            className="w-full rounded border border-border-default bg-bg-primary px-1 py-0.5 text-[10px] text-text-primary focus:border-brand-500 focus:outline-none"
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
                  className="rounded-full bg-bg-surface px-1.5 py-0.5 text-[10px] text-text-secondary"
                >
                  {tag.trim()}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-text-muted">+ tags</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleOpen}
            className="rounded bg-bg-surface px-2 py-0.5 text-[10px] text-text-secondary hover:bg-bg-surface transition-colors"
          >
            Open
          </button>
          <button
            onClick={handleReveal}
            className="rounded bg-bg-surface px-2 py-0.5 text-[10px] text-text-secondary hover:bg-bg-surface transition-colors"
          >
            Reveal
          </button>
          {asset.asset_type === 'image' && onTogglePin && (
            <button
              onClick={onTogglePin}
              className={`rounded px-2 py-0.5 text-[10px] transition-colors ${
                isPinned
                  ? 'bg-brand-600/20 text-brand-300 hover:bg-brand-600/30'
                  : 'bg-bg-surface text-text-secondary hover:bg-bg-surface'
              }`}
            >
              {isPinned ? 'Unpin' : 'Pin'}
            </button>
          )}
          {onSetAsCover && (
            <button
              onClick={onSetAsCover}
              className="rounded bg-bg-surface px-2 py-0.5 text-[10px] text-text-secondary hover:bg-bg-surface transition-colors"
            >
              Set Cover
            </button>
          )}
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
