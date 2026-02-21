import { useLibraryStore } from '../../stores/libraryStore';
import { FilterDropdown } from './FilterDropdown';
import { PROJECT_STATUSES } from '../../lib/constants';
import { useQuery } from '@tanstack/react-query';
import { tauriInvoke } from '../../hooks/useTauriInvoke';
import type { Tag } from '../../types';

export function FilterBar() {
  const searchQuery = useLibraryStore((s) => s.searchQuery);
  const smartFilters = useLibraryStore((s) => s.smartFilters);
  const toggleSmartFilter = useLibraryStore((s) => s.toggleSmartFilter);
  const statusFilters = useLibraryStore((s) => s.statusFilters);
  const setStatusFilters = useLibraryStore((s) => s.setStatusFilters);
  const tagFilters = useLibraryStore((s) => s.tagFilters);
  const setTagFilters = useLibraryStore((s) => s.setTagFilters);
  const showArchived = useLibraryStore((s) => s.showArchived);
  const setShowArchived = useLibraryStore((s) => s.setShowArchived);
  const resetFilters = useLibraryStore((s) => s.resetFilters);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilters.length > 0 ||
    tagFilters.length > 0 ||
    smartFilters.some((f) => f.active) ||
    showArchived;

  const { data: allTags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tauriInvoke<Tag[]>('get_all_tags'),
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Smart filters */}
      {smartFilters.map((sf) => (
        <button
          key={sf.key}
          onClick={() => toggleSmartFilter(sf.key)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            sf.active
              ? 'bg-brand-600 text-white'
              : 'bg-bg-elevated text-text-secondary hover:bg-bg-surface hover:text-text-primary'
          }`}
        >
          {sf.label}
        </button>
      ))}

      <div className="w-px h-5 bg-border-default" />

      {/* Status filter dropdown */}
      <FilterDropdown
        label="Status"
        options={PROJECT_STATUSES.map((s) => ({ value: s, label: s }))}
        selected={statusFilters}
        onChange={setStatusFilters}
      />

      {/* Tag filter dropdown */}
      {allTags && allTags.length > 0 && (
        <FilterDropdown
          label="Tags"
          options={allTags.map((t) => ({ value: String(t.id), label: t.name }))}
          selected={tagFilters.map(String)}
          onChange={(vals) => setTagFilters(vals.map(Number))}
        />
      )}

      <div className="w-px h-5 bg-border-default" />

      {/* Show archived toggle */}
      <button
        onClick={() => setShowArchived(!showArchived)}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          showArchived
            ? 'bg-bg-surface text-text-primary'
            : 'bg-bg-elevated text-text-muted hover:bg-bg-surface hover:text-text-secondary'
        }`}
      >
        Show Archived
      </button>

      {/* Clear all filters */}
      {hasActiveFilters && (
        <>
          <div className="w-px h-5 bg-border-default" />
          <button
            onClick={resetFilters}
            className="rounded-full px-3 py-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors"
          >
            Clear all filters
          </button>
        </>
      )}
    </div>
  );
}
