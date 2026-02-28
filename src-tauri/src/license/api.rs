use serde::Deserialize;

/// Base URL for LemonSqueezy License API.
const LS_API_BASE: &str = "https://api.lemonsqueezy.com/v1/licenses";

/// Response from the LemonSqueezy activate endpoint.
#[derive(Debug, Deserialize)]
pub struct ActivateResponse {
    pub activated: bool,
    pub instance: Option<InstanceData>,
    pub error: Option<String>,
    pub license_key: Option<LicenseKeyData>,
}

/// Response from the LemonSqueezy validate endpoint.
#[derive(Debug, Deserialize)]
pub struct ValidateResponse {
    pub valid: bool,
    pub error: Option<String>,
    pub license_key: Option<LicenseKeyData>,
}

/// Response from the LemonSqueezy deactivate endpoint.
#[derive(Debug, Deserialize)]
pub struct DeactivateResponse {
    pub deactivated: bool,
    pub error: Option<String>,
}

/// Instance data returned from activation.
#[derive(Debug, Deserialize)]
pub struct InstanceData {
    pub id: String,
}

/// License key metadata from LemonSqueezy.
#[derive(Debug, Deserialize)]
pub struct LicenseKeyData {
    pub status: String,
}

/// Activate a license key with LemonSqueezy.
/// instance_name is a human-readable label for this device (e.g., hostname).
pub fn activate_license(key: &str, instance_name: &str) -> Result<ActivateResponse, String> {
    let client = reqwest::blocking::Client::new();
    let resp = client
        .post(format!("{}/activate", LS_API_BASE))
        .header("Accept", "application/json")
        // LemonSqueezy License API uses form-encoded bodies, NOT JSON
        .form(&[
            ("license_key", key),
            ("instance_name", instance_name),
        ])
        .send()
        .map_err(|e| format!("Network error activating license: {}", e))?;

    let status = resp.status();
    let body = resp.text().map_err(|e| format!("Failed to read response: {}", e))?;

    // LemonSqueezy returns 200 for both success and some errors
    serde_json::from_str::<ActivateResponse>(&body)
        .map_err(|e| format!("Failed to parse activation response (HTTP {}): {}", status, e))
}

/// Validate a license key with LemonSqueezy.
/// instance_id is the ID returned from activation.
pub fn validate_license(key: &str, instance_id: &str) -> Result<ValidateResponse, String> {
    let client = reqwest::blocking::Client::new();
    let resp = client
        .post(format!("{}/validate", LS_API_BASE))
        .header("Accept", "application/json")
        .form(&[
            ("license_key", key),
            ("instance_id", instance_id),
        ])
        .send()
        .map_err(|e| format!("Network error validating license: {}", e))?;

    let status = resp.status();
    let body = resp.text().map_err(|e| format!("Failed to read response: {}", e))?;

    serde_json::from_str::<ValidateResponse>(&body)
        .map_err(|e| format!("Failed to parse validation response (HTTP {}): {}", status, e))
}

/// Deactivate a license key from this device.
pub fn deactivate_license(key: &str, instance_id: &str) -> Result<DeactivateResponse, String> {
    let client = reqwest::blocking::Client::new();
    let resp = client
        .post(format!("{}/deactivate", LS_API_BASE))
        .header("Accept", "application/json")
        .form(&[
            ("license_key", key),
            ("instance_id", instance_id),
        ])
        .send()
        .map_err(|e| format!("Network error deactivating license: {}", e))?;

    let status = resp.status();
    let body = resp.text().map_err(|e| format!("Failed to read response: {}", e))?;

    serde_json::from_str::<DeactivateResponse>(&body)
        .map_err(|e| format!("Failed to parse deactivation response (HTTP {}): {}", status, e))
}
