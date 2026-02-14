import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ProjectTask, TaskCategory } from '../types';

export function useTasks(projectId: number) {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('category')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as ProjectTask[]) ?? [];
    },
    enabled: projectId > 0,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      title,
      category,
    }: {
      projectId: number;
      title: string;
      category: TaskCategory;
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({ project_id: projectId, title, category })
        .select()
        .single();
      if (error) throw error;
      return data as ProjectTask;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      done,
      title,
    }: {
      id: number;
      projectId: number;
      done?: boolean;
      title?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (done !== undefined) updates.done = done;
      if (title !== undefined) updates.title = title;

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ProjectTask;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: number; projectId: number }) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}
