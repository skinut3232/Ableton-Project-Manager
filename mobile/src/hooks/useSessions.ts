import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Session } from '../types';

export function useSessions(projectId: number) {
  return useQuery({
    queryKey: ['sessions', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('project_id', projectId)
        .order('started_at', { ascending: false });
      if (error) throw error;
      return (data as Session[]) ?? [];
    },
    enabled: projectId > 0,
  });
}
