use std::sync::Mutex;
use std::time::{Duration, Instant};
use std::io::{Read, Write};
use std::net::TcpListener;
use crate::db::DbState;
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use rand::Rng;

// ── State structs ──

pub struct SoundCloudUserAuth {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: Instant,
    pub username: String,
}

pub struct PkceChallenge {
    pub code_verifier: String,
    pub state: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SoundCloudAuthStatus {
    pub logged_in: bool,
    pub username: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SoundCloudUploadResult {
    pub permalink_url: String,
    pub title: String,
}

pub struct SoundCloudInner {
    pub user_auth: Option<SoundCloudUserAuth>,
    pub pkce_pending: Option<PkceChallenge>,
}

pub struct SoundCloudState(pub Mutex<SoundCloudInner>);

// ── Credentials ──

fn get_sc_client_id() -> Result<String, String> {
    let client_id = option_env!("SOUNDCLOUD_CLIENT_ID")
        .unwrap_or("")
        .to_string();
    if client_id.is_empty() || client_id == "your_client_id_here" {
        return Err("SOUNDCLOUD_CLIENT_ID not configured. Set it in .env and rebuild.".to_string());
    }
    Ok(client_id)
}

fn get_sc_client_secret() -> Result<String, String> {
    let client_secret = option_env!("SOUNDCLOUD_CLIENT_SECRET")
        .unwrap_or("")
        .to_string();
    if client_secret.is_empty() || client_secret == "your_client_secret_here" {
        return Err("SOUNDCLOUD_CLIENT_SECRET not configured. Set it in .env and rebuild.".to_string());
    }
    Ok(client_secret)
}

// ── PKCE helpers ──

const REDIRECT_URI: &str = "http://127.0.0.1:17484/callback";

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

fn urlencoding(s: &str) -> String {
    s.replace(' ', "%20")
     .replace('+', "%2B")
     .replace(':', "%3A")
     .replace('/', "%2F")
     .replace('=', "%3D")
}

// ── OAuth PKCE Flow ──

pub fn start_auth_flow(state: &SoundCloudState) -> Result<String, String> {
    let client_id = get_sc_client_id()?;
    let verifier = generate_pkce_verifier();
    let challenge = pkce_challenge(&verifier);
    let oauth_state = generate_state();

    {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        guard.pkce_pending = Some(PkceChallenge {
            code_verifier: verifier,
            state: oauth_state.clone(),
        });
    }

    let auth_url = format!(
        "https://secure.soundcloud.com/authorize?client_id={}&response_type=code&redirect_uri={}&code_challenge_method=S256&code_challenge={}&state={}",
        urlencoding(&client_id),
        urlencoding(REDIRECT_URI),
        urlencoding(&challenge),
        urlencoding(&oauth_state),
    );

    log::info!("SoundCloud auth URL: {}", auth_url);
    Ok(auth_url)
}

pub fn wait_for_callback_and_exchange(state: &SoundCloudState, db_state: &DbState) -> Result<SoundCloudAuthStatus, String> {
    let client_id = get_sc_client_id()?;
    let client_secret = get_sc_client_secret()?;

    let listener = TcpListener::bind("127.0.0.1:17484")
        .map_err(|e| format!("Failed to bind callback listener on port 17484: {}", e))?;

    // 2-minute timeout so the app doesn't freeze forever if login fails
    let std_duration = std::time::Duration::from_secs(120);
    log::info!("Waiting for SoundCloud OAuth callback on 127.0.0.1:17484 (2 min timeout)...");

    let accept_result = {
        let (tx, rx) = std::sync::mpsc::channel();
        let _handle = std::thread::spawn(move || {
            let result = listener.accept();
            let _ = tx.send(result);
        });
        rx.recv_timeout(std_duration)
            .map_err(|_| "SoundCloud login timed out after 2 minutes. Please try again.".to_string())?
            .map_err(|e| format!("Failed to accept callback connection: {}", e))?
    };
    let (mut stream, _addr) = accept_result;

    let mut buf = [0u8; 4096];
    let n = stream.read(&mut buf)
        .map_err(|e| format!("Failed to read callback request: {}", e))?;
    let request = String::from_utf8_lossy(&buf[..n]);

    let first_line = request.lines().next().unwrap_or("");
    let path = first_line.split_whitespace().nth(1).unwrap_or("");

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
            <div style='text-align:center'><h2 style='color:#ff5500'>SoundCloud Login Successful!</h2><p>You can close this tab and return to the app.</p></div></body></html>".to_string()
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

    if !error.is_empty() {
        return Err(format!("SoundCloud login denied: {}", error));
    }

    if code.is_empty() {
        return Err("No authorization code received from SoundCloud".to_string());
    }

    // Validate state and get verifier
    let code_verifier = {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        let pending = guard.pkce_pending.take()
            .ok_or("No pending PKCE challenge found. Did you call sc_start_login first?")?;
        if pending.state != returned_state {
            return Err("OAuth state mismatch — possible CSRF attack".to_string());
        }
        pending.code_verifier
    };

    // Exchange code for tokens
    let http = reqwest::blocking::Client::new();
    let token_resp = http
        .post("https://secure.soundcloud.com/oauth/token")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body(format!(
            "grant_type=authorization_code&code={}&redirect_uri={}&client_id={}&client_secret={}&code_verifier={}",
            code, urlencoding(REDIRECT_URI), urlencoding(&client_id), urlencoding(&client_secret), code_verifier
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
        .unwrap_or("")
        .to_string();
    let expires_in = token_json["expires_in"].as_u64().unwrap_or(36000);
    let expires_at = Instant::now() + Duration::from_secs(expires_in.saturating_sub(60));

    // Fetch user profile
    let profile_resp = http
        .get("https://api.soundcloud.com/me")
        .header("Authorization", format!("OAuth {}", access_token))
        .send()
        .map_err(|e| format!("Failed to fetch user profile: {}", e))?;

    let profile: serde_json::Value = profile_resp.json()
        .map_err(|e| format!("Failed to parse profile: {}", e))?;

    let username = profile["username"].as_str().unwrap_or("SoundCloud User").to_string();

    // Store in memory
    {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        guard.user_auth = Some(SoundCloudUserAuth {
            access_token,
            refresh_token: refresh_token.clone(),
            expires_at,
            username: username.clone(),
        });
    }

    // Persist to DB
    {
        let conn = db_state.0.lock().map_err(|e| e.to_string())?;
        crate::db::queries::set_setting(&conn, "soundcloud_refresh_token", &refresh_token)?;
        crate::db::queries::set_setting(&conn, "soundcloud_username", &username)?;
    }

    log::info!("SoundCloud OAuth login successful: {}", username);

    Ok(SoundCloudAuthStatus {
        logged_in: true,
        username: Some(username),
    })
}

pub fn refresh_user_token(state: &SoundCloudState, db_state: &DbState) -> Result<String, String> {
    let client_id = get_sc_client_id()?;
    let client_secret = get_sc_client_secret()?;

    let refresh_token = {
        let guard = state.0.lock().map_err(|e| e.to_string())?;
        guard.user_auth.as_ref()
            .map(|a| a.refresh_token.clone())
            .ok_or("Not logged in to SoundCloud")?
    };

    let http = reqwest::blocking::Client::new();
    let resp = http
        .post("https://secure.soundcloud.com/oauth/token")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body(format!(
            "grant_type=refresh_token&refresh_token={}&client_id={}&client_secret={}",
            refresh_token, urlencoding(&client_id), urlencoding(&client_secret)
        ))
        .send()
        .map_err(|e| format!("Token refresh failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().unwrap_or_default();
        if status.as_u16() == 400 || status.as_u16() == 401 {
            logout(state, db_state)?;
            return Err("SoundCloud session expired. Please log in again.".to_string());
        }
        return Err(format!("Token refresh error ({}): {}", status, body));
    }

    let json: serde_json::Value = resp.json()
        .map_err(|e| format!("Failed to parse refresh response: {}", e))?;

    let new_access_token = json["access_token"].as_str()
        .ok_or("Missing access_token in refresh response")?.to_string();
    let expires_in = json["expires_in"].as_u64().unwrap_or(36000);
    let expires_at = Instant::now() + Duration::from_secs(expires_in.saturating_sub(60));

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

    if let Some(ref rt) = new_refresh_token {
        let conn = db_state.0.lock().map_err(|e| e.to_string())?;
        crate::db::queries::set_setting(&conn, "soundcloud_refresh_token", rt)?;
    }

    Ok(new_access_token)
}

pub fn ensure_user_token(state: &SoundCloudState, db_state: &DbState) -> Result<String, String> {
    {
        let guard = state.0.lock().map_err(|e| e.to_string())?;
        if let Some(ref auth) = guard.user_auth {
            if Instant::now() < auth.expires_at {
                return Ok(auth.access_token.clone());
            }
        }
    }

    refresh_user_token(state, db_state)
}

pub fn get_auth_status(state: &SoundCloudState, db_state: &DbState) -> Result<SoundCloudAuthStatus, String> {
    // Check in-memory first
    {
        let guard = state.0.lock().map_err(|e| e.to_string())?;
        if let Some(ref auth) = guard.user_auth {
            return Ok(SoundCloudAuthStatus {
                logged_in: true,
                username: Some(auth.username.clone()),
            });
        }
    }

    // Try restoring from DB
    let (refresh_token, username) = {
        let conn = db_state.0.lock().map_err(|e| e.to_string())?;
        let rt = crate::db::queries::get_setting(&conn, "soundcloud_refresh_token")?;
        let un = crate::db::queries::get_setting(&conn, "soundcloud_username")?;
        (rt, un)
    };

    if let Some(rt) = refresh_token {
        let un = username.unwrap_or_else(|| "SoundCloud User".to_string());

        // Restore to memory with expired token to force refresh on next use
        {
            let mut guard = state.0.lock().map_err(|e| e.to_string())?;
            guard.user_auth = Some(SoundCloudUserAuth {
                access_token: String::new(),
                refresh_token: rt,
                expires_at: Instant::now(),
                username: un.clone(),
            });
        }

        return Ok(SoundCloudAuthStatus {
            logged_in: true,
            username: Some(un),
        });
    }

    Ok(SoundCloudAuthStatus {
        logged_in: false,
        username: None,
    })
}

pub fn logout(state: &SoundCloudState, db_state: &DbState) -> Result<(), String> {
    {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        guard.user_auth = None;
        guard.pkce_pending = None;
    }

    {
        let conn = db_state.0.lock().map_err(|e| e.to_string())?;
        crate::db::queries::delete_setting(&conn, "soundcloud_refresh_token")?;
        crate::db::queries::delete_setting(&conn, "soundcloud_username")?;
    }

    log::info!("SoundCloud user logged out");
    Ok(())
}

// ── Upload ──

pub fn upload_track(
    state: &SoundCloudState,
    db_state: &DbState,
    file_path: &str,
    title: &str,
    genre: &str,
    tags: &str,
    bpm: Option<f64>,
    description: &str,
    sharing: &str,
) -> Result<SoundCloudUploadResult, String> {
    let token = ensure_user_token(state, db_state)?;

    let file_bytes = std::fs::read(file_path)
        .map_err(|e| format!("Failed to read file '{}': {}", file_path, e))?;

    let file_name = std::path::Path::new(file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("bounce.wav")
        .to_string();

    let file_part = reqwest::blocking::multipart::Part::bytes(file_bytes)
        .file_name(file_name)
        .mime_str("audio/wav")
        .map_err(|e| format!("Failed to set MIME type: {}", e))?;

    let sharing_value = if sharing == "public" { "public" } else { "private" };
    let mut form = reqwest::blocking::multipart::Form::new()
        .text("track[title]", title.to_string())
        .text("track[sharing]", sharing_value.to_string())
        .part("track[asset_data]", file_part);

    if !genre.is_empty() {
        form = form.text("track[genre]", genre.to_string());
    }
    if !tags.is_empty() {
        form = form.text("track[tag_list]", tags.to_string());
    }
    if let Some(b) = bpm {
        form = form.text("track[bpm]", format!("{}", b as i64));
    }
    if !description.is_empty() {
        form = form.text("track[description]", description.to_string());
    }

    let http = reqwest::blocking::Client::new();
    let resp = http
        .post("https://api.soundcloud.com/tracks")
        .header("Authorization", format!("OAuth {}", token))
        .multipart(form)
        .send()
        .map_err(|e| format!("SoundCloud upload failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().unwrap_or_default();
        return Err(format!("SoundCloud upload error ({}): {}", status, body));
    }

    let json: serde_json::Value = resp.json()
        .map_err(|e| format!("Failed to parse upload response: {}", e))?;

    let permalink_url = json["permalink_url"].as_str().unwrap_or("").to_string();
    let result_title = json["title"].as_str().unwrap_or(title).to_string();

    log::info!("SoundCloud upload successful: {} -> {}", result_title, permalink_url);

    Ok(SoundCloudUploadResult {
        permalink_url,
        title: result_title,
    })
}
