use tauri::State;
use crate::db::DbState;
use crate::supabase::{SupabaseState, AuthStatus};
use crate::supabase::auth;

#[tauri::command]
pub fn supabase_sign_up(
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

    Ok(AuthStatus {
        logged_in: true,
        email: client.email.clone(),
        user_id: client.user_id.clone(),
        configured: true,
    })
}

#[tauri::command]
pub fn supabase_sign_in(
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

    Ok(AuthStatus {
        logged_in: true,
        email: client.email.clone(),
        user_id: client.user_id.clone(),
        configured: true,
    })
}

#[tauri::command]
pub fn supabase_sign_out(
    db: State<'_, DbState>,
    supabase: State<'_, SupabaseState>,
) -> Result<(), String> {
    let mut client = supabase.0.lock().map_err(|e| e.to_string())?;
    auth::sign_out(&mut client);

    let conn = db.0.lock().map_err(|e| e.to_string())?;
    auth::clear_session_from_db(&conn);

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

    Ok(AuthStatus {
        logged_in: client.is_authenticated(),
        email: client.email.clone(),
        user_id: client.user_id.clone(),
        configured: true,
    })
}
