import { useState } from 'react';
import { MARKER_TYPES } from '../../lib/constants';
import type { Marker, MarkerType } from '../../types';

interface MarkerListProps {
  markers: Marker[];
  onSeek: (seconds: number) => void;
  onSelect: (marker: Marker, rect: DOMRect) => void;
}

export function MarkerList({ markers, onSeek, onSelect }: MarkerListProps) {
  const [filter, setFilter] = useState<MarkerType | 'all'>('all');

  const filtered = filter === 'all' ? markers : markers.filter((m) => m.type === filter);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getColor = (type: MarkerType) =>
    MARKER_TYPES.find((mt) => mt.value === type)?.color ?? '#6b7280';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-300">
          Markers ({filtered.length})
        </h3>
        {/* Filter chips */}
        <div className="flex gap-1">
          {[{ value: 'all' as const, label: 'All' }, ...MARKER_TYPES].map((mt) => (
            <button
              key={mt.value}
              onClick={() => setFilter(mt.value as MarkerType | 'all')}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                filter === mt.value
                  ? 'bg-blue-600/20 text-blue-300'
                  : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {mt.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-neutral-500 py-4 text-center">
          No markers yet. Press M to add one at the current playhead.
        </p>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {filtered.map((marker) => (
            <button
              key={marker.id}
              onClick={(e) => {
                onSeek(marker.timestamp_seconds);
                onSelect(marker, e.currentTarget.getBoundingClientRect());
              }}
              className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-neutral-700/50 transition-colors group"
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: getColor(marker.type) }}
              />
              <span className="text-[10px] text-neutral-500 font-mono w-10 shrink-0">
                {formatTime(marker.timestamp_seconds)}
              </span>
              <span className="text-xs text-neutral-300 truncate flex-1">
                {marker.text || `(${MARKER_TYPES.find((mt) => mt.value === marker.type)?.label})`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
