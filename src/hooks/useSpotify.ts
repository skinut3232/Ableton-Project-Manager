import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tauriInvoke } from './useTauriInvoke';
import type { SpotifyAuthStatus, SpotifyReference, SpotifySearchResult } from '../types';
import { useSpotifyPlayerStore } from '../stores/spotifyPlayerStore';

export function useSpotifyReferences(projectId: number) {
  return useQuery({
    queryKey: ['spotifyReferences', projectId],
    queryFn: () => tauriInvoke<SpotifyReference[]>('get_spotify_references', { projectId }),
    enabled: projectId > 0,
  });
}

export function useSpotifySearch() {
  return useMutation({
    mutationFn: (args: { query: string; limit?: number }) =>
      tauriInvoke<SpotifySearchResult[]>('spotify_search', args),
  });
}

export function useAddSpotifyReference(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (result: SpotifySearchResult) =>
      tauriInvoke<SpotifyReference>('add_spotify_reference', {
        projectId,
        spotifyId: result.spotify_id,
        spotifyType: result.spotify_type,
        name: result.name,
        artistName: result.artist_name,
        albumName: result.album_name,
        albumArtUrl: result.album_art_url,
        durationMs: result.duration_ms,
        spotifyUrl: result.spotify_url,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spotifyReferences', projectId] });
    },
  });
}

export function useUpdateSpotifyReferenceNotes(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: number; notes: string }) =>
      tauriInvoke<SpotifyReference>('update_spotify_reference_notes', args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spotifyReferences', projectId] });
    },
  });
}

export function useDeleteSpotifyReference(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      tauriInvoke<void>('delete_spotify_reference', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spotifyReferences', projectId] });
    },
  });
}

// ── Auth hooks ──

export function useSpotifyAuthStatus() {
  return useQuery({
    queryKey: ['spotifyAuthStatus'],
    queryFn: () => tauriInvoke<SpotifyAuthStatus>('spotify_get_auth_status', {}),
    staleTime: Infinity,
    retry: false,
  });
}

export function useSpotifyLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Step 1: Get auth URL
      const authUrl = await tauriInvoke<string>('spotify_start_login', {});
      // Step 2: Open in browser
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(authUrl);
      // Step 3: Wait for callback (blocks until browser redirects back)
      const status = await tauriInvoke<SpotifyAuthStatus>('spotify_wait_for_callback', {});
      return status;
    },
    onSuccess: (status) => {
      useSpotifyPlayerStore.getState().setAuthStatus(status);
      queryClient.setQueryData(['spotifyAuthStatus'], status);
    },
  });
}

export function useSpotifyLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => tauriInvoke<void>('spotify_logout', {}),
    onSuccess: () => {
      const store = useSpotifyPlayerStore.getState();
      // Disconnect SDK player
      if (store.player) {
        store.player.disconnect();
      }
      store.reset();
      const loggedOut: SpotifyAuthStatus = { logged_in: false, display_name: null, is_premium: false };
      store.setAuthStatus(loggedOut);
      queryClient.setQueryData(['spotifyAuthStatus'], loggedOut);
    },
  });
}
