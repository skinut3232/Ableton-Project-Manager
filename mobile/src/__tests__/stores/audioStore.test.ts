import { useAudioStore } from '../../stores/audioStore';
import type { Bounce, Project } from '../../types';

// Reset store between tests
beforeEach(() => {
  useAudioStore.getState().clear();
});

const mockBounce: Bounce = {
  id: 1,
  project_id: 1,
  bounce_path: '/path/to/bounce.wav',
  mp3_url: 'https://example.com/bounce.mp3',
  duration_seconds: 180,
  modified_time: '2026-01-01T00:00:00Z',
  size_bytes: 1000000,
};

const mockProject: Project = {
  id: 1,
  name: 'Test Project',
  status: 'Idea',
  rating: 3,
  bpm: 120,
  musical_key: 'Am',
  progress: 50,
  in_rotation: true,
  archived: false,
  last_worked_on: '2026-01-01T00:00:00Z',
  cover_url: null,
  tags: [],
};

describe('audioStore', () => {
  describe('initial state', () => {
    it('starts with no track loaded', () => {
      const state = useAudioStore.getState();
      expect(state.currentBounce).toBeNull();
      expect(state.currentProject).toBeNull();
      expect(state.isPlaying).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.positionMs).toBe(0);
      expect(state.durationMs).toBe(0);
      expect(state.audioError).toBeNull();
    });
  });

  describe('setCurrentTrack', () => {
    it('sets bounce and project, resets position and error', () => {
      const store = useAudioStore.getState();

      // Set some existing state first
      store.setPosition(5000);
      store.setDuration(10000);
      store.setAudioError('previous error');

      store.setCurrentTrack(mockBounce, mockProject);

      const state = useAudioStore.getState();
      expect(state.currentBounce).toEqual(mockBounce);
      expect(state.currentProject).toEqual(mockProject);
      expect(state.positionMs).toBe(0);
      expect(state.durationMs).toBe(0);
      expect(state.audioError).toBeNull();
    });
  });

  describe('setIsPlaying', () => {
    it('updates playing state', () => {
      useAudioStore.getState().setIsPlaying(true);
      expect(useAudioStore.getState().isPlaying).toBe(true);

      useAudioStore.getState().setIsPlaying(false);
      expect(useAudioStore.getState().isPlaying).toBe(false);
    });
  });

  describe('setIsLoading', () => {
    it('updates loading state', () => {
      useAudioStore.getState().setIsLoading(true);
      expect(useAudioStore.getState().isLoading).toBe(true);
    });
  });

  describe('setPosition / setDuration', () => {
    it('tracks playback position', () => {
      useAudioStore.getState().setPosition(30000);
      expect(useAudioStore.getState().positionMs).toBe(30000);
    });

    it('tracks duration', () => {
      useAudioStore.getState().setDuration(180000);
      expect(useAudioStore.getState().durationMs).toBe(180000);
    });
  });

  describe('setAudioError', () => {
    it('sets error message', () => {
      useAudioStore.getState().setAudioError('Network error');
      expect(useAudioStore.getState().audioError).toBe('Network error');
    });

    it('clears error when set to null', () => {
      useAudioStore.getState().setAudioError('Error');
      useAudioStore.getState().setAudioError(null);
      expect(useAudioStore.getState().audioError).toBeNull();
    });
  });

  describe('clear', () => {
    it('resets all state to initial values', () => {
      const store = useAudioStore.getState();
      store.setCurrentTrack(mockBounce, mockProject);
      store.setIsPlaying(true);
      store.setIsLoading(true);
      store.setPosition(50000);
      store.setDuration(180000);
      store.setAudioError('some error');

      store.clear();

      const state = useAudioStore.getState();
      expect(state.currentBounce).toBeNull();
      expect(state.currentProject).toBeNull();
      expect(state.isPlaying).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.positionMs).toBe(0);
      expect(state.durationMs).toBe(0);
      expect(state.audioError).toBeNull();
    });
  });
});
