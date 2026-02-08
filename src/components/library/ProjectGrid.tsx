import { useNavigate } from 'react-router-dom';
import { useLibraryStore } from '../../stores/libraryStore';
import { ProjectCard } from './ProjectCard';
import type { Project } from '../../types';
import { useEffect, useCallback } from 'react';

interface ProjectGridProps {
  projects: Project[];
}

export function ProjectGrid({ projects }: ProjectGridProps) {
  const navigate = useNavigate();
  const focusedIndex = useLibraryStore((s) => s.focusedCardIndex);
  const setFocusedIndex = useLibraryStore((s) => s.setFocusedCardIndex);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

    const cols = getColumnCount();

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        setFocusedIndex(Math.min(focusedIndex + 1, projects.length - 1));
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setFocusedIndex(Math.max(focusedIndex - 1, 0));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(Math.min(focusedIndex + cols, projects.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(Math.max(focusedIndex - cols, 0));
        break;
      case 'Enter':
        if (focusedIndex >= 0 && focusedIndex < projects.length) {
          navigate(`/project/${projects[focusedIndex].id}`);
        }
        break;
    }
  }, [focusedIndex, projects, navigate, setFocusedIndex]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll focused card into view
  useEffect(() => {
    if (focusedIndex >= 0) {
      const el = document.getElementById(`project-card-${focusedIndex}`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIndex]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {projects.map((project, index) => (
        <ProjectCard
          key={project.id}
          project={project}
          index={index}
          isFocused={index === focusedIndex}
          onClick={() => navigate(`/project/${project.id}`)}
        />
      ))}
    </div>
  );
}

function getColumnCount(): number {
  const width = window.innerWidth;
  if (width >= 1280) return 4;
  if (width >= 1024) return 3;
  if (width >= 640) return 2;
  return 1;
}
