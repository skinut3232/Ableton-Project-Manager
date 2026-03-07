use tauri::State;
use crate::db::DbState;
use crate::supabase::SupabaseState;
use crate::license::{LicenseStatus, LicenseInfo};

/// Get the LemonSqueezy checkout URL from compile-time env var.
fn checkout_url() -> String {
    option_env!("LEMONSQUEEZY_URL").unwrap_or("").to_string()
}

/// Get the machine hostname for use as the LemonSqueezy instance name.
fn get_instance_name() -> String {
    hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "SetCrate Desktop".to_string())
}

/// Main status check — called on every app launch and periodically.
/// Determines the current license state by checking stored data and validating remotely.
/// In debug builds (tauri dev), always returns Activated to skip license checks.
#[tauri::command]
pub fn get_license_status(state: State<DbState>, supabase: State<SupabaseState>) -> Result<LicenseInfo, String> {
    // Dev mode bypass — skip all license/trial checks during development
    #[cfg(debug_assertions)]
    {
        let _ = (&state, &supabase);
        return Ok(LicenseInfo {
            status: LicenseStatus::Activated,
            days_remaining: None,
            checkout_url: checkout_url(),
            license_key_masked: Some("DEV-MODE".to_string()),
        });
    }

    #[cfg(not(debug_assertions))]
    {
        use chrono::{DateTime, Utc};
        use crate::db::queries;
        use crate::license::{mask_license_key};
        use crate::license::trial;
        use crate::license::api;

        const OFFLINE_GRACE_DAYS: i64 = 7;

        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let url = checkout_url();

        // Check if we have a stored license key
        let license_key = queries::get_setting(&conn, "license_key")?;

        if let Some(ref key) = license_key {
            // --- Licensed path: validate with LemonSqueezy ---
            let instance_id = queries::get_setting(&conn, "license_instance_id")?;

            if let Some(ref iid) = instance_id {
                match api::validate_license(key, iid) {
                    Ok(resp) => {
                        if resp.valid {
                            let now = Utc::now().to_rfc3339();
                            queries::set_setting(&conn, "last_validated_at", &now)?;
                            queries::set_setting(&conn, "license_status", "Activated")?;
                            return Ok(LicenseInfo {
                                status: LicenseStatus::Activated,
                                days_remaining: None,
                                checkout_url: url,
                                license_key_masked: Some(mask_license_key(key)),
                            });
                        } else {
                            clear_license_data(&conn)?;
                            return Ok(LicenseInfo {
                                status: LicenseStatus::Expired,
                                days_remaining: None,
                                checkout_url: url,
                                license_key_masked: None,
                            });
                        }
                    }
                    Err(_) => {
                        // Network error — check offline grace period
                        if let Some(last_validated) = queries::get_setting(&conn, "last_validated_at")? {
                            if let Ok(validated_at) = DateTime::parse_from_rfc3339(&last_validated) {
                                let days_since = (Utc::now() - validated_at.with_timezone(&Utc)).num_days();
                                if days_since <= OFFLINE_GRACE_DAYS {
                                    let remaining = OFFLINE_GRACE_DAYS - days_since;
                                    queries::set_setting(&conn, "license_status", "OfflineGrace")?;
                                    return Ok(LicenseInfo {
                                        status: LicenseStatus::OfflineGrace,
                                        days_remaining: Some(remaining),
                                        checkout_url: url,
                                        license_key_masked: Some(mask_license_key(key)),
                                    });
                                }
                            }
                        }
                        queries::set_setting(&conn, "license_status", "Expired")?;
                        return Ok(LicenseInfo {
                            status: LicenseStatus::Expired,
                            days_remaining: None,
                            checkout_url: url,
                            license_key_masked: Some(mask_license_key(key)),
                        });
                    }
                }
            } else {
                clear_license_data(&conn)?;
            }
        }

        // --- Trial path: no license key ---
        // Fail-open: any error in trial checking defaults to TrialActive with 14 days.
        // This prevents fresh installs from being blocked by unexpected failures.
        const TRIAL_DAYS_DEFAULT: i64 = 14;

        let trial_result: Result<LicenseInfo, String> = (|| {
            let device_id = trial::get_or_create_device_id(&conn)?;

            let supabase_client = supabase.0.lock().map_err(|e| e.to_string())?;
            let supabase_url = supabase_client.url.clone();
            let anon_key = supabase_client.anon_key.clone();
            drop(supabase_client);

            if let Some(remote_start) = trial::check_supabase_trial(&supabase_url, &anon_key, &device_id) {
                let local_start = queries::get_setting(&conn, "trial_start_date")?;
                match local_start {
                    Some(ref local) if local <= &remote_start => {
                        trial::sync_trial_to_supabase(&supabase_url, &anon_key, &device_id, local);
                    }
                    _ => {
                        queries::set_setting(&conn, "trial_start_date", &remote_start)?;
                    }
                }
            }

            let (status, remaining) = trial::check_trial_status(&conn)?;
            let status_str = match status {
                LicenseStatus::TrialActive => "TrialActive",
                LicenseStatus::TrialExpired => "TrialExpired",
                _ => "TrialExpired",
            };
            queries::set_setting(&conn, "license_status", status_str)?;

            if let Ok(Some(start)) = queries::get_setting(&conn, "trial_start_date") {
                trial::sync_trial_to_supabase(&supabase_url, &anon_key, &device_id, &start);
            }

            Ok(LicenseInfo {
                status,
                days_remaining: Some(remaining),
                checkout_url: url.clone(),
                license_key_masked: None,
            })
        })();

        match trial_result {
            Ok(info) => Ok(info),
            Err(e) => {
                eprintln!("[SetCrate] Trial check failed, failing open: {}", e);
                Ok(LicenseInfo {
                    status: LicenseStatus::TrialActive,
                    days_remaining: Some(TRIAL_DAYS_DEFAULT),
                    checkout_url: url,
                    license_key_masked: None,
                })
            }
        }
    }
}

