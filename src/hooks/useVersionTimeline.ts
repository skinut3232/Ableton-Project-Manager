import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tauriInvoke } from './useTauriInvoke';
import type { VersionTimelineEntry, VersionNote } from '../types';

export function useVersionTimeline(projectId: number) {
  return useQuery({
    queryKey: ['version-timeline', projectId],
    queryFn: () => tauriInvoke<VersionTimelineEntry[]>('get_version_timeline', { projectId }),
    enabled: projectId > 0,
  });
}

export function useUpsertVersionNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { setId: number; projectId: number; note: string }) =>
      tauriInvoke<VersionNote>('upsert_version_note', args),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['version-timeline', variables.projectId] });
    },
  });
}

export function useDeleteVersionNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { setId: number; projectId: number }) =>
      tauriInvoke<void>('delete_version_note', { setId: args.setId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['version-timeline', variables.projectId] });
    },
  });
}
