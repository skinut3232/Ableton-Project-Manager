pub mod auth;
pub mod api;
pub mod sync;
pub mod upload;
pub mod migration;

use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use std::sync::mpsc;

/// Supabase HTTP client — talks to Supabase REST API using reqwest.
pub struct SupabaseClient {
    pub url: String,
    pub anon_key: String,
    pub access_token: Option<String>,
    pub refresh_token: Option<String>,
    pub user_id: Option<String>,
    pub email: Option<String>,
}

impl SupabaseClient {
    pub fn new() -> Self {
        let url = option_env!("SUPABASE_URL").unwrap_or("").to_string();
        let anon_key = option_env!("SUPABASE_ANON_KEY").unwrap_or("").to_string();
        Self {
            url,
            anon_key,
            access_token: None,
            refresh_token: None,
            user_id: None,
            email: None,
        }
    }

    pub fn is_configured(&self) -> bool {
        !self.url.is_empty() && !self.anon_key.is_empty()
    }

    pub fn is_authenticated(&self) -> bool {
        self.access_token.is_some()
    }

    /// Build the base URL for auth endpoints.
    pub fn auth_url(&self, path: &str) -> String {
        format!("{}/auth/v1{}", self.url, path)
    }

    /// Build the base URL for REST API endpoints.
    pub fn rest_url(&self, table: &str) -> String {
        format!("{}/rest/v1/{}", self.url, table)
    }

    /// Build the base URL for Storage endpoints.
    pub fn storage_url(&self, path: &str) -> String {
        format!("{}/storage/v1{}", self.url, path)
    }

    /// Get headers for authenticated requests.
    pub fn auth_headers(&self) -> Vec<(&str, String)> {
        let mut headers = vec![
            ("apikey", self.anon_key.clone()),
            ("Content-Type", "application/json".to_string()),
        ];
        if let Some(ref token) = self.access_token {
            headers.push(("Authorization", format!("Bearer {}", token)));
        }
        headers
    }
}

/// Managed Tauri state for the Supabase client.
pub struct SupabaseState(pub Mutex<SupabaseClient>);

/// Channel to notify the sync engine that records need syncing.
pub struct SyncTrigger(pub Mutex<Option<mpsc::Sender<()>>>);

/// Auth status returned to the frontend.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuthStatus {
    pub logged_in: bool,
    pub email: Option<String>,
    pub user_id: Option<String>,
    pub configured: bool,
}
