use tauri::{State, Manager};
use crate::db::DbState;
use crate::supabase::{SupabaseState, SyncTrigger, AuthStatus};
use crate::supabase::auth;

/// Start the background sync thread if not already running.
fn start_bg_sync(app: &tauri::AppHandle) {
    let sync_trigger = app.state::<SyncTrigger>();
    let mut sender = sync_trigger.0.lock().unwrap();
    if sender.is_none() {
        let tx = crate::commands::sync::spawn_bg_sync_thread(app.clone());
        *sender = Some(tx);
        log::info!("Started background sync thread");
    }
}

#[tauri::command]
pub fn supabase_sign_up(
    app: tauri::AppHandle,
    email: String,
    password: String,
    db: State<'_, DbState>,
    supabase: State<'_, SupabaseState>,
) -> Result<AuthStatus, String> {
    let mut client = supabase.0.lock().map_err(|e| e.to_string())?;
    if !client.is_configured() {
        return Err("Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.".to_string());
    }

    auth::sign_up(&mut client, &email, &password)?;

    // Save session to DB for persistence
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    auth::save_session_to_db(&conn, &client);

    drop(conn);
    drop(client);

    // Start background sync thread
    start_bg_sync(&app);

    Ok(AuthStatus {
        logged_in: true,
        email: supabase.0.lock().unwrap().email.clone(),
        user_id: supabase.0.lock().unwrap().user_id.clone(),
        configured: true,
    })
}

#[tauri::command]
pub fn supabase_sign_in(
    app: tauri::AppHandle,
    email: String,
    password: String,
    db: State<'_, DbState>,
    supabase: State<'_, SupabaseState>,
) -> Result<AuthStatus, String> {
    let mut client = supabase.0.lock().map_err(|e| e.to_string())?;
    if !client.is_configured() {
        return Err("Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.".to_string());
    }

    auth::sign_in(&mut client, &email, &password)?;

    // Save session to DB for persistence
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    auth::save_session_to_db(&conn, &client);

    let status = AuthStatus {
        logged_in: true,
        email: client.email.clone(),
        user_id: client.user_id.clone(),
        configured: true,
    };

    drop(conn);
    drop(client);

    // Start background sync thread
    start_bg_sync(&app);

    Ok(status)
}

#[tauri::command]
pub fn supabase_sign_out(
    db: State<'_, DbState>,
    supabase: State<'_, SupabaseState>,
    sync_trigger: State<'_, SyncTrigger>,
) -> Result<(), String> {
    let mut client = supabase.0.lock().map_err(|e| e.to_string())?;
    auth::sign_out(&mut client);

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    auth::clear_session_from_db(&conn);

    // Stop background sync thread (dropping sender disconnects channel → thread exits)
    let mut sender = sync_trigger.0.lock().map_err(|e| e.to_string())?;
    *sender = None;
    log::info!("Stopped background sync thread");

    Ok(())
}

#[tauri::command]
pub fn supabase_get_auth_status(
    supabase: State<'_, SupabaseState>,
) -> Result<AuthStatus, String> {
    let client = supabase.0.lock().map_err(|e| e.to_string())?;
    Ok(AuthStatus {
        logged_in: client.is_authenticated(),
        email: client.email.clone(),
        user_id: client.user_id.clone(),
        configured: client.is_configured(),
    })
}

#[tauri::command]
pub fn supabase_restore_session(
    app: tauri::AppHandle,
    db: State<'_, DbState>,
    supabase: State<'_, SupabaseState>,
) -> Result<AuthStatus, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut client = supabase.0.lock().map_err(|e| e.to_string())?;

    if !client.is_configured() {
        return Ok(AuthStatus {
            logged_in: false,
            email: None,
            user_id: None,
            configured: false,
        });
    }

    let restored = auth::restore_session_from_db(&conn, &mut client)?;

    if restored {
        // Update saved session with new tokens
        auth::save_session_to_db(&conn, &client);
    }

    let status = AuthStatus {
        logged_in: client.is_authenticated(),
        email: client.email.clone(),
        user_id: client.user_id.clone(),
        configured: true,
    };

    drop(conn);
    drop(client);

    // Start background sync thread if session was restored
    if restored {
        start_bg_sync(&app);
    }

    Ok(status)
}
