use crate::commands::stream_decoder::StreamDecoder;
use futures_util::StreamExt;
use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink, Source};
use std::collections::VecDeque;
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::PathBuf;
use std::sync::{Arc, Condvar, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter, Manager, State};
use sha2::{Digest, Sha256};

use crate::commands::eq::{EqCommand, EqSource, FREQUENCIES};
use std::sync::mpsc::Sender;

use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};

pub struct AudioPlayer {
    pub sink: Arc<Sink>,
    pub duration: Option<f32>,
    pub eq_tx: Option<Sender<EqCommand>>,
    stream: Option<Arc<StreamShared>>,
}

pub struct EqState {
    pub bypass: bool,
    pub gains: [f32; 10],
    pub playback_rate: f32,
}

impl Default for EqState {
    fn default() -> Self {
        Self {
            bypass: false,
            gains: [0.0; 10],
            playback_rate: 1.0,
        }
    }
}

impl AudioPlayer {
    pub fn new(handle: &OutputStreamHandle) -> Result<Self, String> {
        let sink = Sink::try_new(handle).map_err(|e| format!("Sink error: {}", e))?;
        Ok(Self {
            sink: Arc::new(sink),
            duration: None,
            eq_tx: None,
            stream: None,
        })
    }
}

pub struct AudioState {
    pub player: Mutex<Option<AudioPlayer>>,
    pub eq: Mutex<EqState>,
    pub current_session: Arc<AtomicU64>,
    pub stream_handle: Mutex<Option<OutputStreamHandle>>,
}

impl AudioState {
    pub fn lock_player(&self) -> std::sync::MutexGuard<'_, Option<AudioPlayer>> {
        match self.player.lock() {
            Ok(g) => g,
            Err(e) => e.into_inner(),
        }
    }

    pub fn lock_eq(&self) -> std::sync::MutexGuard<'_, EqState> {
        match self.eq.lock() {
            Ok(g) => g,
            Err(e) => e.into_inner(),
        }
    }

    pub fn get_or_init_handle(&self) -> Result<OutputStreamHandle, String> {
        let mut handle_lock = match self.stream_handle.lock() {
            Ok(g) => g,
            Err(e) => e.into_inner(),
        };
        if let Some(h) = handle_lock.as_ref() {
            return Ok(h.clone());
        }

        let (tx, rx) = std::sync::mpsc::channel();
        thread::spawn(move || match OutputStream::try_default() {
            Ok((_stream, handle)) => {
                let _ = tx.send(Ok(handle));
                loop {
                    thread::park();
                }
            }
            Err(e) => {
                let _ = tx.send(Err(format!("OutputStream error: {}", e)));
            }
        });

        let handle = rx.recv().map_err(|e| e.to_string())??;
        *handle_lock = Some(handle.clone());
        Ok(handle)
    }
}

impl Default for AudioState {
    fn default() -> Self {
        Self {
            player: Mutex::new(None),
            eq: Mutex::new(EqState::default()),
            current_session: Arc::new(AtomicU64::new(0)),
            stream_handle: Mutex::new(None),
        }
    }
}

const STREAM_BUFFER_LIMIT: usize = 32 * 1024 * 1024;
const INITIAL_PREBUFFER_BYTES: usize = 32 * 1024;
const FLAC_PREBUFFER_BYTES: usize = 32 * 1024;

pub fn get_audio_cache_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?
        .join("audio_cache");
    let _ = std::fs::create_dir_all(&dir);
    Ok(dir)
}

pub fn url_cache_hash(url: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(url.as_bytes());
    hex::encode(hasher.finalize())
}

struct StreamState {
    buf: VecDeque<u8>,
    buf_start: u64,
    eof: bool,
    error: Option<String>,
    total: Option<u64>,
    generation: u64,
    alive: bool,
    disk_written: u64,
}

struct StreamShared {
    state: Mutex<StreamState>,
    cond: Condvar,
    url: String,
    cookie: Option<String>,
    user_agent: Option<String>,
    part_path: Option<PathBuf>,
    final_path: Option<PathBuf>,
    url_hash: Option<String>,
    app_handle: Option<AppHandle>,
    is_buffering: Arc<AtomicBool>,
}

impl StreamShared {
    fn lock_state(&self) -> std::sync::MutexGuard<'_, StreamState> {
        match self.state.lock() {
            Ok(g) => g,
            Err(e) => e.into_inner(),
        }
    }
}

const DEFAULT_STREAM_USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

lazy_static::lazy_static! {
    static ref HTTP_CLIENT: reqwest::Client = reqwest::Client::builder()
        .tcp_nodelay(true)
        .tcp_keepalive(Some(std::time::Duration::from_secs(30)))
        .connect_timeout(std::time::Duration::from_secs(8))
        .pool_idle_timeout(Some(std::time::Duration::from_secs(30)))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());
}

