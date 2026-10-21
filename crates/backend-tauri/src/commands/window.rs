use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, PhysicalSize, WebviewUrl, WebviewWindow};

use crate::smtc::windows_smtc::{self, PlaybackState};

const LYRIC_URL: &str = "index.html#lyric";



#[tauri::command(rename = "minimize-window")]
pub fn minimize_window(window: WebviewWindow) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command(rename = "maximize-window")]
pub fn maximize_window(window: WebviewWindow) -> Result<(), String> {
    if window.is_maximized().map_err(|e| e.to_string())? {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command(rename = "close-window")]
pub fn close_window(window: WebviewWindow) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command(rename = "quit-app")]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub fn restart(app: AppHandle) {
    app.restart();
}

#[tauri::command(rename = "restore-window")]
pub fn restore_window(window: WebviewWindow) -> Result<(), String> {
    window.set_always_on_top(false).map_err(|e| e.to_string())?;
    window.unminimize().map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())
}

#[tauri::command(rename = "resize-window")]
pub fn resize_window(window: WebviewWindow, width: f64, height: f64) -> Result<(), String> {
    if !(1.0..=20000.0).contains(&width) || !(1.0..=20000.0).contains(&height) {
        return Err(format!("invalid size {width}x{height}"));
    }
    let scale = window.scale_factor().unwrap_or(1.0);
    window
        .set_size(PhysicalSize::new(
            (width * scale) as u32,
            (height * scale) as u32,
        ))
        .map_err(|e| e.to_string())
}


#[tauri::command(rename = "get-platform")]
pub fn get_platform(_app: AppHandle) -> &'static str {
    if cfg!(target_os = "windows") {
        "win32"
    } else if cfg!(target_os = "macos") {
        "darwin"
    } else if cfg!(target_os = "linux") {
        "linux"
    } else {
        "unknown"
    }
}

