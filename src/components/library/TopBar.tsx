import { useLibraryStore } from '../../stores/libraryStore';
import { SORT_OPTIONS } from '../../lib/constants';
import { Button } from '../ui/Button';
import { ColumnSelector } from './ColumnSelector';

interface TopBarProps {
  isAdding: boolean;
  onAddProject: () => void;
}

export function TopBar({ isAdding, onAddProject }: TopBarProps) {
  const searchQuery = useLibraryStore((s) => s.searchQuery);
  const setSearchQuery = useLibraryStore((s) => s.setSearchQuery);
  const sortBy = useLibraryStore((s) => s.sortBy);
  const setSortBy = useLibraryStore((s) => s.setSortBy);
  const viewMode = useLibraryStore((s) => s.viewMode);
  const setViewMode = useLibraryStore((s) => s.setViewMode);

  return (
    <div className="flex items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <input
          id="search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search projects..."
          className="w-full rounded-md border border-neutral-600 bg-neutral-800 pl-9 pr-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Sort — only in grid view (table uses column headers) */}
      {viewMode === 'grid' && (
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-md border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

      {/* Column selector — only in table view */}
      {viewMode === 'table' && <ColumnSelector />}

      {/* View toggle */}
      <div className="flex rounded-md border border-neutral-600 overflow-hidden">
        <button
          onClick={() => setViewMode('grid')}
          className={`px-2.5 py-2 transition-colors ${
            viewMode === 'grid'
              ? 'bg-neutral-600 text-white'
              : 'bg-neutral-800 text-neutral-400 hover:text-white'
          }`}
          title="Grid view"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={`px-2.5 py-2 transition-colors border-l border-neutral-600 ${
            viewMode === 'table'
              ? 'bg-neutral-600 text-white'
              : 'bg-neutral-800 text-neutral-400 hover:text-white'
          }`}
          title="Table view"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Add Project */}
      <Button
        size="sm"
        onClick={onAddProject}
        disabled={isAdding}
      >
        {isAdding ? (
          <span className="inline-flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Adding...
          </span>
        ) : (
          '+ Add Project'
        )}
      </Button>
    </div>
  );
}
