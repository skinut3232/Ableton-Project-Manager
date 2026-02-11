import { useState } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useReferences, useCreateReference, useUpdateReference, useDeleteReference } from '../../hooks/useReferences';
import { SpotifyReferencesSection } from './SpotifyReferencesSection';

interface ReferencesTabProps {
  projectId: number;
}

export function ReferencesTab({ projectId }: ReferencesTabProps) {
  const { data: refs = [] } = useReferences(projectId);
  const createRef = useCreateReference(projectId);
  const updateRef = useUpdateReference(projectId);
  const deleteRef = useDeleteReference(projectId);

  const [showAdd, setShowAdd] = useState(false);
  const [addUrl, setAddUrl] = useState('');
  const [addTitle, setAddTitle] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState('');

  const handleAdd = () => {
    const url = addUrl.trim();
    if (!url) return;
    createRef.mutate({
      url,
      title: addTitle.trim() || null,
      notes: addNotes.trim(),
    });
    setAddUrl('');
    setAddTitle('');
    setAddNotes('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-4">
      {/* Spotify Reference Tracks */}
      <SpotifyReferencesSection projectId={projectId} />

      {/* Divider */}
      <div className="border-t border-neutral-700" />

      {/* Add button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-300">
          References ({refs.length})
        </h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
        >
          {showAdd ? 'Cancel' : 'Add Reference'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-3 space-y-2">
          <input
            value={addUrl}
            onChange={(e) => setAddUrl(e.target.value)}
            placeholder="URL (required)"
            autoFocus
            className="w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-1.5 text-sm text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
          />
          <input
            value={addTitle}
            onChange={(e) => setAddTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-1.5 text-sm text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
          />
          <textarea
            value={addNotes}
            onChange={(e) => setAddNotes(e.target.value)}
            placeholder="Notes..."
            rows={2}
            className="w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-1.5 text-sm text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none resize-none"
          />
          <button
            onClick={handleAdd}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
          >
            Add
          </button>
        </div>
      )}

      {/* List */}
      {refs.length === 0 && !showAdd ? (
        <div className="text-center py-12">
          <p className="text-neutral-400 mb-1">No references yet</p>
          <p className="text-xs text-neutral-600">
            Add links to inspiration, tutorials, or reference tracks
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {refs.map((ref) => (
            <div
              key={ref.id}
              className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-3 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {ref.title || ref.url}
                  </p>
                  {ref.title && (
                    <p className="text-[10px] text-neutral-500 truncate">{ref.url}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openUrl(ref.url)}
                    className="rounded bg-neutral-700 px-2 py-1 text-[10px] text-neutral-300 hover:bg-neutral-600 transition-colors"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => deleteRef.mutate(ref.id)}
                    className="text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                    title="Delete"
                  >
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Editable notes */}
              {editingId === ref.id ? (
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  onBlur={() => {
                    if (editNotes !== ref.notes) {
                      updateRef.mutate({ id: ref.id, notes: editNotes });
                    }
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                  rows={2}
                  className="mt-2 w-full rounded border border-neutral-600 bg-neutral-900 px-2 py-1 text-xs text-neutral-300 focus:border-blue-500 focus:outline-none resize-none"
                />
              ) : (
                <p
                  onClick={() => {
                    setEditingId(ref.id);
                    setEditNotes(ref.notes);
                  }}
                  className="mt-1 text-xs text-neutral-500 cursor-pointer hover:text-neutral-400 transition-colors"
                >
                  {ref.notes || 'Click to add notes...'}
                </p>
              )}

              <p className="text-[10px] text-neutral-600 mt-1">
                Added {new Date(ref.created_at + 'Z').toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
