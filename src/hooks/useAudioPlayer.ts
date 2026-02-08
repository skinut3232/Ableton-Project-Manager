import { useCallback } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useAudioStore } from '../stores/audioStore';
import type { Bounce, Project } from '../types';

export function useAudioPlayer() {
  const {
    currentBounce,
    currentProject,
    isPlaying,
    progress,
    duration,
    setCurrentTrack,
    setIsPlaying,
    setProgress,
    audioElement,
  } = useAudioStore();

  const play = useCallback((bounce: Bounce, project: Project) => {
    const audio = audioElement;
    if (!audio) return;

    if (currentBounce?.id === bounce.id) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
      return;
    }

    const src = convertFileSrc(bounce.bounce_path);
    audio.src = src;
    audio.play().then(() => {
      setIsPlaying(true);
    }).catch(err => {
      console.error('Playback failed:', err);
    });
    setCurrentTrack(bounce, project);
  }, [audioElement, currentBounce, isPlaying, setCurrentTrack, setIsPlaying]);

  const togglePlayPause = useCallback(() => {
    const audio = audioElement;
    if (!audio || !currentBounce) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }, [audioElement, currentBounce, isPlaying, setIsPlaying]);

  const seek = useCallback((time: number) => {
    const audio = audioElement;
    if (!audio) return;
    audio.currentTime = time;
    setProgress(time);
  }, [audioElement, setProgress]);

  const stop = useCallback(() => {
    const audio = audioElement;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setProgress(0);
  }, [audioElement, setIsPlaying, setProgress]);

  return {
    currentBounce,
    currentProject,
    isPlaying,
    progress,
    duration,
    play,
    togglePlayPause,
    seek,
    stop,
  };
}
