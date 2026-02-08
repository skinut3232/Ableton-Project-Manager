use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: i64,
    pub name: String,
    pub project_path: String,
    pub genre_label: String,
    pub status: String,
    pub rating: Option<i64>,
    pub bpm: Option<f64>,
    pub in_rotation: bool,
    pub notes: String,
    pub artwork_path: Option<String>,
    pub current_set_path: Option<String>,
    pub archived: bool,
    pub missing: bool,
    pub last_worked_on: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub tags: Vec<Tag>,
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

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectFilters {
    pub statuses: Option<Vec<String>>,
    pub tag_ids: Option<Vec<i64>>,
    pub in_rotation: Option<bool>,
    pub min_rating: Option<i64>,
    pub updated_since_days: Option<i64>,
    pub search_query: Option<String>,
    pub show_archived: Option<bool>,
    pub sort_by: Option<String>,
    pub sort_dir: Option<String>,
}
