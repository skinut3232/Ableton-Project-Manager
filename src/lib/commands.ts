// ============================================================================
// TYPED TAURI COMMANDS
// ============================================================================
// This file maps every Tauri command to its expected arguments and return type.
// This prevents silent bugs caused by camelCase/snake_case mismatches.
//
// RULES:
//   - Argument names MUST be camelCase (Tauri converts to snake_case for Rust)
//   - Every new Tauri command must be added here BEFORE calling it
//   - If TypeScript complains about an argument name, you probably used
//     snake_case — switch to camelCase
//
// To add a new command:
//   1. Find the Rust #[tauri::command] function signature
//   2. Convert every parameter from snake_case to camelCase
//   3. Add an entry below with the correct types
// ============================================================================

import type {
  Project,
  ProjectDetail,
  ProjectFilters,
  Bounce,
  AbletonSet,
  Tag,
  Session,
  Setting,
  ScanSummary,
  DiscoveredProject,
  Marker,
  ProjectTask,
  ProjectReference,
  ProjectNote,
  MoodBoardPin,
  SpotifyReference,
  SpotifySearchResult,
  SpotifyAuthStatus,
  SoundCloudAuthStatus,
  SoundCloudUploadResult,
  ProjectAsset,
  IncompleteSession,
} from '../types';

// Each key is the exact command name string passed to invoke().
// Args = the object the frontend sends (camelCase keys).
// Return = what the command returns after deserialization.

