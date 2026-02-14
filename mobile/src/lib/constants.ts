import type { ProjectStatus, MarkerType, TaskCategory } from '../types';

export const PROJECT_STATUSES: ProjectStatus[] = [
  'Sketch', 'Write', 'Arrange', 'Mix', 'Master', 'Done',
];

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  Sketch: '#6b7280',   // gray-500
  Write: '#3b82f6',    // blue-500
  Arrange: '#a855f7',  // purple-500
  Mix: '#f97316',      // orange-500
  Master: '#eab308',   // yellow-500
  Done: '#22c55e',     // green-500
};

export const STATUS_BG_COLORS: Record<ProjectStatus, string> = {
  Sketch: '#374151',   // gray-700
  Write: '#1e3a5f',    // blue-900-ish
  Arrange: '#4c1d95',  // purple-900-ish
  Mix: '#7c2d12',      // orange-900-ish
  Master: '#713f12',   // yellow-900-ish
  Done: '#14532d',     // green-900-ish
};

export const MUSICAL_KEYS = [
  '',
  'C Major', 'C Minor',
  'C# Major', 'C# Minor',
  'D Major', 'D Minor',
  'Eb Major', 'Eb Minor',
  'E Major', 'E Minor',
  'F Major', 'F Minor',
  'F# Major', 'F# Minor',
  'G Major', 'G Minor',
  'Ab Major', 'Ab Minor',
  'A Major', 'A Minor',
  'Bb Major', 'Bb Minor',
  'B Major', 'B Minor',
] as const;

export const SORT_OPTIONS = [
  { value: 'last_worked_on', label: 'Last Worked On' },
  { value: 'name', label: 'Name' },
  { value: 'rating', label: 'Rating' },
  { value: 'status', label: 'Status' },
  { value: 'bpm', label: 'BPM' },
  { value: 'musical_key', label: 'Key' },
  { value: 'genre_label', label: 'Genre' },
  { value: 'created_at', label: 'Created' },
  { value: 'updated_at', label: 'Updated' },
  { value: 'progress', label: '% Done' },
] as const;

export const MARKER_TYPES: { value: MarkerType; label: string; color: string }[] = [
  { value: 'note', label: 'Note', color: '#3b82f6' },
  { value: 'mix', label: 'Mix Note', color: '#f97316' },
  { value: 'task', label: 'Task', color: '#a855f7' },
  { value: 'idea', label: 'Idea', color: '#22c55e' },
  { value: 'issue', label: 'Issue/Flag', color: '#ef4444' },
];

export const TASK_CATEGORIES: TaskCategory[] = [
  'Drums', 'Bass', 'Synths', 'Arrangement', 'Mix', 'Master', 'Release',
];

export const TASK_CATEGORY_COLORS: Record<TaskCategory, string> = {
  Drums: '#f97316',
  Bass: '#3b82f6',
  Synths: '#a855f7',
  Arrangement: '#22c55e',
  Mix: '#eab308',
  Master: '#ef4444',
  Release: '#06b6d4',
};
