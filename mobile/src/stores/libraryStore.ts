import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ProjectFilters } from '../types';

interface SmartFilter {
  key: string;
  label: string;
  active: boolean;
}

interface LibraryState {
  searchQuery: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  showArchived: boolean;
  statusFilters: string[];
  smartFilters: SmartFilter[];
  viewMode: 'grid' | 'list';

  setSearchQuery: (query: string) => void;
  setSortBy: (sort: string) => void;
  setSortDir: (dir: 'asc' | 'desc') => void;
  setShowArchived: (show: boolean) => void;
  setStatusFilters: (statuses: string[]) => void;
  toggleSmartFilter: (key: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  resetFilters: () => void;
  getFilters: () => ProjectFilters;
}

const DEFAULT_SMART_FILTERS: SmartFilter[] = [
  { key: 'in_rotation', label: 'In Rotation', active: false },
  { key: 'top_rated', label: 'Top Rated', active: false },
  { key: 'last_7_days', label: 'Last 7 Days', active: false },
  { key: 'last_30_days', label: 'Last 30 Days', active: false },
  { key: 'near_done', label: 'Near Done', active: false },
];

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      searchQuery: '',
      sortBy: 'last_worked_on',
      sortDir: 'desc',
      showArchived: false,
      statusFilters: [],
      smartFilters: DEFAULT_SMART_FILTERS,
      viewMode: 'grid',

      setSearchQuery: (query) => set({ searchQuery: query }),
      setSortBy: (sort) => set({ sortBy: sort }),
      setSortDir: (dir) => set({ sortDir: dir }),
      setShowArchived: (show) => set({ showArchived: show }),
      setStatusFilters: (statuses) => set({ statusFilters: statuses }),
      toggleSmartFilter: (key) =>
        set((state) => ({
          smartFilters: state.smartFilters.map((f) =>
            f.key === key ? { ...f, active: !f.active } : f
          ),
        })),
      setViewMode: (mode) => set({ viewMode: mode }),

      resetFilters: () =>
        set({
          searchQuery: '',
          sortBy: 'last_worked_on',
          sortDir: 'desc',
          showArchived: false,
          statusFilters: [],
          smartFilters: DEFAULT_SMART_FILTERS,
        }),

      getFilters: () => {
        const state = get();
        const filters: ProjectFilters = {
          sort_by: state.sortBy,
          sort_dir: state.sortDir,
          show_archived: state.showArchived,
        };

        if (state.searchQuery.trim()) {
          filters.search_query = state.searchQuery.trim();
        }
        if (state.statusFilters.length > 0) {
          filters.statuses = state.statusFilters;
        }

        for (const sf of state.smartFilters) {
          if (!sf.active) continue;
          switch (sf.key) {
            case 'in_rotation':
              filters.in_rotation = true;
              break;
            case 'top_rated':
              filters.min_rating = 4;
              break;
            case 'last_7_days':
              filters.updated_since_days = 7;
              break;
            case 'last_30_days':
              filters.updated_since_days = 30;
              break;
            case 'near_done':
              filters.statuses = [...(filters.statuses || []), 'Mix', 'Master'];
              break;
          }
        }

        return filters;
      },
    }),
    {
      name: 'library-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        sortBy: state.sortBy,
        sortDir: state.sortDir,
        showArchived: state.showArchived,
        statusFilters: state.statusFilters,
        smartFilters: state.smartFilters,
        viewMode: state.viewMode,
      }),
    }
  )
);
