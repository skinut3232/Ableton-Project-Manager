import { useState } from 'react';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import type { ProjectTask } from '../../types';

interface TaskRowProps {
  task: ProjectTask;
  onToggle: (done: boolean) => void;
  onUpdateTitle: (title: string) => void;
  onDelete: () => void;
}

export function TaskRow({ task, onToggle, onUpdateTitle, onDelete }: TaskRowProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const { seek } = useAudioPlayer();

  const commitTitle = () => {
    setEditing(false);
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) {
      onUpdateTitle(trimmed);
    } else {
      setTitle(task.title);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-bg-surface/30 group transition-colors">
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={task.done}
        onChange={(e) => onToggle(e.target.checked)}
        className="h-4 w-4 rounded border-border-default bg-bg-elevated text-brand-500 focus:ring-brand-500 focus:ring-offset-0 cursor-pointer"
      />

      {/* Title */}
      {editing ? (
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitTitle();
            if (e.key === 'Escape') { setTitle(task.title); setEditing(false); }
          }}
          autoFocus
          className="flex-1 bg-bg-elevated border border-border-default rounded px-1 py-0.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className={`flex-1 text-sm cursor-pointer ${
            task.done ? 'text-text-muted line-through' : 'text-text-primary'
          }`}
        >
          {task.title}
        </span>
      )}

      {/* Jump-to timestamp */}
      {task.linked_timestamp_seconds != null && (
        <button
          onClick={() => seek(task.linked_timestamp_seconds!)}
          className="text-[10px] text-brand-400 hover:text-brand-300 font-mono transition-colors"
          title="Jump to timestamp"
        >
          @ {formatTime(task.linked_timestamp_seconds)}
        </button>
      )}

      {/* Delete */}
      <button
        onClick={onDelete}
        className="text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
        title="Delete task"
      >
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>
    </div>
  );
}
