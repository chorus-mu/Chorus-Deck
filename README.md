<div align="center">
  <img src="resources/logo.png" alt="Chorus Deck Logo" width="160" />
  
  # Chorus Deck

  <p>
    <strong>A next-generation, high-performance desktop music player.</strong><br>
    <em>Re-architected from the ground up for zero stutter, minimal memory footprint, and true native performance.</em>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue?style=flat-square" alt="Supported Platforms" />
    <img src="https://img.shields.io/badge/Architecture-Tauri%20v2%20%2B%20Rust-orange?style=flat-square" alt="Architecture" />
    <img src="https://img.shields.io/badge/Frontend-Vue%203%20%2B%20TypeScript-41B883?style=flat-square" alt="Frontend" />
    <img src="https://img.shields.io/badge/Status-Active%20Development-success?style=flat-square" alt="Status" />
  </p>
</div>

<hr />

## 📖 Overview

**Chorus Deck** is a native, ultra-responsive desktop music client. By offloading audio streaming, container decoding, and database caching to an asynchronous **Rust backend**, the UI stays silky smooth, lightweight, and responsive.

The result is a music player that feels instant, integrates deeply with your operating system, and operates with minimal memory and CPU overhead.

## 🛠️ Technologies & Architecture

- 🦀 **Rust & [Tauri v2](https://v2.tauri.app/):** The core engine. Drives OS IPC, low-latency concurrent HTTP chunk caching, and the native audio sink (`rodio`).
- ⚡ **[Vue 3](https://vuejs.org/) & [TypeScript](https://www.typescriptlang.org/):** Reactive, hardware-composited frontend UI with smooth layout animations.
- 🎨 **GPUI & Core Shared Crates:** High-performance native canvas rendering layer bridging rust-native graphics and audio clocks.
- 🗄️ **[SQLite](https://www.sqlite.org/):** WAL mode and memory-mapped caching for instant search and instant playback of pre-cached tracks.
- 🎛️ **Native DSP:** 10-band equalizer processing executed via Rust biquad filters, bypassing browser Web Audio overhead.
- 🍍 **[Pinia](https://pinia.vuejs.org/):** Modular state management for queue, player core, lyrics, and user preferences.

## ✨ Core Features

| Feature | Description |
| :--- | :--- |
| 🎵 **Unlimited Streaming** | High-fidelity streaming powered by YouTube Music with intelligent pre-buffering. |
| ⏱️ **Buffer-First Playback** | Deterministic lifecycle: shimmer buffer timeline, pre-roll validation, and zero sound leaks before playback. |
| 🎤 **Immersive Synced Lyrics** | Syllable & word-by-word synchronized lyrics, dynamic backlit line illumination, and Romaji transliteration. |
| 🌊 **Beat & Interlude Waveforms** | Animated audio waveforms for instrumental preambles, musical breaks, and outro finishes after vocals end. |
| 📑 **Docked & Fullscreen Views** | Switch effortlessly between a docked sidebar lyrics panel and an immersive fullscreen dynamic background. |
| 🎛️ **Native 10-Band EQ** | Built-in equalizer powered by Rust DSP with persistent presets and instant frequency tuning. |
| 🚀 **System Media Integration** | Native Windows SMTC & Linux MPRIS support, media key shortcuts, and system tray management. |
| 🎮 **Discord Rich Presence** | Live Discord presence displaying current track, artist, album artwork, and elapsed time. |
| 💾 **Smart Stream Caching** | Resilient chunk-based spooling ensures replay without re-downloading audio chunks. |

## 🚀 Getting Started

### 1. Prerequisites

- **[Node.js](https://nodejs.org/)** (v18 or higher)
- **[Rust](https://rustup.rs/)** (latest stable release)
- **OS build dependencies** (e.g. MSVC on Windows). Refer to the [Tauri v2 Prerequisites Guide](https://v2.tauri.app/start/prerequisites/).

### 2. Installation

```bash
git clone https://github.com/chorus-mu/Chorus-Deck.git
cd Chorus-Deck
npm install
```

### 3. Development

Run the frontend dev server along with the native Tauri desktop app:

```bash
npm run desktop
# or
npm run tauri:dev
```

To run only the web interface in Vite:

```bash
npm run dev
```

### 4. Production Build

Build the optimized desktop application binary:

```bash
npm run tauri:build
```

Compiled binaries and installers are output to `crates/backend-tauri/target/release/bundle/`.

## 📂 Project Structure

- **`crates/backend-tauri/`**: Tauri v2 backend, audio decoding pipeline, native commands, and OS integrations.
- **`crates/core-shared/`**: Shared state models, audio state bridge, and canvas state machines.
- **`crates/gpui-canvas/`**: GPU-accelerated canvas graphics experiments and native window rendering.
- **`src/renderer/`**: Vue 3 application components, player stores, views, and lyrics renderers.
- **`src/renderer/api/bridge.ts`**: Strictly-typed IPC bridge connecting Vue 3 with native Rust commands.

## 📄 License

This project is open-source and intended for educational and personal use.
