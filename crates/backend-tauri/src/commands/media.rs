use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, Manager, State};

use crate::commands::AppState;

const LYRIC_CHANNEL: &str = "receive-lyric";

#[tauri::command(rename = "send-lyric")]
pub fn send_lyric(app: AppHandle, data: serde_json::Value) -> Result<(), String> {
    let parsed_val: serde_json::Value = if let Some(s) = data.as_str() {
        serde_json::from_str(s).unwrap_or(data.clone())
    } else {
        data.clone()
    };

    let lyric_text = if let Some(t) = parsed_val.get("text").and_then(|v| v.as_str()) {
        Some(t.to_string())
    } else if let (Some(lrc_arr), Some(idx)) = (
        parsed_val.get("lrcArray").and_then(|v| v.as_array()),
        parsed_val.get("nowIndex").and_then(|v| v.as_u64()),
    ) {
        lrc_arr
            .get(idx as usize)
            .and_then(|line| line.get("text"))
            .and_then(|v| v.as_str())
            .map(|t| t.to_string())
    } else {
        None
    };

    if let Some(text) = lyric_text {
        let clean_text = text.replace("{bg}", "");
        if let Some(bridge) = app.try_state::<core_shared::RuntimeBridge>() {
            bridge.update_state(|s| {
                s.current_lyric_line = Some(clean_text);
            });
        }
    }
    if let Some(lyric) = app.get_webview_window("lyric") {
        let _ = lyric.emit(LYRIC_CHANNEL, &parsed_val);
    }
    if let Some(island) = app.get_webview_window("dynamic-island") {
        let _ = island.emit(LYRIC_CHANNEL, &parsed_val);
    }
    Ok(())
}

#[tauri::command(rename = "tray-lyric-update")]
pub fn tray_lyric_update(app: AppHandle, data: serde_json::Value) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id("main-tray") {
        let text = data
            .get("text")
            .and_then(|v| v.as_str())
            .unwrap_or_default();
        if !text.is_empty() {
            let _ = tray.set_tooltip(Some(text));
        }
    }
    Ok(())
}

#[tauri::command(rename = "cache-lyric")]
pub fn cache_lyric(state: State<'_, AppState>, key: String, value: String) -> Result<(), String> {
    state.cache.lock().map_err(|_| "cache lock poisoned")?.set(
        key,
        value.into_bytes(),
        Some(86_400),
    );
    Ok(())
}

#[tauri::command(rename = "get-cached-lyric")]
pub fn get_cached_lyric(state: State<'_, AppState>, key: String) -> Result<Option<String>, String> {
    let bytes = state
        .cache
        .lock()
        .map_err(|_| "cache lock poisoned")?
        .get(&key);
    Ok(bytes.and_then(|b| String::from_utf8(b).ok()))
}

#[tauri::command(rename = "clear-lyric-cache")]
pub fn clear_lyric_cache(state: State<'_, AppState>) -> Result<(), String> {
    state
        .cache
        .lock()
        .map_err(|_| "cache lock poisoned")?
        .clear();
    Ok(())
}

#[tauri::command(rename = "clear-lyrics-cache")]
pub fn clear_lyrics_cache(state: State<'_, AppState>) -> Result<(), String> {
    clear_lyric_cache(state)
}

#[derive(Debug, Deserialize)]
pub struct LyricsPayload {
    #[serde(default)]
    pub action: String,
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub lrc: String,
    #[serde(default)]
    pub tlyric: String,
}

#[tauri::command(rename = "get-lyrics")]
pub fn get_lyrics(payload: LyricsPayload) -> Result<serde_json::Value, String> {
    if payload.id.is_empty() {
        return Err("missing lyric id".to_string());
    }
    Ok(serde_json::json!({
        "action": payload.action,
        "id": payload.id,
        "lrc": payload.lrc,
        "tlyric": payload.tlyric,
    }))
}



