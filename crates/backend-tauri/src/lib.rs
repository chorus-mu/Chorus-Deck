pub mod cache;
pub mod commands;
pub mod db;
pub mod smtc;
pub mod lyrics;

use commands::audio::AudioState;
use commands::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|_app, _argv, _cwd| {
            println!("[Tauri] Single instance triggered, focusing GPUI main window.");
        }))
        .setup(|app| {
            let handle = app.handle().clone();
            let state = AppState::new(&handle)
                .map_err(|e| format!("failed to initialise application state: {e}"))?;
            app.manage(state);
            app.manage(AudioState::default());

            let bridge = core_shared::RuntimeBridge::new();
            app.manage(bridge.clone());


            let progress_handle = handle.clone();
            let bridge_progress = bridge.clone();
            std::thread::spawn(move || {
                use tauri::Emitter;
                loop {
                    std::thread::sleep(std::time::Duration::from_millis(20));
                    let state = progress_handle.state::<AudioState>();
                    let Ok(guard) = state.player.try_lock() else {
                        continue;
                    };

                    let Some(player) = guard.as_ref() else {
                        continue;
                    };

                    let pos = player.sink.get_pos().as_secs_f32();
                    let duration = player.duration.unwrap_or(0.0);
                    let is_ended = if duration > 3.0 {
                        pos >= (duration - 0.4)
                            || (player.sink.empty() && (pos >= (duration - 4.0).max(1.0) || pos >= duration * 0.85))
                    } else {
                        player.sink.empty() && pos > 0.5
                    };

                    let is_paused = player.sink.is_paused();
                    bridge_progress.update_state(|s| {
                        s.is_playing = !is_paused && !is_ended;
                        s.playback_position_secs = pos;
                        if duration > 0.0 {
                            s.duration_secs = duration;
                        }
                    });

                    if is_ended {
                        if !player.ended_emitted.swap(true, std::sync::atomic::Ordering::SeqCst) {
                            println!("[progress_thread] Track playback finished (pos: {:.2}s / {:.2}s, empty: {})", pos, duration, player.sink.empty());
                            let _ = progress_handle.emit("playback-ended", ());
                        }
                    } else if !is_paused {
                        let _ = progress_handle.emit("playback-progress", pos);
                    }
                }
            });

            smtc::windows_smtc::init_smtc(&handle);

            let action_handle = handle.clone();
            let action_bridge = bridge.clone();
            let mut action_rx = bridge.subscribe_actions();
            std::thread::spawn(move || {
                use tauri::Emitter;
                while let Ok(action) = action_rx.blocking_recv() {
                    match action {
                        core_shared::CanvasAction::TogglePlayPause => {
                            let state = action_handle.state::<AudioState>();
                            let guard = state.player.lock();
                            if let Ok(guard) = guard {
                                if let Some(player) = guard.as_ref() {
                                    let will_play = player.sink.is_paused();
                                    if will_play {
                                        player.sink.play();
                                        let _ = action_handle.emit("mpris-play", ());
                                    } else {
                                        player.sink.pause();
                                        let _ = action_handle.emit("mpris-pause", ());
                                    }
                                    action_bridge.update_state(|s| {
                                        s.is_playing = will_play;
                                    });
                                }
                            }
                        }
                        core_shared::CanvasAction::NextTrack => {
                            let _ = action_handle.emit("mpris-next", ());
                        }
                        core_shared::CanvasAction::PreviousTrack => {
                            let _ = action_handle.emit("mpris-previous", ());
                        }
                        core_shared::CanvasAction::SeekTo(secs) => {
                            let state = action_handle.state::<AudioState>();
                            let guard = state.player.lock();
                            if let Ok(guard) = guard {
                                if let Some(player) = guard.as_ref() {
                                    let _ = player.sink.try_seek(std::time::Duration::from_secs_f32(secs));
                                }
                            }
                            let _ = action_handle.emit("mpris-seek", secs);
                        }
                        _ => {}
                    }
                }
            });

            if let Some(island) = app.get_webview_window("dynamic-island") {
                if let Ok(Some(monitor)) = island.current_monitor() {
                    let scale_factor = monitor.scale_factor();
                    let size = monitor.size();
                    let island_width = (500.0 * scale_factor) as i32;
                    let x = (size.width as i32 - island_width) / 2;
                    let y = 0;
                    let _ = island.set_position(tauri::PhysicalPosition::new(x, y));
                    let _ = island.show();
                }
            }

            use tauri::menu::{Menu, MenuItem};
            use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show Chorus Deck", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::with_id("main-tray")
                .tooltip("Chorus Deck")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        println!("[Tauri] Tray show requested for GPUI main window");
                    }
                    _ => {}
                })
                .on_tray_icon_event(|_tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        println!("[Tauri] Tray icon clicked for GPUI main window");
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if window.label() == "lyric" {
                    if let Some(main) = window.app_handle().get_webview_window("main") {
                        use tauri::Emitter;
                        let _ = main.emit("lyric-window-closed", ());
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::window::minimize_window,
            commands::window::maximize_window,
            commands::window::close_window,
            commands::window::quit_app,
            commands::window::restart,
            commands::window::restore_window,
            commands::window::resize_window,
            commands::window::get_platform,
            commands::system::drag_start,
            commands::window::open_lyric,
            commands::media::send_lyric,
            commands::media::tray_lyric_update,
            commands::media::cache_lyric,
            commands::media::get_cached_lyric,
            commands::media::clear_lyric_cache,
            commands::media::clear_lyrics_cache,
            commands::media::get_lyrics,
            commands::window::update_current_song,
            commands::window::update_play_state,
            commands::window::set_content_zoom,
            commands::window::get_content_zoom,
            commands::window::toggle_fullscreen,
            commands::window::is_fullscreen,
            commands::window::launch_performance_window,
            commands::window::launch_dynamic_island,
            commands::store::get_store_value,
            commands::store::set_store_value,
            commands::store::get_disk_cache_config,
            commands::store::set_disk_cache_config,
            commands::store::get_disk_cache_stats,
            commands::store::clear_disk_cache,
            commands::store::switch_disk_cache_directory,
            commands::db::get_track,
            commands::db::get_liked_tracks,
            commands::db::get_liked_tracks_full,
            commands::db::get_recently_played_full,
            commands::db::add_liked_track,
            commands::db::add_disliked_track,
            commands::db::track_played,
            commands::db::store_playlist,
            commands::db::add_track_to_playlist,
            commands::db::remove_track_from_playlist,
            commands::db::get_tracks_in_playlist,
            commands::db::get_all_playlists,
            commands::db::save_local_music,
            commands::db::get_all_local_music,
            commands::db::delete_local_music,
            commands::db::clear_local_music,
            commands::db::follow_artist,
            commands::db::unfollow_artist,
            commands::db::get_followed_artists,
            commands::db::get_top_50_tracks,
            commands::db::export_user_data,
            commands::db::import_playlist,
            commands::media::unblock_music,
            commands::media::scan_local_music,
            commands::media::scan_local_music_with_stats,
            commands::media::parse_local_music_metadata,
            commands::media::check_file_exists,
            commands::system::open_directory,
            commands::system::select_directory,
            commands::system::select_file,
            commands::system::save_file,
            commands::system::show_notification,
            commands::system::change_language,
            commands::system::get_system_accent_color,
            commands::system::get_system_fonts,
            commands::integrations::app_update_get_state,
            commands::integrations::app_update_check,
            commands::integrations::app_update_download,
            commands::integrations::app_update_quit_and_install,
            commands::integrations::app_update_open_release_page,
            commands::integrations::ytm_request,
            commands::integrations::ytm_validate_stream,
            commands::integrations::spotify_login,
            commands::integrations::spotify_exchange_token,
            commands::integrations::spotify_fetch_playlists,
            commands::integrations::spotify_fetch_playlist_tracks,
            commands::integrations::parse_playlist_url,
            commands::discord::update_discord_presence,
            commands::discord::clear_discord_presence,
            commands::discord::discord_logout,
            commands::discord::discord_webview_login,
            commands::discord::discord_refresh_token,
            commands::discord_gateway::discord_gateway_status,
            commands::audio::audio_play,
            commands::audio::audio_pause,
            commands::audio::audio_resume,
            commands::audio::audio_stop,
            commands::audio::audio_set_volume,
            commands::audio::audio_seek,
            commands::audio::audio_get_time,
            commands::audio::audio_get_duration,
            commands::audio::audio_set_eq_bypass,
            commands::audio::audio_set_eq_band,
            commands::audio::audio_set_playback_rate,
            commands::audio::audio_clear_cache,
            commands::audio::audio_prewarm_stream,
            commands::lyrics::fetch_best_lyrics,
            commands::lossless::lossless_resolve_track,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Chorus Deck");
}
