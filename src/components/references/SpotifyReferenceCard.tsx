import { useState, useCallback } from 'react';
import { formatDurationMs } from '../../lib/formatDuration';
import { useSpotifyPlayerStore } from '../../stores/spotifyPlayerStore';
import { useSpotifyPlayTrack } from '../../hooks/useSpotifyPlayer';
import type { SpotifyReference } from '../../types';

interface SpotifyReferenceCardProps {
  ref_: SpotifyReference;
  onUpdateNotes: (id: number, notes: string) => void;
  onDelete: (id: number) => void;
}

function SpotifyProgressBar({
  position,
  duration,
  onSeek,
}: {
  position: number;
  duration: number;
  onSeek: (ms: number) => void;
}) {
  const pct = duration > 0 ? (position / duration) * 100 : 0;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(Math.round(ratio * duration));
  };

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <span className="text-[9px] text-text-muted w-8 text-right tabular-nums">
        {formatDurationMs(position)}
      </span>
      <div
        className="flex-1 h-1 bg-bg-surface rounded cursor-pointer group"
        onClick={handleClick}
      >
        <div
          className="h-full bg-green-500 rounded transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[9px] text-text-muted w-8 tabular-nums">
        {formatDurationMs(duration)}
      </span>
    </div>
  );
}

export function SpotifyReferenceCard({ ref_, onUpdateNotes, onDelete }: SpotifyReferenceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(ref_.notes);

  const authStatus = useSpotifyPlayerStore((s) => s.authStatus);
  const isReady = useSpotifyPlayerStore((s) => s.isReady);
  const currentTrackUri = useSpotifyPlayerStore((s) => s.currentTrackUri);
  const isPlaying = useSpotifyPlayerStore((s) => s.isPlaying);
  const position = useSpotifyPlayerStore((s) => s.position);
  const duration = useSpotifyPlayerStore((s) => s.duration);
  const player = useSpotifyPlayerStore((s) => s.player);
  const playTrack = useSpotifyPlayTrack();

  const trackUri = `spotify:track:${ref_.spotify_id}`;
  const isThisTrack = currentTrackUri === trackUri;
  const isThisPlaying = isThisTrack && isPlaying;
  const canUseSdk = authStatus?.logged_in && authStatus.is_premium && isReady && ref_.spotify_type === 'track';

  const typeBadge = ref_.spotify_type === 'track' ? 'Track' : 'Album';

  const handlePlayPause = useCallback(async () => {
    if (!player) return;
    if (isThisPlaying) {
      await player.pause();
    } else if (isThisTrack) {
      await player.resume();
    } else {
      await playTrack(trackUri);
    }
  }, [player, isThisPlaying, isThisTrack, playTrack, trackUri]);

  const handleSeek = useCallback(
    async (ms: number) => {
      if (player && isThisTrack) {
        await player.seek(ms);
      }
    },
    [player, isThisTrack]
  );

  return (
    <div
      className={`rounded-lg border bg-bg-elevated group ${
        isThisPlaying ? 'border-green-500/60' : 'border-border-default'
      }`}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Album art */}
        {ref_.album_art_url ? (
          <img
            src={ref_.album_art_url}
            alt=""
            className="h-12 w-12 rounded object-cover shrink-0"
          />
        ) : (
          <div className="h-12 w-12 rounded bg-bg-surface shrink-0 flex items-center justify-center text-text-muted">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-text-primary truncate">{ref_.name}</p>
            <span className="shrink-0 rounded bg-bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
              {typeBadge}
            </span>
          </div>
          <p className="text-[11px] text-text-secondary truncate">
            {ref_.artist_name}
            {ref_.spotify_type === 'track' && ref_.album_name && ` \u00b7 ${ref_.album_name}`}
          </p>
          {ref_.duration_ms && !isThisTrack && (
            <p className="text-[10px] text-text-muted mt-0.5">
              {formatDurationMs(ref_.duration_ms)}
            </p>
          )}
          {/* Progress bar when this track is active */}
          {canUseSdk && isThisTrack && (
            <SpotifyProgressBar
              position={position}
              duration={duration}
              onSeek={handleSeek}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {canUseSdk ? (
            <button
              onClick={handlePlayPause}
              className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                isThisPlaying
                  ? 'bg-green-600 text-white'
                  : 'bg-bg-surface text-text-secondary hover:bg-bg-surface'
              }`}
              title={isThisPlaying ? 'Pause' : 'Play'}
            >
              {isThisPlaying ? 'Pause' : isThisTrack ? 'Resume' : 'Play'}
            </button>
          ) : (
            <button
              onClick={() => setExpanded(!expanded)}
              className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                expanded
                  ? 'bg-green-600 text-white'
                  : 'bg-bg-surface text-text-secondary hover:bg-bg-surface'
              }`}
              title={expanded ? 'Collapse player' : 'Play preview'}
            >
              {expanded ? 'Hide' : 'Play'}
            </button>
          )}
          <a
            href={ref_.spotify_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded bg-bg-surface px-2 py-1 text-[10px] text-text-secondary hover:bg-bg-surface transition-colors"
            title="Open in Spotify"
            onClick={(e) => {
              e.preventDefault();
              import('@tauri-apps/plugin-opener').then(({ openUrl }) => openUrl(ref_.spotify_url));
            }}
          >
            Open
          </a>
          <button
            onClick={() => onDelete(ref_.id)}
            className="text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
            title="Remove"
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Spotify embed fallback (when not using SDK) */}
      {expanded && !canUseSdk && (
        <div className="px-3 pb-3">
          <iframe
            src={`https://open.spotify.com/embed/${ref_.spotify_type}/${ref_.spotify_id}?theme=0`}
            width="100%"
            height="80"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded"
          />
        </div>
      )}

      {/* Notes */}
      <div className="border-t border-border-default/50 px-3 py-2">
        {editingNotes ? (
          <textarea
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            onBlur={() => {
              if (notesValue !== ref_.notes) {
                onUpdateNotes(ref_.id, notesValue);
              }
              setEditingNotes(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setNotesValue(ref_.notes);
                setEditingNotes(false);
              }
            }}
            autoFocus
            rows={2}
            className="w-full rounded border border-border-default bg-bg-primary px-2 py-1 text-xs text-text-secondary focus:border-green-500 focus:outline-none resize-none"
          />
        ) : (
          <p
            onClick={() => {
              setNotesValue(ref_.notes);
              setEditingNotes(true);
            }}
            className="text-xs text-text-muted cursor-pointer hover:text-text-secondary transition-colors"
          >
            {ref_.notes || 'Click to add notes...'}
          </p>
        )}
      </div>
    </div>
  );
}
