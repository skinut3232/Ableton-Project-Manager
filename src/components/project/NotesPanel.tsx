import { useState, useRef, useEffect, useCallback } from 'react';
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../../hooks/useNotes';
import { getRelativeTime } from '../../lib/utils';
import type { ProjectNote } from '../../types';

interface NotesPanelProps {
  projectId: number;
}

export function NotesPanel({ projectId }: NotesPanelProps) {
  const { data: notes = [], isLoading } = useNotes(projectId);
  const createNote = useCreateNote(projectId);
  const updateNote = useUpdateNote(projectId);
  const deleteNote = useDeleteNote(projectId);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    if (shouldScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setShouldScroll(false);
    }
  }, [notes, shouldScroll]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    createNote.mutate(trimmed);
    setInput('');
    setShouldScroll(true);
  }, [input, createNote]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (isLoading) {
    return <div className="text-neutral-500 text-sm py-8 text-center">Loading notes...</div>;
  }

  return (
    <div className="flex flex-col h-[500px]">
      {/* Scrollable notes area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
        {notes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-neutral-500 text-sm">No notes yet. Type below to add one.</p>
          </div>
        ) : (
          notes.map((note) => (
            <NoteBubble
              key={note.id}
              note={note}
              onUpdate={(content) => updateNote.mutate({ id: note.id, content })}
              onDelete={() => deleteNote.mutate(note.id)}
            />
          ))
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-neutral-700 pt-3">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a note... (Enter to save, Shift+Enter for newline)"
          rows={1}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 resize-none focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>
    </div>
  );
}

interface NoteBubbleProps {
  note: ProjectNote;
  onUpdate: (content: string) => void;
  onDelete: () => void;
}

function NoteBubble({ note, onUpdate, onDelete }: NoteBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [isHovered, setIsHovered] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.selectionStart = editRef.current.value.length;
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== note.content) {
      onUpdate(trimmed);
    } else {
      setEditContent(note.content);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(note.content);
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const wasEdited = note.updated_at !== note.created_at;
  const timestamp = getRelativeTime(note.created_at);

  return (
    <div
      className="group relative rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Delete button */}
      {isHovered && !isEditing && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-1.5 right-1.5 p-0.5 rounded text-neutral-500 hover:text-red-400 hover:bg-neutral-700 transition-colors"
          title="Delete note"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {isEditing ? (
        <textarea
          ref={editRef}
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onKeyDown={handleEditKeyDown}
          onBlur={handleSave}
          rows={2}
          className="w-full bg-transparent text-sm text-white resize-none focus:outline-none"
        />
      ) : (
        <div
          onClick={() => { setIsEditing(true); setEditContent(note.content); }}
          className="cursor-pointer"
        >
          <p className="text-sm text-neutral-200 whitespace-pre-wrap pr-5">{note.content}</p>
        </div>
      )}

      {/* Timestamp */}
      <div className="flex items-center gap-1 mt-1">
        <span className="text-[10px] text-neutral-600">
          {timestamp}
          {wasEdited && ' (edited)'}
        </span>
      </div>
    </div>
  );
}

