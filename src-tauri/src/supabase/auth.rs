use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use rusqlite::{params, Connection};

use super::SupabaseClient;

#[derive(Debug, Deserialize)]
struct AuthResponse {
    access_token: String,
    refresh_token: String,
    user: AuthUser,
}

/// Sign-up response may NOT include tokens if email confirmation is required.
#[derive(Debug, Deserialize)]
struct SignUpResponse {
    access_token: Option<String>,
    refresh_token: Option<String>,
    user: Option<AuthUser>,
}

#[derive(Debug, Deserialize)]
struct AuthUser {
    id: String,
    email: Option<String>,
}

#[derive(Debug, Serialize)]
struct SignUpRequest {
    email: String,
    password: String,
}

#[derive(Debug, Serialize)]
struct SignInRequest {
    email: String,
    password: String,
}

#[derive(Debug, Serialize)]
struct RefreshRequest {
    refresh_token: String,
}

/// Sign up a new user via email/password.
pub fn sign_up(client: &mut SupabaseClient, email: &str, password: &str) -> Result<(), String> {
    let http = Client::new();
    let url = client.auth_url("/signup");

    let resp = http.post(&url)
        .header("apikey", &client.anon_key)
        .header("Content-Type", "application/json")
        .json(&SignUpRequest {
            email: email.to_string(),
            password: password.to_string(),
        })
        .send()
        .map_err(|e| format!("Sign up request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().unwrap_or_default();
        return Err(format!("Sign up failed ({}): {}", status, body));
    }

    let auth: SignUpResponse = resp.json()
        .map_err(|e| format!("Failed to parse sign up response: {}", e))?;

    // If tokens are present, user is immediately authenticated (email confirmation disabled)
    // If tokens are absent, user needs to confirm their email first
    if let (Some(access_token), Some(refresh_token)) = (auth.access_token, auth.refresh_token) {
        client.access_token = Some(access_token);
        client.refresh_token = Some(refresh_token);
        if let Some(user) = auth.user {
            client.user_id = Some(user.id);
            client.email = user.email;
        }
        Ok(())
    } else {
        // Account created but email confirmation required
        Err("Account created! Check your email and click the confirmation link, then sign in.".to_string())
    }
}

/// Sign in with email/password.
pub fn sign_in(client: &mut SupabaseClient, email: &str, password: &str) -> Result<(), String> {
    let http = Client::new();
    let url = client.auth_url("/token?grant_type=password");

    let resp = http.post(&url)
        .header("apikey", &client.anon_key)
        .header("Content-Type", "application/json")
        .json(&SignInRequest {
            email: email.to_string(),
            password: password.to_string(),
        })
        .send()
        .map_err(|e| format!("Sign in request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().unwrap_or_default();
        return Err(format!("Sign in failed ({}): {}", status, body));
    }

    let auth: AuthResponse = resp.json()
        .map_err(|e| format!("Failed to parse sign in response: {}", e))?;

    client.access_token = Some(auth.access_token);
    client.refresh_token = Some(auth.refresh_token);
    client.user_id = Some(auth.user.id);
    client.email = auth.user.email;

    Ok(())
}

/// Refresh the access token using a stored refresh token.
pub fn refresh_session(client: &mut SupabaseClient) -> Result<(), String> {
    let refresh_token = client.refresh_token.as_ref()
        .ok_or_else(|| "No refresh token available".to_string())?
        .clone();

    let http = Client::new();
    let url = client.auth_url("/token?grant_type=refresh_token");

    let resp = http.post(&url)
        .header("apikey", &client.anon_key)
        .header("Content-Type", "application/json")
        .json(&RefreshRequest { refresh_token })
        .send()
        .map_err(|e| format!("Token refresh failed: {}", e))?;

    if !resp.status().is_success() {
        // Refresh token expired — user needs to re-login
        client.access_token = None;
        client.refresh_token = None;
        client.user_id = None;
        client.email = None;
        return Err("Session expired. Please sign in again.".to_string());
    }

    let auth: AuthResponse = resp.json()
        .map_err(|e| format!("Failed to parse refresh response: {}", e))?;

    client.access_token = Some(auth.access_token);
    client.refresh_token = Some(auth.refresh_token);
    client.user_id = Some(auth.user.id);
    client.email = auth.user.email;

    Ok(())
}

/// Sign out — clear tokens.
pub fn sign_out(client: &mut SupabaseClient) {
    // Optionally call /auth/v1/logout to invalidate server-side, but not critical
    if let Some(ref token) = client.access_token {
        let http = Client::new();
        let url = client.auth_url("/logout");
        http.post(&url)
            .header("apikey", &client.anon_key)
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .ok();
    }
    client.access_token = None;
    client.refresh_token = None;
    client.user_id = None;
    client.email = None;
}

/// Save refresh token to SQLite sync_meta for session persistence across app restarts.
pub fn save_session_to_db(conn: &Connection, client: &SupabaseClient) {
    if let Some(ref token) = client.refresh_token {
        conn.execute(
            "INSERT INTO sync_meta (key, value) VALUES ('refresh_token', ?1) \
             ON CONFLICT(key) DO UPDATE SET value = ?1",
            params![token],
        ).ok();
    }
    if let Some(ref uid) = client.user_id {
        conn.execute(
            "INSERT INTO sync_meta (key, value) VALUES ('supabase_user_id', ?1) \
             ON CONFLICT(key) DO UPDATE SET value = ?1",
            params![uid],
        ).ok();
    }
    if let Some(ref email) = client.email {
        conn.execute(
            "INSERT INTO sync_meta (key, value) VALUES ('supabase_email', ?1) \
             ON CONFLICT(key) DO UPDATE SET value = ?1",
            params![email],
        ).ok();
    }
    conn.execute(
        "INSERT INTO sync_meta (key, value) VALUES ('sync_enabled', 'true') \
         ON CONFLICT(key) DO UPDATE SET value = 'true'",
        [],
    ).ok();
}

/// Load refresh token from SQLite sync_meta and attempt to restore the session.
pub fn restore_session_from_db(conn: &Connection, client: &mut SupabaseClient) -> Result<bool, String> {
    // Check if sync_meta table exists (migration might not have run yet)
    let table_exists: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='sync_meta'",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map(|c| c > 0)
        .unwrap_or(false);

    if !table_exists {
        return Ok(false);
    }

    let token: Option<String> = conn
        .query_row(
            "SELECT value FROM sync_meta WHERE key = 'refresh_token'",
            [],
            |row| row.get(0),
        )
        .ok();

    if let Some(token) = token {
        if !token.is_empty() {
            client.refresh_token = Some(token);
            // Try to refresh — if it fails, session is expired
            match refresh_session(client) {
                Ok(()) => {
                    log::info!("Supabase session restored successfully");
                    return Ok(true);
                }
                Err(e) => {
                    log::warn!("Failed to restore Supabase session: {}", e);
                    clear_session_from_db(conn);
                    return Ok(false);
                }
            }
        }
    }

    Ok(false)
}

/// Clear saved session from sync_meta.
pub fn clear_session_from_db(conn: &Connection) {
    conn.execute("DELETE FROM sync_meta WHERE key IN ('refresh_token', 'supabase_user_id', 'supabase_email')", []).ok();
    conn.execute(
        "INSERT INTO sync_meta (key, value) VALUES ('sync_enabled', 'false') \
         ON CONFLICT(key) DO UPDATE SET value = 'false'",
        [],
    ).ok();
}
