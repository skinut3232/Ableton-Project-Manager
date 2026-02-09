import { useState, useEffect, useRef, useCallback } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import { useAudioStore } from '../../stores/audioStore';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { useMarkers, useCreateMarker, useUpdateMarker, useDeleteMarker } from '../../hooks/useMarkers';
import { useCreateTask } from '../../hooks/useTasks';
import { MARKER_TYPES } from '../../lib/constants';
import { MarkerPopover } from './MarkerPopover';
import { MarkerList } from './MarkerList';
import type { Bounce, Project, Marker, MarkerType } from '../../types';

interface TimelineTabProps {
  project: Project;
  bounces: Bounce[];
}

export function TimelineTab({ project, bounces }: TimelineTabProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const [selectedBounce, setSelectedBounce] = useState<Bounce | null>(bounces[0] ?? null);
  const [popover, setPopover] = useState<{
    marker: Marker | null;
    isNew: boolean;
    position: { x: number; y: number };
  } | null>(null);
  const createMarkerRef = useRef<() => void>(() => {});

  const audioElement = useAudioStore((s) => s.audioElement);
  const currentBounce = useAudioStore((s) => s.currentBounce);
  const { play, seek } = useAudioPlayer();
  const { data: markers = [] } = useMarkers(project.id);
  const createMarker = useCreateMarker(project.id);
  const updateMarker = useUpdateMarker(project.id);
  const deleteMarker = useDeleteMarker(project.id);
  const createTask = useCreateTask(project.id);

  // Load bounce into audio player if needed
  useEffect(() => {
    if (selectedBounce && currentBounce?.id !== selectedBounce.id) {
      play(selectedBounce, project);
    }
  }, [selectedBounce]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current || !selectedBounce) return;

    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4b5563',
      progressColor: '#3b82f6',
      cursorColor: '#60a5fa',
      cursorWidth: 2,
      height: 128,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      media: audioElement,
      plugins: [regions],
    });

    wsRef.current = ws;

    // If audio element doesn't have the right source, load it
    const expectedSrc = convertFileSrc(selectedBounce.bounce_path);
    if (!audioElement.src.includes(selectedBounce.bounce_path.replace(/\\/g, '/')) && audioElement.src !== expectedSrc) {
      ws.load(expectedSrc);
    }

    // Click-to-seek is built in via the `media` option

    // Zoom via mouse wheel
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const currentZoom = ws.options.minPxPerSec ?? 0;
      const newZoom = Math.max(0, Math.min(500, currentZoom - e.deltaY * 0.5));
      ws.zoom(newZoom);
    };
    const container = waveformRef.current;
    container.addEventListener('wheel', handleWheel, { passive: false });

    // Double-click to place a marker at the clicked position
    const handleDblClick = () => {
      createMarkerRef.current();
    };
    container.addEventListener('dblclick', handleDblClick);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('dblclick', handleDblClick);
      ws.destroy();
      wsRef.current = null;
      regionsRef.current = null;
    };
  }, [selectedBounce?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render markers as regions
  useEffect(() => {
    const regions = regionsRef.current;
    if (!regions) return;

    // Clear existing regions
    regions.clearRegions();

    // Add markers as flag-styled point regions
    markers.forEach((marker) => {
      const typeInfo = MARKER_TYPES.find((mt) => mt.value === marker.type);
      const color = typeInfo?.color ?? '#6b7280';

      // Build flag DOM entirely with inline styles (CSS classes don't reliably
      // penetrate WaveSurfer's dynamically-created shadow-like DOM)
      const flagEl = document.createElement('div');
      Object.assign(flagEl.style, {
        position: 'absolute',
        top: '0',
        left: '-1px',
        cursor: 'pointer',
        zIndex: '10',
      });

      // Pennant (flag shape)
      const pennant = document.createElement('div');
      Object.assign(pennant.style, {
        width: '16px',
        height: '14px',
        backgroundColor: color,
        clipPath: 'polygon(0 0, 100% 0, 100% 40%, 65% 100%, 0 100%)',
        opacity: '0.92',
        transition: 'transform 0.15s ease, opacity 0.15s ease',
        filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))',
      });
      flagEl.appendChild(pennant);

      // Tooltip (hidden by default — shown via JS mouseenter/mouseleave)
      const tooltip = document.createElement('div');
      Object.assign(tooltip.style, {
        display: 'none',
        position: 'absolute',
        top: '16px',
        left: '0',
        whiteSpace: 'nowrap',
        background: 'rgba(17,17,17,0.95)',
        color: '#d4d4d4',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        lineHeight: '1.3',
        maxWidth: '200px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        pointerEvents: 'none',
        zIndex: '20',
      });
      const typeLabel = typeInfo?.label ?? 'Marker';
      const text = marker.text?.trim();
      if (text) {
        const typeSpan = document.createElement('span');
        Object.assign(typeSpan.style, { fontWeight: '600', color, marginRight: '4px' });
        typeSpan.textContent = typeLabel + ':';
        tooltip.appendChild(typeSpan);
        tooltip.appendChild(document.createTextNode(' ' + text));
      } else {
        tooltip.textContent = typeLabel;
      }
      flagEl.appendChild(tooltip);

      // Hover events (JS-driven, not CSS)
      flagEl.addEventListener('mouseenter', () => {
        tooltip.style.display = 'block';
        pennant.style.transform = 'scale(1.2)';
        pennant.style.opacity = '1';
      });
      flagEl.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
        pennant.style.transform = '';
        pennant.style.opacity = '0.92';
      });

      const region = regions.addRegion({
        id: `marker-${marker.id}`,
        start: marker.timestamp_seconds,
        content: flagEl,
        color: 'transparent',
        drag: true,
        resize: false,
      });

      // Style the vertical line to be thicker and colored
      const el = (region as any).element as HTMLElement | undefined;
      if (el) {
        el.style.borderLeft = `3px solid ${color}`;
        el.style.opacity = '0.85';
        el.style.zIndex = '3';
        el.style.backgroundColor = 'transparent';
      }
    });

    // Handle region click → open popover
    const handleRegionClick = (region: any, e: MouseEvent) => {
      const markerId = parseInt(region.id.replace('marker-', ''));
      const marker = markers.find((m) => m.id === markerId);
      if (marker) {
        setPopover({
          marker,
          isNew: false,
          position: { x: e.clientX, y: e.clientY },
        });
      }
    };
    regions.on('region-clicked', handleRegionClick);

    // Handle drag complete → update timestamp
    const handleRegionUpdate = (region: any) => {
      const markerId = parseInt(region.id.replace('marker-', ''));
      updateMarker.mutate({
        id: markerId,
        timestampSeconds: region.start,
      });
    };
    regions.on('region-updated', handleRegionUpdate);

    return () => {
      regions.un('region-clicked', handleRegionClick);
      regions.un('region-updated', handleRegionUpdate);
    };
  }, [markers, updateMarker]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts (M, N, P)
  const handleCreateMarkerAtPlayhead = useCallback(() => {
    const time = audioElement.currentTime;
    createMarker.mutate(
      {
        bounceId: selectedBounce?.id ?? null,
        timestampSeconds: time,
        markerType: 'note',
        text: '',
      },
      {
        onSuccess: (newMarker) => {
          setPopover({
            marker: newMarker,
            isNew: true,
            position: { x: window.innerWidth / 2 - 140, y: 300 },
          });
        },
      }
    );
  }, [audioElement, selectedBounce, createMarker]);

  // Keep ref in sync so the dblclick handler always calls the latest version
  createMarkerRef.current = handleCreateMarkerAtPlayhead;

  const seekToAdjacentMarker = useCallback(
    (direction: 'next' | 'prev') => {
      const currentTime = audioElement.currentTime;
      if (direction === 'next') {
        const next = markers.find((m) => m.timestamp_seconds > currentTime + 0.5);
        if (next) seek(next.timestamp_seconds);
      } else {
        const prev = [...markers].reverse().find((m) => m.timestamp_seconds < currentTime - 0.5);
        if (prev) seek(prev.timestamp_seconds);
      }
    },
    [audioElement, markers, seek]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleCreateMarkerAtPlayhead();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        seekToAdjacentMarker('next');
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        seekToAdjacentMarker('prev');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCreateMarkerAtPlayhead, seekToAdjacentMarker]);

  const handlePopoverSave = (data: { markerType: MarkerType; text: string }) => {
    if (!popover?.marker) return;
    updateMarker.mutate({
      id: popover.marker.id,
      markerType: data.markerType,
      text: data.text,
    });
    setPopover(null);
  };

  const handlePopoverDelete = () => {
    if (!popover?.marker) return;
    deleteMarker.mutate(popover.marker.id);
    setPopover(null);
  };

  const handleConvertToTask = (marker: Marker) => {
    createTask.mutate({
      title: marker.text || `Marker at ${Math.floor(marker.timestamp_seconds)}s`,
      category: 'Arrangement',
      linkedMarkerId: marker.id,
      linkedTimestampSeconds: marker.timestamp_seconds,
    });
    updateMarker.mutate({ id: marker.id, markerType: 'task' });
    setPopover(null);
  };

  if (bounces.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">&#127925;</p>
        <p className="text-neutral-400 mb-1">No bounces found</p>
        <p className="text-xs text-neutral-600">
          Export a bounce from Ableton to see the waveform timeline
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bounce selector */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-neutral-500">Bounce:</label>
        <select
          value={selectedBounce?.id ?? ''}
          onChange={(e) => {
            const b = bounces.find((b) => b.id === parseInt(e.target.value));
            if (b) setSelectedBounce(b);
          }}
          className="rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          {bounces.map((b) => (
            <option key={b.id} value={b.id}>
              {b.bounce_path.split(/[/\\]/).pop()}
            </option>
          ))}
        </select>
        <span className="text-[10px] text-neutral-600">
          Double-click or M: add marker | N/P: next/prev | Scroll: zoom
        </span>
      </div>

      {/* Waveform */}
      <div
        ref={waveformRef}
        className="rounded-lg border border-neutral-700 bg-neutral-900/50 overflow-hidden"
      />

      {/* Marker List */}
      <MarkerList
        markers={markers}
        onSeek={seek}
        onSelect={(marker, rect) => {
          setPopover({
            marker,
            isNew: false,
            position: { x: rect.right + 8, y: rect.top },
          });
        }}
      />

      {/* Marker Popover */}
      {popover && (
        <MarkerPopover
          marker={popover.marker}
          isNew={popover.isNew}
          position={popover.position}
          onSave={handlePopoverSave}
          onDelete={handlePopoverDelete}
          onCancel={() => setPopover(null)}
          onConvertToTask={handleConvertToTask}
        />
      )}
    </div>
  );
}
