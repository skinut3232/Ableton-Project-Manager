import { useState, useRef, useEffect } from 'react';
import { useLibraryStore } from '../../stores/libraryStore';
import { TABLE_COLUMNS } from '../../lib/constants';

export function ColumnSelector() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const visibleColumns = useLibraryStore((s) => s.visibleColumns);
  const toggleColumn = useLibraryStore((s) => s.toggleColumn);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-secondary hover:bg-bg-surface hover:text-text-primary transition-colors"
        title="Choose columns"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-lg border border-border-default bg-bg-elevated py-1 shadow-lg">
          <div className="px-3 py-1.5 text-xs font-medium text-text-muted uppercase tracking-wider">
            Columns
          </div>
          {TABLE_COLUMNS.map((col) => (
            <label
              key={col.key}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary cursor-pointer ${
                col.key === 'name' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-bg-surface'
              }`}
            >
              <input
                type="checkbox"
                checked={visibleColumns.includes(col.key)}
                disabled={col.key === 'name'}
                onChange={() => toggleColumn(col.key)}
                className="rounded border-border-default bg-bg-surface text-brand-500 focus:ring-brand-500"
              />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