fn abort_stream(shared: &StreamShared) {
    let mut s = shared.lock_state();
    s.alive = false;
    s.generation += 1;
    drop(s);
    shared.cond.notify_all();
}

fn stream_length(shared: &StreamShared) -> Option<u64> {
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(8);
    let mut s = shared.lock_state();

    while s.total.is_none() && !s.eof && s.error.is_none() && s.alive {
        let remaining = deadline.saturating_duration_since(std::time::Instant::now());
        if remaining.is_zero() {
            break;
        }
        let (guard, _) = match shared.cond.wait_timeout(s, remaining) {
            Ok(res) => res,
            Err(poisoned) => poisoned.into_inner(),
        };
        s = guard;
    }

    s.total
}

fn spawn_producer(shared: Arc<StreamShared>, generation: u64) {
    tauri::async_runtime::spawn(async move {
        let client = &*HTTP_CLIENT;
        let mut consecutive_disconnects = 0;

        let mut part_file: Option<std::fs::File> = if let Some(ref path) = shared.part_path {
            match std::fs::OpenOptions::new()
                .create(true)
                .write(true)
                .read(true)
                .open(path)
            {
                Ok(f) => Some(f),
                Err(e) => {
                    eprintln!("[spawn_producer] Could not open cache part file {:?}: {}", path, e);
                    None
                }
            }
        } else {
            None
        };

        loop {
            let (start, total) = {
                let s = shared.lock_state();
                if !s.alive || s.generation != generation {
                    return;
                }
                if s.eof {
                    return;
                }
                (s.buf_start + s.buf.len() as u64, s.total)
            };

            if total.map(|tot| start >= tot).unwrap_or(false) {
                let mut s = shared.lock_state();
                if s.alive && s.generation == generation {
                    s.eof = true;
                }
                drop(s);
                shared.cond.notify_all();
                finalize_cache_file(&shared);
                return;
            }

            let mut response = None;
            let mut last_error_msg = None;

            for attempt in 0..3 {
                {
                    let s = shared.lock_state();
                    if !s.alive || s.generation != generation {
                        return;
                    }
                }

                if attempt > 0 || consecutive_disconnects > 0 {
                    let delay = (100 * (1 << attempt)).min(1000);
                    tokio::time::sleep(std::time::Duration::from_millis(delay)).await;
                    let s = shared.lock_state();
                    if !s.alive || s.generation != generation {
                        return;
                    }
                }

                let mut req = client.get(&shared.url);
                if let Some(c) = &shared.cookie {
                    req = req.header(reqwest::header::COOKIE, c);
                }
                if let Some(ua) = &shared.user_agent {
                    req = req.header(reqwest::header::USER_AGENT, ua);
                }
                req = req.header(reqwest::header::ACCEPT, "*/*");
                req = req.header(reqwest::header::ACCEPT_ENCODING, "identity");
                req = req.header(reqwest::header::RANGE, format!("bytes={}-", start));

                if attempt > 0 || consecutive_disconnects > 0 {
                    req = req.header(reqwest::header::CONNECTION, "close");
                }

                match req.send().await {
                    Ok(r) => {
                        let status = r.status();
                        if status.is_success() {
                            response = Some(r);
                            consecutive_disconnects = 0;
                            break;
                        }

                        if status.as_u16() == 416 {
                            let mut s = shared.lock_state();
                            if s.alive && s.generation == generation {
                                s.eof = true;
                            }
                            drop(s);
                            shared.cond.notify_all();
                            finalize_cache_file(&shared);
                            return;
                        }

                        let msg = format!(
                            "Stream request failed with status {} (URL expired or rate limited)",
                            status
                        );
                        println!("[spawn_producer] Attempt {}/3: {}", attempt + 1, msg);
                        last_error_msg = Some(msg);

                        if status.as_u16() == 403 || status.as_u16() == 404 || status.as_u16() == 410 {
                            break;
                        }
                    }
                    Err(e) => {
                        let msg = format!("Request failed: {}", e);
                        println!("[spawn_producer] Attempt {}/3 network error: {}", attempt + 1, msg);
                        last_error_msg = Some(msg);
                    }
                }
            }

            let response = match response {
                Some(r) => r,
                None => {
                    let err = last_error_msg.unwrap_or_else(|| "All stream request attempts failed".to_string());
                    let mut s = shared.lock_state();
                    if s.alive && s.generation == generation {
                        s.error = Some(err);
                    }
                    drop(s);
                    shared.cond.notify_all();
                    return;
                }
            };

            let total = response
                .headers()
                .get(reqwest::header::CONTENT_RANGE)
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.rsplit('/').next())
                .and_then(|v| v.trim().parse::<u64>().ok())
                .or_else(|| response.content_length().map(|len| len + start));

            {
                let mut s = shared.lock_state();
                if s.alive && s.generation == generation && s.total.is_none() {
                    s.total = total;
                }
            }
            shared.cond.notify_all();

            let mut stream = response.bytes_stream();
            let mut read_error = false;

            while let Some(chunk) = stream.next().await {
                let chunk = match chunk {
                    Ok(c) => c,
                    Err(e) => {
                        println!("[spawn_producer] Stream read interrupted: {}. Resuming from byte offset...", e);
                        read_error = true;
                        consecutive_disconnects += 1;
                        break;
                    }
                };

                let chunk_len = chunk.len() as u64;

                if let Some(ref mut f) = part_file {
                    let s = shared.lock_state();
                    let current_stream_pos = s.buf_start + s.buf.len() as u64;
                    let disk_written = s.disk_written;
                    drop(s);

                    if current_stream_pos == disk_written {
                        if let Ok(_) = f.seek(SeekFrom::Start(disk_written)) {
                            if let Ok(_) = f.write_all(&chunk) {
                                let mut s = shared.lock_state();
                                s.disk_written += chunk_len;
                            }
                        }
                    }
                }

                let mut s = shared.lock_state();
                while s.buf.len() >= STREAM_BUFFER_LIMIT && s.alive && s.generation == generation {
                    s = match shared.cond.wait(s) {
                        Ok(guard) => guard,
                        Err(poisoned) => poisoned.into_inner(),
                    };
                }

                if !s.alive || s.generation != generation {
                    return;
                }

                s.buf.extend(chunk);
                let current_len = s.buf_start + s.buf.len() as u64;
                let reached_total = s.total.map_or(false, |tot| current_len >= tot);
                if reached_total {
                    s.eof = true;
                    drop(s);
                    shared.cond.notify_all();
                    finalize_cache_file(&shared);
                    return;
                }
                drop(s);
                shared.cond.notify_all();
            }

            if read_error {
                if consecutive_disconnects >= 5 {
                    let mut s = shared.lock_state();
                    if s.alive && s.generation == generation {
                        s.error = Some("Stream disconnected repeatedly (5 times)".to_string());
                    }
                    drop(s);
                    shared.cond.notify_all();
                    return;
                }
                continue;
            }

            let is_finished = {
                let s = shared.lock_state();
                let current_len = s.buf_start + s.buf.len() as u64;
                s.total.map_or(true, |tot| current_len >= tot)
            };

            if is_finished {
                let mut s = shared.lock_state();
                if s.alive && s.generation == generation {
                    s.eof = true;
                }
                drop(s);
                shared.cond.notify_all();
                finalize_cache_file(&shared);
                return;
            }
        }
    });
}

