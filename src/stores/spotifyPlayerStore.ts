import { create } from 'zustand';
import type { SpotifyAuthStatus } from '../types';

interface SpotifyPlayerState {
  authStatus: SpotifyAuthStatus | null;
  player: Spotify.Player | null;
  deviceId: string | null;
  isReady: boolean;
  isConnecting: boolean;
  sdkError: string | null;

  currentTrackUri: string | null;
  currentTrackName: string | null;
  currentArtistName: string | null;
  currentAlbumArt: string | null;
  isPlaying: boolean;
  position: number; // ms
  duration: number; // ms

  setAuthStatus: (status: SpotifyAuthStatus | null) => void;
  setPlayer: (player: Spotify.Player | null) => void;
  setDeviceId: (id: string | null) => void;
  setReady: (ready: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setSdkError: (error: string | null) => void;
  updatePlaybackState: (state: Spotify.WebPlaybackState | null) => void;
  setPosition: (position: number) => void;
  reset: () => void;
}

export const useSpotifyPlayerStore = create<SpotifyPlayerState>((set) => ({
  authStatus: null,
  player: null,
  deviceId: null,
  isReady: false,
  isConnecting: false,
  sdkError: null,

  currentTrackUri: null,
  currentTrackName: null,
  currentArtistName: null,
  currentAlbumArt: null,
  isPlaying: false,
  position: 0,
  duration: 0,

  setAuthStatus: (status) => set({ authStatus: status }),
  setPlayer: (player) => set({ player }),
  setDeviceId: (id) => set({ deviceId: id }),
  setReady: (ready) => set({ isReady: ready }),
  setConnecting: (connecting) => set({ isConnecting: connecting }),
  setSdkError: (error) => set({ sdkError: error }),

  updatePlaybackState: (state) => {
    if (!state) {
      set({
        currentTrackUri: null,
        currentTrackName: null,
        currentArtistName: null,
        currentAlbumArt: null,
        isPlaying: false,
        position: 0,
        duration: 0,
      });
      return;
    }
    const track = state.track_window.current_track;
    set({
      currentTrackUri: track.uri,
      currentTrackName: track.name,
      currentArtistName: track.artists.map((a) => a.name).join(', '),
      currentAlbumArt: track.album.images[0]?.url ?? null,
      isPlaying: !state.paused,
      position: state.position,
      duration: state.duration,
    });
  },

  setPosition: (position) => set({ position }),

  reset: () =>
    set({
      authStatus: null,
      player: null,
      deviceId: null,
      isReady: false,
      isConnecting: false,
      sdkError: null,
      currentTrackUri: null,
      currentTrackName: null,
      currentArtistName: null,
      currentAlbumArt: null,
      isPlaying: false,
      position: 0,
      duration: 0,
    }),
}));
