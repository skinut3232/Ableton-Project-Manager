import { StatusBadge } from '../ui/StatusBadge';
import { RatingStars } from '../ui/RatingStars';
import { PlayButton } from '../audio/PlayButton';
import { CoverImage } from '../ui/CoverImage';
import { getRelativeTime } from '../../lib/utils';
import type { Project, ProjectStatus } from '../../types';

interface ProjectCardProps {
  project: Project;
  index: number;
  isFocused: boolean;
  onClick: () => void;
}

export function ProjectCard({ project, index, isFocused, onClick }: ProjectCardProps) {
  const relativeTime = project.last_worked_on ? getRelativeTime(project.last_worked_on) : '';

  return (
    <div
      id={`project-card-${index}`}
      onClick={onClick}
      className={`group relative cursor-pointer rounded-lg border bg-bg-elevated p-4 transition-all hover:border-text-muted hover:bg-bg-surface ${
        isFocused ? 'border-brand-500 ring-1 ring-brand-500' : 'border-border-default'
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
        <h3 className="text-sm font-medium text-text-primary truncate flex-1">{project.name}</h3>
        {project.in_rotation && (
          <span className="shrink-0 h-2 w-2 rounded-full bg-green-400 mt-1.5" title="In Rotation" />
        )}
      </div>

      {/* Status & BPM */}
      <div className="flex items-center gap-2 mb-2">
        <StatusBadge status={project.status as ProjectStatus} />
        {project.bpm && (
          <span className="text-xs text-text-muted">{project.bpm} BPM</span>
        )}
        {project.genre_label && (
          <span className="text-xs text-text-muted">{project.genre_label}</span>
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
            <span key={tag.id} className="rounded-full bg-bg-surface px-2 py-0.5 text-[10px] text-text-secondary">
              {tag.name}
            </span>
          ))}
          {project.tags.length > 3 && (
            <span className="text-[10px] text-text-muted">+{project.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Last worked on */}
      {relativeTime && (
        <p className="text-[10px] text-text-muted">{relativeTime}</p>
      )}
    </div>
  );
}

