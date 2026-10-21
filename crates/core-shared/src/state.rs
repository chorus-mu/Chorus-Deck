use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CanvasState {
    pub is_playing: bool,
    pub volume: f32,
    pub playback_position_secs: f32,
    pub duration_secs: f32,
    pub track_id: String,
    pub track_title: String,
    pub artist_name: String,
    pub album_art_url: Option<String>,
    pub current_lyric_line: Option<String>,
    pub spectrum_energy: Vec<f32>,
    pub frame_counter: u64,
}

impl Default for CanvasState {
    fn default() -> Self {
        Self {
            is_playing: false,
            volume: 0.85,
            playback_position_secs: 0.0,
            duration_secs: 0.0,
            track_id: String::new(),
            track_title: "No Active Track".to_string(),
            artist_name: "Chorus Deck".to_string(),
            album_art_url: None,
            current_lyric_line: None,
            spectrum_energy: vec![0.0; 16],
            frame_counter: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CanvasAction {
    SetFps(u32),
    TriggerVisualPulse { intensity: f32, color_hex: u32 },
    SetPosition { x: i32, y: i32 },
    ToggleVisibility,
    Shutdown,
    TogglePlayPause,
    NextTrack,
    PreviousTrack,
    SeekTo(f32),
}
