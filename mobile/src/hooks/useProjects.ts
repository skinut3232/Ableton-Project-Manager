import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Project, ProjectFilters } from '../types';

export function useProjects(filters: ProjectFilters) {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      // Use search RPC when there's a search query
      if (filters.search_query) {
        const { data, error } = await supabase.rpc('search_user_projects', {
          search_query: filters.search_query,
        });
        if (error) throw error;
        let results = (data as Project[]) ?? [];

        // Apply additional filters to search results
        results = applyClientFilters(results, filters);
        return results;
      }

      // Build query chain
      let query = supabase.from('projects').select('*');

      if (!filters.show_archived) {
        query = query.eq('archived', false);
      }

      if (filters.statuses && filters.statuses.length > 0) {
        query = query.in('status', filters.statuses);
      }

      if (filters.in_rotation) {
        query = query.eq('in_rotation', true);
      }

      if (filters.min_rating) {
        query = query.gte('rating', filters.min_rating);
      }

      if (filters.updated_since_days) {
        const since = new Date();
        since.setDate(since.getDate() - filters.updated_since_days);
        query = query.gte('last_worked_on', since.toISOString());
      }

      // Sort
      const sortBy = filters.sort_by || 'last_worked_on';
      const ascending = filters.sort_dir === 'asc';
      query = query.order(sortBy, { ascending, nullsFirst: false });

      const { data, error } = await query;
      if (error) throw error;
      return (data as Project[]) ?? [];
    },
  });
}

function applyClientFilters(projects: Project[], filters: ProjectFilters): Project[] {
  let result = projects;

  if (!filters.show_archived) {
    result = result.filter((p) => !p.archived);
  }
  if (filters.statuses && filters.statuses.length > 0) {
    result = result.filter((p) => filters.statuses!.includes(p.status));
  }
  if (filters.in_rotation) {
    result = result.filter((p) => p.in_rotation);
  }
  if (filters.min_rating) {
    result = result.filter((p) => (p.rating ?? 0) >= filters.min_rating!);
  }

  return result;
}

export function useProjectDetail(id: number) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, project_tags(tags(id, name))')
        .eq('id', id)
        .single();
      if (error) throw error;

      // Flatten joined tags
      const project = data as Project;
      if (project.project_tags) {
        project.tags = project.project_tags.map((pt: { tags: { id: number; name: string } }) => pt.tags);
        delete project.project_tags;
      }
      return project;
    },
    enabled: id > 0,
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: number;
      name?: string;
      status?: string;
      rating?: number | null;
      bpm?: number | null;
      in_rotation?: boolean;
      notes?: string;
      genre_label?: string;
      musical_key?: string;
      archived?: boolean;
      progress?: number | null;
    }) => {
      const { id, ...updates } = args;
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
    },
  });
}
