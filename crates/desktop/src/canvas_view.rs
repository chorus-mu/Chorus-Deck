use std::time::Duration;
use core_shared::{CanvasAction, CanvasState, RuntimeBridge};
use gpui::{
    div, px, rgba, Context, IntoElement, ParentElement,
    Render, Styled, Window,
};

pub struct PerformanceCanvasView {
    bridge: RuntimeBridge,
    current_state: CanvasState,
    pulse_intensity: f32,
    pulse_color_hex: u32,
}

impl PerformanceCanvasView {
    pub fn new(bridge: RuntimeBridge, cx: &mut Context<Self>) -> Self {
        let initial_state = bridge.get_state();
        let view = Self {
            bridge: bridge.clone(),
            current_state: initial_state,
            pulse_intensity: 0.0,
            pulse_color_hex: 0x38bdf8,
        };

        let mut state_rx = bridge.state_rx.clone();
        cx.spawn(async move |this, cx| {
            while state_rx.changed().await.is_ok() {
                let latest = state_rx.borrow().clone();
                let update_res = this.update(cx, |view, cx| {
                    view.current_state = latest;
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
                    match action {
                        CanvasAction::TriggerVisualPulse { intensity, color_hex } => {
                            view.pulse_intensity = intensity.clamp(0.0, 1.0);
                            view.pulse_color_hex = color_hex;
                            cx.notify();
                        }
                        CanvasAction::SetFps(_) => {}
                        CanvasAction::SetPosition { .. } | CanvasAction::ToggleVisibility | CanvasAction::Shutdown => {}
                        _ => {}
                    }
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
                    if view.current_state.is_playing {
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
}

impl Render for PerformanceCanvasView {
    fn render(&mut self, _window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        let state = &self.current_state;
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

        let r = ((self.pulse_color_hex >> 16) & 0xFF) as u8;
        let g = ((self.pulse_color_hex >> 8) & 0xFF) as u8;
        let b = (self.pulse_color_hex & 0xFF) as u8;
        let pulse_rgba = (u32::from(r) << 24) | (u32::from(g) << 16) | (u32::from(b) << 8) | ((self.pulse_intensity * 255.0) as u32);

        div()
            .size_full()
            .flex()
            .flex_col()
            .items_center()
            .justify_center()
            .bg(rgba(0x0f172aee))
            .rounded_2xl()
            .border_2()
            .border_color(rgba(if self.pulse_intensity > 0.05 { pulse_rgba } else { 0x38bdf888 }))
            .p_6()
            .gap_4()
            .child(
                div()
                    .flex()
                    .items_center()
                    .justify_between()
                    .w_full()
                    .child(
                        div()
                            .text_xs()
                            .font_weight(gpui::FontWeight::BOLD)
                            .text_color(rgba(0x38bdf8ff))
                            .child("⚡ CHORUS DECK • 120 FPS GPUI CANVAS"),
                    )
                    .child(
                        div()
                            .text_xs()
                            .text_color(if state.is_playing { rgba(0x4ade80ff) } else { rgba(0x94a3b8ff) })
                            .child(if state.is_playing { "● PLAYING" } else { "❚❚ PAUSED" }),
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
                            .text_lg()
                            .font_weight(gpui::FontWeight::BOLD)
                            .text_color(rgba(0xf8fafcff))
                            .child(state.track_title.clone()),
                    )
                    .child(
                        div()
                            .text_sm()
                            .text_color(rgba(0x94a3b8ff))
                            .child(format!("{} • {:.1}s", state.artist_name, live_pos)),
                    )
                    .child(
                        if let Some(ref lyric) = state.current_lyric_line {
                            div()
                                .text_sm()
                                .font_weight(gpui::FontWeight::SEMIBOLD)
                                .text_color(rgba(0xfacc15ff))
                                .child(format!("🎤 {}", lyric))
                        } else {
                            div()
                                .text_xs()
                                .text_color(rgba(0x64748bff))
                                .child("Synchronized across native thread boundary")
                        },
                    ),
            )
            .child(
                div()
                    .w(px(320.0))
                    .h(px(6.0))
                    .rounded_full()
                    .bg(rgba(0x334155ff))
                    .child(
                        div()
                            .h_full()
                            .w(px((progress_ratio * 320.0).max(4.0)))
                            .rounded_full()
                            .bg(rgba(0x38bdf8ff)),
                    ),
            )
    }
}
