import { useState, useRef, useEffect } from 'react';
import { TASK_CATEGORIES } from '../../lib/constants';
import type { TaskCategory } from '../../types';

interface TaskAddFormProps {
  onAdd: (title: string, category: TaskCategory) => Promise<boolean>;
  autoFocus?: boolean;
}

export function TaskAddForm({ onAdd, autoFocus }: TaskAddFormProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Arrangement');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const success = await onAdd(trimmed, category);
      if (success) setTitle('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task..."
        disabled={submitting}
        className="flex-1 rounded border border-border-default bg-bg-elevated px-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:border-brand-500 focus:outline-none disabled:opacity-50"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as TaskCategory)}
        disabled={submitting}
        className="rounded border border-border-default bg-bg-elevated px-2 py-1.5 text-xs text-text-primary focus:border-brand-500 focus:outline-none disabled:opacity-50"
      >
        {TASK_CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500 transition-colors disabled:opacity-50"
      >
        {submitting ? 'Adding...' : 'Add'}
      </button>
    </form>
  );
}
