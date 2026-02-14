import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Marker } from '../types';

export function useMarkers(projectId: number) {
  return useQuery({
    queryKey: ['markers', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('markers')
        .select('*')
        .eq('project_id', projectId)
        .order('timestamp_seconds', { ascending: true });
      if (error) throw error;
      return (data as Marker[]) ?? [];
    },
    enabled: projectId > 0,
  });
}
