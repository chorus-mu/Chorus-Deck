use std::time::Duration;
use core_shared::{CanvasAction, CanvasState, RuntimeBridge};
use gpui::prelude::*;
use gpui::{
    div, px, rgba, App, Context, IntoElement, MouseButton,
    ParentElement, Render, Styled, Window, WindowBackgroundAppearance,
    WindowBounds, WindowOptions, Bounds, Point, size,
};

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum IslandState {
    Hidden,
    Playing,
    Expanded,
}

pub struct DynamicIslandWindow {
    bridge: RuntimeBridge,
    state: CanvasState,
    island_state: IslandState,
    wave_phase: f32,
    pulse_intensity: f32,
}

impl DynamicIslandWindow {
    pub fn new(bridge: RuntimeBridge, cx: &mut Context<Self>) -> Self {
        let initial_state = bridge.get_state();
        let view = Self {
            bridge: bridge.clone(),
            state: initial_state,
            island_state: IslandState::Playing,
            wave_phase: 0.0,
            pulse_intensity: 0.0,
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

        let mut action_rx = bridge.subscribe_actions();
        cx.spawn(async move |this, cx| {
            while let Ok(action) = action_rx.recv().await {
                let update_res = this.update(cx, |view, cx| {
                    if let CanvasAction::TriggerVisualPulse { intensity, .. } = action {
                        view.pulse_intensity = intensity.clamp(0.0, 1.0);
                        cx.notify();
                    }
                });
                if update_res.is_err() {
                    break;
                }
            }
        })
        .detach();

        // 120 FPS animation loop for wave phase and pulse decay
        cx.spawn(async move |this, cx| {
            loop {
                cx.background_executor().timer(Duration::from_millis(8)).await;
                let update_res = this.update(cx, |view, cx| {
                    view.wave_phase += 0.05;
                    if view.pulse_intensity > 0.01 {
                        view.pulse_intensity *= 0.94;
                    }
                    if view.state.is_playing || view.pulse_intensity > 0.01 {
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
        let new_state = !self.state.is_playing;
        self.bridge.update_state(|s| {
            s.is_playing = new_state;
        });
        self.bridge.clock.set_playing(new_state);
        let _ = self.bridge.send_action(core_shared::CanvasAction::TogglePlayPause);
        self.state.is_playing = new_state;
        cx.notify();
    }

    fn set_state(&mut self, state: IslandState, cx: &mut Context<Self>) {
        self.island_state = state;
        cx.notify();
    }
}

impl Render for DynamicIslandWindow {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let state = &self.state;
        let live_pos = if state.is_playing {
            self.bridge.clock.position_secs().max(state.playback_position_secs)
        } else {
            state.playback_position_secs
        };

        let progress_ratio = if state.duration_secs > 0.0 {
            (live_pos / state.duration_secs).clamp(0.0, 1.0)
        } else {
            0.0
        };

        let cur_m = (live_pos / 60.0).floor() as u32;
        let cur_s = (live_pos % 60.0).floor() as u32;
        let dur_m = (state.duration_secs / 60.0).floor() as u32;
        let dur_s = (state.duration_secs % 60.0).floor() as u32;

        let cur_time_str = format!("{cur_m:02}:{cur_s:02}");
        let dur_time_str = format!("{dur_m:02}:{dur_s:02}");

        let (card_w, card_h) = match self.island_state {
            IslandState::Hidden => (px(140.0), px(12.0)),
            IslandState::Playing => (px(220.0), px(36.0)),
            IslandState::Expanded => (px(360.0), px(124.0)),
        };

        div()
            .size_full()
            .flex()
            .justify_center()
            .items_start()
            .pt(px(0.0))
            .bg(rgba(0x00000000))
            .child(
                div()
                    .w(card_w)
                    .h(card_h)
                    .bg(rgba(0x07090ef8))
                    .rounded_b(px(18.0))
                    .border_b_1()
                    .border_x_1()
                    .border_color(rgba(0xffffff22))
                    .shadow_lg()
                    .overflow_hidden()
                    .cursor_pointer()
                    .on_mouse_down(MouseButton::Left, cx.listener(|this, _window, _event, cx| {
                        let next = match this.island_state {
                            IslandState::Expanded => IslandState::Playing,
                            _ => IslandState::Expanded,
                        };
                        this.set_state(next, cx);
                    }))
                    .on_mouse_exit(cx.listener(|this, _window, _event, cx| {
                        this.set_state(IslandState::Playing, cx);
                    }))
                    .child(match self.island_state {
                        IslandState::Hidden => div()
                            .size_full()
                            .flex()
                            .items_center()
                            .justify_center()
                            .text_xs()
                            .text_color(rgba(0x94a3b866))
                            .child("•••"),

                        IslandState::Playing => div()
                            .size_full()
                            .flex()
                            .items_center()
                            .justify_between()
                            .px(px(14.0))
                            .child(
                                div()
                                    .flex()
                                    .items_center()
                                    .gap(px(8.0))
                                    .child(
                                        div()
                                            .size(px(26.0))
                                            .rounded_full()
                                            .bg(rgba(0xa855f7ff))
                                            .flex()
                                            .items_center()
                                            .justify_center()
                                            .text_xs()
                                            .text_color(rgba(0xffffffff))
                                            .child(if state.is_playing { "♫" } else { "❚❚" }),
                                    )
                                    .child(
                                        div()
                                            .text_xs()
                                            .font_weight(gpui::FontWeight::SEMIBOLD)
                                            .text_color(rgba(0xffffffff))
                                            .child(if state.track_title.is_empty() {
                                                "Chorus Deck".to_string()
                                            } else {
                                                state.track_title.chars().take(12).collect::<String>()
                                            }),
                                    ),
                            )
                            .child(
                                div()
                                    .flex()
                                    .items_end()
                                    .gap(px(3.0))
                                    .h(px(14.0))
                                    .children((1..=4).map(|i| {
                                        let factor = ((self.wave_phase + (i as f32) * 1.2).sin() + 1.0) * 0.5;
                                        let h = if state.is_playing { 4.0 + factor * 10.0 } else { 3.0 };
                                        div()
                                            .w(px(2.5))
                                            .h(px(h))
                                            .rounded_full()
                                            .bg(rgba(0x38bdf8ff))
                                    })),
                            ),

                        IslandState::Expanded => div()
                            .size_full()
                            .flex()
                            .flex_col()
                            .justify_between()
                            .p(px(12.0))
                            .child(
                                // Top row: Artwork, track metadata, and quick controls
                                div()
                                    .flex()
                                    .items_center()
                                    .justify_between()
                                    .w_full()
                                    .child(
                                        div()
                                            .flex()
                                            .items_center()
                                            .gap(px(10.0))
                                            .child(
                                                div()
                                                    .size(px(40.0))
                                                    .rounded(px(10.0))
                                                    .bg(rgba(0x3b82f6ff))
                                                    .flex()
                                                    .items_center()
                                                    .justify_center()
                                                    .text_sm()
                                                    .text_color(rgba(0xffffffff))
                                                    .child("♫"),
                                            )
                                            .child(
                                                div()
                                                    .flex()
                                                    .flex_col()
                                                    .child(
                                                        div()
                                                            .text_sm()
                                                            .font_weight(gpui::FontWeight::BOLD)
                                                            .text_color(rgba(0xffffffff))
                                                            .child(if state.track_title.is_empty() {
                                                                "Chorus Deck".to_string()
                                                            } else {
                                                                state.track_title.clone()
                                                            }),
                                                    )
                                                    .child(
                                                        div()
                                                            .text_xs()
                                                            .text_color(rgba(0x94a3b8ff))
                                                            .child(if state.artist_name.is_empty() {
                                                                "Ready to Play".to_string()
                                                            } else {
                                                                state.artist_name.clone()
                                                            }),
                                                    ),
                                            ),
                                    )
                                    .child(
                                        div()
                                            .flex()
                                            .items_center()
                                            .gap(px(8.0))
                                            .child(
                                                div()
                                                    .size(px(32.0))
                                                    .rounded_full()
                                                    .bg(rgba(0xa855f7ff))
                                                    .flex()
                                                    .items_center()
                                                    .justify_center()
                                                    .cursor_pointer()
                                                    .text_color(rgba(0xffffffff))
                                                    .on_mouse_down(MouseButton::Left, cx.listener(|this, _window, _event, cx| {
                                                        this.toggle_play_pause(cx);
                                                    }))
                                                    .child(if state.is_playing { "❚❚" } else { "▶" }),
                                            ),
                                    ),
                            )
                            .child(
                                // Bottom row: Timestamps & 120Hz waveform scrubber bar
                                div()
                                    .flex()
                                    .flex_col()
                                    .gap(px(4.0))
                                    .w_full()
                                    .child(
                                        div()
                                            .w_full()
                                            .h(px(5.0))
                                            .bg(rgba(0x334155aa))
                                            .rounded_full()
                                            .overflow_hidden()
                                            .child(
                                                div()
                                                    .h_full()
                                                    .w(px(progress_ratio * 336.0))
                                                    .bg(rgba(0x38bdf8ff))
                                                    .rounded_full(),
                                            ),
                                    )
                                    .child(
                                        div()
                                            .flex()
                                            .justify_between()
                                            .text_xs()
                                            .text_color(rgba(0x94a3b8ff))
                                            .child(cur_time_str)
                                            .child(dur_time_str),
                                    ),
                            ),
                    }),
            )
    }
}

pub fn launch_dynamic_island(bridge: RuntimeBridge) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    #[cfg(target_os = "windows")]
    let platform = std::rc::Rc::new(
        gpui_windows::WindowsPlatform::new(false)
            .expect("Failed to initialize Windows GPUI platform for Dynamic Island"),
    );
    let app = gpui::Application::with_platform(platform);

    app.run(move |cx: &mut App| {
        #[cfg(windows)]
        let screen_w = {
            use windows::Win32::UI::WindowsAndMessaging::{GetSystemMetrics, SM_CXSCREEN};
            unsafe { GetSystemMetrics(SM_CXSCREEN) as f32 }
        };
        #[cfg(not(windows))]
        let screen_w = 1920.0;

        let island_width = 380.0;
        let island_height = 140.0;
        let origin_x = ((screen_w - island_width) / 2.0).max(0.0);

        let island_size = size(px(island_width), px(island_height));
        let window_options = WindowOptions {
            window_bounds: Some(WindowBounds::Windowed(Bounds {
                origin: Point { x: px(origin_x), y: px(0.0) },
                size: island_size,
            })),
            titlebar: None,
            kind: gpui::WindowKind::PopUp,
            window_background: WindowBackgroundAppearance::Transparent,
            is_movable: false,
            is_resizable: false,
            focus: false,
            show: true,
            ..Default::default()
        };

        let bridge_clone = bridge.clone();
        cx.open_window(window_options, move |_window, cx| {
            cx.new(|cx| DynamicIslandWindow::new(bridge_clone, cx))
        })
        .expect("Failed to open GPUI Dynamic Island window");
    });

    Ok(())
}
