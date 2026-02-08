export type ProjectStatus = 'Sketch' | 'Write' | 'Arrange' | 'Mix' | 'Master' | 'Done';

export interface Project {
  id: number;
  name: string;
  project_path: string;
  genre_label: string;
  musical_key: string;
  status: ProjectStatus;
  rating: number | null;
  bpm: number | null;
  in_rotation: boolean;
  notes: string;
  artwork_path: string | null;
  current_set_path: string | null;
  archived: boolean;
  missing: boolean;
  last_worked_on: string | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

export interface ProjectDetail {
  project: Project;
  sets: AbletonSet[];
  bounces: Bounce[];
  sessions: Session[];
}

export interface AbletonSet {
  id: number;
  project_id: number;
  set_path: string;
  modified_time: string;
}

export interface Bounce {
  id: number;
  project_id: number;
  bounce_path: string;
  modified_time: string;
  duration_seconds: number | null;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Session {
  id: number;
  project_id: number;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  note: string;
}

export interface Setting {
  key: string;
  value: string;
}

export interface ScanSummary {
  found: number;
  new: number;
  updated: number;
  missing: number;
  errors: string[];
}

export interface DiscoveredProject {
  path: string;
  name: string;
  genre_label: string;
}

export interface ProjectFilters {
  statuses?: string[];
  tag_ids?: number[];
  in_rotation?: boolean;
  min_rating?: number;
  updated_since_days?: number;
  search_query?: string;
  show_archived?: boolean;
  sort_by?: string;
  sort_dir?: string;
}

export interface IncompleteSession {
  session: Session;
  project_name: string;
}
