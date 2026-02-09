import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tauriInvoke } from './useTauriInvoke';
import type { ProjectReference } from '../types';

export function useReferences(projectId: number) {
  return useQuery({
    queryKey: ['references', projectId],
    queryFn: () => tauriInvoke<ProjectReference[]>('get_references', { projectId }),
    enabled: projectId > 0,
  });
}

export function useCreateReference(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      url: string;
      title?: string | null;
      notes: string;
    }) => {
      const invokeArgs: Record<string, unknown> = {
        projectId,
        url: args.url,
        notes: args.notes,
      };
      if (args.title != null) invokeArgs.title = args.title;
      return tauriInvoke<ProjectReference>('create_reference', invokeArgs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['references', projectId] });
    },
  });
}

export function useUpdateReference(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      id: number;
      url?: string;
      title?: string;
      notes?: string;
    }) => {
      const invokeArgs: Record<string, unknown> = { id: args.id };
      if (args.url !== undefined) invokeArgs.url = args.url;
      if (args.title !== undefined) invokeArgs.title = args.title;
      if (args.notes !== undefined) invokeArgs.notes = args.notes;
      return tauriInvoke<ProjectReference>('update_reference', invokeArgs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['references', projectId] });
    },
  });
}

export function useDeleteReference(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tauriInvoke<void>('delete_reference', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['references', projectId] });
    },
  });
}