fn finalize_cache_file(shared: &StreamShared) {
    if let (Some(part_path), Some(final_path), Some(hash)) = (
        shared.part_path.as_ref(),
        shared.final_path.as_ref(),
        shared.url_hash.as_ref(),
    ) {
        let s = shared.lock_state();
        let total = s.total;
        let disk_written = s.disk_written;
        let is_complete = total.map(|t| disk_written >= t).unwrap_or(s.eof && disk_written > 0);
        drop(s);

        if is_complete && part_path.exists() {
            if let Ok(_) = std::fs::rename(part_path, final_path) {
                println!("[cache] Successfully cached full stream to {:?}", final_path);
                if let Some(app) = &shared.app_handle {
                    if let Some(state) = app.try_state::<crate::commands::AppState>() {
                        if let Ok(file_size) = std::fs::metadata(final_path).map(|m| m.len()) {
                            let now = std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .map(|d| d.as_secs() as i64)
                                .unwrap_or(0);
                            if let Ok(conn) = state.db.lock() {
                                let _ = crate::db::music_db::record_audio_cache_access(
                                    &conn,
                                    hash,
                                    file_size,
                                    now,
                                );
                            }
                        }
                    }
                }
            }
        }
    }
}

struct HttpStreamSource {
    shared: Arc<StreamShared>,
    pos: u64,
    disk_file: Option<std::fs::File>,
}

impl HttpStreamSource {
    fn start(
        url: String,
        cookie: Option<String>,
        user_agent: Option<String>,
        part_path: Option<PathBuf>,
        final_path: Option<PathBuf>,
        url_hash: Option<String>,
        app_handle: Option<AppHandle>,
    ) -> Self {
        let disk_file = if let Some(ref path) = part_path {
            std::fs::OpenOptions::new().read(true).open(path).ok()
        } else {
            None
        };

        let shared = Arc::new(StreamShared {
            state: Mutex::new(StreamState {
                buf: VecDeque::new(),
                buf_start: 0,
                eof: false,
                error: None,
                total: None,
                generation: 0,
                alive: true,
                disk_written: 0,
            }),
            cond: Condvar::new(),
            url,
            cookie,
            user_agent: Some(
                user_agent
                    .filter(|ua| !ua.trim().is_empty())
                    .unwrap_or_else(|| DEFAULT_STREAM_USER_AGENT.to_string()),
            ),
            part_path,
            final_path,
            url_hash,
            app_handle,
            is_buffering: Arc::new(AtomicBool::new(false)),
        });

        spawn_producer(shared.clone(), 0);

        Self {
            shared,
            pos: 0,
            disk_file,
        }
    }

