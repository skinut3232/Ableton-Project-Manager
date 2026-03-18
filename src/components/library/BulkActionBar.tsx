import { useState } from 'react';
import { useLibraryStore } from '../../stores/libraryStore';
import { useBulkAddTag, useBulkRemoveTag, useBulkArchive, useBulkSetGenre, useBulkAddToCollection } from '../../hooks/useBulkOperations';
import { useQuery } from '@tanstack/react-query';
import { tauriInvoke } from '../../hooks/useTauriInvoke';
import type { Tag, Collection } from '../../types';
import { Button } from '../ui/Button';

export function BulkActionBar() {
  const selectedIds = useLibraryStore((s) => s.selectedProjectIds);
  const clearSelection = useLibraryStore((s) => s.clearSelection);
  const [activePopover, setActivePopover] = useState<string | null>(null);

  const bulkAddTag = useBulkAddTag();
  const bulkRemoveTag = useBulkRemoveTag();
  const bulkArchive = useBulkArchive();
  const bulkSetGenre = useBulkSetGenre();
  const bulkAddToCollection = useBulkAddToCollection();

  const { data: allTags } = useQuery({
    queryKey: ['all-tags'],
    queryFn: () => tauriInvoke<Tag[]>('get_all_tags'),
  });

  const { data: allGenres } = useQuery({
    queryKey: ['all-genres'],
    queryFn: () => tauriInvoke<string[]>('get_all_genres'),
  });

  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: () => tauriInvoke<Collection[]>('get_collections'),
  });

  if (selectedIds.length < 2) return null;

  const manualCollections = collections?.filter(c => c.collection_type === 'manual') || [];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-xl border border-border-default bg-bg-secondary px-4 py-3 shadow-2xl">
      <span className="text-sm font-medium text-text-primary">
        {selectedIds.length} selected
      </span>

      <div className="w-px h-6 bg-border-default" />

      {/* Tag action */}
      <div className="relative">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setActivePopover(activePopover === 'tag' ? null : 'tag')}
        >
          Tag
        </Button>
        {activePopover === 'tag' && (
          <div className="absolute bottom-full mb-2 left-0 w-48 rounded-lg border border-border-default bg-bg-elevated p-2 shadow-xl max-h-48 overflow-y-auto">
            {allTags?.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between py-1 px-2 text-sm">
                <span className="text-text-primary">{tag.name}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => { bulkAddTag.mutate({ projectIds: selectedIds, tagId: tag.id }); setActivePopover(null); }}
                    className="text-xs text-green-400 hover:text-green-300"
                  >+</button>
                  <button
                    onClick={() => { bulkRemoveTag.mutate({ projectIds: selectedIds, tagId: tag.id }); setActivePopover(null); }}
                    className="text-xs text-red-400 hover:text-red-300"
                  >−</button>
                </div>
              </div>
            ))}
            {!allTags?.length && <p className="text-xs text-text-muted p-2">No tags</p>}
          </div>
        )}
      </div>

      {/* Genre action */}
      <div className="relative">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setActivePopover(activePopover === 'genre' ? null : 'genre')}
        >
          Genre
        </Button>
        {activePopover === 'genre' && (
          <div className="absolute bottom-full mb-2 left-0 w-40 rounded-lg border border-border-default bg-bg-elevated p-2 shadow-xl max-h-48 overflow-y-auto">
            {allGenres?.map((genre) => (
              <button
                key={genre}
                onClick={() => { bulkSetGenre.mutate({ projectIds: selectedIds, genreLabel: genre }); setActivePopover(null); }}
                className="block w-full text-left px-2 py-1 text-sm text-text-primary hover:bg-bg-surface rounded"
              >
                {genre}
              </button>
            ))}
            {!allGenres?.length && <p className="text-xs text-text-muted p-2">No genres</p>}
          </div>
        )}
      </div>

      {/* Archive action */}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          if (confirm(`Archive ${selectedIds.length} projects?`)) {
            bulkArchive.mutate({ projectIds: selectedIds, archived: true });
          }
        }}
      >
        Archive
      </Button>

      {/* Add to Collection */}
      {manualCollections.length > 0 && (
        <div className="relative">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActivePopover(activePopover === 'collection' ? null : 'collection')}
          >
            Collection
          </Button>
          {activePopover === 'collection' && (
            <div className="absolute bottom-full mb-2 left-0 w-48 rounded-lg border border-border-default bg-bg-elevated p-2 shadow-xl max-h-48 overflow-y-auto">
              {manualCollections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => { bulkAddToCollection.mutate({ projectIds: selectedIds, collectionId: col.id }); setActivePopover(null); }}
                  className="block w-full text-left px-2 py-1 text-sm text-text-primary hover:bg-bg-surface rounded"
                >
                  {col.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="w-px h-6 bg-border-default" />

      <button
        onClick={clearSelection}
        className="text-sm text-text-muted hover:text-text-primary"
      >
        Clear
      </button>
    </div>
  );
}
