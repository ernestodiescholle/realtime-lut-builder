// Native Seite der Mac-App: schreibt exportierte Dateien direkt in einen gewählten Ordner
// (z. B. das Hauptverzeichnis der SD-Karte). Die ganze Bildverarbeitung bleibt im Web-Teil.
use base64::Engine;
use serde::Deserialize;
use std::path::{Component, Path, PathBuf};

#[derive(Deserialize)]
pub struct FileEntry {
    name: String,
    text: Option<String>,
    base64: Option<String>,
}

fn safe_name(name: &str) -> Result<PathBuf, String> {
    let p = Path::new(name);
    let mut comps = p.components();
    match (comps.next(), comps.next()) {
        (Some(Component::Normal(n)), None) => Ok(PathBuf::from(n)),
        _ => Err(format!("Ungültiger Dateiname: {name}")),
    }
}

/// Schreibt die Dateien in `dir`. Gibt die vollständigen Pfade zurück.
#[tauri::command]
fn write_files(dir: String, files: Vec<FileEntry>) -> Result<Vec<String>, String> {
    let dir = PathBuf::from(&dir);
    if !dir.is_dir() {
        return Err(format!("Ordner nicht gefunden: {}", dir.display()));
    }
    let mut written = Vec::new();
    for f in files {
        let path = dir.join(safe_name(&f.name)?);
        let bytes: Vec<u8> = if let Some(t) = f.text {
            t.into_bytes()
        } else if let Some(b) = f.base64 {
            base64::engine::general_purpose::STANDARD
                .decode(b)
                .map_err(|e| format!("Base64-Fehler bei {}: {e}", f.name))?
        } else {
            Vec::new()
        };
        std::fs::write(&path, bytes).map_err(|e| format!("{}: {e}", path.display()))?;
        written.push(path.display().to_string());
    }
    Ok(written)
}

/// Listet Wechseldatenträger unter /Volumes (SD-Karten), damit die App sie vorschlagen kann.
#[tauri::command]
fn list_volumes() -> Vec<String> {
    let mut out = Vec::new();
    if let Ok(rd) = std::fs::read_dir("/Volumes") {
        for e in rd.flatten() {
            let p = e.path();
            // Das Systemvolume ist meist "Macintosh HD"; alles andere sind Wechseldatenträger.
            let name = p.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
            if p.is_dir() && !name.starts_with("Macintosh") && !name.starts_with('.') {
                out.push(p.display().to_string());
            }
        }
    }
    out.sort();
    out
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![write_files, list_volumes])
        .run(tauri::generate_context!())
        .expect("LUT Generator konnte nicht gestartet werden");
}