    fn rebase(&self, target: u64) -> u64 {
        let mut s = self.shared.lock_state();
        s.buf.clear();
        s.buf_start = target;
        s.eof = false;
        s.error = None;
        s.generation += 1;
        s.generation
    }
}

impl Read for HttpStreamSource {
    fn read(&mut self, out: &mut [u8]) -> std::io::Result<usize> {
        if out.is_empty() {
            return Ok(0);
        }

        let mut s = self.shared.lock_state();

        loop {
            if !s.alive {
                if self.shared.is_buffering.swap(false, Ordering::SeqCst) {
                    if let Some(app) = &self.shared.app_handle {
                        let _ = app.emit("playback-buffering", false);
                    }
                }
                return Ok(0);
            }

            let end = s.buf_start + s.buf.len() as u64;
            if self.pos >= s.buf_start && self.pos < end {
                if self.shared.is_buffering.swap(false, Ordering::SeqCst) {
                    if let Some(app) = &self.shared.app_handle {
                        let _ = app.emit("playback-buffering", false);
                    }
                }
                let offset = (self.pos - s.buf_start) as usize;
                let n = ((end - self.pos) as usize).min(out.len());
                let buf = s.buf.make_contiguous();
                out[..n].copy_from_slice(&buf[offset..offset + n]);
                self.pos += n as u64;

                const RETAIN_BEHIND: u64 = 8 * 1024 * 1024;
                if self.pos > s.buf_start + RETAIN_BEHIND {
                    let drop_n = (self.pos - s.buf_start - RETAIN_BEHIND) as usize;
                    s.buf.drain(..drop_n);
                    s.buf_start += drop_n as u64;
                }
                drop(s);
                self.shared.cond.notify_all();

                return Ok(n);
            }

            if self.pos < s.disk_written {
                if self.disk_file.is_none() {
                    if let Some(ref path) = self.shared.part_path {
                        self.disk_file = std::fs::File::open(path).ok();
                    }
                }
                if let Some(ref mut f) = self.disk_file {
                    let available = (s.disk_written - self.pos) as usize;
                    let to_read = available.min(out.len());
                    drop(s);

                    if let Ok(_) = f.seek(SeekFrom::Start(self.pos)) {
                        match f.read(&mut out[..to_read]) {
                            Ok(n) if n > 0 => {
                                if self.shared.is_buffering.swap(false, Ordering::SeqCst) {
                                    if let Some(app) = &self.shared.app_handle {
                                        let _ = app.emit("playback-buffering", false);
                                    }
                                }
                                self.pos += n as u64;
                                return Ok(n);
                            }
                            _ => {}
                        }
                    }
                    s = self.shared.lock_state();
                }
            }

            if let Some(err) = s.error.clone() {
                if self.shared.is_buffering.swap(false, Ordering::SeqCst) {
                    if let Some(app) = &self.shared.app_handle {
                        let _ = app.emit("playback-buffering", false);
                    }
                }
                return Err(std::io::Error::new(std::io::ErrorKind::Other, err));
            }

            if s.eof || s.total.map_or(false, |tot| self.pos >= tot) {
                if self.shared.is_buffering.swap(false, Ordering::SeqCst) {
                    if let Some(app) = &self.shared.app_handle {
                        let _ = app.emit("playback-buffering", false);
                    }
                }
                if s.total.is_none() {
                    s.total = Some(self.pos);
                }
                return Ok(0);
            }

            if !self.shared.is_buffering.swap(true, Ordering::SeqCst) {
                if let Some(app) = &self.shared.app_handle {
                    let _ = app.emit("playback-buffering", true);
                }
            }

            s = match self.shared.cond.wait(s) {
                Ok(guard) => guard,
                Err(poisoned) => poisoned.into_inner(),
            };
        }
    }
}

impl Seek for HttpStreamSource {
    fn seek(&mut self, to: SeekFrom) -> std::io::Result<u64> {
        let target = {
            let mut s = self.shared.lock_state();

            if matches!(to, SeekFrom::End(_)) && s.total.is_none() {
                let deadline = std::time::Instant::now() + std::time::Duration::from_secs(8);
                while s.total.is_none() && !s.eof && s.error.is_none() && s.alive {
                    let remaining = deadline.saturating_duration_since(std::time::Instant::now());
                    if remaining.is_zero() {
                        break;
                    }
                    let (guard, _) = match self.shared.cond.wait_timeout(s, remaining) {
                        Ok(res) => res,
                        Err(poisoned) => poisoned.into_inner(),
                    };
                    s = guard;
                }
            }

            match to {
                SeekFrom::Start(p) => p,
                SeekFrom::End(p) => {
                    let end = s.total.ok_or_else(|| {
                        std::io::Error::new(
                            std::io::ErrorKind::Unsupported,
                            "stream length is not known until the first response headers arrive",
                        )
                    })?;
                    (end as i64 + p).max(0) as u64
                }
                SeekFrom::Current(p) => (self.pos as i64 + p).max(0) as u64,
            }
        };

        {
            let mut s = self.shared.lock_state();
            let end = s.buf_start + s.buf.len() as u64;
            if target >= s.buf_start && target <= end {
                self.pos = target;
                return Ok(target);
            }
            if target <= s.disk_written {
                self.pos = target;
                return Ok(target);
            }
            if s.total.map(|total| target >= total).unwrap_or(false) {
                s.buf.clear();
                s.buf_start = target;
                s.eof = true;
                s.error = None;
                s.generation += 1;
                self.pos = target;
                drop(s);
                self.shared.cond.notify_all();
                return Ok(target);
            }
        }
        let generation = self.rebase(target);

        self.pos = target;
        self.shared.cond.notify_all();
        spawn_producer(self.shared.clone(), generation);

        Ok(target)
    }
}

