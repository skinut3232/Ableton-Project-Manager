import { create } from 'zustand';
import type { Bounce, Project } from '../types';

interface AudioState {
  currentBounce: Bounce | null;
  currentProject: Project | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  audioElement: HTMLAudioElement;

  setCurrentTrack: (bounce: Bounce, project: Project) => void;
  setIsPlaying: (playing: boolean) => void;
  setProgress: (time: number) => void;
  setDuration: (duration: number) => void;
  clearTrack: () => void;
}

// Create a single global audio element that persists
const globalAudio = new Audio();

export const useAudioStore = create<AudioState>((set) => {
  // Wire up audio events
  globalAudio.addEventListener('timeupdate', () => {
    set({ progress: globalAudio.currentTime });
  });
  globalAudio.addEventListener('loadedmetadata', () => {
    set({ duration: globalAudio.duration });
  });
  globalAudio.addEventListener('ended', () => {
    set({ isPlaying: false, progress: 0 });
  });
  globalAudio.addEventListener('pause', () => {
    set({ isPlaying: false });
  });
  globalAudio.addEventListener('play', () => {
    set({ isPlaying: true });
  });

  return {
    currentBounce: null,
    currentProject: null,
    isPlaying: false,
    progress: 0,
    duration: 0,
    audioElement: globalAudio,

    setCurrentTrack: (bounce, project) =>
      set({ currentBounce: bounce, currentProject: project, progress: 0, duration: 0 }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setProgress: (time) => set({ progress: time }),
    setDuration: (duration) => set({ duration: duration }),
    clearTrack: () => {
      globalAudio.pause();
      globalAudio.src = '';
      set({ currentBounce: null, currentProject: null, isPlaying: false, progress: 0, duration: 0 });
    },
  };
});
