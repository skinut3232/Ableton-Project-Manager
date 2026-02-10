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

    /// Returns an integer in [lo, hi)
    fn range_i32(&mut self, lo: i32, hi: i32) -> i32 {
        lo + (self.next_f64() * (hi - lo) as f64) as i32
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

/// Linearly interpolate two (u8,u8,u8) color tuples.
fn lerp_rgb(a: (u8, u8, u8), b: (u8, u8, u8), t: f64) -> (u8, u8, u8) {
    let t = t.clamp(0.0, 1.0);
    (
        (a.0 as f64 + (b.0 as f64 - a.0 as f64) * t).round().clamp(0.0, 255.0) as u8,
        (a.1 as f64 + (b.1 as f64 - a.1 as f64) * t).round().clamp(0.0, 255.0) as u8,
        (a.2 as f64 + (b.2 as f64 - a.2 as f64) * t).round().clamp(0.0, 255.0) as u8,
    )
}

/// Generate a random HSL color with vivid but tasteful ranges.
fn random_color(rng: &mut Rng) -> (f64, f64, f64) {
    let hue = rng.range_f64(0.0, 360.0);
    let saturation = rng.range_f64(0.35, 0.75);
    let lightness = rng.range_f64(0.25, 0.50);
    (hue, saturation, lightness)
}

/// Generate a complementary/contrasting color from a base.
fn contrasting_color(rng: &mut Rng, base_hue: f64) -> (f64, f64, f64) {
    // Offset hue by 60-180 degrees for visible contrast
    let offset = rng.range_f64(60.0, 180.0);
    let hue = (base_hue + offset) % 360.0;
    let saturation = rng.range_f64(0.30, 0.70);
    let lightness = rng.range_f64(0.20, 0.45);
    (hue, saturation, lightness)
}

// ── SDF Primitives ──

fn smoothstep(edge0: f64, edge1: f64, x: f64) -> f64 {
    let t = ((x - edge0) / (edge1 - edge0)).clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

fn sdf_circle(px: f64, py: f64, cx: f64, cy: f64, r: f64) -> f64 {
    let dx = px - cx;
    let dy = py - cy;
    (dx * dx + dy * dy).sqrt() - r
}

fn sdf_box(px: f64, py: f64, cx: f64, cy: f64, hw: f64, hh: f64) -> f64 {
    let dx = (px - cx).abs() - hw;
    let dy = (py - cy).abs() - hh;
    let outside = (dx.max(0.0) * dx.max(0.0) + dy.max(0.0) * dy.max(0.0)).sqrt();
    let inside = dx.max(dy).min(0.0);
    outside + inside
}

#[allow(dead_code)]
fn sdf_rounded_box(px: f64, py: f64, cx: f64, cy: f64, hw: f64, hh: f64, r: f64) -> f64 {
    sdf_box(px, py, cx, cy, hw - r, hh - r) - r
}

/// Signed distance to a convex polygon defined by vertices.
fn sdf_polygon(px: f64, py: f64, verts: &[(f64, f64)]) -> f64 {
    let n = verts.len();
    if n < 3 { return 1.0; }

    let mut d = f64::MAX;
    let mut sign = 1.0;

    for i in 0..n {
        let j = (i + 1) % n;
        let (ex, ey) = (verts[j].0 - verts[i].0, verts[j].1 - verts[i].1);
        let (wx, wy) = (px - verts[i].0, py - verts[i].1);

        let t = (wx * ex + wy * ey) / (ex * ex + ey * ey);
        let t = t.clamp(0.0, 1.0);
        let (bx, by) = (wx - ex * t, wy - ey * t);
        let dist_sq = bx * bx + by * by;
        d = d.min(dist_sq);

        // Winding number test
        let c1 = py >= verts[i].1;
        let c2 = py < verts[j].1;
        let c3 = ex * wy > ey * wx;
        if (c1 && c2 && c3) || (!c1 && !c2 && !c3) {
            sign = -sign;
        }
    }
    sign * d.sqrt()
}

fn sdf_union(a: f64, b: f64) -> f64 {
    a.min(b)
}

fn sdf_subtract(a: f64, b: f64) -> f64 {
    a.max(-b)
}

/// Convert SDF distance to 0.0–1.0 alpha with anti-aliasing.
fn opacity_from_sdf(d: f64, edge_width: f64) -> f64 {
    1.0 - smoothstep(-edge_width, edge_width, d)
}

// ── Icon Shape Functions ──
// Each takes normalized (0–1) coords, returns opacity 0.0–1.0.
// Icons are designed to fill ~60% of the unit square, centered at (0.5, 0.5).

const AA_WIDTH: f64 = 0.008;

fn icon_note(nx: f64, ny: f64) -> f64 {
    // Music note: ellipse head + vertical stem + flag
    let head_cx = 0.42;
    let head_cy = 0.62;
    let head_rx = 0.10;
    let head_ry = 0.07;
    // Tilted ellipse via coordinate rotation
    let angle = 0.4_f64; // ~23 degrees tilt
    let cos_a = angle.cos();
    let sin_a = angle.sin();
    let dx = nx - head_cx;
    let dy = ny - head_cy;
    let rx = dx * cos_a + dy * sin_a;
    let ry = -dx * sin_a + dy * cos_a;
    let head_d = (rx / head_rx) * (rx / head_rx) + (ry / head_ry) * (ry / head_ry);
    let head_sdf = (head_d.sqrt() - 1.0) * head_rx.min(head_ry);

    // Stem: vertical line from head top-right going up
    let stem_x = 0.50;
    let stem_sdf = sdf_box(nx, ny, stem_x, 0.42, 0.015, 0.22);

    // Flag: small curved triangle at top of stem
    let flag_verts = [
        (stem_x + 0.015, 0.22),
        (stem_x + 0.12, 0.28),
        (stem_x + 0.015, 0.36),
    ];
    let flag_sdf = sdf_polygon(nx, ny, &flag_verts);

    let combined = sdf_union(sdf_union(head_sdf, stem_sdf), flag_sdf);
    opacity_from_sdf(combined, AA_WIDTH)
}

fn icon_star(nx: f64, ny: f64) -> f64 {
    // 5-point star using polar SDF
    let cx = 0.5;
    let cy = 0.50;
    let dx = nx - cx;
    let dy = ny - cy;
    let angle = dy.atan2(dx);
    let r = (dx * dx + dy * dy).sqrt();

    let outer_r = 0.28;
    let inner_r = 0.12;
    let points = 5.0;

    // Oscillate between inner and outer radius
    let sector = std::f64::consts::PI / points;
    let a = ((angle + std::f64::consts::FRAC_PI_2) % (2.0 * sector) + 2.0 * sector) % (2.0 * sector);
    let a = if a > sector { 2.0 * sector - a } else { a };

    // Interpolate radius at this angle
    let star_r = inner_r + (outer_r - inner_r) * (1.0 - a / sector);
    let d = r - star_r;

    opacity_from_sdf(d, AA_WIDTH)
}

fn icon_heart(nx: f64, ny: f64) -> f64 {
    // Heart: two circles at top + triangle pointing down
    let top_y = 0.40;
    let spread = 0.12;
    let circle_r = 0.12;

    let left_d = sdf_circle(nx, ny, 0.5 - spread, top_y, circle_r);
    let right_d = sdf_circle(nx, ny, 0.5 + spread, top_y, circle_r);
    let circles = sdf_union(left_d, right_d);

    // Triangle: from bottom edges of circles down to a point
    let tri_verts = [
        (0.5 - spread - circle_r, top_y + 0.02),
        (0.5, 0.72),
        (0.5 + spread + circle_r, top_y + 0.02),
    ];
    let tri_d = sdf_polygon(nx, ny, &tri_verts);

    let combined = sdf_union(circles, tri_d);
    opacity_from_sdf(combined, AA_WIDTH)
}

fn icon_lightning(nx: f64, ny: f64) -> f64 {
    // Lightning bolt: zigzag polygon
    let verts = [
        (0.52, 0.18),
        (0.58, 0.18),
        (0.48, 0.47),
        (0.58, 0.47),
        (0.40, 0.82),
        (0.50, 0.52),
        (0.40, 0.52),
    ];
    let d = sdf_polygon(nx, ny, &verts);
    opacity_from_sdf(d, AA_WIDTH)
}

fn icon_diamond(nx: f64, ny: f64) -> f64 {
    // Rotated square (45 degrees)
    let cx = 0.5;
    let cy = 0.5;
    let dx = nx - cx;
    let dy = ny - cy;
    // Rotate 45 degrees
    let cos45 = std::f64::consts::FRAC_1_SQRT_2;
    let rx = dx * cos45 + dy * cos45;
    let ry = -dx * cos45 + dy * cos45;
    let half = 0.20;
    let d = sdf_box(rx + cx, ry + cy, cx, cy, half, half);
    opacity_from_sdf(d, AA_WIDTH)
}

fn icon_flame(nx: f64, ny: f64) -> f64 {
    // Flame: teardrop shape with sine-wave edge modulation
    let cx = 0.5;
    let cy = 0.5;
    let dx = nx - cx;
    let dy = ny - cy;

    // Teardrop base: wider at bottom, narrow at top
    let t = (dy + 0.3) / 0.6; // 0 at top, 1 at bottom
    let t = t.clamp(0.0, 1.0);
    // Width varies: narrow at top, wide in middle, tapers at bottom
    let width = 0.18 * (1.0 - (t - 0.6).powi(2) / 0.36).max(0.0).sqrt();

    // Add flickering edge via sine wave
    let flicker = 0.02 * (ny * 25.0).sin() * (1.0 - t);
    let effective_width = width + flicker;

    let d_x = dx.abs() - effective_width;
    let d_y_top = -(ny - 0.22); // top boundary
    let d_y_bot = ny - 0.78;    // bottom boundary

    // Combine: inside if d_x < 0, d_y_top < 0, d_y_bot < 0
    let d = d_x.max(d_y_top).max(d_y_bot);
    opacity_from_sdf(d, AA_WIDTH)
}

fn icon_ring(nx: f64, ny: f64) -> f64 {
    // Donut: subtract inner circle from outer circle
    let outer = sdf_circle(nx, ny, 0.5, 0.5, 0.25);
    let inner = sdf_circle(nx, ny, 0.5, 0.5, 0.14);
    let d = sdf_subtract(outer, inner);
    opacity_from_sdf(d, AA_WIDTH)
}

fn icon_moon(nx: f64, ny: f64) -> f64 {
    // Crescent moon: subtract offset circle from main circle
    let main = sdf_circle(nx, ny, 0.5, 0.5, 0.24);
    let cutout = sdf_circle(nx, ny, 0.62, 0.44, 0.20);
    let d = sdf_subtract(main, cutout);
    opacity_from_sdf(d, AA_WIDTH)
}

fn icon_sun(nx: f64, ny: f64) -> f64 {
    // 8-pointed sun: stubby rays radiating from center
    let cx = 0.5;
    let cy = 0.5;
    let dx = nx - cx;
    let dy = ny - cy;
    let angle = dy.atan2(dx);
    let r = (dx * dx + dy * dy).sqrt();

    let points = 8.0;
    let outer_r = 0.28;
    let inner_r = 0.19;
    let sector = std::f64::consts::PI / points;
    let a = ((angle + std::f64::consts::FRAC_PI_2) % (2.0 * sector) + 2.0 * sector) % (2.0 * sector);
    let a = if a > sector { 2.0 * sector - a } else { a };
    let star_r = inner_r + (outer_r - inner_r) * (1.0 - a / sector);
    let d = r - star_r;
    opacity_from_sdf(d, AA_WIDTH)
}

fn icon_cloud(nx: f64, ny: f64) -> f64 {
    // Puffy cloud: 4 overlapping circles
    let d1 = sdf_circle(nx, ny, 0.36, 0.52, 0.13);
    let d2 = sdf_circle(nx, ny, 0.50, 0.42, 0.15);
    let d3 = sdf_circle(nx, ny, 0.64, 0.50, 0.13);
    let d4 = sdf_circle(nx, ny, 0.50, 0.56, 0.12);
    let d = sdf_union(sdf_union(d1, d2), sdf_union(d3, d4));
    opacity_from_sdf(d, AA_WIDTH)
}

fn icon_cross(nx: f64, ny: f64) -> f64 {
    // Plus/cross: two intersecting rectangles
    let h_bar = sdf_box(nx, ny, 0.5, 0.5, 0.24, 0.07);
    let v_bar = sdf_box(nx, ny, 0.5, 0.5, 0.07, 0.24);
    let d = sdf_union(h_bar, v_bar);
    opacity_from_sdf(d, AA_WIDTH)
}

fn icon_arrow(nx: f64, ny: f64) -> f64 {
    // Upward arrow: triangle head + rectangle stem
    let head_verts = [
        (0.50, 0.22),
        (0.70, 0.48),
        (0.30, 0.48),
    ];
    let head_d = sdf_polygon(nx, ny, &head_verts);
    let stem = sdf_box(nx, ny, 0.5, 0.62, 0.065, 0.16);
    let d = sdf_union(head_d, stem);
    opacity_from_sdf(d, AA_WIDTH)
}

fn icon_wave(nx: f64, ny: f64) -> f64 {
    // Thick sine wave band
    let amplitude = 0.12;
    let freq = 2.5 * std::f64::consts::PI;
    let wave_y = 0.5 + amplitude * (freq * (nx - 0.5)).sin();
    let d_wave = (ny - wave_y).abs() - 0.045;
    let d_clip = (nx - 0.5).abs() - 0.33;
    let d = d_wave.max(d_clip);
    opacity_from_sdf(d, AA_WIDTH)
}

fn icon_triangle(nx: f64, ny: f64) -> f64 {
    // Equilateral triangle pointing up
    let verts = [
        (0.50, 0.24),
        (0.74, 0.72),
        (0.26, 0.72),
    ];
    let d = sdf_polygon(nx, ny, &verts);
    opacity_from_sdf(d, AA_WIDTH)
}

fn icon_hexagon(nx: f64, ny: f64) -> f64 {
    // Regular hexagon (flat-top orientation)
    let verts = [
        (0.500, 0.260),
        (0.708, 0.380),
        (0.708, 0.620),
        (0.500, 0.740),
        (0.292, 0.620),
        (0.292, 0.380),
    ];
    let d = sdf_polygon(nx, ny, &verts);
    opacity_from_sdf(d, AA_WIDTH)
}

fn icon_eye(nx: f64, ny: f64) -> f64 {
    // Eye: almond outline + filled pupil
    let top_arc = sdf_circle(nx, ny, 0.5, 0.26, 0.34);
    let bot_arc = sdf_circle(nx, ny, 0.5, 0.74, 0.34);
    let lens_inside = top_arc.max(bot_arc);
    let lens_border = lens_inside.abs() - 0.022;
    let pupil = sdf_circle(nx, ny, 0.5, 0.5, 0.08);
    let d = sdf_union(lens_border, pupil);
    opacity_from_sdf(d, AA_WIDTH)
}

fn icon_crown(nx: f64, ny: f64) -> f64 {
    // Crown: zigzag top with solid base
    let verts = [
        (0.24, 0.68),
        (0.24, 0.40),
        (0.35, 0.52),
        (0.50, 0.32),
        (0.65, 0.52),
        (0.76, 0.40),
        (0.76, 0.68),
    ];
    let d = sdf_polygon(nx, ny, &verts);
    opacity_from_sdf(d, AA_WIDTH)
}

fn icon_leaf(nx: f64, ny: f64) -> f64 {
    // Leaf: intersection of two offset circles creating a pointed oval
    let d1 = sdf_circle(nx, ny, 0.38, 0.36, 0.30);
    let d2 = sdf_circle(nx, ny, 0.62, 0.64, 0.30);
    let d = d1.max(d2);
    opacity_from_sdf(d, AA_WIDTH)
}

fn icon_droplet(nx: f64, ny: f64) -> f64 {
    // Water droplet: circle bottom + pointed top
    let circle_d = sdf_circle(nx, ny, 0.5, 0.58, 0.16);
    let tri_verts = [
        (0.50, 0.24),
        (0.36, 0.56),
        (0.64, 0.56),
    ];
    let tri_d = sdf_polygon(nx, ny, &tri_verts);
    let d = sdf_union(circle_d, tri_d);
    opacity_from_sdf(d, AA_WIDTH)
}

fn icon_infinity(nx: f64, ny: f64) -> f64 {
    // Figure-8: two overlapping thick rings
    let left = sdf_circle(nx, ny, 0.35, 0.5, 0.16);
    let left_inner = sdf_circle(nx, ny, 0.35, 0.5, 0.08);
    let left_ring = sdf_subtract(left, left_inner);
    let right = sdf_circle(nx, ny, 0.65, 0.5, 0.16);
    let right_inner = sdf_circle(nx, ny, 0.65, 0.5, 0.08);
    let right_ring = sdf_subtract(right, right_inner);
    let d = sdf_union(left_ring, right_ring);
    opacity_from_sdf(d, AA_WIDTH)
}

fn icon_skull(nx: f64, ny: f64) -> f64 {
    // Skull: rounded head + jaw, with eye holes cut out
    let head = sdf_circle(nx, ny, 0.5, 0.42, 0.20);
    let jaw_verts = [
        (0.34, 0.52),
        (0.66, 0.52),
        (0.60, 0.72),
        (0.40, 0.72),
    ];
    let jaw = sdf_polygon(nx, ny, &jaw_verts);
    let skull_shape = sdf_union(head, jaw);
    let left_eye = sdf_circle(nx, ny, 0.43, 0.40, 0.055);
    let right_eye = sdf_circle(nx, ny, 0.57, 0.40, 0.055);
    let d = sdf_subtract(sdf_subtract(skull_shape, left_eye), right_eye);
    opacity_from_sdf(d, AA_WIDTH)
}

fn icon_peaks(nx: f64, ny: f64) -> f64 {
    // Mountain peaks silhouette
    let verts = [
        (0.18, 0.74),
        (0.36, 0.36),
        (0.44, 0.52),
        (0.58, 0.28),
        (0.82, 0.74),
    ];
    let d = sdf_polygon(nx, ny, &verts);
    opacity_from_sdf(d, AA_WIDTH)
}

fn icon_bars(nx: f64, ny: f64) -> f64 {
    // Equalizer bars: 5 vertical bars of varying heights
    let b1 = sdf_box(nx, ny, 0.30, 0.56, 0.032, 0.12);
    let b2 = sdf_box(nx, ny, 0.40, 0.50, 0.032, 0.18);
    let b3 = sdf_box(nx, ny, 0.50, 0.46, 0.032, 0.22);
    let b4 = sdf_box(nx, ny, 0.60, 0.52, 0.032, 0.16);
    let b5 = sdf_box(nx, ny, 0.70, 0.54, 0.032, 0.14);
    let d = sdf_union(sdf_union(sdf_union(b1, b2), sdf_union(b3, b4)), b5);
    opacity_from_sdf(d, AA_WIDTH)
}

const ICON_NAMES: [&str; 23] = [
    "note", "star", "heart", "lightning", "diamond", "flame", "ring", "moon",
    "sun", "cloud", "cross", "arrow", "wave", "triangle", "hexagon", "eye",
    "crown", "leaf", "droplet", "infinity", "skull", "peaks", "bars",
];

fn get_icon_fn(name: &str) -> fn(f64, f64) -> f64 {
    match name {
        "note" => icon_note,
        "star" => icon_star,
        "heart" => icon_heart,
        "lightning" => icon_lightning,
        "diamond" => icon_diamond,
        "flame" => icon_flame,
        "ring" => icon_ring,
        "moon" => icon_moon,
        "sun" => icon_sun,
        "cloud" => icon_cloud,
        "cross" => icon_cross,
        "arrow" => icon_arrow,
        "wave" => icon_wave,
        "triangle" => icon_triangle,
        "hexagon" => icon_hexagon,
        "eye" => icon_eye,
        "crown" => icon_crown,
        "leaf" => icon_leaf,
        "droplet" => icon_droplet,
        "infinity" => icon_infinity,
        "skull" => icon_skull,
        "peaks" => icon_peaks,
        "bars" => icon_bars,
        _ => icon_star,
    }
}

// ── Gradient Styles (return base hue) ──

/// Style 0: Diagonal gradient (two contrasting colors, angled)
fn style_diagonal(rng: &mut Rng, img: &mut RgbaImage, size: u32) -> f64 {
    let (h1, s1, l1) = random_color(rng);
    let (h2, s2, l2) = contrasting_color(rng, h1);
    let c1 = hsl_to_rgb(h1, s1, l1);
    let c2 = hsl_to_rgb(h2, s2, l2);
    let angle = rng.range_f64(0.3, 0.7); // diagonal bias

    for y in 0..size {
        for x in 0..size {
            let nx = x as f64 / (size - 1) as f64;
            let ny = y as f64 / (size - 1) as f64;
            let t = (nx * angle + ny * (1.0 - angle)).clamp(0.0, 1.0);
            let (r, g, b) = lerp_rgb(c1, c2, t);
            img.put_pixel(x, y, Rgba([r, g, b, 255]));
        }
    }
    h1
}

/// Style 1: Radial spotlight (bright center fading to dark edge)
fn style_radial(rng: &mut Rng, img: &mut RgbaImage, size: u32) -> f64 {
    let (h1, s1, l1) = random_color(rng);
    let inner = hsl_to_rgb(h1, s1, (l1 + 0.15).min(0.6));
    let outer = hsl_to_rgb(h1, s1.max(0.2), (l1 - 0.10).max(0.10));

    // Off-center spotlight
    let cx = rng.range_f64(0.3, 0.7);
    let cy = rng.range_f64(0.3, 0.7);
    let radius = rng.range_f64(0.5, 0.9);

    for y in 0..size {
        for x in 0..size {
            let nx = x as f64 / (size - 1) as f64;
            let ny = y as f64 / (size - 1) as f64;
            let dx = nx - cx;
            let dy = ny - cy;
            let dist = (dx * dx + dy * dy).sqrt() / radius;
            let t = dist.clamp(0.0, 1.0);
            // Ease-out for smoother falloff
            let t = t * t;
            let (r, g, b) = lerp_rgb(inner, outer, t);
            img.put_pixel(x, y, Rgba([r, g, b, 255]));
        }
    }
    h1
}

/// Style 2: Three-color mesh gradient (3 anchor points blended by distance)
fn style_mesh(rng: &mut Rng, img: &mut RgbaImage, size: u32) -> f64 {
    let (h1, s1, l1) = random_color(rng);
    let (h2, s2, l2) = contrasting_color(rng, h1);
    let h3 = (h1 + rng.range_f64(90.0, 270.0)) % 360.0;
    let s3 = rng.range_f64(0.30, 0.65);
    let l3 = rng.range_f64(0.20, 0.45);

    let c1 = hsl_to_rgb(h1, s1, l1);
    let c2 = hsl_to_rgb(h2, s2, l2);
    let c3 = hsl_to_rgb(h3, s3, l3);

    // Three anchor points
    let anchors = [
        (rng.range_f64(0.0, 0.4), rng.range_f64(0.0, 0.4)),
        (rng.range_f64(0.6, 1.0), rng.range_f64(0.0, 0.5)),
        (rng.range_f64(0.2, 0.8), rng.range_f64(0.6, 1.0)),
    ];

    for y in 0..size {
        for x in 0..size {
            let nx = x as f64 / (size - 1) as f64;
            let ny = y as f64 / (size - 1) as f64;

            // Inverse-distance weighting
            let mut weights = [0.0f64; 3];
            for (i, (ax, ay)) in anchors.iter().enumerate() {
                let dx = nx - ax;
                let dy = ny - ay;
                let dist = (dx * dx + dy * dy).sqrt().max(0.001);
                weights[i] = 1.0 / (dist * dist);
            }
            let total: f64 = weights.iter().sum();
            let w1 = weights[0] / total;
            let w2 = weights[1] / total;
            let w3 = weights[2] / total;

            let r = (c1.0 as f64 * w1 + c2.0 as f64 * w2 + c3.0 as f64 * w3).clamp(0.0, 255.0) as u8;
            let g = (c1.1 as f64 * w1 + c2.1 as f64 * w2 + c3.1 as f64 * w3).clamp(0.0, 255.0) as u8;
            let b = (c1.2 as f64 * w1 + c2.2 as f64 * w2 + c3.2 as f64 * w3).clamp(0.0, 255.0) as u8;
            img.put_pixel(x, y, Rgba([r, g, b, 255]));
        }
    }
    h1
}

/// Style 3: Horizontal bands with smooth blending
fn style_bands(rng: &mut Rng, img: &mut RgbaImage, size: u32) -> f64 {
    let num_bands = rng.range_i32(3, 6) as usize;
    let mut colors: Vec<(u8, u8, u8)> = Vec::new();
    let (h_base, _, _) = random_color(rng);
    for i in 0..num_bands {
        let h = (h_base + (i as f64 * 360.0 / num_bands as f64)) % 360.0;
        let s = rng.range_f64(0.35, 0.70);
        let l = rng.range_f64(0.22, 0.48);
        colors.push(hsl_to_rgb(h, s, l));
    }

    for y in 0..size {
        let band_pos = y as f64 / (size - 1) as f64 * (num_bands - 1) as f64;
        let band_idx = (band_pos as usize).min(num_bands - 2);
        let t = band_pos - band_idx as f64;
        // Smooth step for softer transitions
        let t = t * t * (3.0 - 2.0 * t);
        let (r, g, b) = lerp_rgb(colors[band_idx], colors[band_idx + 1], t);

        for x in 0..size {
            img.put_pixel(x, y, Rgba([r, g, b, 255]));
        }
    }
    h_base
}

/// Style 4: Corner gradient (4 colors, one per corner, bilinear blend)
fn style_corners(rng: &mut Rng, img: &mut RgbaImage, size: u32) -> f64 {
    let (h1, _, _) = random_color(rng);
    let offsets = [0.0, 90.0, 180.0, 270.0];
    let mut corners = [(0u8, 0u8, 0u8); 4];
    for (i, offset) in offsets.iter().enumerate() {
        let h = (h1 + offset + rng.range_f64(-15.0, 15.0)) % 360.0;
        let s = rng.range_f64(0.35, 0.75);
        let l = rng.range_f64(0.20, 0.50);
        corners[i] = hsl_to_rgb(if h < 0.0 { h + 360.0 } else { h }, s, l);
    }

    for y in 0..size {
        let ny = y as f64 / (size - 1) as f64;
        let top = lerp_rgb(corners[0], corners[1], ny);    // TL → BL
        let bottom = lerp_rgb(corners[2], corners[3], ny);  // TR → BR
        for x in 0..size {
            let nx = x as f64 / (size - 1) as f64;
            let (r, g, b) = lerp_rgb(top, bottom, nx);
            img.put_pixel(x, y, Rgba([r, g, b, 255]));
        }
    }
    h1
}

// ── Icon Overlay ──

/// Overlay an icon onto the gradient image.
fn overlay_icon(img: &mut RgbaImage, size: u32, base_hue: f64, icon_fn: fn(f64, f64) -> f64, rng: &mut Rng) {
    // Icon color: same hue family, high lightness, low-moderate saturation for a luminous look
    let icon_hue = base_hue + rng.range_f64(-15.0, 15.0);
    let icon_hue = if icon_hue < 0.0 { icon_hue + 360.0 } else { icon_hue % 360.0 };
    let icon_sat = rng.range_f64(0.15, 0.30);
    let icon_light = rng.range_f64(0.65, 0.80);
    let (ir, ig, ib) = hsl_to_rgb(icon_hue, icon_sat, icon_light);

    // Icon occupies ~55-65% of canvas, centered
    let scale = rng.range_f64(0.55, 0.65);
    let offset = (1.0 - scale) / 2.0;

    for y in 0..size {
        for x in 0..size {
            let nx = (x as f64 / (size - 1) as f64 - offset) / scale;
            let ny = (y as f64 / (size - 1) as f64 - offset) / scale;

            let alpha = icon_fn(nx, ny);
            if alpha > 0.001 {
                let px = img.get_pixel(x, y);
                let a = alpha.clamp(0.0, 1.0);
                let r = (px[0] as f64 * (1.0 - a) + ir as f64 * a).round().clamp(0.0, 255.0) as u8;
                let g = (px[1] as f64 * (1.0 - a) + ig as f64 * a).round().clamp(0.0, 255.0) as u8;
                let b = (px[2] as f64 * (1.0 - a) + ib as f64 * a).round().clamp(0.0, 255.0) as u8;
                img.put_pixel(x, y, Rgba([r, g, b, 255]));
            }
        }
    }
}

/// Apply subtle film grain overlay.
fn apply_grain(img: &mut RgbaImage, size: u32, rng: &mut Rng, intensity: f64) {
    for y in 0..size {
        for x in 0..size {
            let noise = (rng.next_f64() - 0.5) * 2.0 * intensity * 255.0;
            let px = img.get_pixel(x, y);
            let r = (px[0] as f64 + noise).clamp(0.0, 255.0) as u8;
            let g = (px[1] as f64 + noise).clamp(0.0, 255.0) as u8;
            let b = (px[2] as f64 + noise).clamp(0.0, 255.0) as u8;
            img.put_pixel(x, y, Rgba([r, g, b, 255]));
        }
    }
}

/// Generate a procedural cover image with gradient background and icon overlay.
/// `style_preset`: icon name ("note", "star", etc.), "random"/"default"/None for PRNG pick.
/// Returns path to the generated thumbnail.
pub fn generate_cover(seed: &str, output_dir: &Path, style_preset: Option<&str>) -> Result<PathBuf, String> {
    std::fs::create_dir_all(output_dir)
        .map_err(|e| format!("Failed to create cover dir: {}", e))?;

    let hash = hash_seed(seed);
    let mut rng = Rng::new(hash);

    let size = 300u32;
    let mut img = RgbaImage::new(size, size);

    // Pick a gradient style based on seed
    let style = rng.range_i32(0, 5);
    let base_hue = match style {
        0 => style_diagonal(&mut rng, &mut img, size),
        1 => style_radial(&mut rng, &mut img, size),
        2 => style_mesh(&mut rng, &mut img, size),
        3 => style_bands(&mut rng, &mut img, size),
        _ => style_corners(&mut rng, &mut img, size),
    };

    // Pick icon
    let icon_name = match style_preset {
        Some(name) if !name.is_empty() && name != "default" && name != "random" => {
            // Validate the name is a known icon
            if ICON_NAMES.contains(&name) { name.to_string() } else { ICON_NAMES[rng.range_i32(0, ICON_NAMES.len() as i32) as usize].to_string() }
        }
        _ => {
            // Random pick from seed
            ICON_NAMES[rng.range_i32(0, ICON_NAMES.len() as i32) as usize].to_string()
        }
    };

    let icon_fn = get_icon_fn(&icon_name);
    overlay_icon(&mut img, size, base_hue, icon_fn, &mut rng);

    // Apply subtle grain (separate RNG to not disturb determinism)
    let grain_intensity = rng.range_f64(0.03, 0.08);
    let mut grain_rng = Rng::new(hash.wrapping_mul(0x9E3779B97F4A7C15));
    apply_grain(&mut img, size, &mut grain_rng, grain_intensity);

    let thumb_path = output_dir.join("thumbnail.png");
    img.save(&thumb_path)
        .map_err(|e| format!("Failed to save cover: {}", e))?;

    Ok(thumb_path)
}