enum ContainerPlan {
    Mp4,
    Flac,
    Alac,
    Sniff,
}
fn container_plan(hint: Option<&str>) -> Result<ContainerPlan, String> {
    let normalized = hint.map(|c| {
        let subtype = c.split(';').next().unwrap_or(c).trim();
        subtype
            .rsplit('/')
            .next()
            .unwrap_or(subtype)
            .trim()
            .to_ascii_lowercase()
    });

    match normalized.as_deref() {
        None => Ok(ContainerPlan::Mp4),
        Some("m4a") | Some("mp4") | Some("m4v") | Some("aac") | Some("mp4a") => {
            Ok(ContainerPlan::Mp4)
        }
        Some("flac") | Some("x-flac") => {
            Ok(ContainerPlan::Flac)
        }
        Some("alac") => {
            Ok(ContainerPlan::Alac)
        }
        Some("webm") | Some("opus") | Some("ogg") => {
            Err("audio/webm (Opus) is not supported by the decoder".to_string())
        }
        Some(_) => Ok(ContainerPlan::Sniff),
    }
}

#[tauri::command(rename = "audio-play")]
pub async fn audio_play(
    app: AppHandle,
    state: State<'_, AudioState>,
    url: String,
    cookie: Option<String>,
    duration_ms: Option<f64>,
    container: Option<String>,
    user_agent: Option<String>,
    start_time_secs: Option<f32>,
) -> Result<(), String> {
    let play_session_id = state.current_session.fetch_add(1, Ordering::SeqCst) + 1;
    println!("Streaming audio from URL (session #{}): {}", play_session_id, url);

    {
        let mut player_lock = state.lock_player();
        if let Some(prev) = player_lock.as_ref() {
            prev.sink.set_volume(0.0);
            prev.sink.pause();
            prev.sink.stop();
            if let Some(shared) = &prev.stream {
                abort_stream(shared);
            }
        }
        *player_lock = None;
    }

    let hint_container = container.as_ref().map(|c| c.to_ascii_lowercase());

    let local_file_path: Option<PathBuf> = if url.starts_with("local:///") {
        let raw = url.strip_prefix("local:///").unwrap();
        let decoded = urlencoding::decode(raw).unwrap_or(std::borrow::Cow::Borrowed(raw));
        Some(PathBuf::from(decoded.as_ref()))
    } else if url.starts_with("file://") {
        let raw = url.strip_prefix("file://").unwrap();
        let raw = if raw.starts_with('/') && (raw.len() > 2 && raw.as_bytes()[2] == b':') {
            &raw[1..]
        } else {
            raw
        };
        let decoded = urlencoding::decode(raw).unwrap_or(std::borrow::Cow::Borrowed(raw));
        Some(PathBuf::from(decoded.as_ref()))
    } else {
        None
    };

    let (source, shared) = if let Some(local_path) = local_file_path {
        println!("Direct local file playback from: {:?}", local_path);
        let ext = local_path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("flac")
            .to_lowercase();
        let file = std::fs::File::open(&local_path)
            .map_err(|e| format!("Failed to open local file {:?}: {}", local_path, e))?;
        let file_len = file.metadata().ok().map(|m| m.len());

        let source: Box<dyn Source<Item = i16> + Send> = match ext.as_str() {
            "flac" => Box::new(
                StreamDecoder::new(file, "flac", move || file_len)
                    .map_err(|e| format!("FLAC decode error: {}", e))?,
            ),
            "m4a" | "mp4" | "aac" | "alac" => Box::new(
                StreamDecoder::new(file, "m4a", move || file_len)
                    .map_err(|e| format!("M4A decode error: {}", e))?,
            ),
            _ => Box::new(
                Decoder::new(file).map_err(|e| format!("Local file decode error: {}", e))?,
            ),
        };

        (source, None)
    } else {
        let cache_dir = get_audio_cache_dir(&app).ok();
        let url_hash = url_cache_hash(&url);
        let ext = match container_plan(hint_container.as_deref()) {
            Ok(ContainerPlan::Flac) => "flac",
            Ok(ContainerPlan::Alac) | Ok(ContainerPlan::Mp4) => "m4a",
            _ => "m4a",
        };

        let cached_file_path = cache_dir.as_ref().map(|d| d.join(format!("{}.{}", url_hash, ext)));
        let part_file_path = cache_dir.as_ref().map(|d| d.join(format!("{}.{}.part", url_hash, ext)));

        if let Some(ref full_cached) = cached_file_path {
            if full_cached.exists() {
                if let Ok(file) = std::fs::File::open(full_cached) {
                    if let Ok(meta) = file.metadata() {
                        let file_size = meta.len();
                        if file_size > 0 {
                            println!("[cache hit] Playing directly from audio cache: {:?}", full_cached);
                            let app_clone = app.clone();
                            let hash_clone = url_hash.clone();
                            tauri::async_runtime::spawn_blocking(move || {
                                if let Some(app_state) = app_clone.try_state::<crate::commands::AppState>() {
                                    if let Ok(conn) = app_state.db.lock() {
                                        let now = std::time::SystemTime::now()
                                            .duration_since(std::time::UNIX_EPOCH)
                                            .map(|d| d.as_secs() as i64)
                                            .unwrap_or(0);
                                        let _ = crate::db::music_db::record_audio_cache_access(
                                            &conn,
                                            &hash_clone,
                                            file_size,
                                            now,
                                        );
                                    }
                                }
                            });

                            let source: Result<Box<dyn Source<Item = i16> + Send>, String> = match ext {
                                "flac" => StreamDecoder::new(file, "flac", move || Some(file_size))
                                    .map(|d| Box::new(d) as Box<dyn Source<Item = i16> + Send>)
                                    .map_err(|e| format!("FLAC cache decode error: {}", e)),
                                "m4a" => StreamDecoder::new(file, "m4a", move || Some(file_size))
                                    .map(|d| Box::new(d) as Box<dyn Source<Item = i16> + Send>)
                                    .map_err(|e| format!("M4A cache decode error: {}", e)),
                                _ => Decoder::new(file)
                                    .map(|d| Box::new(d) as Box<dyn Source<Item = i16> + Send>)
                                    .map_err(|e| format!("Cache decode error: {}", e)),
                            };

                            if let Ok(src) = source {
                                return finish_audio_play(
                                    app,
                                    state,
                                    src,
                                    None,
                                    duration_ms,
                                    start_time_secs,
                                    play_session_id,
                                );
                            }
                        }
                    }
                }
            }
        }

        let app_handle = app.clone();
        let hash_for_stream = url_hash.clone();
        let (src, shared) = tauri::async_runtime::spawn_blocking(move || {
            let reader = HttpStreamSource::start(
                url,
                cookie,
                user_agent,
                part_file_path,
                cached_file_path,
                Some(hash_for_stream),
                Some(app_handle),
            );
            let shared = reader.shared.clone();

            let plan = match container_plan(hint_container.as_deref()) {
                Ok(plan) => plan,
                Err(msg) => {
                    let mut s = shared.lock_state();
                    s.error = Some(msg.clone());
                    drop(s);
                    shared.cond.notify_all();
                    return Err(msg);
                }
            };

            let built: Result<Box<dyn Source<Item = i16> + Send>, String> = match plan {
                ContainerPlan::Mp4 => {
                    let for_length = shared.clone();
                    StreamDecoder::new(reader, "m4a", move || stream_length(&for_length))
                        .map(|d| Box::new(d) as Box<dyn Source<Item = i16> + Send>)
                        .map_err(|e| format!("Decode error: {}", e))
                }
                ContainerPlan::Flac => {
                    let for_length = shared.clone();
                    StreamDecoder::new(reader, "flac", move || stream_length(&for_length))
                        .map(|d| Box::new(d) as Box<dyn Source<Item = i16> + Send>)
                        .map_err(|e| format!("FLAC Decode error: {}", e))
                }
                ContainerPlan::Alac => {
                    let for_length = shared.clone();
                    StreamDecoder::new(reader, "m4a", move || stream_length(&for_length))
                        .map(|d| Box::new(d) as Box<dyn Source<Item = i16> + Send>)
                        .map_err(|e| format!("ALAC Decode error: {}", e))
                }
                ContainerPlan::Sniff => {
                    Decoder::new(reader)
                        .map(|d| Box::new(d) as Box<dyn Source<Item = i16> + Send>)
                        .map_err(|e| format!("Decode error: {}", e))
                }
            };

            match built {
                Ok(source) => Ok((source, shared)),
                Err(e) => {
                    abort_stream(&shared);
                    Err(e)
                }
            }
        })
        .await
        .map_err(|e| e.to_string())??;

        let is_lossless = matches!(
            container_plan(container.as_deref()),
            Ok(ContainerPlan::Flac) | Ok(ContainerPlan::Alac)
        );
        let target_prebuffer = if is_lossless {
            FLAC_PREBUFFER_BYTES
        } else {
            INITIAL_PREBUFFER_BYTES
        };
        let prebuffer_wait_ms = if is_lossless { 200 } else { 200 };

        {
            let mut s = shared.lock_state();
            let deadline = std::time::Instant::now() + std::time::Duration::from_millis(prebuffer_wait_ms);
            while s.buf.len() < target_prebuffer && !s.eof && s.error.is_none() && s.alive {
                let remaining = deadline.saturating_duration_since(std::time::Instant::now());
                if remaining.is_zero() {
                    break;
                }
                let (guard, _) = match shared.cond.wait_timeout(s, remaining) {
                    Ok(res) => res,
                    Err(poisoned) => poisoned.into_inner(),
                };
                s = guard;
            }
        }

        (src, Some(shared))
    };

    finish_audio_play(
        app,
        state,
        source,
        shared,
        duration_ms,
        start_time_secs,
        play_session_id,
    )
}

