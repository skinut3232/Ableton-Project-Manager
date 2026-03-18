import { useState } from 'react';
import { useVersionTimeline, useUpsertVersionNote, useDeleteVersionNote } from '../../hooks/useVersionTimeline';
import { formatTimestamp, getRelativeTime } from '../../lib/utils';

interface VersionTimelineProps {
  projectId: number;
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileName(setPath: string): string {
  const parts = setPath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || setPath;
}

export function VersionTimeline({ projectId }: VersionTimelineProps) {
  const { data: entries, isLoading } = useVersionTimeline(projectId);
  const upsertNote = useUpsertVersionNote();
  const deleteNote = useDeleteVersionNote();
  const [editingSetId, setEditingSetId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');

  if (isLoading) {
    return <div className="text-text-secondary text-sm">Loading versions...</div>;
  }

  if (!entries?.length) {
    return (
      <div className="text-center py-8">
        <p className="text-text-secondary text-sm">No .als versions found</p>
      </div>
    );
  }

  const handleStartEdit = (setId: number, existingNote: string | null) => {
    setEditingSetId(setId);
    setNoteText(existingNote || '');
  };

  const handleSaveNote = (setId: number) => {
    if (noteText.trim()) {
      upsertNote.mutate({ setId, projectId, note: noteText.trim() });
    } else {
      deleteNote.mutate({ setId, projectId });
    }
    setEditingSetId(null);
    setNoteText('');
  };

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border-default" />

      <div className="space-y-4">
        {entries.map((entry, idx) => (
          <div key={entry.set.id} className="relative pl-9">
            {/* Timeline dot */}
            <div className={`absolute left-1.5 top-2 w-3 h-3 rounded-full border-2 ${
              idx === 0 ? 'bg-brand-500 border-brand-500' : 'bg-bg-primary border-border-default'
            }`} />

            <div className="rounded-lg border border-border-default bg-bg-elevated p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {getFileName(entry.set.set_path)}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                    <span>{formatTimestamp(entry.set.modified_time)}</span>
                    <span>{getRelativeTime(entry.set.modified_time)}</span>
                    <span>{formatFileSize(entry.set.file_size)}</span>
                  </div>
                </div>
                {idx === 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 shrink-0">
                    Current
                  </span>
                )}
              </div>

              {/* Note area */}
              {editingSetId === entry.set.id ? (
                <div className="mt-2">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note about this version..."
                    className="w-full rounded border border-border-default bg-bg-primary px-2 py-1.5 text-sm text-text-primary placeholder-text-muted focus:border-brand-500 focus:outline-none resize-none"
                    rows={2}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSaveNote(entry.set.id);
                      }
                      if (e.key === 'Escape') {
                        setEditingSetId(null);
                      }
                    }}
                  />
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => handleSaveNote(entry.set.id)}
                      className="text-xs text-brand-400 hover:text-brand-300"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingSetId(null)}
                      className="text-xs text-text-muted hover:text-text-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : entry.note ? (
                <p
                  className="mt-2 text-sm text-text-secondary cursor-pointer hover:text-text-primary"
                  onClick={() => handleStartEdit(entry.set.id, entry.note)}
                >
                  {entry.note}
                </p>
              ) : (
                <button
                  onClick={() => handleStartEdit(entry.set.id, null)}
                  className="mt-2 text-xs text-text-muted hover:text-text-secondary"
                >
                  + Add note
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
