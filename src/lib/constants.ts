import type { ProjectStatus, MarkerType, TaskCategory } from '../types';

export const PROJECT_STATUSES: ProjectStatus[] = [
  'Sketch', 'Write', 'Arrange', 'Mix', 'Master', 'Done'
];

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  Sketch: 'bg-gray-500',
  Write: 'bg-blue-500',
  Arrange: 'bg-purple-500',
  Mix: 'bg-orange-500',
  Master: 'bg-yellow-500',
  Done: 'bg-green-500',
};

export const STATUS_TEXT_COLORS: Record<ProjectStatus, string> = {
  Sketch: 'text-gray-400',
  Write: 'text-blue-400',
  Arrange: 'text-purple-400',
  Mix: 'text-orange-400',
  Master: 'text-yellow-400',
  Done: 'text-green-400',
};

export const MUSICAL_KEYS = [
  '', // empty = unset
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
  { value: 'in_rotation', label: 'In Rotation' },
  { value: 'progress', label: '% Done' },
] as const;

export type TableColumnKey =
  | 'name'
  | 'status'
  | 'rating'
  | 'bpm'
  | 'musical_key'
  | 'genre_label'
  | 'tags'
  | 'last_worked_on'
  | 'in_rotation'
  | 'notes'
  | 'created_at'
  | 'updated_at'
  | 'progress'
  | 'archived'
  | 'project_path';

export interface TableColumnDef {
  key: TableColumnKey;
  label: string;
  defaultVisible: boolean;
  sortable: boolean;
  width: string;
  center?: boolean;
}

export const TABLE_COLUMNS: TableColumnDef[] = [
  { key: 'name', label: 'Name', defaultVisible: true, sortable: true, width: '28%' },
  { key: 'status', label: 'Status', defaultVisible: true, sortable: true, width: '90px', center: true },
  { key: 'rating', label: 'Rating', defaultVisible: true, sortable: true, width: '100px', center: true },
  { key: 'bpm', label: 'BPM', defaultVisible: true, sortable: true, width: '65px', center: true },
  { key: 'musical_key', label: 'Key', defaultVisible: true, sortable: true, width: '65px', center: true },
  { key: 'genre_label', label: 'Genre', defaultVisible: true, sortable: true, width: '110px', center: true },
  { key: 'tags', label: 'Tags', defaultVisible: true, sortable: false, width: '15%' },
  { key: 'last_worked_on', label: 'Last Worked', defaultVisible: true, sortable: true, width: '105px', center: true },
  { key: 'progress', label: '% Done', defaultVisible: true, sortable: true, width: '110px', center: true },
  { key: 'in_rotation', label: 'In Rotation', defaultVisible: false, sortable: true, width: '90px', center: true },
  { key: 'notes', label: 'Notes', defaultVisible: false, sortable: false, width: '15%' },
  { key: 'created_at', label: 'Created', defaultVisible: false, sortable: true, width: '105px', center: true },
  { key: 'updated_at', label: 'Updated', defaultVisible: false, sortable: true, width: '105px', center: true },
  { key: 'archived', label: 'Archived', defaultVisible: false, sortable: false, width: '80px', center: true },
  { key: 'project_path', label: 'Path', defaultVisible: false, sortable: false, width: '20%' },
];

export const DEFAULT_VISIBLE_COLUMNS: TableColumnKey[] = TABLE_COLUMNS
  .filter((c) => c.defaultVisible)
  .map((c) => c.key);

// ── Studio Timeline constants ──

export const MARKER_TYPES: { value: MarkerType; label: string; color: string }[] = [
  { value: 'note', label: 'Note', color: '#8B5CF6' },       // brand purple
  { value: 'mix', label: 'Mix Note', color: '#f97316' },    // orange
  { value: 'task', label: 'Task', color: '#a855f7' },       // purple
  { value: 'idea', label: 'Idea', color: '#22c55e' },       // green
  { value: 'issue', label: 'Issue/Flag', color: '#ef4444' }, // red
];

export const TASK_CATEGORIES: TaskCategory[] = [
  'Drums', 'Bass', 'Synths', 'Arrangement', 'Mix', 'Master', 'Release',
];
