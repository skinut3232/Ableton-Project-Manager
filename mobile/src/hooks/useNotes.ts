import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ProjectNote } from '../types';

export function useNotes(projectId: number) {
  return useQuery({
    queryKey: ['notes', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_notes')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as ProjectNote[]) ?? [];
    },
    enabled: projectId > 0,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, content }: { projectId: number; content: string }) => {
      const { data, error } = await supabase
        .from('project_notes')
        .insert({ project_id: projectId, content })
        .select()
        .single();
      if (error) throw error;
      return data as ProjectNote;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['notes', projectId] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId, content }: { id: number; projectId: number; content: string }) => {
      const { data, error } = await supabase
        .from('project_notes')
        .update({ content })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ProjectNote;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['notes', projectId] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: number; projectId: number }) => {
      const { error } = await supabase
        .from('project_notes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['notes', projectId] });
    },
  });
}
