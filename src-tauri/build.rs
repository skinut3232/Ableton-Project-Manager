fn main() {
    dotenvy::dotenv().ok();
    println!("cargo:rerun-if-changed=../.env");

    // Forward .env values to rustc so option_env!() can read them
    for key in &["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"] {
        if let Ok(val) = std::env::var(key) {
            println!("cargo:rustc-env={}={}", key, val);
        }
    }

    tauri_build::build()
}
