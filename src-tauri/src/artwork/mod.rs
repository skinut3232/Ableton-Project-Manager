use std::path::{Path, PathBuf};
use image::imageops::FilterType;

pub fn process_artwork(source_path: &str, output_dir: &Path) -> Result<PathBuf, String> {
    let img = image::open(source_path)
        .map_err(|e| format!("Failed to open image: {}", e))?;

    // Save original
    let source = Path::new(source_path);
    let ext = source.extension().unwrap_or_default().to_string_lossy().to_lowercase();
    let original_path = output_dir.join(format!("original.{}", ext));
    img.save(&original_path)
        .map_err(|e| format!("Failed to save original: {}", e))?;

    // Create 300x300 thumbnail
    let thumbnail = img.resize_to_fill(300, 300, FilterType::Lanczos3);
    let thumb_path = output_dir.join("thumbnail.png");
    thumbnail.save(&thumb_path)
        .map_err(|e| format!("Failed to save thumbnail: {}", e))?;

    Ok(thumb_path)
}
