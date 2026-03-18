import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tauriInvoke } from './useTauriInvoke';
import { useLibraryStore } from '../stores/libraryStore';

export function useBulkAddTag() {
  const queryClient = useQueryClient();
  const clearSelection = useLibraryStore((s) => s.clearSelection);
  return useMutation({
    mutationFn: (args: { projectIds: number[]; tagId: number }) =>
      tauriInvoke<void>('bulk_add_tag', args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      clearSelection();
    },
  });
}

export function useBulkRemoveTag() {
  const queryClient = useQueryClient();
  const clearSelection = useLibraryStore((s) => s.clearSelection);
  return useMutation({
    mutationFn: (args: { projectIds: number[]; tagId: number }) =>
      tauriInvoke<void>('bulk_remove_tag', args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      clearSelection();
    },
  });
}

export function useBulkArchive() {
  const queryClient = useQueryClient();
  const clearSelection = useLibraryStore((s) => s.clearSelection);
  return useMutation({
    mutationFn: (args: { projectIds: number[]; archived: boolean }) =>
      tauriInvoke<void>('bulk_archive', args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      clearSelection();
    },
  });
}

export function useBulkSetGenre() {
  const queryClient = useQueryClient();
  const clearSelection = useLibraryStore((s) => s.clearSelection);
  return useMutation({
    mutationFn: (args: { projectIds: number[]; genreLabel: string }) =>
      tauriInvoke<void>('bulk_set_genre', args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      clearSelection();
    },
  });
}

export function useBulkAddToCollection() {
  const queryClient = useQueryClient();
  const clearSelection = useLibraryStore((s) => s.clearSelection);
  return useMutation({
    mutationFn: (args: { projectIds: number[]; collectionId: number }) =>
      tauriInvoke<void>('bulk_add_to_collection', args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      clearSelection();
    },
  });
}
