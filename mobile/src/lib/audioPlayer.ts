import { Audio, type AVPlaybackStatus } from 'expo-av';
import type { Bounce, Project } from '../types';
import { useAudioStore } from '../stores/audioStore';

let sound: Audio.Sound | null = null;

async function ensureAudioMode() {
  await Audio.setAudioModeAsync({
    staysActiveInBackground: true,
    playsInSilentModeIOS: true,
  });
}

function onPlaybackStatusUpdate(status: AVPlaybackStatus) {
  const store = useAudioStore.getState();
  if (!status.isLoaded) {
    if (status.error) {
      console.error('Playback error:', status.error);
      store.setIsPlaying(false);
      store.setIsLoading(false);
    }
    return;
  }

  store.setIsPlaying(status.isPlaying);
  store.setIsLoading(status.isBuffering);
  store.setPosition(status.positionMillis);
  if (status.durationMillis) {
    store.setDuration(status.durationMillis);
  }

  if (status.didJustFinish) {
    store.setIsPlaying(false);
    store.setPosition(0);
  }
}

export async function playBounce(bounce: Bounce, project: Project) {
  if (!bounce.mp3_url) return;

  const store = useAudioStore.getState();

  // If same bounce, toggle play/pause
  if (store.currentBounce?.id === bounce.id && sound) {
    await togglePlayPause();
    return;
  }

  // Unload previous
  if (sound) {
    await sound.unloadAsync();
    sound = null;
  }

  await ensureAudioMode();

  store.setCurrentTrack(bounce, project);
  store.setIsLoading(true);

  const { sound: newSound } = await Audio.Sound.createAsync(
    { uri: bounce.mp3_url },
    { shouldPlay: true },
    onPlaybackStatusUpdate
  );

  sound = newSound;
}

export async function togglePlayPause() {
  if (!sound) return;

  const status = await sound.getStatusAsync();
  if (!status.isLoaded) return;

  if (status.isPlaying) {
    await sound.pauseAsync();
  } else {
    await sound.playAsync();
  }
}

export async function seekTo(positionMs: number) {
  if (!sound) return;
  await sound.setPositionAsync(positionMs);
}

export async function skipForward(ms: number = 10000) {
  if (!sound) return;
  const status = await sound.getStatusAsync();
  if (!status.isLoaded) return;
  const newPos = Math.min(status.positionMillis + ms, status.durationMillis ?? status.positionMillis);
  await sound.setPositionAsync(newPos);
}

export async function skipBackward(ms: number = 10000) {
  if (!sound) return;
  const status = await sound.getStatusAsync();
  if (!status.isLoaded) return;
  const newPos = Math.max(status.positionMillis - ms, 0);
  await sound.setPositionAsync(newPos);
}

export async function stopPlayback() {
  if (sound) {
    await sound.stopAsync();
    await sound.unloadAsync();
    sound = null;
  }
  useAudioStore.getState().clear();
}
