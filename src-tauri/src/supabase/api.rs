use reqwest::blocking::Client;
use serde_json::Value;
use super::SupabaseClient;

/// Generic GET request to Supabase REST API.
pub fn get(
    client: &SupabaseClient,
    table: &str,
    query_params: &str,
) -> Result<Vec<Value>, String> {
    let http = Client::new();
    let url = format!("{}?{}", client.rest_url(table), query_params);

    let mut req = http.get(&url)
        .header("apikey", &client.anon_key);

    if let Some(ref token) = client.access_token {
        req = req.header("Authorization", format!("Bearer {}", token));
    }

    let resp = req.send().map_err(|e| format!("GET {} failed: {}", table, e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().unwrap_or_default();
        return Err(format!("GET {} failed ({}): {}", table, status, body));
    }

    resp.json::<Vec<Value>>()
        .map_err(|e| format!("Failed to parse GET {} response: {}", table, e))
}

/// Upsert (insert or update) a record via POST with Prefer: resolution=merge-duplicates.
pub fn upsert(
    client: &SupabaseClient,
    table: &str,
    body: &Value,
) -> Result<Value, String> {
    let http = Client::new();
    let url = client.rest_url(table);

    let mut req = http.post(&url)
        .header("apikey", &client.anon_key)
        .header("Content-Type", "application/json")
        .header("Prefer", "return=representation,resolution=merge-duplicates");

    if let Some(ref token) = client.access_token {
        req = req.header("Authorization", format!("Bearer {}", token));
    }

    let resp = req.json(body)
        .send()
        .map_err(|e| format!("UPSERT {} failed: {}", table, e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body_text = resp.text().unwrap_or_default();
        return Err(format!("UPSERT {} failed ({}): {}", table, status, body_text));
    }

    let results: Vec<Value> = resp.json()
        .map_err(|e| format!("Failed to parse UPSERT {} response: {}", table, e))?;

    results.into_iter().next()
        .ok_or_else(|| format!("UPSERT {} returned empty response", table))
}

/// Insert a single record via POST (no upsert).
pub fn insert(
    client: &SupabaseClient,
    table: &str,
    body: &Value,
) -> Result<Value, String> {
    let http = Client::new();
    let url = client.rest_url(table);

    let mut req = http.post(&url)
        .header("apikey", &client.anon_key)
        .header("Content-Type", "application/json")
        .header("Prefer", "return=representation");

    if let Some(ref token) = client.access_token {
        req = req.header("Authorization", format!("Bearer {}", token));
    }

    let resp = req.json(body)
        .send()
        .map_err(|e| format!("INSERT {} failed: {}", table, e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body_text = resp.text().unwrap_or_default();
        return Err(format!("INSERT {} failed ({}): {}", table, status, body_text));
    }

    let results: Vec<Value> = resp.json()
        .map_err(|e| format!("Failed to parse INSERT {} response: {}", table, e))?;

    results.into_iter().next()
        .ok_or_else(|| format!("INSERT {} returned empty response", table))
}

/// Update a record via PATCH.
pub fn update(
    client: &SupabaseClient,
    table: &str,
    remote_id: i64,
    body: &Value,
) -> Result<Value, String> {
    let http = Client::new();
    let url = format!("{}?id=eq.{}", client.rest_url(table), remote_id);

    let mut req = http.patch(&url)
        .header("apikey", &client.anon_key)
        .header("Content-Type", "application/json")
        .header("Prefer", "return=representation");

    if let Some(ref token) = client.access_token {
        req = req.header("Authorization", format!("Bearer {}", token));
    }

    let resp = req.json(body)
        .send()
        .map_err(|e| format!("UPDATE {} failed: {}", table, e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body_text = resp.text().unwrap_or_default();
        return Err(format!("UPDATE {} failed ({}): {}", table, status, body_text));
    }

    let results: Vec<Value> = resp.json()
        .map_err(|e| format!("Failed to parse UPDATE {} response: {}", table, e))?;

    results.into_iter().next()
        .ok_or_else(|| format!("UPDATE {} returned empty response", table))
}

/// Delete a record via DELETE.
pub fn delete(
    client: &SupabaseClient,
    table: &str,
    remote_id: i64,
) -> Result<(), String> {
    let http = Client::new();
    let url = format!("{}?id=eq.{}", client.rest_url(table), remote_id);

    let mut req = http.delete(&url)
        .header("apikey", &client.anon_key);

    if let Some(ref token) = client.access_token {
        req = req.header("Authorization", format!("Bearer {}", token));
    }

    let resp = req.send()
        .map_err(|e| format!("DELETE {} failed: {}", table, e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().unwrap_or_default();
        return Err(format!("DELETE {} failed ({}): {}", table, status, body));
    }

    Ok(())
}
