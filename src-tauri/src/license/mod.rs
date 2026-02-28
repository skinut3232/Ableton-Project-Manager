pub mod trial;
pub mod api;

use serde::{Deserialize, Serialize};

/// All possible license states for the app.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum LicenseStatus {
    TrialActive,
    TrialExpired,
    Activated,
    Expired,
    OfflineGrace,
}

/// License info returned to the frontend on every status check.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseInfo {
    pub status: LicenseStatus,
    /// Days remaining in trial or offline grace period (None when activated or expired)
    pub days_remaining: Option<i64>,
    /// LemonSqueezy checkout URL for purchasing
    pub checkout_url: String,
    /// Masked license key for display (e.g. "XXXX-XXXX-XXXX-AB12"), None if no key
    pub license_key_masked: Option<String>,
}

/// Mask a license key for safe display — show only the last 4 characters.
pub fn mask_license_key(key: &str) -> String {
    if key.len() <= 4 {
        return key.to_string();
    }
    let visible = &key[key.len() - 4..];
    format!("****-****-****-{}", visible)
}
