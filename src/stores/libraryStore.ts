import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProjectFilters } from '../types';
import { DEFAULT_VISIBLE_COLUMNS, type TableColumnKey } from '../lib/constants';

interface SmartFilter {
  key: string;
  label: string;
  active: boolean;
}

interface LibraryState {
  searchQuery: string;
  sortBy: string;
  showArchived: boolean;
  statusFilters: string[];
  tagFilters: number[];
  smartFilters: SmartFilter[];
  focusedCardIndex: number;
  viewMode: 'grid' | 'table';
  visibleColumns: TableColumnKey[];
  tableSortDir: 'asc' | 'desc';

  setSearchQuery: (query: string) => void;
  setSortBy: (sort: string) => void;
  setShowArchived: (show: boolean) => void;
  setStatusFilters: (statuses: string[]) => void;
  setTagFilters: (tags: number[]) => void;
  toggleSmartFilter: (key: string) => void;
  setFocusedCardIndex: (index: number) => void;
  setViewMode: (mode: 'grid' | 'table') => void;
  setVisibleColumns: (columns: TableColumnKey[]) => void;
  toggleColumn: (column: TableColumnKey) => void;
  setTableSort: (sortBy: string, dir: 'asc' | 'desc') => void;
  resetFilters: () => void;
  getFilters: () => ProjectFilters;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      searchQuery: '',
      sortBy: 'last_worked_on',
      showArchived: false,
      statusFilters: [],
      tagFilters: [],
      smartFilters: [
        { key: 'in_rotation', label: 'In Rotation', active: false },
        { key: 'top_rated', label: 'Top Rated', active: false },
        { key: 'last_7_days', label: 'Last 7 Days', active: false },
        { key: 'last_30_days', label: 'Last 30 Days', active: false },
        { key: 'near_done', label: 'Near Done', active: false },
      ],
      focusedCardIndex: -1,
      viewMode: 'table',
      visibleColumns: DEFAULT_VISIBLE_COLUMNS,
      tableSortDir: 'desc',

      setSearchQuery: (query) => set({ searchQuery: query }),
      setSortBy: (sort) => set({ sortBy: sort }),
      setShowArchived: (show) => set({ showArchived: show }),
      setStatusFilters: (statuses) => set({ statusFilters: statuses }),
      setTagFilters: (tags) => set({ tagFilters: tags }),
      toggleSmartFilter: (key) =>
        set((state) => ({
          smartFilters: state.smartFilters.map((f) =>
            f.key === key ? { ...f, active: !f.active } : f
          ),
        })),
      setFocusedCardIndex: (index) => set({ focusedCardIndex: index }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setVisibleColumns: (columns) => set({ visibleColumns: columns }),
      toggleColumn: (column) =>
        set((state) => {
          if (column === 'name') return state; // name always visible
          const has = state.visibleColumns.includes(column);
          return {
            visibleColumns: has
              ? state.visibleColumns.filter((c) => c !== column)
              : [...state.visibleColumns, column],
          };
        }),
      setTableSort: (sortBy, dir) => set({ sortBy, tableSortDir: dir }),

      resetFilters: () =>
        set({
          searchQuery: '',
          sortBy: 'last_worked_on',
          showArchived: false,
          statusFilters: [],
          tagFilters: [],
          smartFilters: [
            { key: 'in_rotation', label: 'In Rotation', active: false },
            { key: 'top_rated', label: 'Top Rated', active: false },
            { key: 'last_7_days', label: 'Last 7 Days', active: false },
            { key: 'last_30_days', label: 'Last 30 Days', active: false },
            { key: 'near_done', label: 'Near Done', active: false },
          ],
          tableSortDir: 'desc',
        }),

      getFilters: () => {
        const state = get();
        const filters: ProjectFilters = {
          sort_by: state.sortBy,
          sort_dir: state.tableSortDir,
          show_archived: state.showArchived,
        };

        if (state.searchQuery.trim()) {
          filters.search_query = state.searchQuery.trim();
        }
        if (state.statusFilters.length > 0) {
          filters.statuses = state.statusFilters;
        }
        if (state.tagFilters.length > 0) {
          filters.tag_ids = state.tagFilters;
        }

        // Apply smart filters
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
      partialize: (state) => ({
        sortBy: state.sortBy,
        showArchived: state.showArchived,
        statusFilters: state.statusFilters,
        tagFilters: state.tagFilters,
        smartFilters: state.smartFilters,
        viewMode: state.viewMode,
        visibleColumns: state.visibleColumns,
        tableSortDir: state.tableSortDir,
      }),
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as object) };
        // Ensure newly added default columns appear in stored visibleColumns
        const stored = (persisted as any)?.visibleColumns as TableColumnKey[] | undefined;
        if (stored) {
          const missing = DEFAULT_VISIBLE_COLUMNS.filter((c) => !stored.includes(c));
          if (missing.length > 0) {
            merged.visibleColumns = [...stored, ...missing];
          }
        }
        return merged;
      },
    }
  )
);