fn finish_audio_play(
    app: AppHandle,
    state: State<'_, AudioState>,
    source: Box<dyn Source<Item = i16> + Send>,
    shared: Option<Arc<StreamShared>>,
    duration_ms: Option<f64>,
    start_time_secs: Option<f32>,
    play_session_id: u64,
) -> Result<(), String> {
    let duration = match duration_ms {
        Some(ms) if ms > 0.0 => Some((ms / 1000.0) as f32),
        _ => source.total_duration().map(|d| d.as_secs_f32()),
    };

    let mut player_lock = state.lock_player();
    if state.current_session.load(Ordering::SeqCst) != play_session_id {
        println!("Superseded audio session #{} discarded at lock acquisition", play_session_id);
        if let Some(ref s) = shared {
            abort_stream(s);
        }
        return Ok(());
    }

    if let Some(prev) = player_lock.as_ref() {
        prev.sink.set_volume(0.0);
        prev.sink.pause();
        prev.sink.stop();
        if let Some(stream) = &prev.stream {
            abort_stream(stream);
        }
    }

    let handle = state.get_or_init_handle()?;
    let mut player = AudioPlayer::new(&handle)?;
    player.duration = duration;
    player.stream = shared;

    let (eq_tx, eq_rx) = std::sync::mpsc::channel();
    let eq_source = EqSource::new(source.convert_samples::<f32>(), eq_rx);
    player.eq_tx = Some(eq_tx.clone());

    player.sink.append(eq_source);
    player.sink.play();

    {
        let eq_state = state.lock_eq();
        let _ = eq_tx.send(EqCommand::Bypass(eq_state.bypass));
        for (i, &freq) in FREQUENCIES.iter().enumerate() {
            let gain = eq_state.gains[i];
            if gain.abs() > 0.001 {
                let _ = eq_tx.send(EqCommand::Band {
                    frequency: freq,
                    gain,
                });
            }
        }
        player.sink.set_speed(eq_state.playback_rate);
    }

    if let Some(start_secs) = start_time_secs {
        if start_secs > 0.0 {
            let duration = std::time::Duration::from_secs_f32(start_secs);
            let seek_res = player.sink.try_seek(duration);
            println!("audio_play initial seek to {:.2}s result: {:?}", start_secs, seek_res);
            crate::smtc::windows_smtc::update_smtc_position(start_secs);
            let _ = app.emit("playback-progress", start_secs);
        } else {
            let _ = app.emit("playback-progress", 0.05f32);
            crate::smtc::windows_smtc::update_smtc_position(0.0);
        }
    } else {
        let _ = app.emit("playback-progress", 0.05f32);
        crate::smtc::windows_smtc::update_smtc_position(0.0);
    }

    *player_lock = Some(player);

    println!("Playback started via Rust Native Engine (streaming, session #{})", play_session_id);
    Ok(())
}

