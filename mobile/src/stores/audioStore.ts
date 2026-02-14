import { create } from 'zustand';
import type { Bounce, Project } from '../types';

interface AudioState {
  currentBounce: Bounce | null;
  currentProject: Project | null;
  isPlaying: boolean;
  isLoading: boolean;
  positionMs: number;
  durationMs: number;

  setCurrentTrack: (bounce: Bounce, project: Project) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setPosition: (positionMs: number) => void;
  setDuration: (durationMs: number) => void;
  clear: () => void;
}

export const useAudioStore = create<AudioState>()((set) => ({
  currentBounce: null,
  currentProject: null,
  isPlaying: false,
  isLoading: false,
  positionMs: 0,
  durationMs: 0,

  setCurrentTrack: (bounce, project) =>
    set({ currentBounce: bounce, currentProject: project, positionMs: 0, durationMs: 0 }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setPosition: (positionMs) => set({ positionMs }),
  setDuration: (durationMs) => set({ durationMs }),
  clear: () =>
    set({
      currentBounce: null,
      currentProject: null,
      isPlaying: false,
      isLoading: false,
      positionMs: 0,
      durationMs: 0,
    }),
}));