#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LocalMusicMeta {
    pub file_path: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration: f64,
    pub cover_path: Option<String>,
    pub lyrics: Option<String>,
    pub file_size: u64,
    pub modified_time: u64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileInfo {
    pub path: String,
    pub modified_time: u64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ScanResultWithStats {
    pub files: Vec<FileInfo>,
    pub count: usize,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub files: Vec<String>,
    pub count: usize,
}

const AUDIO_EXTENSIONS: &[&str] = &[
    "mp3", "m4a", "aac", "flac", "wav", "ogg", "opus", "wma", "aiff", "alac",
];

fn read_metadata(path: &Path, app: Option<&AppHandle>) -> Option<LocalMusicMeta> {
    use lofty::prelude::*;
    use lofty::read_from_path;
    use lofty::tag::Accessor;

    let fs_meta = std::fs::metadata(path).ok()?;
    let file_size = fs_meta.len();
    let modified_time = fs_meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    let tagged = read_from_path(path).ok()?;
    let duration = tagged.properties().duration().as_secs_f64();

    let tag = tagged.primary_tag().or_else(|| tagged.first_tag());
    let (name, artist, album, cover, lyrics) = match tag {
        Some(t) => {
            let c = t.pictures().first().and_then(|p| {
                if let Some(app_handle) = app {
                    if let Ok(cache_dir) = app_handle.path().app_cache_dir() {
                        let covers_dir = cache_dir.join("covers");
                        let _ = std::fs::create_dir_all(&covers_dir);
                        use std::hash::{Hash, Hasher};
                        let mut hasher = std::collections::hash_map::DefaultHasher::new();
                        p.data().hash(&mut hasher);
                        let file_name = format!("{:x}.jpg", hasher.finish());
                        let file_path = covers_dir.join(file_name);
                        let _ = std::fs::write(&file_path, p.data());
                        return Some(file_path.to_string_lossy().to_string());
                    }
                }
                None
            });
            (
                t.title().map(|s| s.to_string()),
                t.artist().map(|s| s.to_string()),
                t.album().map(|s| s.to_string()),
                c,
                t.comment()
                    .map(|s| s.to_string())
                    .filter(|s| !s.trim().is_empty()),
            )
        }
        None => (None, None, None, None, None),
    };

    let stem = path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();

    Some(LocalMusicMeta {
        file_path: path.to_string_lossy().to_string(),
        title: name.unwrap_or(stem),
        artist: artist.unwrap_or_default(),
        album: album.unwrap_or_default(),
        duration,
        cover_path: cover,
        lyrics,
        file_size,
        modified_time,
    })
}

fn collect_audio_files(root: &Path, out: &mut Vec<PathBuf>) {
    let Ok(entries) = std::fs::read_dir(root) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_audio_files(&path, out);
        } else if path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| AUDIO_EXTENSIONS.contains(&e.to_lowercase().as_str()))
            .unwrap_or(false)
        {
            out.push(path);
        }
    }
}

#[tauri::command(rename = "scan-local-music")]
pub fn scan_local_music(folder_path: String) -> ScanResult {
    let mut files = Vec::new();
    collect_audio_files(Path::new(&folder_path), &mut files);
    let paths: Vec<String> = files
        .iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect();
    ScanResult {
        count: paths.len(),
        files: paths,
    }
}

#[tauri::command(rename = "scan-local-music-with-stats")]
pub fn scan_local_music_with_stats(folder_path: String) -> ScanResultWithStats {
    let mut files = Vec::new();
    collect_audio_files(Path::new(&folder_path), &mut files);

    let mut file_infos = Vec::new();
    for p in &files {
        let meta = std::fs::metadata(p).ok();
        let modified_time = meta
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        file_infos.push(FileInfo {
            path: p.to_string_lossy().to_string(),
            modified_time,
        });
    }
    ScanResultWithStats {
        count: file_infos.len(),
        files: file_infos,
    }
}

#[tauri::command(rename = "parse-local-music-metadata")]
pub fn parse_local_music_metadata(app: AppHandle, file_paths: Vec<String>) -> Vec<LocalMusicMeta> {
    file_paths
        .iter()
        .filter_map(|p| read_metadata(Path::new(p), Some(&app)))
        .collect()
}

#[tauri::command(rename = "check-file-exists")]
pub fn check_file_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command(rename = "unblock-music")]
pub fn unblock_music(
    id: String,
    _data: serde_json::Value,
    _enabled_sources: Vec<String>,
) -> Result<serde_json::Value, String> {
    Err(format!(
        "unblock-music is not implemented in the Tauri backend (id={id}); the NetEase \
         unblocker ran as a Node server under Electron and has no Rust equivalent yet"
    ))
}
