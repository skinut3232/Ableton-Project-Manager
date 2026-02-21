import { useLibraryStore } from '../../stores/libraryStore';
import { SORT_OPTIONS } from '../../lib/constants';
import { Button } from '../ui/Button';
import { ColumnSelector } from './ColumnSelector';

interface TopBarProps {
  isAdding: boolean;
  onAddProject: () => void;
  onRandomProject: () => void;
  projectCount: number;
}

export function TopBar({ isAdding, onAddProject, onRandomProject, projectCount }: TopBarProps) {
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
          className="w-full rounded-lg border border-border-default bg-bg-elevated pl-9 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Sort — only in grid view (table uses column headers) */}
      {viewMode === 'grid' && (
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

      {/* Column selector — only in table view */}
      {viewMode === 'table' && <ColumnSelector />}

      {/* View toggle */}
      <div className="flex rounded-lg border border-border-default overflow-hidden">
        <button
          onClick={() => setViewMode('grid')}
          className={`px-2.5 py-2 transition-colors ${
            viewMode === 'grid'
              ? 'bg-bg-surface text-text-primary'
              : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
          }`}
          title="Grid view"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={`px-2.5 py-2 transition-colors border-l border-border-default ${
            viewMode === 'table'
              ? 'bg-bg-surface text-text-primary'
              : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
          }`}
          title="Table view"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Random Project */}
      <Button
        variant="secondary"
        size="sm"
        onClick={onRandomProject}
        disabled={projectCount === 0}
        title="Random project (Ctrl+Shift+R)"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth={2} />
          <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      </Button>

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
