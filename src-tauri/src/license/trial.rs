use chrono::{NaiveDate, Utc};
use rusqlite::Connection;
use crate::db::queries;
use super::LicenseStatus;

/// Trial duration in days.
const TRIAL_DAYS: i64 = 14;

/// Generate a UUID v4-style device ID using rand (avoids adding uuid crate).
fn generate_device_id() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let bytes: [u8; 16] = rng.gen();

    // Format as UUID v4: set version (4) and variant (10xx) bits
    format!(
        "{:08x}-{:04x}-4{:03x}-{:04x}-{:012x}",
        u32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]),
        u16::from_be_bytes([bytes[4], bytes[5]]),
        u16::from_be_bytes([bytes[6], bytes[7]]) & 0x0FFF,
        (u16::from_be_bytes([bytes[8], bytes[9]]) & 0x3FFF) | 0x8000,
        // Last 6 bytes as a single hex string
        u64::from_be_bytes([0, 0, bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]])
    )
}

/// Get the device ID from settings, creating one if it doesn't exist.
pub fn get_or_create_device_id(conn: &Connection) -> Result<String, String> {
    if let Some(id) = queries::get_setting(conn, "device_id")? {
        return Ok(id);
    }
    let id = generate_device_id();
    queries::set_setting(conn, "device_id", &id)?;
    Ok(id)
}

/// Get the trial start date from settings, creating one (today) if it doesn't exist.
/// Returns the ISO 8601 date string (YYYY-MM-DD).
pub fn get_or_create_trial_start(conn: &Connection) -> Result<String, String> {
    if let Some(date) = queries::get_setting(conn, "trial_start_date")? {
        return Ok(date);
    }
    let today = Utc::now().format("%Y-%m-%d").to_string();
    queries::set_setting(conn, "trial_start_date", &today)?;
    Ok(today)
}

/// Check the trial status based on the stored trial_start_date.
/// Returns (LicenseStatus, days_remaining).
pub fn check_trial_status(conn: &Connection) -> Result<(LicenseStatus, i64), String> {
    let start_str = get_or_create_trial_start(conn)?;
    let start_date = NaiveDate::parse_from_str(&start_str, "%Y-%m-%d")
        .map_err(|e| format!("Invalid trial_start_date '{}': {}", start_str, e))?;

    let today = Utc::now().date_naive();
    let elapsed = (today - start_date).num_days();
    let remaining = TRIAL_DAYS - elapsed;

    if remaining > 0 {
        Ok((LicenseStatus::TrialActive, remaining))
    } else {
        Ok((LicenseStatus::TrialExpired, 0))
    }
}

/// Sync the trial start date to Supabase for anti-reset protection.
/// Best-effort — failures are silently ignored (e.g., no network, Supabase not configured).
pub fn sync_trial_to_supabase(supabase_url: &str, anon_key: &str, device_id: &str, trial_start: &str) {
    if supabase_url.is_empty() || anon_key.is_empty() {
        return;
    }

    // Upsert to device_trials table (device_id is the primary key)
    let url = format!("{}/rest/v1/device_trials", supabase_url);
    let body = serde_json::json!({
        "device_id": device_id,
        "trial_start_date": trial_start
    });

    let client = reqwest::blocking::Client::new();
    // Use upsert via Prefer header — creates or updates based on device_id
    client.post(&url)
        .header("apikey", anon_key)
        .header("Authorization", format!("Bearer {}", anon_key))
        .header("Content-Type", "application/json")
        .header("Prefer", "resolution=merge-duplicates")
        .json(&body)
        .send()
        .ok(); // Best-effort: ignore errors
}

/// Check Supabase for an existing trial start date for this device.
/// Returns the remote trial_start_date if found, None otherwise.
/// Best-effort — returns None on any error.
pub fn check_supabase_trial(supabase_url: &str, anon_key: &str, device_id: &str) -> Option<String> {
    if supabase_url.is_empty() || anon_key.is_empty() {
        return None;
    }

    let url = format!(
        "{}/rest/v1/device_trials?device_id=eq.{}&select=trial_start_date",
        supabase_url, device_id
    );

    let client = reqwest::blocking::Client::new();
    let resp = client.get(&url)
        .header("apikey", anon_key)
        .header("Authorization", format!("Bearer {}", anon_key))
        .send()
        .ok()?;

    let rows: Vec<serde_json::Value> = resp.json().ok()?;
    rows.first()
        .and_then(|row| row.get("trial_start_date"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}
