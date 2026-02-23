import { RatingStars } from '../ui/RatingStars';
import { CoverImage } from '../ui/CoverImage';
import { CoverLightbox } from '../cover/CoverLightbox';
import { ChangeCoverModal } from '../cover/ChangeCoverModal';
import { PROJECT_STATUSES, MUSICAL_KEYS } from '../../lib/constants';
import { tauriInvoke } from '../../hooks/useTauriInvoke';
import { formatTimestamp } from '../../lib/utils';
import type { Project } from '../../types';
import { useState, useRef, useEffect } from 'react';
import { generateSongName } from '../../lib/songNameGenerator';

interface ProjectHeaderProps {
  project: Project;
  onUpdate: (field: string, value: unknown) => void;
}

export function ProjectHeader({ project, onUpdate }: ProjectHeaderProps) {
  const [showLightbox, setShowLightbox] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(project.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameValue(project.name);
  }, [project.name]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const commitName = () => {
    setEditingName(false);
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== project.name) {
      onUpdate('name', trimmed);
    } else {
      setNameValue(project.name);
    }
  };

  return (
    <div className="flex gap-6">
      {/* Artwork */}
      <div className="relative group">
        <CoverImage
          project={project}
          size="lg"
          className="shrink-0 rounded-lg"
          onClick={() => setShowLightbox(true)}
          showLock
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg cursor-pointer"
          onClick={() => setShowLightbox(true)}
        >
          <span className="text-xs text-white">View cover</span>
        </div>
      </div>

      {showLightbox && (
        <CoverLightbox
          project={project}
          onClose={() => setShowLightbox(false)}
          onChangeCover={() => { setShowLightbox(false); setShowCoverModal(true); }}
        />
      )}
      {showCoverModal && (
        <ChangeCoverModal
          project={project}
          onClose={() => setShowCoverModal(false)}
        />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4 mb-3">
          {editingName ? (
            <div className="flex items-center gap-2 w-full">
              <input
                ref={nameInputRef}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitName();
                  if (e.key === 'Escape') { setNameValue(project.name); setEditingName(false); }
                }}
                className="text-2xl font-bold text-text-primary bg-bg-elevated border border-border-default rounded-lg px-2 py-0.5 focus:border-brand-500 focus:outline-none flex-1 min-w-0"
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setNameValue(generateSongName())}
                className="shrink-0 flex items-center gap-1 rounded-lg border border-border-default bg-bg-elevated px-2 py-1 text-[10px] text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors"
                title="Generate a random song name"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                  <path d="M13.5 2.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm2-9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-6 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm9 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm6 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-9 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm6 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm3-3a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm0 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/>
                </svg>
                Name it for me
              </button>
            </div>
          ) : (
            <h1
              className="text-2xl font-bold text-text-primary truncate cursor-pointer hover:text-text-secondary transition-colors"
              onClick={() => setEditingName(true)}
              title="Click to rename"
            >
              {project.name}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-3 mb-3">
          {/* Status dropdown */}
          <select
            value={project.status}
            onChange={(e) => onUpdate('status', e.target.value)}
            className="rounded-lg border border-border-default bg-bg-elevated px-2 py-1 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* In Rotation toggle */}
          <button
            onClick={() => onUpdate('inRotation', !project.in_rotation)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              project.in_rotation
                ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                : 'bg-bg-elevated text-text-muted hover:text-text-secondary'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${project.in_rotation ? 'bg-green-400' : 'bg-text-muted'}`} />
            In Rotation
          </button>

          {/* Archive toggle */}
          <button
            onClick={() => onUpdate('archived', !project.archived)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              project.archived
                ? 'bg-bg-surface text-text-primary'
                : 'bg-bg-elevated text-text-muted hover:text-text-secondary'
            }`}
          >
            {project.archived ? 'Archived' : 'Archive'}
          </button>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-3 mb-3">
          <RatingStars
            rating={project.rating}
            onChange={(r) => onUpdate('rating', r || null)}
            size="md"
          />
        </div>

        {/* Progress slider */}
        <div className="flex items-center gap-3 mb-3">
          <label className="text-xs text-text-muted shrink-0">Done:</label>
          <div className="flex items-center gap-3 flex-1 max-w-xs">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={project.progress ?? 0}
              onChange={(e) => onUpdate('progress', parseInt(e.target.value))}
              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer
                bg-bg-surface
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-brand-500
                [&::-webkit-slider-thumb]:hover:bg-brand-400
                [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(139,92,246,0.5)]
                [&::-webkit-slider-thumb]:transition-colors"
            />
            <span className={`text-sm font-medium w-10 text-right ${
              project.progress == null ? 'text-text-muted' : 'text-text-primary'
            }`}>
              {project.progress != null ? `${project.progress}%` : '—'}
            </span>
          </div>
        </div>

        {/* BPM, Key & Genre */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-text-muted">BPM:</label>
            <input
              type="number"
              value={project.bpm ?? ''}
              onChange={(e) => onUpdate('bpm', e.target.value ? parseFloat(e.target.value) : null)}
              className="w-16 rounded border border-border-default bg-bg-elevated px-2 py-0.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              placeholder="&#8212;"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-text-muted">Key:</label>
            <select
              value={project.musical_key}
              onChange={(e) => onUpdate('musicalKey', e.target.value)}
              className="rounded border border-border-default bg-bg-elevated px-2 py-0.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            >
              {MUSICAL_KEYS.map((k) => (
                <option key={k} value={k}>{k || '—'}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-text-muted">Genre:</label>
            <input
              type="text"
              value={project.genre_label}
              onChange={(e) => onUpdate('genreLabel', e.target.value)}
              className="w-32 rounded border border-border-default bg-bg-elevated px-2 py-0.5 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              placeholder="&#8212;"
            />
          </div>
        </div>

        {project.last_worked_on && (
          <p className="text-xs text-text-muted mt-2">
            Last worked on: {formatTimestamp(project.last_worked_on)}
          </p>
        )}
      </div>
    </div>
  );
}
