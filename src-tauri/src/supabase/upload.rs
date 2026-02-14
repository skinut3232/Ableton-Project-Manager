// Phase 4: File upload to Supabase Storage
// Handles cover art, MP3 bounces, and asset uploads.

use reqwest::blocking::Client;
use super::SupabaseClient;

/// Upload a file to Supabase Storage.
pub fn upload_file(
    client: &SupabaseClient,
    bucket: &str,
    path: &str,
    data: Vec<u8>,
    content_type: &str,
) -> Result<String, String> {
    let http = Client::new();
    let url = client.storage_url(&format!("/object/{}/{}", bucket, path));

    let mut req = http.post(&url)
        .header("apikey", &client.anon_key)
        .header("Content-Type", content_type)
        .header("x-upsert", "true"); // Overwrite if exists

    if let Some(ref token) = client.access_token {
        req = req.header("Authorization", format!("Bearer {}", token));
    }

    let resp = req.body(data)
        .send()
        .map_err(|e| format!("Upload to {}/{} failed: {}", bucket, path, e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().unwrap_or_default();
        return Err(format!("Upload failed ({}): {}", status, body));
    }

    // Return the public URL
    let public_url = client.storage_url(&format!("/object/public/{}/{}", bucket, path));
    Ok(public_url)
}

/// Delete a file from Supabase Storage.
pub fn delete_file(
    client: &SupabaseClient,
    bucket: &str,
    path: &str,
) -> Result<(), String> {
    let http = Client::new();
    let url = client.storage_url(&format!("/object/{}/{}", bucket, path));

    let mut req = http.delete(&url)
        .header("apikey", &client.anon_key);

    if let Some(ref token) = client.access_token {
        req = req.header("Authorization", format!("Bearer {}", token));
    }

    let resp = req.send()
        .map_err(|e| format!("Delete from {}/{} failed: {}", bucket, path, e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().unwrap_or_default();
        return Err(format!("Delete failed ({}): {}", status, body));
    }

    Ok(())
}