#[tauri::command(rename = "audio-pause")]
pub fn audio_pause(state: State<'_, AudioState>) -> Result<(), String> {
    if let Some(player) = state.lock_player().as_ref() {
        player.sink.pause();
        let pos = player.sink.get_pos().as_secs_f32();
        crate::smtc::windows_smtc::update_smtc_position(pos);
        crate::commands::discord::set_discord_playing_state(false);
    }
    Ok(())
}

#[tauri::command(rename = "audio-resume")]
pub fn audio_resume(state: State<'_, AudioState>) -> Result<(), String> {
    if let Some(player) = state.lock_player().as_ref() {
        player.sink.play();
        let pos = player.sink.get_pos().as_secs_f32();
        crate::smtc::windows_smtc::update_smtc_position(pos);
        crate::commands::discord::set_discord_playing_state(true);
    }
    Ok(())
}

#[tauri::command(rename = "audio-stop")]
pub fn audio_stop(state: State<'_, AudioState>) -> Result<(), String> {
    state.current_session.fetch_add(1, Ordering::SeqCst);
    let mut player_lock = state.lock_player();
    if let Some(player) = player_lock.as_ref() {
        player.sink.set_volume(0.0);
        player.sink.pause();
        player.sink.stop();
        if let Some(shared) = &player.stream {
            abort_stream(shared);
        }
        let _ = crate::commands::discord::clear_discord_presence();
    }
    *player_lock = None;
    Ok(())
}

