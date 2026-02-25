use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: i64,
    pub name: String,
    pub project_path: String,
    pub genre_label: String,
    pub musical_key: String,
    pub status: String,
    pub rating: Option<i64>,
    pub bpm: Option<f64>,
    pub in_rotation: bool,
    pub notes: String,
    pub artwork_path: Option<String>,
    pub current_set_path: Option<String>,
    pub archived: bool,
    pub missing: bool,
    pub progress: Option<i64>,
    pub last_worked_on: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub tags: Vec<Tag>,
    pub cover_type: String,
    pub cover_locked: bool,
    pub cover_seed: Option<String>,
    pub cover_style_preset: String,
    pub cover_asset_id: Option<i64>,
    pub cover_updated_at: Option<String>,
    pub cover_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectDetail {
    pub project: Project,
    pub sets: Vec<AbletonSet>,
    pub bounces: Vec<Bounce>,
    pub sessions: Vec<Session>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AbletonSet {
    pub id: i64,
    pub project_id: i64,
    pub set_path: String,
    pub modified_time: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Bounce {
    pub id: i64,
    pub project_id: i64,
    pub bounce_path: String,
    pub modified_time: String,
    pub duration_seconds: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tag {
    pub id: i64,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Session {
    pub id: i64,
    pub project_id: i64,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub duration_seconds: Option<i64>,
    pub note: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Setting {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanSummary {
    pub found: usize,
    pub new: usize,
    pub updated: usize,
    pub missing: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiscoveredProject {
    pub path: String,
    pub name: String,
    pub genre_label: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Marker {
    pub id: i64,
    pub project_id: i64,
    pub bounce_id: Option<i64>,
    pub timestamp_seconds: f64,
    #[serde(rename = "type")]
    pub marker_type: String,
    pub text: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectTask {
    pub id: i64,
    pub project_id: i64,
    pub title: String,
    pub done: bool,
    pub category: String,
    pub linked_marker_id: Option<i64>,
    pub linked_timestamp_seconds: Option<f64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectReference {
    pub id: i64,
    pub project_id: i64,
    pub url: String,
    pub title: Option<String>,
    pub notes: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Asset {
    pub id: i64,
    pub project_id: i64,
    pub original_filename: String,
    pub stored_path: String,
    pub asset_type: String,
    pub tags: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MoodBoardPin {
    pub id: i64,
    pub project_id: i64,
    pub asset_id: i64,
    pub sort_order: i64,
    pub created_at: String,
    pub stored_path: String,
    pub original_filename: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectNote {
    pub id: i64,
    pub project_id: i64,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SpotifyReference {
    pub id: i64,
    pub project_id: i64,
    pub spotify_id: String,
    pub spotify_type: String,
    pub name: String,
    pub artist_name: String,
    pub album_name: String,
    pub album_art_url: String,
    pub duration_ms: Option<i64>,
    pub spotify_url: String,
    pub notes: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SpotifySearchResult {
    pub spotify_id: String,
    pub spotify_type: String,
    pub name: String,
    pub artist_name: String,
    pub album_name: String,
    pub album_art_url: String,
    pub duration_ms: Option<i64>,
    pub spotify_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectFilters {
    pub statuses: Option<Vec<String>>,
    pub tag_ids: Option<Vec<i64>>,
    pub genres: Option<Vec<String>>,
    pub in_rotation: Option<bool>,
    pub min_rating: Option<i64>,
    pub updated_since_days: Option<i64>,
    pub search_query: Option<String>,
    pub show_archived: Option<bool>,
    pub sort_by: Option<String>,
    pub sort_dir: Option<String>,
}
