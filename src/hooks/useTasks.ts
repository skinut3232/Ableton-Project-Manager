import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tauriInvoke } from './useTauriInvoke';
import type { ProjectTask, TaskCategory } from '../types';

export function useTasks(projectId: number) {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tauriInvoke<ProjectTask[]>('get_tasks', { projectId }),
    enabled: projectId > 0,
  });
}

export function useCreateTask(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      title: string;
      category: TaskCategory;
      linkedMarkerId?: number;
      linkedTimestampSeconds?: number;
    }) => {
      const invokeArgs: Record<string, unknown> = {
        projectId,
        title: args.title,
        category: args.category,
      };
      if (args.linkedMarkerId != null) invokeArgs.linkedMarkerId = args.linkedMarkerId;
      if (args.linkedTimestampSeconds != null) invokeArgs.linkedTimestampSeconds = args.linkedTimestampSeconds;
      return tauriInvoke<ProjectTask>('create_task', invokeArgs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}

export function useUpdateTask(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      id: number;
      title?: string;
      done?: boolean;
      category?: TaskCategory;
      linkedMarkerId?: number;
      linkedTimestampSeconds?: number;
    }) => {
      const invokeArgs: Record<string, unknown> = { id: args.id };
      if (args.title !== undefined) invokeArgs.title = args.title;
      if (args.done !== undefined) invokeArgs.done = args.done;
      if (args.category !== undefined) invokeArgs.category = args.category;
      if (args.linkedMarkerId != null) invokeArgs.linkedMarkerId = args.linkedMarkerId;
      if (args.linkedTimestampSeconds != null) invokeArgs.linkedTimestampSeconds = args.linkedTimestampSeconds;
      return tauriInvoke<ProjectTask>('update_task', invokeArgs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}

export function useDeleteTask(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tauriInvoke<void>('delete_task', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}
