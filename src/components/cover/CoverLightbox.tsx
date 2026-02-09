import { useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { Project } from '../../types';

interface CoverLightboxProps {
  project: Project;
  onClose: () => void;
  onChangeCover: () => void;
}

const COVER_TYPE_LABELS: Record<string, string> = {
  generated: 'Generated',
  uploaded: 'Uploaded',
  moodboard: 'Mood Board',
  none: 'No Cover',
};

export function CoverLightbox({ project, onClose, onChangeCover }: CoverLightboxProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const fallbackHue = (project.id * 137) % 360;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover image */}
        <div className="rounded-xl overflow-hidden shadow-2xl">
          {project.artwork_path ? (
            <img
              src={convertFileSrc(project.artwork_path)}
              alt={project.name}
              className="w-full aspect-square object-cover"
            />
          ) : (
            <div
              className="w-full aspect-square flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, hsl(${fallbackHue}, 25%, 22%) 0%, hsl(${(fallbackHue + 20) % 360}, 20%, 18%) 100%)`,
              }}
            >
              <span className="text-6xl text-neutral-600">&#9835;</span>
            </div>
          )}
        </div>

        {/* Info bar */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">
              {COVER_TYPE_LABELS[project.cover_type] || 'Unknown'}
            </span>
            {project.cover_locked && (
              <span className="flex items-center gap-1 text-xs text-neutral-500">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Locked
              </span>
            )}
          </div>
          <button
            onClick={onChangeCover}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            Change Cover
          </button>
        </div>
      </div>
    </div>
  );
}