#[tauri::command(rename = "audio-set-volume")]
pub fn audio_set_volume(state: State<'_, AudioState>, volume: f32) -> Result<(), String> {
    if let Some(player) = state.lock_player().as_ref() {
        player.sink.set_volume(volume);
    }
    Ok(())
}

#[tauri::command(rename = "audio-seek")]
pub async fn audio_seek(
    app: AppHandle,
    state: State<'_, AudioState>,
    time_secs: f32,
) -> Result<(), String> {
    let (sink, duration, max_dur) = {
        let player_lock = state.lock_player();
        let Some(player) = player_lock.as_ref() else {
            return Ok(());
        };
        (
            player.sink.clone(),
            std::time::Duration::from_secs_f32(time_secs.max(0.0)),
            player.duration.unwrap_or(0.0),
        )
    };

    if max_dur > 5.0 && time_secs >= (max_dur - 0.5) {
        println!(
            "Seek reached track end boundary ({} >= {}), emitting playback-ended",
            time_secs, max_dur
        );
        sink.pause();
        let _ = app.emit("playback-ended", ());
        return Ok(());
    }

    let seek_res = tauri::async_runtime::spawn_blocking(move || {
        let mut res = sink.try_seek(duration);
        println!("audio_seek to {:.2}s result: {:?}", time_secs, res);
        if res.is_err() {
            std::thread::sleep(std::time::Duration::from_millis(80));
            res = sink.try_seek(duration);
            println!("audio_seek retry to {:.2}s result: {:?}", time_secs, res);
        }
        res
    })
    .await
    .map_err(|e| e.to_string())?;

    if let Err(e) = seek_res {
        let err_str = format!("{:?}", e);
        eprintln!("audio_seek failed at {:.2}s: {}", time_secs, err_str);
        return Err(err_str);
    }
    crate::smtc::windows_smtc::update_smtc_position(time_secs);
    Ok(())
}

#[tauri::command(rename = "audio-get-time")]
pub fn audio_get_time(state: State<'_, AudioState>) -> Result<f32, String> {
    if let Some(player) = state.lock_player().as_ref() {
        Ok(player.sink.get_pos().as_secs_f32())
    } else {
        Ok(0.0)
    }
}

#[tauri::command(rename = "audio-get-duration")]
pub fn audio_get_duration(state: State<'_, AudioState>) -> Result<Option<f32>, String> {
    if let Some(player) = state.lock_player().as_ref() {
        Ok(player.duration)
    } else {
        Ok(None)
    }
}

#[tauri::command(rename = "audio-set-eq-bypass")]
pub fn audio_set_eq_bypass(state: State<'_, AudioState>, bypass: bool) -> Result<(), String> {
    state.lock_eq().bypass = bypass;
    if let Some(player) = state.lock_player().as_ref() {
        if let Some(tx) = &player.eq_tx {
            let _ = tx.send(EqCommand::Bypass(bypass));
        }
    }
    println!("Native EQ bypass set to: {}", bypass);
    Ok(())
}

#[tauri::command(rename = "audio-set-eq-band")]
pub fn audio_set_eq_band(
    state: State<'_, AudioState>,
    frequency: f32,
    gain: f32,
) -> Result<(), String> {
    {
        let mut eq = state.lock_eq();
        if let Some(idx) = FREQUENCIES
            .iter()
            .position(|&f| (f - frequency).abs() < 1.0)
        {
            eq.gains[idx] = gain;
        }
    }
    if let Some(player) = state.lock_player().as_ref() {
        if let Some(tx) = &player.eq_tx {
            let _ = tx.send(EqCommand::Band { frequency, gain });
        }
    }
    println!("Native EQ band set: {}Hz to {}dB", frequency, gain);
    Ok(())
}

#[tauri::command(rename = "audio-set-playback-rate")]
pub fn audio_set_playback_rate(state: State<'_, AudioState>, rate: f32) -> Result<(), String> {
    let clamped = rate.clamp(0.25, 4.0);
    state.lock_eq().playback_rate = clamped;
    if let Some(player) = state.lock_player().as_ref() {
        player.sink.set_speed(clamped);
    }
    println!("Native playback rate set to: {}x", clamped);
    Ok(())
}

#[tauri::command(rename = "audio-clear-cache")]
pub fn audio_clear_cache(app: AppHandle) -> Result<(), String> {
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?
        .join("audio_cache");
    if cache_dir.exists() {
        let _ = std::fs::remove_dir_all(&cache_dir);
        let _ = std::fs::create_dir_all(&cache_dir);
        println!("Audio cache cleared manually");
    }
    Ok(())
}

