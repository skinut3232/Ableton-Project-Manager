import { useState } from 'react';
import {
  useSpotifyReferences,
  useAddSpotifyReference,
  useUpdateSpotifyReferenceNotes,
  useDeleteSpotifyReference,
  useSpotifyLogin,
  useSpotifyLogout,
} from '../../hooks/useSpotify';
import { useSpotifyPlayerStore } from '../../stores/spotifyPlayerStore';
import { SpotifySearch } from './SpotifySearch';
import { SpotifyReferenceCard } from './SpotifyReferenceCard';

interface SpotifyReferencesSectionProps {
  projectId: number;
}

export function SpotifyReferencesSection({ projectId }: SpotifyReferencesSectionProps) {
  const { data: refs = [] } = useSpotifyReferences(projectId);
  const addRef = useAddSpotifyReference(projectId);
  const updateNotes = useUpdateSpotifyReferenceNotes(projectId);
  const deleteRef = useDeleteSpotifyReference(projectId);
  const [showSearch, setShowSearch] = useState(false);

  const authStatus = useSpotifyPlayerStore((s) => s.authStatus);
  const login = useSpotifyLogin();
  const logout = useSpotifyLogout();

  const addedIds = new Set(refs.map((r) => r.spotify_id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-300">
          Reference Tracks ({refs.length})
        </h3>
        <div className="flex items-center gap-2">
          {authStatus?.logged_in ? (
            <>
              <span className="text-[10px] text-neutral-500">
                {authStatus.display_name}
              </span>
              <button
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="rounded px-2 py-1 text-[10px] text-neutral-400 hover:text-white transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={() => login.mutate()}
              disabled={login.isPending}
              className="rounded px-3 py-1 text-[10px] font-medium text-white transition-colors"
              style={{ backgroundColor: '#1DB954' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1ed760')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1DB954')}
            >
              {login.isPending ? 'Logging in...' : 'Login to Spotify'}
            </button>
          )}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-500 transition-colors"
          >
            {showSearch ? 'Close Search' : 'Search Spotify'}
          </button>
        </div>
      </div>

      {/* Premium warning for free users */}
      {authStatus?.logged_in && !authStatus.is_premium && (
        <div className="rounded bg-yellow-900/30 border border-yellow-700/50 px-3 py-2 text-[11px] text-yellow-400">
          Spotify Premium is required for full playback. You'll see 30-second previews instead.
        </div>
      )}

      {/* Login error */}
      {login.isError && (
        <div className="rounded bg-red-900/30 border border-red-700/50 px-3 py-2 text-[11px] text-red-400">
          Login failed: {String(login.error)}
        </div>
      )}

      {showSearch && (
        <SpotifySearch
          onAdd={(result) => addRef.mutate(result)}
          addedIds={addedIds}
        />
      )}

      {refs.length === 0 && !showSearch ? (
        <div className="text-center py-8">
          <p className="text-neutral-400 mb-1">No reference tracks yet</p>
          <p className="text-xs text-neutral-600">
            Search Spotify to add tracks or albums as references
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {refs.map((ref_) => (
            <SpotifyReferenceCard
              key={ref_.id}
              ref_={ref_}
              onUpdateNotes={(id, notes) => updateNotes.mutate({ id, notes })}
              onDelete={(id) => deleteRef.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
