import { StatusBadge } from '../ui/StatusBadge';
import { RatingStars } from '../ui/RatingStars';
import { PlayButton } from '../audio/PlayButton';
import { CoverImage } from '../ui/CoverImage';
import type { Project, ProjectStatus } from '../../types';

interface ProjectCardProps {
  project: Project;
  index: number;
  isFocused: boolean;
  onClick: () => void;
}

export function ProjectCard({ project, index, isFocused, onClick }: ProjectCardProps) {
  const relativeTime = getRelativeTime(project.last_worked_on);
  const notesSnippet = project.notes.length > 120
    ? project.notes.slice(0, 120) + '...'
    : project.notes;

  return (
    <div
      id={`project-card-${index}`}
      onClick={onClick}
      className={`group relative cursor-pointer rounded-lg border bg-neutral-800 p-4 transition-all hover:border-neutral-500 hover:bg-neutral-750 ${
        isFocused ? 'border-blue-500 ring-1 ring-blue-500' : 'border-neutral-700'
      }`}
    >
      {/* Artwork */}
      <div className="relative mb-3">
        <CoverImage project={project} size="md" className="rounded-md" />
        {/* Play button overlay */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <PlayButton projectId={project.id} project={project} />
        </div>
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-sm font-medium text-white truncate flex-1">{project.name}</h3>
        {project.in_rotation && (
          <span className="shrink-0 h-2 w-2 rounded-full bg-green-400 mt-1.5" title="In Rotation" />
        )}
      </div>

      {/* Status & BPM */}
      <div className="flex items-center gap-2 mb-2">
        <StatusBadge status={project.status as ProjectStatus} />
        {project.bpm && (
          <span className="text-xs text-neutral-500">{project.bpm} BPM</span>
        )}
        {project.genre_label && (
          <span className="text-xs text-neutral-500">{project.genre_label}</span>
        )}
      </div>

      {/* Rating */}
      {project.rating && (
        <div className="mb-2">
          <RatingStars rating={project.rating} readonly size="sm" />
        </div>
      )}

      {/* Tags */}
      {project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {project.tags.slice(0, 3).map((tag) => (
            <span key={tag.id} className="rounded-full bg-neutral-700 px-2 py-0.5 text-[10px] text-neutral-400">
              {tag.name}
            </span>
          ))}
          {project.tags.length > 3 && (
            <span className="text-[10px] text-neutral-500">+{project.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Notes snippet */}
      {notesSnippet && (
        <p className="text-xs text-neutral-500 line-clamp-2 mb-2">{notesSnippet}</p>
      )}

      {/* Last worked on */}
      {relativeTime && (
        <p className="text-[10px] text-neutral-600">{relativeTime}</p>
      )}
    </div>
  );
}

function getRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'Z');
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}
