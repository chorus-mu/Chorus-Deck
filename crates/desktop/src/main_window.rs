use std::time::Duration;
use core_shared::{CanvasState, RuntimeBridge};
use gpui::prelude::*;
use gpui::{
    div, px, rgba, App, Context, IntoElement, MouseButton,
    ParentElement, Render, Styled, Window, WindowBackgroundAppearance,
    WindowBounds, WindowOptions, Bounds, Point, size,
};

pub struct ChorusDeckMainWindow {
    bridge: RuntimeBridge,
    state: CanvasState,
    active_tab: Tab,
    pulse_intensity: f32,
    _pulse_color_hex: u32,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Tab {
    NowPlaying,
    Lyrics,
    Queue,
}

impl ChorusDeckMainWindow {
    pub fn new(bridge: RuntimeBridge, cx: &mut Context<Self>) -> Self {
        let initial_state = bridge.get_state();
        let view = Self {
            bridge: bridge.clone(),
            state: initial_state,
            active_tab: Tab::NowPlaying,
            pulse_intensity: 0.0,
            _pulse_color_hex: 0x38bdf8,
        };

        let mut state_rx = bridge.state_rx.clone();
        cx.spawn(async move |this, cx| {
            while state_rx.changed().await.is_ok() {
                let latest = state_rx.borrow().clone();
                let update_res = this.update(cx, |view, cx| {
                    view.state = latest;
                    cx.notify();
                });
                if update_res.is_err() {
                    break;
                }
            }
        })
        .detach();

        cx.spawn(async move |this, cx| {
            loop {
                cx.background_executor().timer(Duration::from_millis(8)).await;
                let update_res = this.update(cx, |view, cx| {
                    if view.pulse_intensity > 0.01 {
                        view.pulse_intensity *= 0.94;
                    }
                    if view.state.is_playing {
                        cx.notify();
                    }
                });
                if update_res.is_err() {
                    break;
                }
            }
        })
        .detach();

        view
    }

    fn toggle_play_pause(&mut self, cx: &mut Context<Self>) {
        let new_play_state = !self.state.is_playing;
        self.bridge.update_state(|s| {
            s.is_playing = new_play_state;
        });
        self.bridge.clock.set_playing(new_play_state);
        let _ = self.bridge.send_action(core_shared::CanvasAction::TogglePlayPause);
        self.state.is_playing = new_play_state;
        cx.notify();
    }

    fn next_track(&mut self, _cx: &mut Context<Self>) {
        let _ = self.bridge.send_action(core_shared::CanvasAction::NextTrack);
    }

    fn previous_track(&mut self, _cx: &mut Context<Self>) {
        let _ = self.bridge.send_action(core_shared::CanvasAction::PreviousTrack);
    }
}

impl Render for ChorusDeckMainWindow {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let state = &self.state;
        let live_pos = if state.is_playing {
            self.bridge.clock.position_secs().max(state.playback_position_secs)
        } else {
            state.playback_position_secs
        };

        let duration = state.duration_secs.max(1.0);
        let progress_pct = ((live_pos / duration).clamp(0.0, 1.0) * 100.0) as u32;

        let cur_mins = (live_pos as u32) / 60;
        let cur_secs = (live_pos as u32) % 60;
        let dur_mins = (duration as u32) / 60;
        let dur_secs = (duration as u32) % 60;

