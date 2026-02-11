import { useEffect, useRef, useCallback } from 'react';
import { tauriInvoke } from './useTauriInvoke';
import { useSpotifyPlayerStore } from '../stores/spotifyPlayerStore';
import { useAudioStore } from '../stores/audioStore';

export function useSpotifyPlayer(isLoggedIn: boolean, isPremium: boolean) {
  const playerRef = useRef<Spotify.Player | null>(null);
  const positionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const store = useSpotifyPlayerStore;

  useEffect(() => {
    if (!isLoggedIn || !isPremium) return;

    let cancelled = false;

    const initPlayer = () => {
      if (cancelled || playerRef.current) return;

      store.getState().setConnecting(true);

      const player = new window.Spotify!.Player({
        name: 'Ableton Project Library',
        getOAuthToken: async (cb) => {
          try {
            const token = await tauriInvoke<string>('spotify_get_access_token', {});
            cb(token);
          } catch (err) {
            console.error('Failed to get Spotify access token:', err);
            store.getState().setSdkError(String(err));
          }
        },
        volume: 0.5,
      });

      player.addListener('ready', ({ device_id }) => {
        console.log('Spotify SDK ready, device_id:', device_id);
        store.getState().setDeviceId(device_id);
        store.getState().setReady(true);
        store.getState().setConnecting(false);
      });

      player.addListener('not_ready', ({ device_id }) => {
        console.warn('Spotify SDK not ready, device_id:', device_id);
        store.getState().setReady(false);
      });

      player.addListener('player_state_changed', (state) => {
        store.getState().updatePlaybackState(state);
      });

      player.addListener('initialization_error', ({ message }) => {
        console.error('Spotify init error:', message);
        store.getState().setSdkError(message);
        store.getState().setConnecting(false);
      });

      player.addListener('authentication_error', ({ message }) => {
        console.error('Spotify auth error:', message);
        store.getState().setSdkError(message);
        store.getState().setConnecting(false);
      });

      player.addListener('account_error', ({ message }) => {
        console.error('Spotify account error:', message);
        store.getState().setSdkError(message);
        store.getState().setConnecting(false);
      });

      player.addListener('playback_error', ({ message }) => {
        console.error('Spotify playback error:', message);
      });

      player.connect();
      playerRef.current = player;
      store.getState().setPlayer(player);
    };

    // Check if SDK is already loaded
    if (window.Spotify) {
      initPlayer();
    } else {
      // Wait for SDK to load
      window.onSpotifyWebPlaybackSDKReady = initPlayer;
    }

    // Position polling
    positionIntervalRef.current = setInterval(async () => {
      const p = playerRef.current;
      if (!p) return;
      const state = await p.getCurrentState();
      if (state && !state.paused) {
        store.getState().setPosition(state.position);
      }
    }, 1000);

    return () => {
      cancelled = true;
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
        positionIntervalRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
        store.getState().setPlayer(null);
        store.getState().setReady(false);
        store.getState().setDeviceId(null);
      }
    };
  }, [isLoggedIn, isPremium]);
}

export function useSpotifyPlayTrack() {
  const deviceId = useSpotifyPlayerStore((s) => s.deviceId);

  return useCallback(
    async (spotifyUri: string) => {
      if (!deviceId) {
        console.error('No Spotify device ID available');
        return;
      }

      // Pause local WAV audio first
      const audio = useAudioStore.getState().audioElement;
      if (!audio.paused) {
        audio.pause();
      }

      try {
        const token = await tauriInvoke<string>('spotify_get_access_token', {});
        const resp = await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uris: [spotifyUri] }),
          }
        );
        if (!resp.ok) {
          const body = await resp.text();
          console.error('Spotify play error:', resp.status, body);
        }
      } catch (err) {
        console.error('Failed to play Spotify track:', err);
      }
    },
    [deviceId]
  );
}
