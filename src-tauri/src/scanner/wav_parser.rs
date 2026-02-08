use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;

/// Parse WAV file to get duration in seconds.
/// Properly iterates RIFF chunks - does NOT assume data chunk is at fixed offset.
pub fn parse_wav_duration(path: &Path) -> Result<f64, String> {
    let mut file = File::open(path).map_err(|e| format!("Failed to open WAV: {}", e))?;

    // Read RIFF header (12 bytes)
    let mut riff_header = [0u8; 12];
    file.read_exact(&mut riff_header).map_err(|e| format!("Failed to read RIFF header: {}", e))?;

    // Verify RIFF + WAVE signature
    if &riff_header[0..4] != b"RIFF" || &riff_header[8..12] != b"WAVE" {
        return Err("Not a valid WAV file".to_string());
    }

    let mut sample_rate: u32 = 0;
    let mut channels: u16 = 0;
    let mut bits_per_sample: u16 = 0;
    let mut data_size: u32 = 0;
    let mut found_fmt = false;
    let mut found_data = false;

    // Iterate through chunks
    loop {
        let mut chunk_header = [0u8; 8];
        match file.read_exact(&mut chunk_header) {
            Ok(_) => {}
            Err(_) => break, // End of file
        }

        let chunk_id = &chunk_header[0..4];
        let chunk_size = u32::from_le_bytes([chunk_header[4], chunk_header[5], chunk_header[6], chunk_header[7]]);

        if chunk_id == b"fmt " {
            let mut fmt_data = vec![0u8; chunk_size as usize];
            file.read_exact(&mut fmt_data).map_err(|e| format!("Failed to read fmt chunk: {}", e))?;

            if fmt_data.len() >= 16 {
                channels = u16::from_le_bytes([fmt_data[2], fmt_data[3]]);
                sample_rate = u32::from_le_bytes([fmt_data[4], fmt_data[5], fmt_data[6], fmt_data[7]]);
                bits_per_sample = u16::from_le_bytes([fmt_data[14], fmt_data[15]]);
                found_fmt = true;
            }
        } else if chunk_id == b"data" {
            data_size = chunk_size;
            found_data = true;
            break; // We have what we need
        } else {
            // Skip unknown chunk
            let skip = if chunk_size % 2 == 1 { chunk_size + 1 } else { chunk_size };
            file.seek(SeekFrom::Current(skip as i64))
                .map_err(|e| format!("Failed to skip chunk: {}", e))?;
        }
    }

    if !found_fmt || !found_data {
        return Err("WAV file missing fmt or data chunk".to_string());
    }

    if sample_rate == 0 || channels == 0 || bits_per_sample == 0 {
        return Err("Invalid WAV format parameters".to_string());
    }

    let bytes_per_sample = bits_per_sample as u32 / 8;
    let bytes_per_second = sample_rate * channels as u32 * bytes_per_sample;

    if bytes_per_second == 0 {
        return Err("Invalid WAV byte rate".to_string());
    }

    let duration = data_size as f64 / bytes_per_second as f64;
    Ok(duration)
}
