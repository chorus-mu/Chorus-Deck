pub mod canvas_view;
pub mod dynamic_island;
pub mod main_window;

use core_shared::RuntimeBridge;
use gpui::{
    size, px, App, AppContext, Bounds, Point, WindowBackgroundAppearance,
    WindowBounds, WindowOptions,
};
pub use canvas_view::PerformanceCanvasView;
pub use dynamic_island::{DynamicIslandWindow, launch_dynamic_island, IslandState};
pub use main_window::{ChorusDeckMainWindow, launch_main_window, Tab};

pub fn launch_desktop(bridge: RuntimeBridge) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    #[cfg(target_os = "windows")]
    let platform = std::rc::Rc::new(
        gpui_windows::WindowsPlatform::new(false)
            .expect("Failed to initialize Windows GPUI platform"),
    );
    let app = gpui::Application::with_platform(platform);

    app.run(move |cx: &mut App| {
        // The primary application window (navigation, search, player, library, settings)
        // is the full Vue 3 / Tauri desktop application.
        // GPUI handles the ultra-low latency, hardware-accelerated Dynamic Island notch overlay.

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
        let island_options = WindowOptions {
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
        if let Err(e) = cx.open_window(island_options, move |_window, cx| {
            cx.new(|cx| DynamicIslandWindow::new(bridge_clone, cx))
        }) {
            eprintln!("[GPUI Desktop] Failed to open dynamic island window: {e:?}");
        }
    });

    Ok(())
}

pub fn launch_canvas_runtime(bridge: RuntimeBridge) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    #[cfg(target_os = "windows")]
    let platform = std::rc::Rc::new(
        gpui_windows::WindowsPlatform::new(false)
            .expect("Failed to initialize Windows GPUI platform"),
    );
    let app = gpui::Application::with_platform(platform);

    app.run(move |cx: &mut App| {
        let initial_bounds = WindowBounds::Windowed(Bounds {
            origin: Point {
                x: px(120.0),
                y: px(120.0),
            },
            size: size(px(460.0), px(220.0)),
        });

        let window_options = WindowOptions {
            window_bounds: Some(initial_bounds),
            titlebar: None,
            window_background: WindowBackgroundAppearance::Transparent,
            is_movable: true,
            is_resizable: true,
            ..Default::default()
        };

        let bridge_clone = bridge.clone();
        if let Err(e) = cx.open_window(window_options, move |_window, cx| {
            cx.new(|cx| PerformanceCanvasView::new(bridge_clone, cx))
        }) {
            log::error!("Failed to open GPUI performance window: {e:?}");
        }
    });

    Ok(())
}