/// Activate a license key — store it and return the new status.
#[tauri::command]
pub fn activate_license_key(state: State<DbState>, key: String) -> Result<LicenseInfo, String> {
    use chrono::Utc;
    use crate::db::queries;
    use crate::license::{mask_license_key};
    use crate::license::api;

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let instance_name = get_instance_name();

    let resp = api::activate_license(&key, &instance_name)?;

    if !resp.activated {
        let msg = resp.error.unwrap_or_else(|| "Activation failed".to_string());
        return Err(msg);
    }

    let instance_id = resp.instance
        .ok_or("Activation succeeded but no instance ID returned")?
        .id;

    queries::set_setting(&conn, "license_key", &key)?;
    queries::set_setting(&conn, "license_instance_id", &instance_id)?;
    queries::set_setting(&conn, "license_status", "Activated")?;
    queries::set_setting(&conn, "last_validated_at", &Utc::now().to_rfc3339())?;

    Ok(LicenseInfo {
        status: LicenseStatus::Activated,
        days_remaining: None,
        checkout_url: checkout_url(),
        license_key_masked: Some(mask_license_key(&key)),
    })
}

/// Deactivate the current license key — clear stored data and return new status.
#[tauri::command]
pub fn deactivate_license_key(state: State<DbState>) -> Result<LicenseInfo, String> {
    use crate::db::queries;
    use crate::license::trial;
    use crate::license::api;

    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let key = queries::get_setting(&conn, "license_key")?;
    let instance_id = queries::get_setting(&conn, "license_instance_id")?;

    if let (Some(ref k), Some(ref iid)) = (key, instance_id) {
        api::deactivate_license(k, iid).ok();
    }

    clear_license_data(&conn)?;

    let (status, remaining) = trial::check_trial_status(&conn)?;

    Ok(LicenseInfo {
        status,
        days_remaining: Some(remaining),
        checkout_url: checkout_url(),
        license_key_masked: None,
    })
}

/// Return the LemonSqueezy checkout URL.
#[tauri::command]
pub fn get_checkout_url() -> Result<String, String> {
    let url = checkout_url();
    if url.is_empty() {
        return Err("Checkout URL not configured".to_string());
    }
    Ok(url)
}

/// Clear all license-related settings from the database.
fn clear_license_data(conn: &rusqlite::Connection) -> Result<(), String> {
    use crate::db::queries;
    queries::set_setting(conn, "license_key", "")?;
    queries::set_setting(conn, "license_instance_id", "")?;
    queries::set_setting(conn, "license_status", "")?;
    queries::set_setting(conn, "last_validated_at", "")?;
    Ok(())
}
