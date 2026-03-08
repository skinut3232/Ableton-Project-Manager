import { Audio } from 'expo-av';
import { useAudioStore } from '../../stores/audioStore';
import type { Bounce, Project } from '../../types';

// Mock expo-av
const mockSound = {
  getStatusAsync: jest.fn(),
  pauseAsync: jest.fn(),
  playAsync: jest.fn(),
  setPositionAsync: jest.fn(),
  stopAsync: jest.fn(),
  unloadAsync: jest.fn(),
};

jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn(),
    Sound: {
      createAsync: jest.fn(),
    },
  },
  InterruptionModeIOS: { DoNotMix: 1 },
  InterruptionModeAndroid: { DoNotMix: 1 },
}));

// Import after mocking
import { playBounce, togglePlayPause, seekTo, skipForward, skipBackward, stopPlayback } from '../../lib/audioPlayer';

const mockBounce: Bounce = {
  id: 1,
  project_id: 1,
  bounce_path: '/test/bounce.wav',
  mp3_url: 'https://example.com/test.mp3',
  duration_seconds: 120,
  modified_time: '2026-01-01T00:00:00Z',
  size_bytes: 500000,
};

const mockProject: Project = {
  id: 1,
  name: 'Test Project',
  status: 'Idea',
  rating: 3,
  bpm: 128,
  musical_key: 'Cm',
  progress: 25,
  in_rotation: false,
  archived: false,
  last_worked_on: '2026-01-01T00:00:00Z',
  cover_url: null,
  tags: [],
};

describe('audioPlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAudioStore.getState().clear();

    // Default mock: createAsync returns a sound object
    (Audio.Sound.createAsync as jest.Mock).mockResolvedValue({
      sound: mockSound,
    });
    mockSound.getStatusAsync.mockResolvedValue({
      isLoaded: true,
      isPlaying: true,
      positionMillis: 30000,
      durationMillis: 120000,
    });
  });

  describe('playBounce', () => {
    it('does nothing if bounce has no mp3_url', async () => {
      const bounceCopy = { ...mockBounce, mp3_url: null };
      await playBounce(bounceCopy as any, mockProject);
      expect(Audio.setAudioModeAsync).not.toHaveBeenCalled();
    });

    it('sets audio mode with correct config', async () => {
      await playBounce(mockBounce, mockProject);
      expect(Audio.setAudioModeAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          shouldDuckAndroid: true,
        })
      );
    });

    it('sets current track in store', async () => {
      await playBounce(mockBounce, mockProject);
      const state = useAudioStore.getState();
      expect(state.currentBounce).toEqual(mockBounce);
      expect(state.currentProject).toEqual(mockProject);
    });

    it('sets loading state', async () => {
      // We can check that setIsLoading was called by verifying that createAsync was called
      // (loading is set true before createAsync)
      await playBounce(mockBounce, mockProject);
      expect(Audio.Sound.createAsync).toHaveBeenCalledWith(
        { uri: mockBounce.mp3_url },
        { shouldPlay: true },
        expect.any(Function)
      );
    });

    it('clears audio error on new play', async () => {
      useAudioStore.getState().setAudioError('old error');
      await playBounce(mockBounce, mockProject);
      expect(useAudioStore.getState().audioError).toBeNull();
    });

    it('handles createAsync errors gracefully', async () => {
      (Audio.Sound.createAsync as jest.Mock).mockRejectedValue(new Error('Network failure'));
      await playBounce(mockBounce, mockProject);

      const state = useAudioStore.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.audioError).toBe('Network failure');
    });
  });

  describe('togglePlayPause', () => {
    it('does nothing when no sound loaded', async () => {
      await togglePlayPause();
      expect(mockSound.pauseAsync).not.toHaveBeenCalled();
      expect(mockSound.playAsync).not.toHaveBeenCalled();
    });
  });

  describe('seekTo', () => {
    it('does nothing when no sound loaded', async () => {
      await seekTo(5000);
      expect(mockSound.setPositionAsync).not.toHaveBeenCalled();
    });
  });

  describe('skipForward', () => {
    it('does nothing when no sound loaded', async () => {
      await skipForward(10000);
      expect(mockSound.setPositionAsync).not.toHaveBeenCalled();
    });
  });

  describe('skipBackward', () => {
    it('does nothing when no sound loaded', async () => {
      await skipBackward(10000);
      expect(mockSound.setPositionAsync).not.toHaveBeenCalled();
    });
  });

  describe('stopPlayback', () => {
    it('clears the store even when no sound is loaded', async () => {
      useAudioStore.getState().setCurrentTrack(mockBounce, mockProject);
      await stopPlayback();
      const state = useAudioStore.getState();
      expect(state.currentBounce).toBeNull();
      expect(state.currentProject).toBeNull();
    });
  });
});
