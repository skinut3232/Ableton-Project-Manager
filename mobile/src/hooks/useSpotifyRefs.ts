import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { SpotifyReference } from '../types';

export function useSpotifyReferences(projectId: number) {
  return useQuery({
    queryKey: ['spotify_references', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spotify_references')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as SpotifyReference[]) ?? [];
    },
    enabled: projectId > 0,
  });
}
