import { useState } from 'react';
import { useCollections, useDeleteCollection } from '../../hooks/useCollections';
import { useLibraryStore } from '../../stores/libraryStore';
import { CreateCollectionDialog } from './CreateCollectionDialog';

export function CollectionsList() {
  const { data: collections } = useCollections();
  const deleteCollection = useDeleteCollection();
  const activeCollectionId = useLibraryStore((s) => s.activeCollectionId);
  const setActiveCollectionId = useLibraryStore((s) => s.setActiveCollectionId);
  const [showCreate, setShowCreate] = useState(false);
  const [contextMenuId, setContextMenuId] = useState<number | null>(null);

  if (!collections?.length && !showCreate) {
    return (
      <div className="px-2">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Collections</span>
          <button
            onClick={() => setShowCreate(true)}
            className="text-xs text-text-muted hover:text-text-primary"
            title="New Collection"
          >
            +
          </button>
        </div>
        <p className="px-3 text-xs text-text-muted">No collections yet</p>
        <CreateCollectionDialog isOpen={showCreate} onClose={() => setShowCreate(false)} />
      </div>
    );
  }

  return (
    <div className="px-2">
      <div className="flex items-center justify-between px-3 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Collections</span>
        <button
          onClick={() => setShowCreate(true)}
          className="text-xs text-text-muted hover:text-text-primary"
          title="New Collection"
        >
          +
        </button>
      </div>

      <div className="space-y-0.5">
        {collections?.map((col) => (
          <button
            key={col.id}
            onClick={() => {
              if (activeCollectionId === col.id) {
                setActiveCollectionId(null);
              } else {
                setActiveCollectionId(col.id);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenuId(contextMenuId === col.id ? null : col.id);
            }}
            className={`w-full flex items-center justify-between rounded-lg px-3 py-1.5 text-sm transition-colors ${
              activeCollectionId === col.id
                ? 'bg-bg-elevated text-text-primary'
                : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
            }`}
          >
            <span className="truncate">
              {col.icon ? `${col.icon} ` : ''}{col.name}
            </span>
            <span className="text-xs text-text-muted ml-1">
              {col.collection_type === 'smart' ? 'S' : col.project_count}
            </span>
          </button>
        ))}
      </div>

      {/* Simple context menu for delete */}
      {contextMenuId !== null && (
        <div className="px-3 py-1">
          <button
            onClick={() => {
              deleteCollection.mutate(contextMenuId);
              if (activeCollectionId === contextMenuId) {
                setActiveCollectionId(null);
              }
              setContextMenuId(null);
            }}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Delete collection
          </button>
          <button
            onClick={() => setContextMenuId(null)}
            className="text-xs text-text-muted hover:text-text-secondary ml-2"
          >
            Cancel
          </button>
        </div>
      )}

      <CreateCollectionDialog isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
