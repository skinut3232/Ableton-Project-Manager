import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tauriInvoke } from './useTauriInvoke';
import type { Collection, SmartCollectionRule, SmartCollectionRuleInput } from '../types';

export function useCollections() {
  return useQuery({
    queryKey: ['collections'],
    queryFn: () => tauriInvoke<Collection[]>('get_collections'),
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { name: string; collectionType: string; icon: string }) =>
      tauriInvoke<Collection>('create_collection', args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: number; name?: string; icon?: string }) =>
      tauriInvoke<Collection>('update_collection', args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      tauriInvoke<void>('delete_collection', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useReorderCollections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) =>
      tauriInvoke<void>('reorder_collections', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useSmartCollectionRules(collectionId: number) {
  return useQuery({
    queryKey: ['smart-rules', collectionId],
    queryFn: () => tauriInvoke<SmartCollectionRule[]>('get_smart_collection_rules', { collectionId }),
    enabled: collectionId > 0,
  });
}

export function useSetSmartCollectionRules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { collectionId: number; rules: SmartCollectionRuleInput[] }) =>
      tauriInvoke<SmartCollectionRule[]>('set_smart_collection_rules', args),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['smart-rules', variables.collectionId] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useAddProjectToCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { collectionId: number; projectId: number }) =>
      tauriInvoke<void>('add_project_to_collection', args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useRemoveProjectFromCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { collectionId: number; projectId: number }) =>
      tauriInvoke<void>('remove_project_from_collection', args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useReorderCollectionProjects() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { collectionId: number; projectIds: number[] }) =>
      tauriInvoke<void>('reorder_collection_projects', args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
