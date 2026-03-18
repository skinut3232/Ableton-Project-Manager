import { useState } from 'react';
import { useCreateCollection } from '../../hooks/useCollections';
import { Button } from '../ui/Button';
import type { CollectionType } from '../../types';

interface CreateCollectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateCollectionDialog({ isOpen, onClose }: CreateCollectionDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CollectionType>('manual');
  const createCollection = useCreateCollection();

  const handleCreate = () => {
    if (!name.trim()) return;
    createCollection.mutate(
      { name: name.trim(), collectionType: type, icon: '' },
      {
        onSuccess: () => {
          onClose();
          setName('');
          setType('manual');
        },
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-80 rounded-lg border border-border-default bg-bg-secondary p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-text-primary mb-4">New Collection</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Collection"
              className="w-full rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-brand-500 focus:outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') onClose();
              }}
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-2">Type</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-1.5 text-sm text-text-primary cursor-pointer">
                <input
                  type="radio"
                  name="collectionType"
                  checked={type === 'manual'}
                  onChange={() => setType('manual')}
                  className="accent-brand-500"
                />
                Manual
              </label>
              <label className="flex items-center gap-1.5 text-sm text-text-primary cursor-pointer">
                <input
                  type="radio"
                  name="collectionType"
                  checked={type === 'smart'}
                  onChange={() => setType('smart')}
                  className="accent-brand-500"
                />
                Smart
              </label>
            </div>
            <p className="text-xs text-text-muted mt-1">
              {type === 'manual'
                ? 'Manually add projects to this collection'
                : 'Auto-populate based on filter rules'}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || createCollection.isPending}>
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