export type CommandMap = {
  // --- Settings ---
  get_settings: {
    args: Record<string, never>;
    return: Setting[];
  };
  update_settings: {
    args: { settings: Setting[] };
    return: void;
  };

  // --- Projects ---
  get_projects: {
    args: { filters: ProjectFilters };
    return: Project[];
  };
  get_project_detail: {
    args: { id: number };
    return: ProjectDetail;
  };
  update_project: {
    args: {
      id: number;
      name?: string | null;
      status?: string | null;
      rating?: number | null;
      bpm?: number | null;
      inRotation?: boolean | null;
      notes?: string | null;
      genreLabel?: string | null;
      musicalKey?: string | null;
      archived?: boolean | null;
      progress?: number | null;
    };
    return: Project;
  };

  // --- Tags ---
  get_all_tags: {
    args: Record<string, never>;
    return: Tag[];
  };
  create_tag: {
    args: { name: string };
    return: Tag;
  };
  add_tag_to_project: {
    args: { projectId: number; tagId: number };
    return: void;
  };
  remove_tag_from_project: {
    args: { projectId: number; tagId: number };
    return: void;
  };

  // --- Bounces ---
  get_bounces_for_project: {
    args: { projectId: number };
    return: Bounce[];
  };

  // --- Sets ---
  get_sets_for_project: {
    args: { projectId: number };
    return: AbletonSet[];
  };
  set_current_set: {
    args: { projectId: number; setPath: string };
    return: void;
  };

  // --- Sessions ---
  start_session: {
    args: { projectId: number };
    return: Session;
  };
  stop_session: {
    args: { sessionId: number; note: string };
    return: Session;
  };
  get_sessions: {
    args: { projectId: number };
    return: Session[];
  };
  get_incomplete_sessions: {
    args: Record<string, never>;
    return: IncompleteSession[];
  };
  resolve_session: {
    args: { sessionId: number; save: boolean; note: string };
    return: void;
  };

  // --- Scanner ---
  refresh_library: {
    args: Record<string, never>;
    return: ScanSummary;
  };
  discover_untracked_projects: {
    args: Record<string, never>;
    return: DiscoveredProject[];
  };
  add_project: {
    args: { folderPath: string };
    return: ScanSummary;
  };
  import_projects: {
    args: { projects: DiscoveredProject[] };
    return: ScanSummary;
  };

  // --- Ableton ---
  open_in_ableton: {
    args: { setPath: string };
    return: void;
  };
  open_bounces_folder: {
    args: { path: string };
    return: void;
  };

  // --- Artwork ---
  upload_artwork: {
    args: { projectId: number; sourcePath: string };
    return: string;
  };

  // --- Markers ---
  get_markers: {
    args: { projectId: number };
    return: Marker[];
  };
  create_marker: {
    args: {
      projectId: number;
      bounceId?: number | null;
      timestampSeconds: number;
      markerType: string;
      text: string;
    };
    return: Marker;
  };
  update_marker: {
    args: {
      id: number;
      timestampSeconds?: number | null;
      markerType?: string | null;
      text?: string | null;
    };
    return: Marker;
  };
  delete_marker: {
    args: { id: number };
    return: void;
  };

  // --- Tasks ---
  get_tasks: {
    args: { projectId: number };
    return: ProjectTask[];
  };
  create_task: {
    args: {
      projectId: number;
      title: string;
      category: string;
      linkedMarkerId?: number | null;
      linkedTimestampSeconds?: number | null;
    };
    return: ProjectTask;
  };
  update_task: {
    args: {
      id: number;
      title?: string | null;
      done?: boolean | null;
      category?: string | null;
      linkedMarkerId?: number | null;
      linkedTimestampSeconds?: number | null;
    };
    return: ProjectTask;
  };
  delete_task: {
    args: { id: number };
    return: void;
  };

  // --- References ---
  get_references: {
    args: { projectId: number };
    return: ProjectReference[];
  };
  create_reference: {
    args: { projectId: number; url: string; title?: string | null; notes: string };
    return: ProjectReference;
  };
  update_reference: {
    args: { id: number; url?: string | null; title?: string | null; notes?: string | null };
    return: ProjectReference;
  };
  delete_reference: {
    args: { id: number };
    return: void;
  };

  // --- Notes ---
  get_notes: {
    args: { projectId: number };
    return: ProjectNote[];
  };
  create_note: {
    args: { projectId: number; content: string };
    return: ProjectNote;
  };
  update_note: {
    args: { id: number; content: string };
    return: ProjectNote;
  };
  delete_note: {
    args: { id: number };
    return: void;
  };

  // --- Assets ---
  get_assets: {
    args: { projectId: number };
    return: ProjectAsset[];
  };
  upload_asset: {
    args: { projectId: number; sourcePath: string };
    return: ProjectAsset;
  };
  update_asset: {
    args: { id: number; tags?: string | null };
    return: ProjectAsset;
  };
  delete_asset: {
    args: { id: number };
    return: void;
  };

  // --- Covers ---
  generate_cover: {
    args: { projectId: number; seed?: string | null; stylePreset?: string | null };
    return: Project;
  };
  set_cover_from_upload: {
    args: { projectId: number; sourcePath: string };
    return: Project;
  };
  set_cover_from_moodboard: {
    args: { projectId: number; assetId: number };
    return: Project;
  };
  toggle_cover_lock: {
    args: { projectId: number };
    return: Project;
  };
  remove_cover: {
    args: { projectId: number };
    return: Project;
  };
  get_mood_board: {
    args: { projectId: number };
    return: MoodBoardPin[];
  };
  pin_to_mood_board: {
    args: { projectId: number; assetId: number };
    return: MoodBoardPin;
  };
  unpin_from_mood_board: {
    args: { pinId: number };
    return: void;
  };
  reorder_mood_board: {
    args: { projectId: number; pinIds: number[] };
    return: MoodBoardPin[];
  };

  // --- Spotify ---
  spotify_search: {
    args: { query: string; limit?: number | null };
    return: SpotifySearchResult[];
  };
  get_spotify_references: {
    args: { projectId: number };
    return: SpotifyReference[];
  };
  add_spotify_reference: {
    args: {
      projectId: number;
      spotifyId: string;
      spotifyType: string;
      name: string;
      artistName: string;
      albumName: string;
      albumArtUrl: string;
      durationMs?: number | null;
      spotifyUrl: string;
    };
    return: SpotifyReference;
  };
  update_spotify_reference_notes: {
    args: { id: number; notes: string };
    return: SpotifyReference;
  };
  delete_spotify_reference: {
    args: { id: number };
    return: void;
  };
  spotify_get_auth_status: {
    args: Record<string, never>;
    return: SpotifyAuthStatus;
  };
  spotify_start_login: {
    args: Record<string, never>;
    return: string;
  };
  spotify_wait_for_callback: {
    args: Record<string, never>;
    return: SpotifyAuthStatus;
  };
  spotify_get_access_token: {
    args: Record<string, never>;
    return: string;
  };
  spotify_logout: {
    args: Record<string, never>;
    return: void;
  };

  // --- Share ---
  share_bounce: {
    args: { bouncePath: string };
    return: string;
  };

  // --- SoundCloud ---
  sc_get_auth_status: {
    args: Record<string, never>;
    return: SoundCloudAuthStatus;
  };
  sc_start_login: {
    args: Record<string, never>;
    return: string;
  };
  sc_wait_for_callback: {
    args: Record<string, never>;
    return: SoundCloudAuthStatus;
  };
  sc_upload_bounce: {
    args: {
      bouncePath: string;
      title: string;
      genre: string;
      tags: string;
      bpm?: number | null;
      description?: string | null;
      sharing?: string | null;
    };
    return: SoundCloudUploadResult;
  };
  sc_logout: {
    args: Record<string, never>;
    return: void;
  };
};

// Helper types to extract args/return for a given command
export type CommandArgs<T extends keyof CommandMap> = CommandMap[T]['args'];
export type CommandReturn<T extends keyof CommandMap> = CommandMap[T]['return'];
