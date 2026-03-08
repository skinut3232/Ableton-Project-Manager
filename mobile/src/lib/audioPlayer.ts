import { Audio, InterruptionModeIOS, InterruptionModeAndroid, type AVPlaybackStatus } from 'expo-av';
import type { Bounce, Project } from '../types';
import { useAudioStore } from '../stores/audioStore';

let sound: Audio.Sound | null = null;

async function ensureAudioMode() {
  await Audio.setAudioModeAsync({
    staysActiveInBackground: true,
    playsInSilentModeIOS: true,
    allowsRecordingIOS: false,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    shouldDuckAndroid: true,
  });
}

function onPlaybackStatusUpdate(status: AVPlaybackStatus) {
  const store = useAudioStore.getState();
  if (!status.isLoaded) {
    if (status.error) {
      console.error('Playback error:', status.error);
      store.setIsPlaying(false);
      store.setIsLoading(false);
      store.setAudioError(`Playback error: ${status.error}`);
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

  try {
    // Unload previous
    if (sound) {
      await sound.unloadAsync();
      sound = null;
    }

    await ensureAudioMode();

    store.setCurrentTrack(bounce, project);
    store.setIsLoading(true);
    store.setAudioError(null);

    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: bounce.mp3_url },
      { shouldPlay: true },
      onPlaybackStatusUpdate
    );

    sound = newSound;
  } catch (error) {
    console.error('playBounce error:', error);
    store.setIsPlaying(false);
    store.setIsLoading(false);
    store.setAudioError(error instanceof Error ? error.message : 'Failed to play audio');
  }
}

export async function togglePlayPause() {
  if (!sound) return;

  try {
    const status = await sound.getStatusAsync();
    if (!status.isLoaded) return;

    if (status.isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  } catch (error) {
    console.error('togglePlayPause error:', error);
    const store = useAudioStore.getState();
    store.setIsPlaying(false);
    store.setIsLoading(false);
    store.setAudioError(error instanceof Error ? error.message : 'Playback control failed');
  }
}

export async function seekTo(positionMs: number) {
  if (!sound) return;

  try {
    await sound.setPositionAsync(positionMs);
  } catch (error) {
    console.error('seekTo error:', error);
    useAudioStore.getState().setAudioError(error instanceof Error ? error.message : 'Seek failed');
  }
}

export async function skipForward(ms: number = 10000) {
  if (!sound) return;

  try {
    const status = await sound.getStatusAsync();
    if (!status.isLoaded) return;
    const newPos = Math.min(status.positionMillis + ms, status.durationMillis ?? status.positionMillis);
    await sound.setPositionAsync(newPos);
  } catch (error) {
    console.error('skipForward error:', error);
    useAudioStore.getState().setAudioError(error instanceof Error ? error.message : 'Skip failed');
  }
}

export async function skipBackward(ms: number = 10000) {
  if (!sound) return;

  try {
    const status = await sound.getStatusAsync();
    if (!status.isLoaded) return;
    const newPos = Math.max(status.positionMillis - ms, 0);
    await sound.setPositionAsync(newPos);
  } catch (error) {
    console.error('skipBackward error:', error);
    useAudioStore.getState().setAudioError(error instanceof Error ? error.message : 'Skip failed');
  }
}

export async function stopPlayback() {
  try {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      sound = null;
    }
  } catch (error) {
    console.error('stopPlayback error:', error);
    sound = null;
  }
  useAudioStore.getState().clear();
}
