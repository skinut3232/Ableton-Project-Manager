import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tauriInvoke } from './useTauriInvoke';
import type { ProjectNote } from '../types';

export function useNotes(projectId: number) {
  return useQuery({
    queryKey: ['notes', projectId],
    queryFn: () => tauriInvoke<ProjectNote[]>('get_notes', { projectId }),
    enabled: projectId > 0,
  });
}

export function useCreateNote(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      tauriInvoke<ProjectNote>('create_note', { projectId, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', projectId] });
    },
  });
}

export function useUpdateNote(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: number; content: string }) =>
      tauriInvoke<ProjectNote>('update_note', { id: args.id, content: args.content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', projectId] });
    },
  });
}

export function useDeleteNote(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tauriInvoke<void>('delete_note', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', projectId] });
    },
  });
}
