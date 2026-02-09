import { useState, useEffect, useMemo } from 'react';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../../hooks/useTasks';
import { TASK_CATEGORIES } from '../../lib/constants';
import { TaskRow } from './TaskRow';
import { TaskAddForm } from './TaskAddForm';

interface TasksTabProps {
  projectId: number;
}

export function TasksTab({ projectId }: TasksTabProps) {
  const { data: tasks = [] } = useTasks(projectId);
  const createTask = useCreateTask(projectId);
  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);
  const [addFocused, setAddFocused] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // T shortcut to focus add form
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setAddFocused(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof tasks> = {};
    for (const cat of TASK_CATEGORIES) {
      const items = tasks.filter((t) => t.category === cat);
      if (items.length > 0) groups[cat] = items;
    }
    return groups;
  }, [tasks]);

  const toggleCollapse = (cat: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const incompleteCount = tasks.filter((t) => !t.done).length;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-neutral-500">
          {incompleteCount} remaining | T: add task
        </span>
      </div>

      {/* Add form */}
      <TaskAddForm
        autoFocus={addFocused}
        onAdd={async (title, category) => {
          setAddError(null);
          try {
            await createTask.mutateAsync({ title, category });
            setAddFocused(false);
            return true;
          } catch (err) {
            console.error('Failed to create task:', err);
            setAddError(String(err));
            return false;
          }
        }}
      />
      {addError && (
        <p className="text-xs text-red-400">Error: {addError}</p>
      )}

      {/* Grouped task list */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-neutral-400 mb-1">No tasks yet</p>
          <p className="text-xs text-neutral-600">
            Press T to add a task, or convert a marker from the Timeline tab
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([category, items]) => {
            const incomplete = items.filter((t) => !t.done).length;
            const isCollapsed = collapsed.has(category);
            return (
              <div key={category}>
                <button
                  onClick={() => toggleCollapse(category)}
                  className="flex items-center gap-2 w-full text-left mb-1"
                >
                  <svg
                    className={`h-3 w-3 text-neutral-500 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span className="text-xs font-medium text-neutral-400">{category}</span>
                  <span className="text-[10px] text-neutral-600">
                    {incomplete > 0 ? `${incomplete} remaining` : 'all done'}
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="ml-2">
                    {items.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onToggle={(done) => updateTask.mutate({ id: task.id, done })}
                        onUpdateTitle={(title) => updateTask.mutate({ id: task.id, title })}
                        onDelete={() => deleteTask.mutate(task.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
