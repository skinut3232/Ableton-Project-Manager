import { useNavigate } from 'react-router-dom';
import { useLibraryStore } from '../../stores/libraryStore';
import { TABLE_COLUMNS, type TableColumnKey } from '../../lib/constants';
import { StatusBadge } from '../ui/StatusBadge';
import { RatingStars } from '../ui/RatingStars';
import { PlayButton } from '../audio/PlayButton';
import { CoverImage } from '../ui/CoverImage';
import { parseTimestamp } from '../../lib/utils';
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
      className="overflow-x-auto rounded-lg border border-border-default"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <table className="w-full text-sm text-left">
        <thead className="bg-bg-elevated border-b border-border-default sticky top-0 z-10">
          <tr>
            <th className="w-10 px-1 py-2.5" />
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2.5 text-xs font-medium text-text-secondary uppercase tracking-wider whitespace-nowrap ${
                  col.sortable ? 'cursor-pointer hover:text-text-primary select-none' : ''
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
        <tbody className="divide-y divide-bg-elevated">
          {projects.map((project, index) => (
            <tr
              key={project.id}
              id={`project-card-${index}`}
              onClick={() => navigate(`/project/${project.id}`)}
              onMouseEnter={() => setFocusedCardIndex(index)}
              className={`cursor-pointer transition-colors ${
                focusedCardIndex === index
                  ? 'bg-bg-surface/50'
                  : 'bg-bg-primary hover:bg-bg-elevated'
              }`}
            >
              <td className="px-1 py-2 text-center">
                <PlayButton projectId={project.id} project={project} />
              </td>
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
          <CoverImage project={project} size="sm" className="shrink-0 rounded" />
          <span className="text-text-primary font-medium truncate">{project.name}</span>
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
        <span className="text-text-secondary">
          {project.bpm != null ? project.bpm : '—'}
        </span>
      );

    case 'musical_key':
      return (
        <span className="text-text-secondary">
          {project.musical_key || '—'}
        </span>
      );

    case 'genre_label':
      return (
        <span className="text-text-secondary">
          {project.genre_label || '—'}
        </span>
      );

    case 'tags':
      return (
        <div className="flex flex-wrap gap-1">
          {project.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="rounded-full bg-bg-surface px-2 py-0.5 text-[10px] text-text-secondary"
            >
              {tag.name}
            </span>
          ))}
          {project.tags.length > 3 && (
            <span className="text-[10px] text-text-muted">+{project.tags.length - 3}</span>
          )}
        </div>
      );

    case 'last_worked_on':
      return (
        <span className="text-text-secondary">{formatDate(project.last_worked_on)}</span>
      );

    case 'in_rotation':
      return (
        <span className={project.in_rotation ? 'text-green-400' : 'text-text-muted'}>
          {project.in_rotation ? 'Yes' : 'No'}
        </span>
      );

    case 'notes':
      return (
        <span className="text-text-muted truncate block max-w-[200px]">
          —
        </span>
      );

    case 'created_at':
      return <span className="text-text-secondary">{formatDate(project.created_at)}</span>;

    case 'updated_at':
      return <span className="text-text-secondary">{formatDate(project.updated_at)}</span>;

    case 'progress':
      if (project.progress == null) {
        return <span className="text-text-muted">—</span>;
      }
      return (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-bg-surface overflow-hidden">
            <div
              className="h-full rounded-full transition-all bg-gradient-to-r from-brand-500 to-emerald-400"
              style={{ width: `${project.progress}%` }}
            />
          </div>
          <span className="text-xs text-text-secondary w-8 text-right">{project.progress}%</span>
        </div>
      );

    case 'archived':
      return (
        <span className={project.archived ? 'text-yellow-400' : 'text-text-muted'}>
          {project.archived ? 'Yes' : 'No'}
        </span>
      );

    case 'project_path':
      return (
        <span className="text-text-muted truncate block max-w-[250px]" title={project.project_path}>
          {project.project_path}
        </span>
      );

    default:
      return null;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = parseTimestamp(dateStr);
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