        div()
            .size_full()
            .flex()
            .flex_col()
            .bg(rgba(0x09070fff))
            .text_color(rgba(0xf8fafcff))
            .child(
                div()
                    .h(px(48.0))
                    .w_full()
                    .flex()
                    .items_center()
                    .justify_between()
                    .px_6()
                    .bg(rgba(0x0f0b1aee))
                    .border_b_1()
                    .border_color(rgba(0x1e1832ff))
                    .child(
                        div()
                            .flex()
                            .items_center()
                            .gap_3()
                            .child(
                                div()
                                    .text_sm()
                                    .font_weight(gpui::FontWeight::BOLD)
                                    .text_color(rgba(0xa855f7ff))
                                    .child("⚡ CHORUS DECK"),
                            )
                            .child(
                                div()
                                    .px_2()
                                    .py_0p5()
                                    .rounded_md()
                                    .bg(rgba(0x38bdf822))
                                    .border_1()
                                    .border_color(rgba(0x38bdf866))
                                    .text_xs()
                                    .font_weight(gpui::FontWeight::SEMIBOLD)
                                    .text_color(rgba(0x38bdf8ff))
                                    .child("120 FPS NATIVE GPUI"),
                            ),
                    )
                    .child(
                        div()
                            .flex()
                            .items_center()
                            .gap_4()
                            .child(
                                div()
                                    .text_xs()
                                    .font_weight(gpui::FontWeight::SEMIBOLD)
                                    .text_color(if self.active_tab == Tab::NowPlaying { rgba(0xf8fafcff) } else { rgba(0x94a3b8aa) })
                                    .cursor_pointer()
                                    .child("Now Playing"),
                            )
                            .child(
                                div()
                                    .text_xs()
                                    .font_weight(gpui::FontWeight::SEMIBOLD)
                                    .text_color(if self.active_tab == Tab::Lyrics { rgba(0xf8fafcff) } else { rgba(0x94a3b8aa) })
                                    .cursor_pointer()
                                    .child("Lyrics"),
                            )
                            .child(
                                div()
                                    .text_xs()
                                    .font_weight(gpui::FontWeight::SEMIBOLD)
                                    .text_color(if self.active_tab == Tab::Queue { rgba(0xf8fafcff) } else { rgba(0x94a3b8aa) })
                                    .cursor_pointer()
                                    .child("Queue"),
                            ),
                    )
                    .child(
                        div()
                            .flex()
                            .items_center()
                            .gap_2()
                            .child(
                                div()
                                    .size(px(12.0))
                                    .rounded_full()
                                    .bg(rgba(0xef4444ff))
                                    .cursor_pointer(),
                            )
                            .child(
                                div()
                                    .size(px(12.0))
                                    .rounded_full()
                                    .bg(rgba(0xfacc15ff)) // Minimize (Yellow)
                                    .cursor_pointer(),
                            )
                            .child(
                                div()
                                    .size(px(12.0))
                                    .rounded_full()
                                    .bg(rgba(0x22c55eff))
                                    .cursor_pointer(),
                            ),
                    ),
            )
            .child(
                div()
                    .flex_1()
                    .w_full()
                    .flex()
                    .p_8()
                    .gap_8()
                    .child(
                        div()
                            .w(px(380.0))
                            .flex()
                            .flex_col()
                            .items_center()
                            .justify_center()
                            .gap_6()
                            .child(
                                div()
                                    .size(px(260.0))
                                    .rounded_2xl()
                                    .bg(rgba(0x18122bee))
                                    .border_1()
                                    .border_color(rgba(0xa855f755))
                                    .flex()
                                    .items_center()
                                    .justify_center()
                                    .child(
                                        div()
                                            .text_3xl()
                                            .child("🎵"),
                                    ),
                            )
                            .child(
                                div()
                                    .flex()
                                    .flex_col()
                                    .items_center()
                                    .gap_1()
                                    .child(
                                        div()
                                            .text_xl()
                                            .font_weight(gpui::FontWeight::BOLD)
                                            .text_color(rgba(0xffffffff))
                                            .child(state.track_title.clone()),
                                    )
                                    .child(
                                        div()
                                            .text_sm()
                                            .text_color(rgba(0x94a3b8ff))
                                            .child(state.artist_name.clone()),
                                    )
                                    .child(
                                        div()
                                            .mt_2()
                                            .px_2p5()
                                            .py_0p5()
                                            .rounded_full()
                                            .bg(rgba(0x10b98122))
                                            .border_1()
                                            .border_color(rgba(0x10b98166))
                                            .text_xs()
                                            .font_weight(gpui::FontWeight::BOLD)
                                            .text_color(rgba(0x34d399ff))
                                            .child("✦ LOSSLESS 24-BIT / OPUS 251"),
                                    ),
                            ),
                    )
                    .child(
                        div()
                            .flex_1()
                            .h_full()
                            .flex()
                            .flex_col()
                            .justify_center()
                            .px_6()
                            .gap_4()
                            .child(
                                div()
                                    .text_sm()
                                    .font_weight(gpui::FontWeight::BOLD)
                                    .text_color(rgba(0xa855f7bb))
                                    .child("LIVE SYNCHRONIZED LYRICS"),
                            )
                            .child(
                                if let Some(ref lyric) = state.current_lyric_line {
                                    div()
                                        .text_2xl()
                                        .font_weight(gpui::FontWeight::BOLD)
                                        .text_color(rgba(0xf8fafcff))
                                        .child(lyric.clone())
                                } else {
                                    div()
                                        .text_lg()
                                        .text_color(rgba(0x64748baa))
                                        .child("Playback streams purely in-memory with sub-millisecond precision...")
                                },
                            )
                            .child(
                                div()
                                    .text_sm()
                                    .text_color(rgba(0x475569ff))
                                    .child("Zero disk downloads • Sample-accurate DAC sync • 120 FPS native compositor"),
                            ),
                    ),
            )
            .child(
                div()
                    .h(px(96.0))
                    .w_full()
                    .flex()
                    .flex_col()
                    .justify_center()
                    .px_8()
                    .bg(rgba(0x0c0817ff))
                    .border_t_1()
                    .border_color(rgba(0x1e1832ff))
                    .gap_3()
                    .child(
                        div()
                            .flex()
                            .items_center()
                            .gap_4()
                            .child(
                                div()
                                    .text_xs()
                                    .text_color(rgba(0x94a3b8ff))
                                    .child(format!("{:02}:{:02}", cur_mins, cur_secs)),
                            )
                            .child(
                                div()
                                    .flex_1()
                                    .h(px(6.0))
                                    .rounded_full()
                                    .bg(rgba(0x1e293bff))
                                    .child(
                                        div()
                                            .h_full()
                                            .w(gpui::relative((progress_pct as f32 / 100.0).clamp(0.005, 1.0)))
                                            .rounded_full()
                                            .bg(rgba(0xa855f7ff)),
                                    ),
                            )
                            .child(
                                div()
                                    .text_xs()
                                    .text_color(rgba(0x94a3b8ff))
                                    .child(format!("{:02}:{:02}", dur_mins, dur_secs)),
                            ),
                    )
                    .child(
                        div()
                            .flex()
                            .items_center()
                            .justify_between()
                            .child(
                                div()
                                    .text_xs()
                                    .text_color(rgba(0x64748bff))
                                    .child("Volume: 85%"),
                            )
                            .child(
                                div()
                                    .flex()
                                    .items_center()
                                    .gap_6()
                                    .child(
                                        div()
                                            .text_lg()
                                            .cursor_pointer()
                                            .on_mouse_down(MouseButton::Left, cx.listener(|this, _window, _event, cx| this.previous_track(cx)))
                                            .child("⏮"),
                                    )
                                    .child(
                                        div()
                                            .size(px(38.0))
                                            .rounded_full()
                                            .bg(rgba(0xa855f7ff))
                                            .flex()
                                            .items_center()
                                            .justify_center()
                                            .cursor_pointer()
                                            .text_color(rgba(0xffffffff))
                                            .on_mouse_down(MouseButton::Left, cx.listener(|this, _window, _event, cx| this.toggle_play_pause(cx)))
                                            .child(if state.is_playing { "❚❚" } else { "▶" }),
                                    )
                                    .child(
                                        div()
                                            .text_lg()
                                            .cursor_pointer()
                                            .on_mouse_down(MouseButton::Left, cx.listener(|this, _window, _event, cx| this.next_track(cx)))
                                            .child("⏭"),
                                    ),
                            )
                            .child(
                                div()
                                    .text_xs()
                                    .text_color(rgba(0x38bdf8ff))
                                    .child("120 Hz Hardware Vsync"),
                            ),
                    ),
            )
    }
}

pub fn launch_main_window(bridge: RuntimeBridge) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    #[cfg(target_os = "windows")]
    let platform = std::rc::Rc::new(
        gpui_windows::WindowsPlatform::new(false)
            .expect("Failed to initialize Windows GPUI platform"),
    );
    let app = gpui::Application::with_platform(platform);

    app.run(move |cx: &mut App| {
        let initial_size = size(px(1020.0), px(640.0));
        let window_options = WindowOptions {
            window_bounds: Some(WindowBounds::Windowed(Bounds {
                origin: Point { x: px(140.0), y: px(100.0) },
                size: initial_size,
            })),
            titlebar: None,
            window_background: WindowBackgroundAppearance::Opaque,
            is_movable: true,
            is_resizable: true,
            ..Default::default()
        };

        let bridge_clone = bridge.clone();
        cx.open_window(window_options, move |_window, cx| {
            cx.new(|cx| ChorusDeckMainWindow::new(bridge_clone, cx))
        })
        .expect("Failed to open GPUI main window");
    });

    Ok(())
}
