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
  progress: number | null;
  last_worked_on: string | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  cover_type: 'none' | 'generated' | 'uploaded' | 'moodboard';
  cover_locked: boolean;
  cover_seed: string | null;
  cover_style_preset: string;
  cover_asset_id: number | null;
  cover_updated_at: string | null;
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
  genres?: string[];
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

// ── Studio Timeline types ──

export type MarkerType = 'note' | 'mix' | 'task' | 'idea' | 'issue';

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

export type TaskCategory = 'Drums' | 'Bass' | 'Synths' | 'Arrangement' | 'Mix' | 'Master' | 'Release';

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

export interface MoodBoardPin {
  id: number;
  project_id: number;
  asset_id: number;
  sort_order: number;
  created_at: string;
  stored_path: string;
  original_filename: string;
}

export interface ProjectNote {
  id: number;
  project_id: number;
  content: string;
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

export interface SpotifySearchResult {
  spotify_id: string;
  spotify_type: 'track' | 'album';
  name: string;
  artist_name: string;
  album_name: string;
  album_art_url: string;
  duration_ms: number | null;
  spotify_url: string;
}

export interface SpotifyAuthStatus {
  logged_in: boolean;
  display_name: string | null;
  is_premium: boolean;
}

// ── SoundCloud types ──

export interface SoundCloudAuthStatus {
  logged_in: boolean;
  username: string | null;
}

export interface SoundCloudUploadResult {
  permalink_url: string;
  title: string;
}

export type AssetType = 'image' | 'audio' | 'generic';

export interface ProjectAsset {
  id: number;
  project_id: number;
  original_filename: string;
  stored_path: string;
  asset_type: AssetType;
  tags: string;
  created_at: string;
  updated_at: string;
}

// ── Cloud Sync types ──

export interface AuthStatus {
  logged_in: boolean;
  email: string | null;
  user_id: string | null;
  configured: boolean;
}

export interface SyncStatus {
  enabled: boolean;
  pending_push: number;
  last_push_at: string | null;
  last_pull_at: string | null;
}
