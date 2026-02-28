import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { AudioPlayer } from '../components/audio/AudioPlayer';
import { useAudioStore } from '../stores/audioStore';
import { useEffect, useCallback } from 'react';
import { useLibraryStore } from '../stores/libraryStore';
import { useSpotifyAuthStatus } from '../hooks/useSpotify';
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer';
import { useSpotifyPlayerStore } from '../stores/spotifyPlayerStore';
import { SyncIndicator } from '../components/ui/SyncIndicator';
import { TrialBanner } from '../components/license/TrialBanner';
import { useRestoreSession } from '../hooks/useAuth';

export function AppLayout() {
  const currentBounce = useAudioStore((s) => s.currentBounce);
  const navigate = useNavigate();
  const setSearchQuery = useLibraryStore((s) => s.setSearchQuery);

  // Restore Supabase session on mount
  const restoreSession = useRestoreSession();
  useEffect(() => {
    restoreSession.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Spotify auth status + SDK init
  const { data: authStatus } = useSpotifyAuthStatus();
  const setAuthStatus = useSpotifyPlayerStore((s) => s.setAuthStatus);
  useEffect(() => {
    if (authStatus) setAuthStatus(authStatus);
  }, [authStatus, setAuthStatus]);
  useSpotifyPlayer(authStatus?.logged_in ?? false, authStatus?.is_premium ?? false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

    if ((e.ctrlKey && e.key === 'f') || (e.key === '/' && !isInput)) {
      e.preventDefault();
      const searchInput = document.getElementById('search-input');
      searchInput?.focus();
    }

    if (e.key === ' ' && !isInput) {
      e.preventDefault();
      const audio = useAudioStore.getState().audioElement;
      if (audio.src) {
        if (audio.paused) audio.play();
        else audio.pause();
      }
    }

    if (e.key === 'Escape') {
      if (isInput) {
        (target as HTMLInputElement).blur();
        if (target.id === 'search-input') {
          setSearchQuery('');
        }
      } else {
        navigate('/');
      }
    }

    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('random-project'));
      return;
    }

    if (e.ctrlKey && e.key === 'r') {
      e.preventDefault();
      // Trigger refresh via custom event
      window.dispatchEvent(new CustomEvent('refresh-library'));
    }
  }, [navigate, setSearchQuery]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary">
      {/* Sidebar */}
      <nav className="w-48 shrink-0 border-r border-border-default bg-bg-secondary flex flex-col">
        <div className="p-4 border-b border-border-default">
          <h1 className="text-sm font-bold tracking-wide text-text-primary font-brand">SetCrate</h1>
          <p className="text-[10px] text-text-muted mt-0.5">Project Library</p>
        </div>
        <div className="flex flex-col gap-1 p-2 flex-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-bg-elevated text-text-primary'
                  : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
              }`
            }
          >
            <span>&#9835;</span> Library
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-bg-elevated text-text-primary'
                  : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
              }`
            }
          >
            <span>&#9881;</span> Settings
          </NavLink>
        </div>
        <div className="p-3 border-t border-border-default space-y-1">
          <SyncIndicator />
          <p className="text-[10px] text-text-muted">v1.0.0</p>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TrialBanner />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
        {currentBounce && <AudioPlayer />}
      </div>
    </div>
  );
}
