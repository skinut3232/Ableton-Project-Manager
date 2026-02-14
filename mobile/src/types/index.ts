// ── Core types matching Supabase schema ──

export type ProjectStatus = 'Sketch' | 'Write' | 'Arrange' | 'Mix' | 'Master' | 'Done';
export type MarkerType = 'note' | 'mix' | 'task' | 'idea' | 'issue';
export type TaskCategory = 'Drums' | 'Bass' | 'Synths' | 'Arrangement' | 'Mix' | 'Master' | 'Release';

export interface Project {
  id: number;
  user_id: string;
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
  progress: number | null;
  last_worked_on: string | null;
  created_at: string;
  updated_at: string;
  cover_type: 'none' | 'generated' | 'uploaded' | 'moodboard';
  cover_locked: boolean;
  cover_seed: string | null;
  cover_style_preset: string;
  cover_asset_id: number | null;
  cover_updated_at: string | null;
  cover_url: string | null;
  // Joined data
  tags?: Tag[];
  project_tags?: { tags: Tag }[];
}

export interface Tag {
  id: number;
  name: string;
}

export interface Bounce {
  id: number;
  project_id: number;
  bounce_path: string;
  modified_time: string;
  duration_seconds: number | null;
  is_latest: boolean;
  mp3_url: string | null;
}

export interface Session {
  id: number;
  project_id: number;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  note: string;
}

export interface Marker {
  id: number;
  project_id: number;
  bounce_id: number | null;
  timestamp_seconds: number;
  type: MarkerType;
  text: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectTask {
  id: number;
  project_id: number;
  title: string;
  done: boolean;
  category: TaskCategory;
  linked_marker_id: number | null;
  linked_timestamp_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectReference {
  id: number;
  project_id: number;
  url: string;
  title: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface SpotifyReference {
  id: number;
  project_id: number;
  spotify_id: string;
  spotify_type: 'track' | 'album';
  name: string;
  artist_name: string;
  album_name: string;
  album_art_url: string;
  duration_ms: number | null;
  spotify_url: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectNote {
  id: number;
  project_id: number;
  content: string;
  created_at: string;
  updated_at: string;
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
