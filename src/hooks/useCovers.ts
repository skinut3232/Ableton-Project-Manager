import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tauriInvoke } from './useTauriInvoke';
import type { Project, MoodBoardPin } from '../types';

export function useGenerateCover(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (seed?: string) =>
      tauriInvoke<Project>('generate_cover', { projectId, seed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useSetCoverFromUpload(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourcePath: string) =>
      tauriInvoke<Project>('set_cover_from_upload', { projectId, sourcePath }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useSetCoverFromMoodboard(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assetId: number) =>
      tauriInvoke<Project>('set_cover_from_moodboard', { projectId, assetId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useToggleCoverLock(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      tauriInvoke<Project>('toggle_cover_lock', { projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useRemoveCover(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      tauriInvoke<Project>('remove_cover', { projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useMoodBoard(projectId: number) {
  return useQuery({
    queryKey: ['mood_board', projectId],
    queryFn: () => tauriInvoke<MoodBoardPin[]>('get_mood_board', { projectId }),
  });
}

export function usePinToMoodBoard(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assetId: number) =>
      tauriInvoke<MoodBoardPin>('pin_to_mood_board', { projectId, assetId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mood_board', projectId] });
    },
  });
}

export function useUnpinFromMoodBoard(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pinId: number) =>
      tauriInvoke<void>('unpin_from_mood_board', { pinId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mood_board', projectId] });
    },
  });
}

export function useReorderMoodBoard(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pinIds: number[]) =>
      tauriInvoke<MoodBoardPin[]>('reorder_mood_board', { projectId, pinIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mood_board', projectId] });
    },
  });
}
