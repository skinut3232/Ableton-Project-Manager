import { useState, useEffect, useRef } from 'react';
import { useSpotifySearch } from '../../hooks/useSpotify';
import { formatDurationMs } from '../../lib/formatDuration';
import type { SpotifySearchResult } from '../../types';

interface SpotifySearchProps {
  onAdd: (result: SpotifySearchResult) => void;
  addedIds: Set<string>;
}

export function SpotifySearch({ onAdd, addedIds }: SpotifySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifySearchResult[]>([]);
  const search = useSpotifySearch();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    timerRef.current = setTimeout(() => {
      search.mutate(
        { query: trimmed, limit: 10 },
        { onSuccess: (data) => setResults(data) }
      );
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const tracks = results.filter((r) => r.spotify_type === 'track');
  const albums = results.filter((r) => r.spotify_type === 'album');

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Spotify for tracks or albums..."
          autoFocus
          className="w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-green-500 focus:outline-none"
        />
        {search.isPending && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-500 border-t-green-500" />
          </div>
        )}
      </div>

      {search.isError && (
        <p className="text-xs text-red-400">{String(search.error)}</p>
      )}

      {results.length > 0 && (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-800/80">
          {tracks.length > 0 && (
            <>
              <div className="sticky top-0 bg-neutral-800 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-700">
                Tracks
              </div>
              {tracks.map((r) => (
                <SearchResultRow key={r.spotify_id} result={r} onAdd={onAdd} isAdded={addedIds.has(r.spotify_id)} />
              ))}
            </>
          )}
          {albums.length > 0 && (
            <>
              <div className="sticky top-0 bg-neutral-800 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-700">
                Albums
              </div>
              {albums.map((r) => (
                <SearchResultRow key={r.spotify_id} result={r} onAdd={onAdd} isAdded={addedIds.has(r.spotify_id)} />
              ))}
            </>
          )}
        </div>
      )}

      {query.trim() && !search.isPending && results.length === 0 && !search.isError && (
        <p className="text-xs text-neutral-500 text-center py-3">No results found</p>
      )}
    </div>
  );
}

function SearchResultRow({
  result,
  onAdd,
  isAdded,
}: {
  result: SpotifySearchResult;
  onAdd: (r: SpotifySearchResult) => void;
  isAdded: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-700/50 transition-colors">
      {result.album_art_url ? (
        <img
          src={result.album_art_url}
          alt=""
          className="h-10 w-10 rounded object-cover shrink-0"
        />
      ) : (
        <div className="h-10 w-10 rounded bg-neutral-700 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white truncate">{result.name}</p>
        <p className="text-[11px] text-neutral-400 truncate">
          {result.artist_name}
          {result.spotify_type === 'track' && result.album_name && ` \u00b7 ${result.album_name}`}
        </p>
      </div>
      {result.duration_ms && (
        <span className="text-[11px] text-neutral-500 shrink-0">
          {formatDurationMs(result.duration_ms)}
        </span>
      )}
      <button
        onClick={() => onAdd(result)}
        disabled={isAdded}
        className={`shrink-0 rounded px-2 py-1 text-xs font-medium transition-colors ${
          isAdded
            ? 'bg-neutral-700 text-neutral-500 cursor-default'
            : 'bg-green-600 text-white hover:bg-green-500'
        }`}
      >
        {isAdded ? 'Added' : '+'}
      </button>
    </div>
  );
}
