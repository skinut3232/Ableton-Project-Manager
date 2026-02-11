use std::fs::File;
use std::io::{Read, Seek, SeekFrom, Write};
use std::mem::MaybeUninit;
use std::path::Path;

use mp3lame_encoder::{Builder, FlushNoGap, InterleavedPcm, MonoPcm};

/// Convert a WAV file to MP3 at 192kbps using LAME encoder.
pub fn convert_wav_to_mp3(wav_path: &Path, output_path: &Path) -> Result<(), String> {
    let mut file = File::open(wav_path).map_err(|e| format!("Failed to open WAV: {}", e))?;

    // Read RIFF header (12 bytes)
    let mut riff_header = [0u8; 12];
    file.read_exact(&mut riff_header)
        .map_err(|e| format!("Failed to read RIFF header: {}", e))?;

    if &riff_header[0..4] != b"RIFF" || &riff_header[8..12] != b"WAVE" {
        return Err("Not a valid WAV file".to_string());
    }

    let mut sample_rate: u32 = 0;
    let mut channels: u16 = 0;
    let mut bits_per_sample: u16 = 0;
    let mut data_size: u32 = 0;
    let mut data_offset: u64 = 0;
    let mut found_fmt = false;
    let mut found_data = false;

    // Iterate through RIFF chunks to find fmt and data
    loop {
        let mut chunk_header = [0u8; 8];
        match file.read_exact(&mut chunk_header) {
            Ok(_) => {}
            Err(_) => break,
        }

        let chunk_id = [
            chunk_header[0],
            chunk_header[1],
            chunk_header[2],
            chunk_header[3],
        ];
        let chunk_size = u32::from_le_bytes([
            chunk_header[4],
            chunk_header[5],
            chunk_header[6],
            chunk_header[7],
        ]);

        if &chunk_id == b"fmt " {
            let mut fmt_data = vec![0u8; chunk_size as usize];
            file.read_exact(&mut fmt_data)
                .map_err(|e| format!("Failed to read fmt chunk: {}", e))?;

            if fmt_data.len() >= 16 {
                channels = u16::from_le_bytes([fmt_data[2], fmt_data[3]]);
                sample_rate =
                    u32::from_le_bytes([fmt_data[4], fmt_data[5], fmt_data[6], fmt_data[7]]);
                bits_per_sample = u16::from_le_bytes([fmt_data[14], fmt_data[15]]);
                found_fmt = true;
            }
        } else if &chunk_id == b"data" {
            data_size = chunk_size;
            data_offset = file
                .stream_position()
                .map_err(|e| format!("Failed to get position: {}", e))?;
            found_data = true;
            break;
        } else {
            // Skip unknown chunk (pad to even boundary)
            let skip = if chunk_size % 2 == 1 {
                chunk_size + 1
            } else {
                chunk_size
            };
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

    // Read raw PCM data
    file.seek(SeekFrom::Start(data_offset))
        .map_err(|e| format!("Failed to seek to data: {}", e))?;

    let mut raw_data = vec![0u8; data_size as usize];
    file.read_exact(&mut raw_data)
        .map_err(|e| format!("Failed to read PCM data: {}", e))?;

    // Convert raw bytes to i16 samples
    let samples_i16 = convert_to_i16(&raw_data, bits_per_sample)?;

    // Set up LAME encoder
    let mut encoder = Builder::new().ok_or("Failed to create LAME encoder")?;
    encoder
        .set_sample_rate(sample_rate)
        .map_err(|e| format!("Failed to set sample rate: {:?}", e))?;
    encoder
        .set_num_channels(channels as u8)
        .map_err(|e| format!("Failed to set channels: {:?}", e))?;
    encoder
        .set_brate(mp3lame_encoder::Birtate::Kbps192)
        .map_err(|e| format!("Failed to set bitrate: {:?}", e))?;
    encoder
        .set_quality(mp3lame_encoder::Quality::Best)
        .map_err(|e| format!("Failed to set quality: {:?}", e))?;

    let mut encoder = encoder
        .build()
        .map_err(|e| format!("Failed to build LAME encoder: {:?}", e))?;

    // Encode based on channel count
    let mp3_data = if channels == 1 {
        let input = MonoPcm(&samples_i16);
        let buf_size = mp3lame_encoder::max_required_buffer_size(samples_i16.len());
        let mut mp3_buf: Vec<MaybeUninit<u8>> = vec![MaybeUninit::uninit(); buf_size];
        let encoded_size = encoder
            .encode(input, &mut mp3_buf)
            .map_err(|e| format!("MP3 encode error: {:?}", e))?;

        let mut result = unsafe {
            let ptr = mp3_buf.as_ptr() as *const u8;
            std::slice::from_raw_parts(ptr, encoded_size).to_vec()
        };

        // Flush remaining frames
        let mut flush_buf: Vec<MaybeUninit<u8>> = vec![MaybeUninit::uninit(); 7200];
        let flush_size = encoder
            .flush::<FlushNoGap>(&mut flush_buf)
            .map_err(|e| format!("MP3 flush error: {:?}", e))?;
        unsafe {
            let ptr = flush_buf.as_ptr() as *const u8;
            result.extend_from_slice(std::slice::from_raw_parts(ptr, flush_size));
        }

        result
    } else {
        // Stereo (or multi-channel treated as interleaved stereo)
        let input = InterleavedPcm(&samples_i16);
        let num_samples = samples_i16.len() / channels as usize;
        let buf_size = mp3lame_encoder::max_required_buffer_size(num_samples);
        let mut mp3_buf: Vec<MaybeUninit<u8>> = vec![MaybeUninit::uninit(); buf_size];
        let encoded_size = encoder
            .encode(input, &mut mp3_buf)
            .map_err(|e| format!("MP3 encode error: {:?}", e))?;

        let mut result = unsafe {
            let ptr = mp3_buf.as_ptr() as *const u8;
            std::slice::from_raw_parts(ptr, encoded_size).to_vec()
        };

        // Flush remaining frames
        let mut flush_buf: Vec<MaybeUninit<u8>> = vec![MaybeUninit::uninit(); 7200];
        let flush_size = encoder
            .flush::<FlushNoGap>(&mut flush_buf)
            .map_err(|e| format!("MP3 flush error: {:?}", e))?;
        unsafe {
            let ptr = flush_buf.as_ptr() as *const u8;
            result.extend_from_slice(std::slice::from_raw_parts(ptr, flush_size));
        }

        result
    };

    // Ensure parent directory exists
    if let Some(parent) = output_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create output directory: {}", e))?;
    }

    // Write MP3 file
    let mut out_file =
        File::create(output_path).map_err(|e| format!("Failed to create MP3 file: {}", e))?;
    out_file
        .write_all(&mp3_data)
        .map_err(|e| format!("Failed to write MP3 data: {}", e))?;

    Ok(())
}

/// Convert raw PCM bytes to i16 samples, handling 16-bit, 24-bit, and 32-bit formats.
fn convert_to_i16(raw: &[u8], bits_per_sample: u16) -> Result<Vec<i16>, String> {
    match bits_per_sample {
        16 => {
            if raw.len() % 2 != 0 {
                return Err("Invalid 16-bit PCM data length".to_string());
            }
            Ok(raw
                .chunks_exact(2)
                .map(|c| i16::from_le_bytes([c[0], c[1]]))
                .collect())
        }
        24 => {
            if raw.len() % 3 != 0 {
                return Err("Invalid 24-bit PCM data length".to_string());
            }
            Ok(raw
                .chunks_exact(3)
                .map(|c| {
                    // 24-bit to i32, then scale down to i16
                    let val =
                        ((c[2] as i32) << 24 | (c[1] as i32) << 16 | (c[0] as i32) << 8) >> 8;
                    (val >> 8) as i16
                })
                .collect())
        }
        32 => {
            if raw.len() % 4 != 0 {
                return Err("Invalid 32-bit PCM data length".to_string());
            }
            Ok(raw
                .chunks_exact(4)
                .map(|c| {
                    let val = i32::from_le_bytes([c[0], c[1], c[2], c[3]]);
                    (val >> 16) as i16
                })
                .collect())
        }
        _ => Err(format!("Unsupported bits per sample: {}", bits_per_sample)),
    }
}
