import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tauriInvoke } from './useTauriInvoke';
import type { Project, ProjectDetail, ProjectFilters, ScanSummary, DiscoveredProject } from '../types';
import { useLibraryStore } from '../stores/libraryStore';

export function useProjects() {
  const searchQuery = useLibraryStore(s => s.searchQuery);
  const sortBy = useLibraryStore(s => s.sortBy);
  const showArchived = useLibraryStore(s => s.showArchived);
  const statusFilters = useLibraryStore(s => s.statusFilters);
  const tagFilters = useLibraryStore(s => s.tagFilters);
  const smartFilters = useLibraryStore(s => s.smartFilters);
  const tableSortDir = useLibraryStore(s => s.tableSortDir);

  const filters = useMemo(() => {
    const f: ProjectFilters = {
      sort_by: sortBy,
      sort_dir: tableSortDir,
      show_archived: showArchived,
    };
    if (searchQuery.trim()) f.search_query = searchQuery.trim();
    if (statusFilters.length > 0) f.statuses = statusFilters;
    if (tagFilters.length > 0) f.tag_ids = tagFilters;

    for (const sf of smartFilters) {
      if (!sf.active) continue;
      switch (sf.key) {
        case 'in_rotation': f.in_rotation = true; break;
        case 'top_rated': f.min_rating = 4; break;
        case 'last_7_days': f.updated_since_days = 7; break;
        case 'last_30_days': f.updated_since_days = 30; break;
        case 'near_done': f.statuses = [...(f.statuses || []), 'Mix', 'Master']; break;
      }
    }
    return f;
  }, [searchQuery, sortBy, tableSortDir, showArchived, statusFilters, tagFilters, smartFilters]);

  return useQuery({
    queryKey: ['projects', filters],
    queryFn: () => tauriInvoke<Project[]>('get_projects', { filters }),
  });
}

export function useProjectDetail(id: number) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => tauriInvoke<ProjectDetail>('get_project_detail', { id }),
    enabled: id > 0,
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      id: number;
      status?: string;
      rating?: number;
      bpm?: number;
      in_rotation?: boolean;
      notes?: string;
      genre_label?: string;
      archived?: boolean;
    }) => tauriInvoke<Project>('update_project', args),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
    },
  });
}

export function useRefreshLibrary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => tauriInvoke<ScanSummary>('refresh_library'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useAddProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (folderPath: string) => tauriInvoke<ScanSummary>('add_project', { folderPath }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDiscoverProjects() {
  return useMutation({
    mutationFn: () => tauriInvoke<DiscoveredProject[]>('discover_untracked_projects'),
  });
}

export function useImportProjects() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projects: DiscoveredProject[]) => tauriInvoke<ScanSummary>('import_projects', { projects }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
