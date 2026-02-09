use std::path::{Path, PathBuf};
use image::{Rgba, RgbaImage};
use std::hash::{Hash, Hasher};
use std::collections::hash_map::DefaultHasher;

/// Simple LCG PRNG seeded from a u64.
struct Rng {
    state: u64,
}

impl Rng {
    fn new(seed: u64) -> Self {
        Self { state: seed.wrapping_add(1) }
    }

    fn next(&mut self) -> u64 {
        // LCG constants from Numerical Recipes
        self.state = self.state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        self.state
    }

    /// Returns a float in [0.0, 1.0)
    fn next_f64(&mut self) -> f64 {
        (self.next() >> 11) as f64 / (1u64 << 53) as f64
    }

    /// Returns a value in [lo, hi)
    fn range_f64(&mut self, lo: f64, hi: f64) -> f64 {
        lo + self.next_f64() * (hi - lo)
    }
}

/// Hash a string seed into a u64.
fn hash_seed(seed: &str) -> u64 {
    let mut hasher = DefaultHasher::new();
    seed.hash(&mut hasher);
    hasher.finish()
}

/// Convert HSL to RGB (h in [0,360), s and l in [0,1]).
fn hsl_to_rgb(h: f64, s: f64, l: f64) -> (u8, u8, u8) {
    let c = (1.0 - (2.0 * l - 1.0).abs()) * s;
    let h2 = h / 60.0;
    let x = c * (1.0 - (h2 % 2.0 - 1.0).abs());
    let (r1, g1, b1) = if h2 < 1.0 {
        (c, x, 0.0)
    } else if h2 < 2.0 {
        (x, c, 0.0)
    } else if h2 < 3.0 {
        (0.0, c, x)
    } else if h2 < 4.0 {
        (0.0, x, c)
    } else if h2 < 5.0 {
        (x, 0.0, c)
    } else {
        (c, 0.0, x)
    };
    let m = l - c / 2.0;
    (
        ((r1 + m) * 255.0).round().clamp(0.0, 255.0) as u8,
        ((g1 + m) * 255.0).round().clamp(0.0, 255.0) as u8,
        ((b1 + m) * 255.0).round().clamp(0.0, 255.0) as u8,
    )
}

/// Generate a procedural cover image with a muted gradient + film grain texture.
/// Generates directly at 300x300 for speed (~50ms vs ~2s for 1024+resize).
/// Returns path to the generated thumbnail.
pub fn generate_cover(seed: &str, output_dir: &Path) -> Result<PathBuf, String> {
    std::fs::create_dir_all(output_dir)
        .map_err(|e| format!("Failed to create cover dir: {}", e))?;

    let hash = hash_seed(seed);
    let mut rng = Rng::new(hash);

    // Derive a muted base color — desaturated, deeper tones
    let hue = rng.range_f64(0.0, 360.0);
    let saturation = rng.range_f64(0.15, 0.35);
    let lightness = rng.range_f64(0.18, 0.32);

    // Subtle secondary color for gradient
    let hue2 = hue + rng.range_f64(-20.0, 20.0);
    let hue2 = if hue2 < 0.0 { hue2 + 360.0 } else if hue2 >= 360.0 { hue2 - 360.0 } else { hue2 };
    let lightness2 = lightness + rng.range_f64(-0.05, 0.05);
    let lightness2 = lightness2.clamp(0.12, 0.40);

    let (r1, g1, b1) = hsl_to_rgb(hue, saturation, lightness);
    let (r2, g2, b2) = hsl_to_rgb(hue2, saturation, lightness2);

    // Grain parameters
    let grain_intensity = rng.range_f64(0.06, 0.12);

    // Generate directly at 300x300 (thumbnail size — no expensive resize needed)
    let size = 300u32;
    let mut img = RgbaImage::new(size, size);

    // Separate grain RNG seeded differently for per-pixel noise
    let mut grain_rng = Rng::new(hash.wrapping_mul(0x9E3779B97F4A7C15));

    for y in 0..size {
        let t = y as f64 / (size - 1) as f64;
        // Interpolate gradient
        let r = r1 as f64 + (r2 as f64 - r1 as f64) * t;
        let g = g1 as f64 + (g2 as f64 - g1 as f64) * t;
        let b = b1 as f64 + (b2 as f64 - b1 as f64) * t;

        for x in 0..size {
            // Film grain: per-pixel luminance variation
            let noise = (grain_rng.next_f64() - 0.5) * 2.0 * grain_intensity * 255.0;
            let pr = (r + noise).clamp(0.0, 255.0) as u8;
            let pg = (g + noise).clamp(0.0, 255.0) as u8;
            let pb = (b + noise).clamp(0.0, 255.0) as u8;
            img.put_pixel(x, y, Rgba([pr, pg, pb, 255]));
        }
    }

    // Save as thumbnail (the only file we need)
    let thumb_path = output_dir.join("thumbnail.png");
    img.save(&thumb_path)
        .map_err(|e| format!("Failed to save cover: {}", e))?;

    Ok(thumb_path)
}
