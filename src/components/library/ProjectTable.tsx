import { useNavigate } from 'react-router-dom';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useLibraryStore } from '../../stores/libraryStore';
import { TABLE_COLUMNS, type TableColumnKey } from '../../lib/constants';
import { StatusBadge } from '../ui/StatusBadge';
import { RatingStars } from '../ui/RatingStars';
import type { Project, ProjectStatus } from '../../types';

interface ProjectTableProps {
  projects: Project[];
}

export function ProjectTable({ projects }: ProjectTableProps) {
  const navigate = useNavigate();
  const visibleColumns = useLibraryStore((s) => s.visibleColumns);
  const sortBy = useLibraryStore((s) => s.sortBy);
  const tableSortDir = useLibraryStore((s) => s.tableSortDir);
  const setTableSort = useLibraryStore((s) => s.setTableSort);
  const focusedCardIndex = useLibraryStore((s) => s.focusedCardIndex);
  const setFocusedCardIndex = useLibraryStore((s) => s.setFocusedCardIndex);

  const columns = TABLE_COLUMNS.filter((c) => visibleColumns.includes(c.key));

  const handleHeaderClick = (key: TableColumnKey) => {
    const col = TABLE_COLUMNS.find((c) => c.key === key);
    if (!col?.sortable) return;
    if (sortBy === key) {
      setTableSort(key, tableSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setTableSort(key, 'desc');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedCardIndex(Math.min(focusedCardIndex + 1, projects.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedCardIndex(Math.max(focusedCardIndex - 1, 0));
    } else if (e.key === 'Enter' && focusedCardIndex >= 0 && focusedCardIndex < projects.length) {
      navigate(`/project/${projects[focusedCardIndex].id}`);
    }
  };

  return (
    <div
      className="overflow-x-auto rounded-lg border border-neutral-700"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <table className="w-full text-sm text-left">
        <thead className="bg-neutral-800 border-b border-neutral-700 sticky top-0 z-10">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2.5 text-xs font-medium text-neutral-400 uppercase tracking-wider whitespace-nowrap ${
                  col.sortable ? 'cursor-pointer hover:text-white select-none' : ''
                }`}
                style={{ width: col.width.startsWith('minmax') ? undefined : col.width }}
                onClick={() => handleHeaderClick(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortBy === col.key && (
                    <SortIndicator dir={tableSortDir} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {projects.map((project, index) => (
            <tr
              key={project.id}
              id={`project-card-${index}`}
              onClick={() => navigate(`/project/${project.id}`)}
              onMouseEnter={() => setFocusedCardIndex(index)}
              className={`cursor-pointer transition-colors ${
                focusedCardIndex === index
                  ? 'bg-neutral-700/50'
                  : 'bg-neutral-900 hover:bg-neutral-800'
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 whitespace-nowrap">
                  <CellRenderer column={col.key} project={project} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortIndicator({ dir }: { dir: 'asc' | 'desc' }) {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {dir === 'asc' ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      )}
    </svg>
  );
}

function CellRenderer({ column, project }: { column: TableColumnKey; project: Project }) {
  switch (column) {
    case 'name':
      return (
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 shrink-0 rounded bg-neutral-700 overflow-hidden">
            {project.artwork_path ? (
              <img
                src={convertFileSrc(project.artwork_path)}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-neutral-600">♪</div>
            )}
          </div>
          <span className="text-white font-medium truncate">{project.name}</span>
          {project.in_rotation && (
            <span className="shrink-0 h-2 w-2 rounded-full bg-green-400" title="In Rotation" />
          )}
        </div>
      );

    case 'status':
      return <StatusBadge status={project.status as ProjectStatus} />;

    case 'rating':
      return <RatingStars rating={project.rating} readonly size="sm" />;

    case 'bpm':
      return (
        <span className="text-neutral-400">
          {project.bpm != null ? project.bpm : '—'}
        </span>
      );

    case 'musical_key':
      return (
        <span className="text-neutral-400">
          {project.musical_key || '—'}
        </span>
      );

    case 'genre_label':
      return (
        <span className="text-neutral-400">
          {project.genre_label || '—'}
        </span>
      );

    case 'tags':
      return (
        <div className="flex flex-wrap gap-1">
          {project.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="rounded-full bg-neutral-700 px-2 py-0.5 text-[10px] text-neutral-400"
            >
              {tag.name}
            </span>
          ))}
          {project.tags.length > 3 && (
            <span className="text-[10px] text-neutral-500">+{project.tags.length - 3}</span>
          )}
        </div>
      );

    case 'last_worked_on':
      return (
        <span className="text-neutral-400">{formatDate(project.last_worked_on)}</span>
      );

    case 'in_rotation':
      return (
        <span className={project.in_rotation ? 'text-green-400' : 'text-neutral-600'}>
          {project.in_rotation ? 'Yes' : 'No'}
        </span>
      );

    case 'notes':
      return (
        <span className="text-neutral-500 truncate block max-w-[200px]">
          {project.notes || '—'}
        </span>
      );

    case 'created_at':
      return <span className="text-neutral-400">{formatDate(project.created_at)}</span>;

    case 'updated_at':
      return <span className="text-neutral-400">{formatDate(project.updated_at)}</span>;

    case 'archived':
      return (
        <span className={project.archived ? 'text-yellow-400' : 'text-neutral-600'}>
          {project.archived ? 'Yes' : 'No'}
        </span>
      );

    case 'project_path':
      return (
        <span className="text-neutral-500 truncate block max-w-[250px]" title={project.project_path}>
          {project.project_path}
        </span>
      );

    default:
      return null;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr + 'Z');
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays < 1) {
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 1) return 'Just now';
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
