#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use core_shared::{CanvasAction, RuntimeBridge};

fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    env_logger::init();

    let bridge = RuntimeBridge::new();
    let bridge_clone = bridge.clone();
    std::thread::spawn(move || {
        let mut progress = 0.0f32;
        loop {
            std::thread::sleep(std::time::Duration::from_millis(50));
            progress += 0.05;
            if progress > 180.0 {
                progress = 0.0;
            }

            bridge_clone.update_state(|state| {
                state.is_playing = true;
                state.track_title = "Starboy".to_string();
                state.artist_name = "The Weeknd ft. Daft Punk".to_string();
                state.duration_secs = 230.0;
                state.playback_position_secs = progress;
                state.current_lyric_line = Some(format!("Look what you've done... ({:.1}s)", progress));
                state.frame_counter += 1;
            });

            if (progress * 10.0) as u32 % 40 == 0 {
                let _ = bridge_clone.send_action(CanvasAction::TriggerVisualPulse {
                    intensity: 1.0,
                    color_hex: 0x38bdf8,
                });
            }
        }
    });

    log::info!("Starting Chorus Deck GPUI Desktop (Main Window + Dynamic Island)...");
    desktop::launch_desktop(bridge)
}
