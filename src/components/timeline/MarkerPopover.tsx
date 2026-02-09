import { useState, useEffect, useRef } from 'react';
import { MARKER_TYPES } from '../../lib/constants';
import type { Marker, MarkerType } from '../../types';

interface MarkerPopoverProps {
  marker: Marker | null;
  isNew: boolean;
  position: { x: number; y: number };
  onSave: (data: { markerType: MarkerType; text: string }) => void;
  onDelete: () => void;
  onCancel: () => void;
  onConvertToTask?: (marker: Marker) => void;
}

export function MarkerPopover({
  marker,
  isNew,
  position,
  onSave,
  onDelete,
  onCancel,
  onConvertToTask,
}: MarkerPopoverProps) {
  const [markerType, setMarkerType] = useState<MarkerType>(marker?.type ?? 'note');
  const [text, setText] = useState(marker?.text ?? '');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMarkerType(marker?.type ?? 'note');
    setText(marker?.text ?? '');
  }, [marker]);

  // Close on Escape (capture phase to prevent AppLayout navigation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [onCancel]);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onCancel]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 w-72 rounded-lg border border-neutral-600 bg-neutral-800 shadow-xl p-3 space-y-3"
      style={{
        left: Math.min(position.x, window.innerWidth - 300),
        top: Math.min(position.y, window.innerHeight - 300),
      }}
    >
      {marker && (
        <p className="text-[10px] text-neutral-500">
          @ {formatTime(marker.timestamp_seconds)}
        </p>
      )}

      {/* Type selector */}
      <div>
        <label className="text-[10px] text-neutral-500 block mb-1">Type</label>
        <select
          value={markerType}
          onChange={(e) => setMarkerType(e.target.value as MarkerType)}
          className="w-full rounded border border-neutral-600 bg-neutral-900 px-2 py-1 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          {MARKER_TYPES.map((mt) => (
            <option key={mt.value} value={mt.value}>
              {mt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Text */}
      <div>
        <label className="text-[10px] text-neutral-500 block mb-1">Note</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Add a note..."
          autoFocus
          className="w-full rounded border border-neutral-600 bg-neutral-900 px-2 py-1 text-sm text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => onSave({ markerType, text })}
            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="rounded bg-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-600 transition-colors"
          >
            Cancel
          </button>
        </div>
        <div className="flex gap-2">
          {!isNew && marker && onConvertToTask && (
            <button
              onClick={() => onConvertToTask(marker)}
              className="rounded bg-purple-600/20 px-2 py-1 text-[10px] text-purple-300 hover:bg-purple-600/30 transition-colors"
              title="Convert to Task"
            >
              Task
            </button>
          )}
          {!isNew && (
            <button
              onClick={onDelete}
              className="rounded bg-red-600/20 px-2 py-1 text-[10px] text-red-400 hover:bg-red-600/30 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
