import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tauriInvoke } from './useTauriInvoke';
import type { Marker, MarkerType } from '../types';

export function useMarkers(projectId: number) {
  return useQuery({
    queryKey: ['markers', projectId],
    queryFn: () => tauriInvoke<Marker[]>('get_markers', { projectId }),
    enabled: projectId > 0,
  });
}

export function useCreateMarker(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      bounceId?: number | null;
      timestampSeconds: number;
      markerType: MarkerType;
      text: string;
    }) => {
      const invokeArgs: Record<string, unknown> = {
        projectId,
        timestampSeconds: args.timestampSeconds,
        markerType: args.markerType,
        text: args.text,
      };
      if (args.bounceId != null) invokeArgs.bounceId = args.bounceId;
      return tauriInvoke<Marker>('create_marker', invokeArgs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markers', projectId] });
    },
  });
}

export function useUpdateMarker(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      id: number;
      timestampSeconds?: number;
      markerType?: MarkerType;
      text?: string;
    }) => {
      const invokeArgs: Record<string, unknown> = { id: args.id };
      if (args.timestampSeconds !== undefined) invokeArgs.timestampSeconds = args.timestampSeconds;
      if (args.markerType !== undefined) invokeArgs.markerType = args.markerType;
      if (args.text !== undefined) invokeArgs.text = args.text;
      return tauriInvoke<Marker>('update_marker', invokeArgs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markers', projectId] });
    },
  });
}

export function useDeleteMarker(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tauriInvoke<void>('delete_marker', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markers', projectId] });
    },
  });
}
