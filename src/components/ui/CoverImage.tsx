import { convertFileSrc } from '@tauri-apps/api/core';
import type { Project } from '../../types';

interface CoverImageProps {
  project: Project;
  size: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  showLock?: boolean;
}

const SIZE_MAP = {
  sm: 'h-7 w-7',
  md: 'h-36 w-full',
  lg: 'h-48 w-48',
};

/**
 * Deterministic CSS gradient fallback based on project.id.
 * Every project gets a unique hue even before generation runs.
 */
function fallbackGradient(id: number): string {
  const hue = (id * 137) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 25%, 22%) 0%, hsl(${(hue + 20) % 360}, 20%, 18%) 100%)`;
}

export function CoverImage({ project, size, className = '', onClick, showLock }: CoverImageProps) {
  const sizeClass = SIZE_MAP[size];

  return (
    <div
      className={`relative rounded-${size === 'sm' ? '' : 'md'} bg-neutral-700 overflow-hidden ${sizeClass} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      style={!project.artwork_path ? { background: fallbackGradient(project.id) } : undefined}
      onClick={onClick}
    >
      {project.artwork_path ? (
        <img
          src={convertFileSrc(project.artwork_path) + (project.cover_updated_at ? `?t=${encodeURIComponent(project.cover_updated_at)}` : '')}
          alt={project.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <span className={`text-neutral-600 ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-3xl' : 'text-4xl'}`}>
            &#9835;
          </span>
        </div>
      )}
      {showLock && project.cover_locked && (
        <div className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5">
          <svg className="h-3 w-3 text-neutral-300" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
}
