use std::sync::Mutex;
use std::time::{Duration, Instant};
use std::io::{Read, Write};
use std::net::TcpListener;
use crate::db::DbState;
use crate::db::models::SpotifySearchResult;
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use rand::Rng;

// ── Client Credentials token (for search) ──

pub struct SpotifyToken {
    pub access_token: String,
    pub expires_at: Instant,
}

// ── OAuth User Auth ──

pub struct SpotifyUserAuth {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: Instant,
    pub display_name: String,
    pub product: String, // "premium" | "free" | etc.
}

pub struct PkceChallenge {
    pub code_verifier: String,
    pub state: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SpotifyAuthStatus {
    pub logged_in: bool,
    pub display_name: Option<String>,
    pub is_premium: bool,
}

// ── Combined State ──

pub struct SpotifyInner {
    pub client_token: Option<SpotifyToken>,
    pub user_auth: Option<SpotifyUserAuth>,
    pub pkce_pending: Option<PkceChallenge>,
}

pub struct SpotifyState(pub Mutex<SpotifyInner>);

// ── Credentials ──

fn get_credentials() -> Result<(String, String), String> {
    let client_id = option_env!("SPOTIFY_CLIENT_ID")
        .unwrap_or("")
        .to_string();
    let client_secret = option_env!("SPOTIFY_CLIENT_SECRET")
        .unwrap_or("")
        .to_string();

    if client_id.is_empty() || client_secret.is_empty()
        || client_id == "your_client_id_here" || client_secret == "your_client_secret_here"
    {
        return Err("Spotify credentials not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env and rebuild.".to_string());
    }

    Ok((client_id, client_secret))
}

fn get_client_id() -> Result<String, String> {
    let client_id = option_env!("SPOTIFY_CLIENT_ID")
        .unwrap_or("")
        .to_string();
    if client_id.is_empty() || client_id == "your_client_id_here" {
        return Err("SPOTIFY_CLIENT_ID not configured".to_string());
    }
    Ok(client_id)
}

// ── Client Credentials flow (for search) ──

fn fetch_client_token(client_id: &str, client_secret: &str) -> Result<SpotifyToken, String> {
    let client = reqwest::blocking::Client::new();
    let resp = client
        .post("https://accounts.spotify.com/api/token")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .basic_auth(client_id, Some(client_secret))
        .body("grant_type=client_credentials")
        .send()
        .map_err(|e| format!("Spotify token request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().unwrap_or_default();
        return Err(format!("Spotify token error ({}): {}", status, body));
    }

    let json: serde_json::Value = resp
        .json()
        .map_err(|e| format!("Failed to parse Spotify token response: {}", e))?;

    let access_token = json["access_token"]
        .as_str()
        .ok_or("Missing access_token in Spotify response")?
        .to_string();

    let expires_in = json["expires_in"].as_u64().unwrap_or(3600);
    let expires_at = Instant::now() + Duration::from_secs(expires_in.saturating_sub(60));

    Ok(SpotifyToken {
        access_token,
        expires_at,
    })
}

fn ensure_client_token(state: &SpotifyState) -> Result<String, String> {
    let (client_id, client_secret) = get_credentials()?;

    let guard = state.0.lock().map_err(|e| e.to_string())?;

    if let Some(ref token) = guard.client_token {
        if Instant::now() < token.expires_at {
            return Ok(token.access_token.clone());
        }
    }

    // Drop guard before network call to avoid holding lock
    drop(guard);

    let token = fetch_client_token(&client_id, &client_secret)?;
    let access_token = token.access_token.clone();

    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    guard.client_token = Some(token);

    Ok(access_token)
}

// ── Search (uses client credentials) ──

pub fn search(state: &SpotifyState, query: &str, limit: u32) -> Result<Vec<SpotifySearchResult>, String> {
    let token = ensure_client_token(state)?;

    let client = reqwest::blocking::Client::new();
    let resp = client
        .get("https://api.spotify.com/v1/search")
        .bearer_auth(&token)
        .query(&[
            ("q", query),
            ("type", "track,album"),
            ("limit", &limit.to_string()),
        ])
        .send()
        .map_err(|e| format!("Spotify search request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().unwrap_or_default();
        return Err(format!("Spotify search error ({}): {}", status, body));
    }

    let json: serde_json::Value = resp
        .json()
        .map_err(|e| format!("Failed to parse Spotify search response: {}", e))?;

    let mut results = Vec::new();

    // Parse tracks
    if let Some(tracks) = json["tracks"]["items"].as_array() {
        for track in tracks {
            let spotify_id = track["id"].as_str().unwrap_or_default().to_string();
            if spotify_id.is_empty() {
                continue;
            }
            let name = track["name"].as_str().unwrap_or_default().to_string();
            let artist_name = track["artists"]
                .as_array()
                .and_then(|a| a.first())
                .and_then(|a| a["name"].as_str())
                .unwrap_or_default()
                .to_string();
            let album_name = track["album"]["name"].as_str().unwrap_or_default().to_string();
            let album_art_url = track["album"]["images"]
                .as_array()
                .and_then(|imgs| imgs.first())
                .and_then(|img| img["url"].as_str())
                .unwrap_or_default()
                .to_string();
            let duration_ms = track["duration_ms"].as_i64();
            let spotify_url = track["external_urls"]["spotify"]
                .as_str()
                .unwrap_or_default()
                .to_string();

            results.push(SpotifySearchResult {
                spotify_id,
                spotify_type: "track".to_string(),
                name,
                artist_name,
                album_name,
                album_art_url,
                duration_ms,
                spotify_url,
            });
        }
    }

    // Parse albums
    if let Some(albums) = json["albums"]["items"].as_array() {
        for album in albums {
            let spotify_id = album["id"].as_str().unwrap_or_default().to_string();
            if spotify_id.is_empty() {
                continue;
            }
            let name = album["name"].as_str().unwrap_or_default().to_string();
            let artist_name = album["artists"]
                .as_array()
                .and_then(|a| a.first())
                .and_then(|a| a["name"].as_str())
                .unwrap_or_default()
                .to_string();
            let album_art_url = album["images"]
                .as_array()
                .and_then(|imgs| imgs.first())
                .and_then(|img| img["url"].as_str())
                .unwrap_or_default()
                .to_string();
            let spotify_url = album["external_urls"]["spotify"]
                .as_str()
                .unwrap_or_default()
                .to_string();

            let album_name = name.clone();
            results.push(SpotifySearchResult {
                spotify_id,
                spotify_type: "album".to_string(),
                name,
                artist_name,
                album_name,
                album_art_url,
                duration_ms: None,
                spotify_url,
            });
        }
    }

    Ok(results)
}

// ── OAuth PKCE Flow ──

const REDIRECT_URI: &str = "http://127.0.0.1:17483/callback";
const SCOPES: &str = "streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state";

fn generate_pkce_verifier() -> String {
    let mut rng = rand::thread_rng();
    let bytes: Vec<u8> = (0..64).map(|_| rng.gen::<u8>()).collect();
    URL_SAFE_NO_PAD.encode(&bytes)
}

fn pkce_challenge(verifier: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let hash = hasher.finalize();
    URL_SAFE_NO_PAD.encode(hash)
}

fn generate_state() -> String {
    let mut rng = rand::thread_rng();
    let bytes: Vec<u8> = (0..16).map(|_| rng.gen::<u8>()).collect();
    URL_SAFE_NO_PAD.encode(&bytes)
}

pub fn start_auth_flow(state: &SpotifyState) -> Result<String, String> {
    let client_id = get_client_id()?;
    let verifier = generate_pkce_verifier();
    let challenge = pkce_challenge(&verifier);
    let oauth_state = generate_state();

    // Store PKCE data for later validation
    {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        guard.pkce_pending = Some(PkceChallenge {
            code_verifier: verifier,
            state: oauth_state.clone(),
        });
    }

    let auth_url = format!(
        "https://accounts.spotify.com/authorize?client_id={}&response_type=code&redirect_uri={}&scope={}&code_challenge_method=S256&code_challenge={}&state={}",
        urlencoding(&client_id),
        urlencoding(REDIRECT_URI),
        urlencoding(SCOPES),
        urlencoding(&challenge),
        urlencoding(&oauth_state),
    );

    Ok(auth_url)
}

fn urlencoding(s: &str) -> String {
    s.replace(' ', "%20")
     .replace('+', "%2B")
     .replace(':', "%3A")
     .replace('/', "%2F")
     .replace('=', "%3D")
}

pub fn wait_for_callback_and_exchange(state: &SpotifyState, db_state: &DbState) -> Result<SpotifyAuthStatus, String> {
    let client_id = get_client_id()?;

    // Bind TCP listener for OAuth callback
    let listener = TcpListener::bind("127.0.0.1:17483")
        .map_err(|e| format!("Failed to bind callback listener on port 17483: {}", e))?;

    // Set a timeout so we don't block forever
    listener.set_nonblocking(false)
        .map_err(|e| format!("Failed to set listener to blocking mode: {}", e))?;

    log::info!("Waiting for Spotify OAuth callback on 127.0.0.1:17483...");

    // Accept one connection
    let (mut stream, _addr) = listener.accept()
        .map_err(|e| format!("Failed to accept callback connection: {}", e))?;

    // Read the HTTP request
    let mut buf = [0u8; 4096];
    let n = stream.read(&mut buf)
        .map_err(|e| format!("Failed to read callback request: {}", e))?;
    let request = String::from_utf8_lossy(&buf[..n]);

    // Parse the request line to get the path + query
    let first_line = request.lines().next().unwrap_or("");
    let path = first_line.split_whitespace().nth(1).unwrap_or("");

    // Extract query parameters
    let query_string = path.split('?').nth(1).unwrap_or("");
    let params: std::collections::HashMap<&str, &str> = query_string
        .split('&')
        .filter_map(|pair| {
            let mut parts = pair.splitn(2, '=');
            Some((parts.next()?, parts.next().unwrap_or("")))
        })
        .collect();

    let code = params.get("code").copied().unwrap_or("");
    let returned_state = params.get("state").copied().unwrap_or("");
    let error = params.get("error").copied().unwrap_or("");

    // Send response to browser
    let (status_line, body) = if !error.is_empty() {
        ("HTTP/1.1 400 Bad Request", format!(
            "<!DOCTYPE html><html><body style='background:#1a1a1a;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0'>\
            <div style='text-align:center'><h2 style='color:#ef4444'>Login Failed</h2><p>Error: {}</p><p style='color:#666'>You can close this tab.</p></div></body></html>",
            error
        ))
    } else {
        ("HTTP/1.1 200 OK",
            "<!DOCTYPE html><html><body style='background:#1a1a1a;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0'>\
            <div style='text-align:center'><h2 style='color:#1DB954'>Login Successful!</h2><p>You can close this tab and return to the app.</p></div></body></html>".to_string()
        )
    };

    let response = format!(
        "{}\r\nContent-Type: text/html\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        status_line,
        body.len(),
        body
    );
    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();
    drop(stream);
    drop(listener);

    if !error.is_empty() {
        return Err(format!("Spotify login denied: {}", error));
    }

    if code.is_empty() {
        return Err("No authorization code received from Spotify".to_string());
    }

    // Validate state and get verifier
    let code_verifier = {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        let pending = guard.pkce_pending.take()
            .ok_or("No pending PKCE challenge found. Did you call start_login first?")?;
        if pending.state != returned_state {
            return Err("OAuth state mismatch — possible CSRF attack".to_string());
        }
        pending.code_verifier
    };

    // Exchange code for tokens
    let http = reqwest::blocking::Client::new();
    let token_resp = http
        .post("https://accounts.spotify.com/api/token")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body(format!(
            "grant_type=authorization_code&code={}&redirect_uri={}&client_id={}&code_verifier={}",
            code, urlencoding(REDIRECT_URI), urlencoding(&client_id), code_verifier
        ))
        .send()
        .map_err(|e| format!("Token exchange failed: {}", e))?;

    if !token_resp.status().is_success() {
        let status = token_resp.status();
        let body = token_resp.text().unwrap_or_default();
        return Err(format!("Token exchange error ({}): {}", status, body));
    }

    let token_json: serde_json::Value = token_resp.json()
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    let access_token = token_json["access_token"].as_str()
        .ok_or("Missing access_token")?.to_string();
    let refresh_token = token_json["refresh_token"].as_str()
        .ok_or("Missing refresh_token")?.to_string();
    let expires_in = token_json["expires_in"].as_u64().unwrap_or(3600);
    let expires_at = Instant::now() + Duration::from_secs(expires_in.saturating_sub(60));

    // Fetch user profile
    let profile_resp = http
        .get("https://api.spotify.com/v1/me")
        .bearer_auth(&access_token)
        .send()
        .map_err(|e| format!("Failed to fetch user profile: {}", e))?;

    let profile: serde_json::Value = profile_resp.json()
        .map_err(|e| format!("Failed to parse profile: {}", e))?;

    let display_name = profile["display_name"].as_str().unwrap_or("Spotify User").to_string();
    let product = profile["product"].as_str().unwrap_or("free").to_string();

    // Store in memory
    {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        guard.user_auth = Some(SpotifyUserAuth {
            access_token,
            refresh_token: refresh_token.clone(),
            expires_at,
            display_name: display_name.clone(),
            product: product.clone(),
        });
    }

    // Persist to DB (drop SpotifyState lock first, then lock DB)
    {
        let conn = db_state.0.lock().map_err(|e| e.to_string())?;
        crate::db::queries::set_setting(&conn, "spotify_refresh_token", &refresh_token)?;
        crate::db::queries::set_setting(&conn, "spotify_display_name", &display_name)?;
        crate::db::queries::set_setting(&conn, "spotify_product", &product)?;
    }

    let is_premium = product == "premium";
    log::info!("Spotify OAuth login successful: {} ({})", display_name, product);

    Ok(SpotifyAuthStatus {
        logged_in: true,
        display_name: Some(display_name),
        is_premium,
    })
}

pub fn refresh_user_token(state: &SpotifyState, db_state: &DbState) -> Result<String, String> {
    let client_id = get_client_id()?;

    // Get refresh token from state
    let refresh_token = {
        let guard = state.0.lock().map_err(|e| e.to_string())?;
        guard.user_auth.as_ref()
            .map(|a| a.refresh_token.clone())
            .ok_or("Not logged in")?
    };

    let http = reqwest::blocking::Client::new();
    let resp = http
        .post("https://accounts.spotify.com/api/token")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body(format!(
            "grant_type=refresh_token&refresh_token={}&client_id={}",
            refresh_token, urlencoding(&client_id)
        ))
        .send()
        .map_err(|e| format!("Token refresh failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().unwrap_or_default();
        // If refresh fails with 400/401, the token is likely revoked
        if status.as_u16() == 400 || status.as_u16() == 401 {
            logout(state, db_state)?;
            return Err("Spotify session expired. Please log in again.".to_string());
        }
        return Err(format!("Token refresh error ({}): {}", status, body));
    }

    let json: serde_json::Value = resp.json()
        .map_err(|e| format!("Failed to parse refresh response: {}", e))?;

    let new_access_token = json["access_token"].as_str()
        .ok_or("Missing access_token in refresh response")?.to_string();
    let expires_in = json["expires_in"].as_u64().unwrap_or(3600);
    let expires_at = Instant::now() + Duration::from_secs(expires_in.saturating_sub(60));

    // Spotify may rotate the refresh token
    let new_refresh_token = json["refresh_token"].as_str()
        .map(|s| s.to_string());

    // Update in memory
    {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        if let Some(ref mut auth) = guard.user_auth {
            auth.access_token = new_access_token.clone();
            auth.expires_at = expires_at;
            if let Some(ref rt) = new_refresh_token {
                auth.refresh_token = rt.clone();
            }
        }
    }

    // Persist rotated refresh token if present
    if let Some(ref rt) = new_refresh_token {
        let conn = db_state.0.lock().map_err(|e| e.to_string())?;
        crate::db::queries::set_setting(&conn, "spotify_refresh_token", rt)?;
    }

    Ok(new_access_token)
}

pub fn ensure_user_token(state: &SpotifyState, db_state: &DbState) -> Result<String, String> {
    // Check if we have a valid cached token
    {
        let guard = state.0.lock().map_err(|e| e.to_string())?;
        if let Some(ref auth) = guard.user_auth {
            if Instant::now() < auth.expires_at {
                return Ok(auth.access_token.clone());
            }
        }
    }

    // Token expired or not present, try refresh
    refresh_user_token(state, db_state)
}

pub fn get_auth_status(state: &SpotifyState, db_state: &DbState) -> Result<SpotifyAuthStatus, String> {
    // Check in-memory first
    {
        let guard = state.0.lock().map_err(|e| e.to_string())?;
        if let Some(ref auth) = guard.user_auth {
            return Ok(SpotifyAuthStatus {
                logged_in: true,
                display_name: Some(auth.display_name.clone()),
                is_premium: auth.product == "premium",
            });
        }
    }

    // Try restoring from DB
    let (refresh_token, display_name, product) = {
        let conn = db_state.0.lock().map_err(|e| e.to_string())?;
        let rt = crate::db::queries::get_setting(&conn, "spotify_refresh_token")?;
        let dn = crate::db::queries::get_setting(&conn, "spotify_display_name")?;
        let pr = crate::db::queries::get_setting(&conn, "spotify_product")?;
        (rt, dn, pr)
    };

    if let Some(rt) = refresh_token {
        let dn = display_name.unwrap_or_else(|| "Spotify User".to_string());
        let pr = product.unwrap_or_else(|| "free".to_string());

        // Restore to memory (with expired token to force refresh on next use)
        {
            let mut guard = state.0.lock().map_err(|e| e.to_string())?;
            guard.user_auth = Some(SpotifyUserAuth {
                access_token: String::new(),
                refresh_token: rt,
                expires_at: Instant::now(), // will trigger refresh on first use
                display_name: dn.clone(),
                product: pr.clone(),
            });
        }

        return Ok(SpotifyAuthStatus {
            logged_in: true,
            display_name: Some(dn),
            is_premium: pr == "premium",
        });
    }

    Ok(SpotifyAuthStatus {
        logged_in: false,
        display_name: None,
        is_premium: false,
    })
}

pub fn logout(state: &SpotifyState, db_state: &DbState) -> Result<(), String> {
    // Clear in-memory
    {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        guard.user_auth = None;
        guard.pkce_pending = None;
    }

    // Clear from DB
    {
        let conn = db_state.0.lock().map_err(|e| e.to_string())?;
        crate::db::queries::delete_setting(&conn, "spotify_refresh_token")?;
        crate::db::queries::delete_setting(&conn, "spotify_display_name")?;
        crate::db::queries::delete_setting(&conn, "spotify_product")?;
    }

    log::info!("Spotify user logged out");
    Ok(())
}
