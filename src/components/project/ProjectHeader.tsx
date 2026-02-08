import { convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { RatingStars } from '../ui/RatingStars';
import { Button } from '../ui/Button';
import { PROJECT_STATUSES, MUSICAL_KEYS } from '../../lib/constants';
import { tauriInvoke } from '../../hooks/useTauriInvoke';
import { useQueryClient } from '@tanstack/react-query';
import type { Project } from '../../types';
import { useState, useRef, useEffect } from 'react';

interface ProjectHeaderProps {
  project: Project;
  onUpdate: (field: string, value: unknown) => void;
}

export function ProjectHeader({ project, onUpdate }: ProjectHeaderProps) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
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

  const handleArtworkUpload = async () => {
    const selected = await open({
      multiple: false,
      title: 'Select Artwork',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }],
    });
    if (!selected) return;

    setUploading(true);
    try {
      await tauriInvoke('upload_artwork', {
        projectId: project.id,
        sourcePath: selected as string,
      });
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
    } catch (err) {
      console.error('Artwork upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleArtworkDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    // Use the file path from the drop event
    const path = (file as any).path;
    if (!path) return;

    setUploading(true);
    try {
      await tauriInvoke('upload_artwork', {
        projectId: project.id,
        sourcePath: path,
      });
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
    } catch (err) {
      console.error('Artwork upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleOpenAbleton = async () => {
    if (!project.current_set_path) return;
    try {
      await tauriInvoke('open_in_ableton', { setPath: project.current_set_path });
    } catch (err) {
      alert(String(err));
    }
  };

  return (
    <div className="flex gap-6">
      {/* Artwork */}
      <div
        className="h-48 w-48 shrink-0 rounded-lg bg-neutral-700 overflow-hidden cursor-pointer relative group"
        onClick={handleArtworkUpload}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleArtworkDrop}
      >
        {project.artwork_path ? (
          <img
            src={convertFileSrc(project.artwork_path)}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500">
            <span className="text-4xl mb-2">&#9835;</span>
            <span className="text-xs">Click or drop image</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-xs text-white">{uploading ? 'Uploading...' : 'Change artwork'}</span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4 mb-3">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitName();
                if (e.key === 'Escape') { setNameValue(project.name); setEditingName(false); }
              }}
              className="text-2xl font-bold text-white bg-neutral-800 border border-neutral-600 rounded px-2 py-0.5 focus:border-blue-500 focus:outline-none w-full"
            />
          ) : (
            <h1
              className="text-2xl font-bold text-white truncate cursor-pointer hover:text-neutral-300 transition-colors"
              onClick={() => setEditingName(true)}
              title="Click to rename"
            >
              {project.name}
            </h1>
          )}
          <Button variant="primary" size="sm" onClick={handleOpenAbleton} disabled={!project.current_set_path}>
            Open in Ableton
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-3">
          {/* Status dropdown */}
          <select
            value={project.status}
            onChange={(e) => onUpdate('status', e.target.value)}
            className="rounded-md border border-neutral-600 bg-neutral-800 px-2 py-1 text-sm text-white focus:border-blue-500 focus:outline-none"
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
                : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${project.in_rotation ? 'bg-green-400' : 'bg-neutral-600'}`} />
            In Rotation
          </button>

          {/* Archive toggle */}
          <button
            onClick={() => onUpdate('archived', !project.archived)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              project.archived
                ? 'bg-neutral-600 text-white'
                : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300'
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
          <label className="text-xs text-neutral-500 shrink-0">Done:</label>
          <div className="flex items-center gap-3 flex-1 max-w-xs">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={project.progress ?? 0}
              onChange={(e) => onUpdate('progress', parseInt(e.target.value))}
              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer
                bg-neutral-700
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-blue-500
                [&::-webkit-slider-thumb]:hover:bg-blue-400
                [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(59,130,246,0.5)]
                [&::-webkit-slider-thumb]:transition-colors"
            />
            <span className={`text-sm font-medium w-10 text-right ${
              project.progress == null ? 'text-neutral-600' : 'text-white'
            }`}>
              {project.progress != null ? `${project.progress}%` : '—'}
            </span>
          </div>
        </div>

        {/* BPM, Key & Genre */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-neutral-500">BPM:</label>
            <input
              type="number"
              value={project.bpm ?? ''}
              onChange={(e) => onUpdate('bpm', e.target.value ? parseFloat(e.target.value) : null)}
              className="w-16 rounded border border-neutral-600 bg-neutral-800 px-2 py-0.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              placeholder="&#8212;"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-neutral-500">Key:</label>
            <select
              value={project.musical_key}
              onChange={(e) => onUpdate('musicalKey', e.target.value)}
              className="rounded border border-neutral-600 bg-neutral-800 px-2 py-0.5 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              {MUSICAL_KEYS.map((k) => (
                <option key={k} value={k}>{k || '—'}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-neutral-500">Genre:</label>
            <input
              type="text"
              value={project.genre_label}
              onChange={(e) => onUpdate('genreLabel', e.target.value)}
              className="w-32 rounded border border-neutral-600 bg-neutral-800 px-2 py-0.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              placeholder="&#8212;"
            />
          </div>
        </div>

        {project.last_worked_on && (
          <p className="text-xs text-neutral-500 mt-2">
            Last worked on: {new Date(project.last_worked_on + 'Z').toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
