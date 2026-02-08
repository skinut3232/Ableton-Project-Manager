import { useLibraryStore } from '../../stores/libraryStore';
import { FilterDropdown } from './FilterDropdown';
import { PROJECT_STATUSES } from '../../lib/constants';
import { useQuery } from '@tanstack/react-query';
import { tauriInvoke } from '../../hooks/useTauriInvoke';
import type { Tag } from '../../types';

export function FilterBar() {
  const smartFilters = useLibraryStore((s) => s.smartFilters);
  const toggleSmartFilter = useLibraryStore((s) => s.toggleSmartFilter);
  const statusFilters = useLibraryStore((s) => s.statusFilters);
  const setStatusFilters = useLibraryStore((s) => s.setStatusFilters);
  const tagFilters = useLibraryStore((s) => s.tagFilters);
  const setTagFilters = useLibraryStore((s) => s.setTagFilters);
  const showArchived = useLibraryStore((s) => s.showArchived);
  const setShowArchived = useLibraryStore((s) => s.setShowArchived);

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
              ? 'bg-blue-600 text-white'
              : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
          }`}
        >
          {sf.label}
        </button>
      ))}

      <div className="w-px h-5 bg-neutral-700" />

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

      <div className="w-px h-5 bg-neutral-700" />

      {/* Show archived toggle */}
      <button
        onClick={() => setShowArchived(!showArchived)}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          showArchived
            ? 'bg-neutral-600 text-white'
            : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700 hover:text-neutral-300'
        }`}
      >
        Show Archived
      </button>
    </div>
  );
}
