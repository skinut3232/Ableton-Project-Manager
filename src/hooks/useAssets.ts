import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tauriInvoke } from './useTauriInvoke';
import type { ProjectAsset } from '../types';

export function useAssets(projectId: number) {
  return useQuery({
    queryKey: ['assets', projectId],
    queryFn: () => tauriInvoke<ProjectAsset[]>('get_assets', { projectId }),
    enabled: projectId > 0,
  });
}

export function useUploadAsset(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourcePath: string) =>
      tauriInvoke<ProjectAsset>('upload_asset', { projectId, sourcePath }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', projectId] });
    },
  });
}

export function useUpdateAsset(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: number; tags?: string }) =>
      tauriInvoke<ProjectAsset>('update_asset', {
        id: args.id,
        tags: args.tags ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', projectId] });
    },
  });
}

export function useDeleteAsset(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tauriInvoke<void>('delete_asset', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', projectId] });
    },
  });
}
