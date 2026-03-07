// .als file parser — extracts BPM, key, plugins, and sample references from
// Ableton Live Set files. .als files are gzip-compressed XML.

use std::collections::HashSet;
use std::io::Read;
use std::path::Path;

use crate::db::models::PluginInfo;

/// A sample reference extracted from the .als file.
pub struct SampleRef {
    pub path: String,
    pub filename: String,
}

/// All metadata extracted from a single .als file.
pub struct AlsMetadata {
    pub bpm: Option<f64>,
    pub key_tonic: Option<String>,
    pub key_scale: Option<String>,
    pub plugins: Vec<PluginInfo>,
    pub samples: Vec<SampleRef>,
}

/// Tonic integer (0-11) to note name mapping used by Ableton's KeySignature node.
const TONIC_NAMES: [&str; 12] = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

/// Parse an Ableton Live Set (.als) file and extract metadata.
/// Returns Err on I/O or XML parse failures — never panics.
pub fn parse_als(path: &Path) -> Result<AlsMetadata, String> {
    // Read and decompress the gzip file
    let file = std::fs::File::open(path)
        .map_err(|e| format!("Failed to open .als file: {}", e))?;
    let mut decoder = flate2::read::GzDecoder::new(file);
    let mut xml_string = String::new();
    decoder.read_to_string(&mut xml_string)
        .map_err(|e| format!("Failed to decompress .als file: {}", e))?;

    // Parse XML
    let doc = roxmltree::Document::parse(&xml_string)
        .map_err(|e| format!("Failed to parse .als XML: {}", e))?;

    let bpm = extract_bpm(&doc);
    let (key_tonic, key_scale) = extract_key(&doc);
    let plugins = extract_plugins(&doc);
    let samples = extract_samples(&doc);

    Ok(AlsMetadata {
        bpm,
        key_tonic,
        key_scale,
        plugins,
        samples,
    })
}

/// Find the first <Tempo> node and read its <Manual Value="..."/> child.
fn extract_bpm(doc: &roxmltree::Document) -> Option<f64> {
    for node in doc.descendants() {
        if node.has_tag_name("Tempo") {
            for child in node.children() {
                if child.has_tag_name("Manual") {
                    if let Some(val) = child.attribute("Value") {
                        return val.parse::<f64>().ok();
                    }
                }
            }
        }
    }
    None
}

/// Find <KeySignature> → <Tonic Value="N"/> and <Scale Value="N"/>.
/// Tonic 0-11 maps to note names; Scale 0=Major, 1=Minor.
fn extract_key(doc: &roxmltree::Document) -> (Option<String>, Option<String>) {
    for node in doc.descendants() {
        if node.has_tag_name("KeySignature") {
            let mut tonic: Option<String> = None;
            let mut scale: Option<String> = None;

            for child in node.descendants() {
                if child.has_tag_name("Tonic") {
                    if let Some(val) = child.attribute("Value") {
                        if let Ok(idx) = val.parse::<usize>() {
                            if idx < TONIC_NAMES.len() {
                                tonic = Some(TONIC_NAMES[idx].to_string());
                            }
                        }
                    }
                }
                if child.has_tag_name("Scale") {
                    if let Some(val) = child.attribute("Value") {
                        scale = Some(match val {
                            "0" => "Major".to_string(),
                            "1" => "Minor".to_string(),
                            _ => format!("Scale {}", val),
                        });
                    }
                }
            }

            if tonic.is_some() {
                return (tonic, scale);
            }
        }
    }
    (None, None)
}

/// Extract all unique plugins from the XML tree.
fn extract_plugins(doc: &roxmltree::Document) -> Vec<PluginInfo> {
    let mut seen = HashSet::new();
    let mut plugins = Vec::new();

    for node in doc.descendants() {
        let (name_tag, plugin_type) = match node.tag_name().name() {
            "VstPluginInfo" => ("PlugName", "vst2"),
            "Vst3PluginInfo" => ("Name", "vst3"),
            "AuPluginInfo" => ("Name", "au"),
            "MxDeviceInfo" => ("DisplayName", "max_for_live"),
            _ => continue,
        };

        // For Vst3PluginInfo, use direct children only (not descendants)
        // to avoid picking up the empty <Name> inside <Vst3Preset>
        let name_value = if node.tag_name().name() == "Vst3PluginInfo" {
            node.children()
                .find(|c| c.has_tag_name(name_tag))
                .and_then(|c| c.attribute("Value"))
        } else {
            node.descendants()
                .find(|c| c.has_tag_name(name_tag))
                .and_then(|c| c.attribute("Value"))
        };

        if let Some(name) = name_value {
            let trimmed = name.trim();
            if !trimmed.is_empty() {
                let key = trimmed.to_lowercase();
                if seen.insert(key) {
                    plugins.push(PluginInfo {
                        name: trimmed.to_string(),
                        plugin_type: plugin_type.to_string(),
                    });
                }
            }
        }
    }

    plugins
}

/// Extract all unique sample file references from <SampleRef> → <FileRef> → <Path>.
fn extract_samples(doc: &roxmltree::Document) -> Vec<SampleRef> {
    let mut seen = HashSet::new();
    let mut samples = Vec::new();

    for node in doc.descendants() {
        if node.has_tag_name("SampleRef") {
            // Look for FileRef → Path child
            for child in node.descendants() {
                if child.has_tag_name("FileRef") {
                    for fc in child.children() {
                        if fc.has_tag_name("Path") {
                            if let Some(path_val) = fc.attribute("Value") {
                                let trimmed = path_val.trim();
                                if !trimmed.is_empty() && seen.insert(trimmed.to_string()) {
                                    let filename = Path::new(trimmed)
                                        .file_name()
                                        .map(|f| f.to_string_lossy().to_string())
                                        .unwrap_or_else(|| trimmed.to_string());
                                    samples.push(SampleRef {
                                        path: trimmed.to_string(),
                                        filename,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    samples
}
