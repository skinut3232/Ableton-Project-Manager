import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Bounce } from '../types';

export function useBounces(projectId: number) {
  return useQuery({
    queryKey: ['bounces', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bounces')
        .select('*')
        .eq('project_id', projectId)
        .order('modified_time', { ascending: false });
      if (error) throw error;
      return (data as Bounce[]) ?? [];
    },
    enabled: projectId > 0,
  });
}