#[tauri::command(rename = "open-lyric")]
pub fn open_lyric(app: AppHandle) -> Result<(), String> {
    if let Some(existing) = app.get_webview_window("lyric") {
        existing.show().map_err(|e| e.to_string())?;
        existing.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    let url = WebviewUrl::App(LYRIC_URL.into());
    let window = tauri::WebviewWindowBuilder::new(&app, "lyric", url)
        .title("Chorus Deck Lyrics")
        .inner_size(520.0, 220.0)
        .min_inner_size(320.0, 120.0)
        .resizable(true)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .shadow(true)
        .build()
        .map_err(|e| e.to_string())?;

    let _ = window.emit("lyric-window-ready", ());

    if let Some(main) = app.get_webview_window("main") {
        let _ = main.emit("lyric-window-ready", ());
    }
    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct SongUpdate {
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub artist: String,
    #[serde(default)]
    pub album: String,
    #[serde(default)]
    pub cover_url: String,
    #[serde(default)]
    pub duration: f64,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub is_playing: Option<bool>,
}

#[tauri::command(rename = "update-current-song")]
pub fn update_current_song(app: AppHandle, data: SongUpdate) -> Result<(), String> {
    windows_smtc::set_now_playing(data.title.clone(), data.artist.clone());
    if let Some(true) = data.is_playing {
        windows_smtc::set_playback_state(PlaybackState::Playing);
    }

    if let Some(bridge) = app.try_state::<core_shared::RuntimeBridge>() {
        bridge.update_state(|s| {
            s.track_title = data.title.clone();
            s.artist_name = data.artist.clone();
            if !data.cover_url.is_empty() {
                s.album_art_url = Some(data.cover_url.clone());
            }
            if data.duration > 0.0 {
                s.duration_secs = (if data.duration > 1000.0 {
                    data.duration / 1000.0
                } else {
                    data.duration
                }) as f32;
            }
            if let Some(playing) = data.is_playing {
                s.is_playing = playing;
            }
        });
    }

    if let Some(tray) = app.tray_by_id("main-tray") {
        if let Some(line) = windows_smtc::display_line() {
            let _ = tray.set_tooltip(Some(&line));
        }
    }

    if let Some(lyric) = app.get_webview_window("lyric") {
        let _ = lyric.emit("update-current-song", &data);
    }
    if let Some(island) = app.get_webview_window("dynamic-island") {
        let _ = island.emit("update-current-song", &data);
    }
    Ok(())
}

#[tauri::command(rename = "update-play-state")]
pub fn update_play_state(app: AppHandle, is_playing: bool) -> Result<(), String> {
    windows_smtc::set_playback_state(if is_playing {
        PlaybackState::Playing
    } else {
        PlaybackState::Paused
    });

    if let Some(bridge) = app.try_state::<core_shared::RuntimeBridge>() {
        bridge.update_state(|s| {
            s.is_playing = is_playing;
        });
    }

    if let Some(lyric) = app.get_webview_window("lyric") {
        let _ = lyric.emit("update-play-state", is_playing);
    }
    if let Some(island) = app.get_webview_window("dynamic-island") {
        let _ = island.emit("update-play-state", is_playing);
    }
    Ok(())
}

#[tauri::command(rename = "set-content-zoom")]
pub fn set_content_zoom(
    window: WebviewWindow,
    state: tauri::State<'_, crate::commands::AppState>,
    zoom: f64,
) -> Result<(), String> {
    if !(0.25..=5.0).contains(&zoom) {
        return Err(format!("zoom {zoom} out of range"));
    }
    window.set_zoom(zoom).map_err(|e| e.to_string())?;
    *state.zoom.lock().map_err(|_| "zoom lock poisoned")? = zoom;
    Ok(())
}

#[tauri::command(rename = "get-content-zoom")]
pub fn get_content_zoom(state: tauri::State<'_, crate::commands::AppState>) -> Result<f64, String> {
    Ok(*state.zoom.lock().map_err(|_| "zoom lock poisoned")?)
}

#[tauri::command(rename = "toggle-fullscreen")]
pub fn toggle_fullscreen(window: WebviewWindow) -> Result<bool, String> {
    let current = window.is_fullscreen().map_err(|e| e.to_string())?;
    let target = !current;
    window.set_fullscreen(target).map_err(|e| e.to_string())?;
    Ok(target)
}

#[tauri::command(rename = "is-fullscreen")]
pub fn is_fullscreen(window: WebviewWindow) -> Result<bool, String> {
    window.is_fullscreen().map_err(|e| e.to_string())
}

static GPUI_ACTIVE: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
static DYNAMIC_ISLAND_ACTIVE: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

#[tauri::command(rename = "launch_performance_window")]
pub async fn launch_performance_window(app: AppHandle) -> Result<String, String> {
    if GPUI_ACTIVE.load(std::sync::atomic::Ordering::SeqCst) {
        return Ok("GPUI performance canvas is already running.".to_string());
    }

    let bridge = match app.try_state::<core_shared::RuntimeBridge>() {
        Some(b) => b.inner().clone(),
        None => core_shared::RuntimeBridge::new(),
    };
    let spawn_res = std::thread::Builder::new()
        .name("gpui-canvas-thread".to_string())
        .stack_size(8 * 1024 * 1024)
        .spawn(move || {
            #[cfg(target_os = "windows")]
            unsafe {
                use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};
                let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
            }
            GPUI_ACTIVE.store(true, std::sync::atomic::Ordering::SeqCst);
            let _ = desktop::launch_canvas_runtime(bridge);
            GPUI_ACTIVE.store(false, std::sync::atomic::Ordering::SeqCst);
        });

    match spawn_res {
        Ok(_) => Ok("GPUI performance window launched successfully.".to_string()),
        Err(e) => Err(format!("Failed to spawn GPUI thread: {e}")),
    }
}

#[tauri::command(rename = "launch_dynamic_island")]
pub async fn launch_dynamic_island(app: AppHandle) -> Result<String, String> {
    if DYNAMIC_ISLAND_ACTIVE.load(std::sync::atomic::Ordering::SeqCst) {
        return Ok("GPUI Dynamic Island is already running.".to_string());
    }

    let bridge = match app.try_state::<core_shared::RuntimeBridge>() {
        Some(b) => b.inner().clone(),
        None => core_shared::RuntimeBridge::new(),
    };

    let spawn_res = std::thread::Builder::new()
        .name("gpui-dynamic-island-thread".to_string())
        .stack_size(8 * 1024 * 1024)
        .spawn(move || {
            #[cfg(target_os = "windows")]
            unsafe {
                use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};
                let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
            }
            DYNAMIC_ISLAND_ACTIVE.store(true, std::sync::atomic::Ordering::SeqCst);
            if let Err(e) = desktop::launch_dynamic_island(bridge) {
                eprintln!("Error in GPUI Dynamic Island: {e:?}");
            }
            DYNAMIC_ISLAND_ACTIVE.store(false, std::sync::atomic::Ordering::SeqCst);
        });

    match spawn_res {
        Ok(_) => Ok("GPUI Dynamic Island window launched successfully.".to_string()),
        Err(e) => Err(format!("Failed to spawn Dynamic Island thread: {e}")),
    }
}

