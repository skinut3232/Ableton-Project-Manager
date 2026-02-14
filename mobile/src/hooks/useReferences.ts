import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ProjectReference } from '../types';

export function useReferences(projectId: number) {
  return useQuery({
    queryKey: ['references', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_references')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as ProjectReference[]) ?? [];
    },
    enabled: projectId > 0,
  });
}
