use crate::commands::stream_decoder::StreamDecoder;
use futures_util::StreamExt;
use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink, Source};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::PathBuf;
use std::sync::{Arc, Condvar, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::commands::eq::{EqCommand, EqSource, FREQUENCIES};
use std::sync::mpsc::Sender;

use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};

pub struct AudioPlayer {
    pub sink: Arc<Sink>,
    pub duration: Option<f32>,
    pub eq_tx: Option<Sender<EqCommand>>,
    pub stream: Option<Arc<StreamShared>>,
    pub url: Option<String>,
    pub cookie: Option<String>,
    pub user_agent: Option<String>,
    pub container: Option<String>,
    pub duration_ms: Option<f64>,
    pub ended_emitted: AtomicBool,
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
            url: None,
            cookie: None,
            user_agent: None,
            container: None,
            duration_ms: None,
            ended_emitted: AtomicBool::new(false),
        })
    }
}

pub struct PrewarmedStream {
    pub url: String,
    pub shared: Arc<StreamShared>,
    pub created_at: std::time::Instant,
}

pub struct AudioState {
    pub player: Mutex<Option<AudioPlayer>>,
    pub eq: Mutex<EqState>,
    pub current_session: Arc<AtomicU64>,
    pub stream_handle: Mutex<Option<OutputStreamHandle>>,
    pub prewarmed: Arc<Mutex<Option<PrewarmedStream>>>,
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
            prewarmed: Arc::new(Mutex::new(None)),
        }
    }
}

enum Store {
    #[allow(dead_code)]
    File(std::fs::File),
    Memory(Vec<u8>),
}

struct Spool {
    len: usize,
    #[allow(dead_code)]
    announced: Option<usize>,
    store: Store,
}

impl Spool {
    fn new(total: Option<u64>) -> Self {
        let cap = total
            .and_then(|t| usize::try_from(t).ok())
            .unwrap_or(256 * 1024)
            .min(256 * 1024 * 1024);
        Self {
            len: 0,
            announced: total.and_then(|t| usize::try_from(t).ok()),
            store: Store::Memory(Vec::with_capacity(cap)),
        }
    }

    fn len(&self) -> usize {
        self.len
    }

    fn get_slice(&self, up_to: usize) -> Vec<u8> {
        let n = self.len.min(up_to);
        if n == 0 {
            return Vec::new();
        }
        match &self.store {
            Store::Memory(held) => held[..n].to_vec(),
            Store::File(file) => {
                let mut buf = vec![0u8; n];
                if let Ok(mut clone) = file.try_clone() {
                    let _ = clone.seek(SeekFrom::Start(0));
                    let _ = clone.read_exact(&mut buf);
                }
                buf
            }
        }
    }

    fn read_at(&mut self, at: usize, out: &mut [u8]) -> std::io::Result<usize> {
        if at >= self.len {
            return Ok(0);
        }
        let available = self.len - at;
        let to_read = available.min(out.len());
        if to_read == 0 {
            return Ok(0);
        }

        match &mut self.store {
            Store::File(file) => {
                file.seek(SeekFrom::Start(at as u64))?;
                file.read_exact(&mut out[..to_read])?;
                Ok(to_read)
            }
            Store::Memory(held) => {
                out[..to_read].copy_from_slice(&held[at..at + to_read]);
                Ok(to_read)
            }
        }
    }

    fn append(&mut self, bytes: &[u8]) -> std::io::Result<()> {
        if let Store::File(file) = &mut self.store {
            match file.seek(SeekFrom::Start(self.len as u64)).and_then(|_| file.write_all(bytes)) {
                Ok(()) => {
                    self.len += bytes.len();
                    return Ok(());
                }
                Err(error) => {
                    eprintln!("[spool] failed to write to disk spool, falling back to memory: {}", error);
                    let mut held = vec![0u8; self.len];
                    if let Ok(_) = file.seek(SeekFrom::Start(0)).and_then(|_| file.read_exact(&mut held)) {
                        self.store = Store::Memory(held);
                    } else {
                        self.store = Store::Memory(Vec::new());
                        self.len = 0;
                    }
                }
            }
        }
        if let Store::Memory(held) = &mut self.store {
            held.extend_from_slice(bytes);
            self.len = held.len();
        }
        Ok(())
    }
}

struct StreamState {
    spool: Spool,
    eof: bool,
    error: Option<String>,
    total: Option<u64>,
    alive: bool,
}

pub struct StreamShared {
    state: Mutex<StreamState>,
    cond: Condvar,
    url: String,
    cookie: Option<String>,
    user_agent: Option<String>,
    app_handle: Option<AppHandle>,
    is_buffering: Arc<AtomicBool>,
    offset_start: u64,
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
const PREROLL_BYTES: usize = 64 * 1024;
const FLAC_PREROLL_BYTES: usize = 96 * 1024;

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

fn spawn_producer(shared: Arc<StreamShared>) {
    tauri::async_runtime::spawn(async move {
        let client = &*HTTP_CLIENT;
        let mut consecutive_disconnects = 0;

        loop {
            let (start, total) = {
                let s = shared.lock_state();
                if !s.alive || s.eof {
                    return;
                }
                (s.spool.len() as u64, s.total)
            };

            if total.map(|tot| start >= tot).unwrap_or(false) {
                let mut s = shared.lock_state();
                if s.alive {
                    s.eof = true;
                }
                drop(s);
                shared.cond.notify_all();
                return;
            }

            let mut response = None;
            let mut last_error_msg = None;

            for attempt in 0..3 {
                {
                    let s = shared.lock_state();
                    if !s.alive {
                        return;
                    }
                }

                if attempt > 0 || consecutive_disconnects > 0 {
                    let delay = (100 * (1 << attempt)).min(1000);
                    tokio::time::sleep(std::time::Duration::from_millis(delay)).await;
                    let s = shared.lock_state();
                    if !s.alive {
                        return;
                    }
                }

                let mut req = client.get(&shared.url);
                if let Some(c) = &shared.cookie {
                    req = req.header(reqwest::header::COOKIE, c);
                }

                let is_googlevideo = shared.url.contains("googlevideo.com");
                let effective_ua = if is_googlevideo {
                    if let Some(ua) = &shared.user_agent {
                        if !ua.is_empty() {
                            Some(ua.clone())
                        } else if shared.url.contains("c=VISIONOS") || shared.url.contains("c%3DVISIONOS") {
                            Some("Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15".to_string())
                        } else if shared.url.contains("c=IOS") || shared.url.contains("c%3DIOS") {
                            Some("com.google.ios.youtube/21.03.3 (iPad7,6; U; CPU iPadOS 17_7_10 like Mac OS X; en-US)".to_string())
                        } else if shared.url.contains("c=ANDROID_VR") || shared.url.contains("c%3DANDROID_VR") {
                            Some("com.google.android.apps.youtube.vr.oculus/1.43.32 (Linux; U; Android 12; en_US; Quest 3; Build/SQ3A.220605.009.A1; Cronet/107.0.5284.2)".to_string())
                        } else if shared.url.contains("c=ANDROID") || shared.url.contains("c%3DANDROID") {
                            Some("com.google.android.youtube/21.02.35 (Linux; U; Android 11) gzip".to_string())
                        } else {
                            Some("Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15".to_string())
                        }
                    } else if shared.url.contains("c=VISIONOS") || shared.url.contains("c%3DVISIONOS") {
                        Some("Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15".to_string())
                    } else if shared.url.contains("c=IOS") || shared.url.contains("c%3DIOS") {
                        Some("com.google.ios.youtube/21.03.3 (iPad7,6; U; CPU iPadOS 17_7_10 like Mac OS X; en-US)".to_string())
                    } else if shared.url.contains("c=ANDROID_VR") || shared.url.contains("c%3DANDROID_VR") {
                        Some("com.google.android.apps.youtube.vr.oculus/1.43.32 (Linux; U; Android 12; en_US; Quest 3; Build/SQ3A.220605.009.A1; Cronet/107.0.5284.2)".to_string())
                    } else if shared.url.contains("c=ANDROID") || shared.url.contains("c%3DANDROID") {
                        Some("com.google.android.youtube/21.02.35 (Linux; U; Android 11) gzip".to_string())
                    } else {
                        Some("Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15".to_string())
                    }
                } else {
                    shared.user_agent.clone().or_else(|| Some("ChorusDeck/5.1.0 (Preservation Player)".to_string()))
                };

                if let Some(ua) = &effective_ua {
                    req = req.header(reqwest::header::USER_AGENT, ua);
                }

                if is_googlevideo {
                    if let Some(ua) = &effective_ua {
                        if !ua.contains("com.google.ios") && !ua.contains("com.google.android") {
                            req = req.header(reqwest::header::ORIGIN, "https://www.youtube.com");
                            req = req.header(reqwest::header::REFERER, "https://www.youtube.com/");
                        }
                    }
                }

                req = req.header(reqwest::header::ACCEPT, "*/*");
                req = req.header(reqwest::header::ACCEPT_ENCODING, "identity");
                let effective_start = shared.offset_start + start;
                if effective_start > 0 || is_googlevideo {
                    req = req.header(reqwest::header::RANGE, format!("bytes={}-", effective_start));
                }

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
                            if s.alive {
                                s.eof = true;
                            }
                            drop(s);
                            shared.cond.notify_all();
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
                    if s.alive {
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
                if s.alive && s.total.is_none() {
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

                let mut s = shared.lock_state();
                if !s.alive {
                    return;
                }

                if let Err(e) = s.spool.append(&chunk) {
                    eprintln!("[spawn_producer] Spool append failed: {}", e);
                    s.error = Some(e.to_string());
                    drop(s);
                    shared.cond.notify_all();
                    return;
                }

                let current_len = s.spool.len() as u64;
                let reached_total = s.total.map_or(false, |tot| current_len >= tot);
                if reached_total {
                    s.eof = true;
                    drop(s);
                    shared.cond.notify_all();
                    return;
                }
                drop(s);
                shared.cond.notify_all();
            }

            if read_error {
                if consecutive_disconnects >= 5 {
                    let mut s = shared.lock_state();
                    if s.alive {
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
                let current_len = s.spool.len() as u64;
                s.total.map_or(true, |tot| current_len >= tot)
            };

            if is_finished {
                let mut s = shared.lock_state();
                if s.alive {
                    s.eof = true;
                }
                drop(s);
                shared.cond.notify_all();
                return;
            }
        }
    });
}

struct HttpStreamSource {
    shared: Arc<StreamShared>,
    pos: u64,
}

impl HttpStreamSource {
    fn start(
        url: String,
        cookie: Option<String>,
        user_agent: Option<String>,
        app_handle: Option<AppHandle>,
    ) -> Self {
        Self::start_at(url, cookie, user_agent, app_handle, 0)
    }

    fn start_at(
        url: String,
        cookie: Option<String>,
        user_agent: Option<String>,
        app_handle: Option<AppHandle>,
        offset_start: u64,
    ) -> Self {
        let spool = Spool::new(None);

        let shared = Arc::new(StreamShared {
            state: Mutex::new(StreamState {
                spool,
                eof: false,
                error: None,
                total: None,
                alive: true,
            }),
            cond: Condvar::new(),
            url,
            cookie,
            user_agent: Some(
                user_agent
                    .filter(|ua| !ua.trim().is_empty())
                    .unwrap_or_else(|| DEFAULT_STREAM_USER_AGENT.to_string()),
            ),
            app_handle,
            is_buffering: Arc::new(AtomicBool::new(false)),
            offset_start,
        });

        spawn_producer(shared.clone());

        Self {
            shared,
            pos: 0,
        }
    }
}

struct SplicedStreamSource {
    head_bytes: Vec<u8>,
    graft_stream: HttpStreamSource,
    pos: u64,
}

impl Read for SplicedStreamSource {
    fn read(&mut self, out: &mut [u8]) -> std::io::Result<usize> {
        if out.is_empty() {
            return Ok(0);
        }
        let head_len = self.head_bytes.len() as u64;
        if self.pos < head_len {
            let available = (head_len - self.pos) as usize;
            let n = available.min(out.len());
            let offset = self.pos as usize;
            out[..n].copy_from_slice(&self.head_bytes[offset..offset + n]);
            self.pos += n as u64;
            Ok(n)
        } else {
            let n = self.graft_stream.read(out)?;
            self.pos += n as u64;
            Ok(n)
        }
    }
}

impl Seek for SplicedStreamSource {
    fn seek(&mut self, to: SeekFrom) -> std::io::Result<u64> {
        let new_pos = match to {
            SeekFrom::Start(p) => p,
            SeekFrom::Current(p) => (self.pos as i64 + p).max(0) as u64,
            SeekFrom::End(_) => {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::Unsupported,
                    "cannot seek from end on spliced progressive stream",
                ));
            }
        };
        self.pos = new_pos;
        Ok(new_pos)
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

            let spool_len = s.spool.len() as u64;

            if self.pos < spool_len {
                if self.shared.is_buffering.swap(false, Ordering::SeqCst) {
                    if let Some(app) = &self.shared.app_handle {
                        let _ = app.emit("playback-buffering", false);
                    }
                }
                let n = s.spool.read_at(self.pos as usize, out)?;
                self.pos += n as u64;
                return Ok(n);
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

            let (guard, timed_out) = match self.shared.cond.wait_timeout(s, Duration::from_millis(400)) {
                Ok(res) => res,
                Err(poisoned) => poisoned.into_inner(),
            };
            s = guard;

            if timed_out.timed_out() {
                if !self.shared.is_buffering.swap(true, Ordering::SeqCst) {
                    if let Some(app) = &self.shared.app_handle {
                        let _ = app.emit("playback-buffering", true);
                    }
                }

                let (guard2, timed_out2) = match self.shared.cond.wait_timeout(s, Duration::from_secs(15)) {
                    Ok(res) => res,
                    Err(poisoned) => poisoned.into_inner(),
                };
                s = guard2;

                if timed_out2.timed_out() {
                    if self.shared.is_buffering.swap(false, Ordering::SeqCst) {
                        if let Some(app) = &self.shared.app_handle {
                            let _ = app.emit("playback-buffering", false);
                        }
                    }
                    return Err(std::io::Error::new(
                        std::io::ErrorKind::TimedOut,
                        "stream read timed out waiting for data",
                    ));
                }
            }
        }
    }
}

impl Seek for HttpStreamSource {
    fn seek(&mut self, to: SeekFrom) -> std::io::Result<u64> {
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

        let target: i64 = match to {
            SeekFrom::Start(p) => p as i64,
            SeekFrom::End(p) => {
                let end = s.total.or_else(|| if s.eof { Some(s.spool.len() as u64) } else { None })
                    .ok_or_else(|| {
                        std::io::Error::new(
                            std::io::ErrorKind::Unsupported,
                            "stream length is not known until response headers arrive",
                        )
                    })?;
                end as i64 + p
            }
            SeekFrom::Current(p) => self.pos as i64 + p,
        };

        if target < 0 {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "cannot seek before stream start",
            ));
        }

        let target_u64 = target as u64;
        self.pos = target_u64;
        Ok(target_u64)
    }
}

enum ContainerPlan {
    Mp4,
    Flac,
    Alac,
    Webm,
    Ogg,
    Wav,
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
        Some("webm") | Some("opus") | Some("mkv") => {
            Ok(ContainerPlan::Webm)
        }
        Some("ogg") | Some("vorbis") => {
            Ok(ContainerPlan::Ogg)
        }
        Some("wav") | Some("wave") => {
            Ok(ContainerPlan::Wav)
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
        if let Some(bridge) = app.try_state::<core_shared::RuntimeBridge>() {
            bridge.update_state(|s| {
                s.playback_position_secs = 0.0;
            });
        }
        let _ = app.emit("playback-progress", 0.0f32);
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
        let app_handle = app.clone();
        let prewarmed_arc = state.prewarmed.clone();
        let stream_url = url.clone();
        let stream_cookie = cookie.clone();
        let stream_ua = user_agent.clone();
        let stream_hint = hint_container.clone();

        let (src, shared) = tauri::async_runtime::spawn_blocking(move || {
            let maybe_prewarmed = {
                let mut pre_lock = match prewarmed_arc.lock() {
                    Ok(g) => g,
                    Err(e) => e.into_inner(),
                };
                if let Some(pre) = pre_lock.take() {
                    let has_err = pre.shared.lock_state().error.is_some();
                    if pre.url == stream_url && !has_err && pre.created_at.elapsed() < Duration::from_secs(120) {
                        println!("[audio_play] Instant play using pre-warmed spool: {}", stream_url);
                        Some(pre.shared)
                    } else {
                        abort_stream(&pre.shared);
                        None
                    }
                } else {
                    None
                }
            };

            let plan = match container_plan(stream_hint.as_deref()) {
                Ok(plan) => plan,
                Err(msg) => return Err(msg),
            };

            let is_lossless = matches!(plan, ContainerPlan::Flac | ContainerPlan::Alac);
            let target_prebuffer = if is_lossless {
                FLAC_PREROLL_BYTES
            } else {
                PREROLL_BYTES
            };

            let (reader, shared) = if let Some(pre_shared) = maybe_prewarmed {
                let r = HttpStreamSource {
                    shared: pre_shared.clone(),
                    pos: 0,
                };
                (r, pre_shared)
            } else {
                let r = HttpStreamSource::start(
                    stream_url.clone(),
                    stream_cookie.clone(),
                    stream_ua.clone(),
                    Some(app_handle.clone()),
                );
                let sh = r.shared.clone();
                (r, sh)
            };

            {
                let mut s = shared.lock_state();
                let deadline = std::time::Instant::now() + std::time::Duration::from_millis(500);
                while s.spool.len() < target_prebuffer && !s.eof && s.error.is_none() && s.alive {
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

                if let Some(ref err) = s.error {
                    return Err(format!("Stream request error: {err}"));
                }
            }

            if let Some(start_secs) = start_time_secs.filter(|&s| s > 0.5) {
                let head_data = shared.lock_state().spool.get_slice(64 * 1024);
                let mut spliced_source: Option<Box<dyn Source<Item = i16> + Send>> = None;
                let mut graft_shared: Option<Arc<StreamShared>> = None;

                if matches!(plan, ContainerPlan::Mp4 | ContainerPlan::Alac) {
                    if let Some(segments) = crate::commands::segments::Segments::read(&head_data) {
                        if let Some(entry) = segments.entry(Duration::from_secs_f32(start_secs)) {
                            println!("[audio_play] DASH fMP4 sidx graft at byte {} for {:.2}s", entry.graft, start_secs);
                            let head_slice = head_data[..entry.head].to_vec();
                            let graft_stream = HttpStreamSource::start_at(
                                stream_url.clone(),
                                stream_cookie.clone(),
                                stream_ua.clone(),
                                Some(app_handle.clone()),
                                entry.graft as u64,
                            );
                            graft_shared = Some(graft_stream.shared.clone());
                            let spliced = SplicedStreamSource {
                                head_bytes: head_slice,
                                graft_stream,
                                pos: 0,
                            };
                            if let Ok(d) = StreamDecoder::new_streaming(spliced, "m4a", move || None) {
                                spliced_source = Some(Box::new(d));
                            }
                        }
                    }
                } else if matches!(plan, ContainerPlan::Flac) {
                    if let Some(dur_sec) = duration_ms.map(|ms| (ms / 1000.0) as f32).filter(|&d| d > 1.0) {
                        let total_len = stream_length(&shared).unwrap_or(25 * 1024 * 1024);
                        let graft_byte = ((start_secs / dur_sec) as f64 * total_len as f64) as u64;
                        println!("[audio_play] FLAC progressive graft at byte {} for {:.2}s", graft_byte, start_secs);
                        let head_slice = head_data[..42.min(head_data.len())].to_vec();
                        let graft_stream = HttpStreamSource::start_at(
                            stream_url.clone(),
                            stream_cookie.clone(),
                            stream_ua.clone(),
                            Some(app_handle.clone()),
                            graft_byte,
                        );
                        graft_shared = Some(graft_stream.shared.clone());
                        let spliced = SplicedStreamSource {
                            head_bytes: head_slice,
                            graft_stream,
                            pos: 0,
                        };
                        if let Ok(d) = StreamDecoder::new_streaming(spliced, "flac", move || None) {
                            spliced_source = Some(Box::new(d));
                        }
                    }
                }

                if let Some(src) = spliced_source {
                    return Ok((src, graft_shared.unwrap_or(shared)));
                }
            }

            let for_length = shared.clone();
            let built: Result<Box<dyn Source<Item = i16> + Send>, String> = match plan {
                ContainerPlan::Mp4 => {
                    StreamDecoder::new_streaming(reader, "m4a", move || stream_length(&for_length))
                        .map(|d| Box::new(d) as Box<dyn Source<Item = i16> + Send>)
                        .map_err(|e| format!("Decode error: {}", e))
                }
                ContainerPlan::Flac => {
                    StreamDecoder::new_streaming(reader, "flac", move || stream_length(&for_length))
                        .map(|d| Box::new(d) as Box<dyn Source<Item = i16> + Send>)
                        .map_err(|e| format!("FLAC Decode error: {}", e))
                }
                ContainerPlan::Alac => {
                    StreamDecoder::new_streaming(reader, "m4a", move || stream_length(&for_length))
                        .map(|d| Box::new(d) as Box<dyn Source<Item = i16> + Send>)
                        .map_err(|e| format!("ALAC Decode error: {}", e))
                }
                ContainerPlan::Webm => {
                    StreamDecoder::new_streaming(reader, "webm", move || stream_length(&for_length))
                        .map(|d| Box::new(d) as Box<dyn Source<Item = i16> + Send>)
                        .map_err(|e| format!("WebM/Opus Decode error: {}", e))
                }
                ContainerPlan::Ogg => {
                    StreamDecoder::new_streaming(reader, "ogg", move || stream_length(&for_length))
                        .map(|d| Box::new(d) as Box<dyn Source<Item = i16> + Send>)
                        .map_err(|e| format!("Ogg/Opus Decode error: {}", e))
                }
                ContainerPlan::Wav => {
                    StreamDecoder::new_streaming(reader, "wav", move || stream_length(&for_length))
                        .map(|d| Box::new(d) as Box<dyn Source<Item = i16> + Send>)
                        .map_err(|e| format!("WAV Decode error: {}", e))
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
        Some(url),
        cookie,
        user_agent,
        hint_container,
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
    url: Option<String>,
    cookie: Option<String>,
    user_agent: Option<String>,
    container: Option<String>,
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
    player.stream = shared.clone();
    player.url = url;
    player.cookie = cookie;
    player.user_agent = user_agent;
    player.container = container;
    player.duration_ms = duration_ms;

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
            let _ = app.emit("playback-progress", 0.0f32);
            crate::smtc::windows_smtc::update_smtc_position(0.0);
        }
    } else {
        let _ = app.emit("playback-progress", 0.0f32);
        crate::smtc::windows_smtc::update_smtc_position(0.0);
    }

    if let Some(ref s) = shared {
        s.is_buffering.store(false, Ordering::SeqCst);
    }
    let _ = app.emit("playback-buffering", false);

    if let Some(bridge) = app.try_state::<core_shared::RuntimeBridge>() {
        bridge.update_state(|s| {
            s.is_playing = true;
            s.playback_position_secs = start_time_secs.unwrap_or(0.0);
            if let Some(d) = duration {
                s.duration_secs = d;
            }
        });
        bridge.clock.set_playing(true);
    }
    let _ = app.emit("playback-state-changed", true);

    *player_lock = Some(player);

    println!("Playback started via Rust Native Engine (streaming, session #{})", play_session_id);
    Ok(())
}

#[tauri::command(rename = "audio-pause")]
pub fn audio_pause(app: AppHandle, state: State<'_, AudioState>) -> Result<(), String> {
    if let Some(player) = state.lock_player().as_ref() {
        player.sink.pause();
        let pos = player.sink.get_pos().as_secs_f32();
        crate::smtc::windows_smtc::update_smtc_position(pos);
        crate::commands::discord::set_discord_playing_state(false);
        if let Some(bridge) = app.try_state::<core_shared::RuntimeBridge>() {
            bridge.update_state(|s| {
                s.is_playing = false;
                s.playback_position_secs = pos;
            });
            bridge.clock.set_playing(false);
        }
        let _ = app.emit("playback-state-changed", false);
        let _ = app.emit("playback-buffering", false);
    }
    Ok(())
}

#[tauri::command(rename = "audio-resume")]
pub fn audio_resume(app: AppHandle, state: State<'_, AudioState>) -> Result<(), String> {
    if let Some(player) = state.lock_player().as_ref() {
        player.sink.play();
        let pos = player.sink.get_pos().as_secs_f32();
        crate::smtc::windows_smtc::update_smtc_position(pos);
        crate::commands::discord::set_discord_playing_state(true);
        if let Some(bridge) = app.try_state::<core_shared::RuntimeBridge>() {
            bridge.update_state(|s| {
                s.is_playing = true;
                s.playback_position_secs = pos;
            });
            bridge.clock.set_playing(true);
        }
        let _ = app.emit("playback-state-changed", true);
        let _ = app.emit("playback-buffering", false);
    }
    Ok(())
}

#[tauri::command(rename = "audio-stop")]
pub fn audio_stop(app: AppHandle, state: State<'_, AudioState>) -> Result<(), String> {
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
    if let Some(bridge) = app.try_state::<core_shared::RuntimeBridge>() {
        bridge.update_state(|s| {
            s.is_playing = false;
            s.playback_position_secs = 0.0;
        });
        bridge.clock.set_playing(false);
    }
    let _ = app.emit("playback-state-changed", false);
    let _ = app.emit("playback-progress", 0.0f32);
    let _ = app.emit("playback-buffering", false);
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
    let (sink, duration, max_dur, player_meta) = {
        let player_lock = state.lock_player();
        let Some(player) = player_lock.as_ref() else {
            return Ok(());
        };
        player.ended_emitted.store(false, Ordering::SeqCst);
        let meta = (
            player.url.clone(),
            player.cookie.clone(),
            player.user_agent.clone(),
            player.container.clone(),
            player.duration_ms,
        );
        (
            player.sink.clone(),
            std::time::Duration::from_secs_f32(time_secs.max(0.0)),
            player.duration.unwrap_or(0.0),
            meta,
        )
    };

    if max_dur > 2.0 && time_secs >= (max_dur - 0.8) {
        println!(
            "Seek reached track end boundary ({} >= {}), emitting playback-ended",
            time_secs, max_dur
        );
        sink.pause();
        let _ = app.emit("playback-ended", ());
        return Ok(());
    }

    let seek_res = tauri::async_runtime::spawn_blocking(move || {
        let res = sink.try_seek(duration);
        println!("audio_seek to {:.2}s result: {:?}", time_secs, res);
        res
    })
    .await
    .map_err(|e| e.to_string())?;

    if seek_res.is_ok() {
        crate::smtc::windows_smtc::update_smtc_position(time_secs);
        let _ = app.emit("playback-progress", time_secs);
        return Ok(());
    }

    // Seamless unseekable stream spliced seek:
    if let (Some(url), cookie, user_agent, container, duration_ms) = player_meta {
        println!("[audio_seek] Spliced seek to {:.2}s for {}", time_secs, url);
        let res = audio_play(
            app.clone(),
            state,
            url,
            cookie,
            duration_ms,
            container,
            user_agent,
            Some(time_secs),
        )
        .await;
        crate::smtc::windows_smtc::update_smtc_position(time_secs);
        let _ = app.emit("playback-progress", time_secs);
        return res;
    }

    Ok(())
}

#[tauri::command(rename = "audio:prewarm-stream")]
pub fn audio_prewarm_stream(
    app: AppHandle,
    state: State<'_, AudioState>,
    url: String,
    _container: Option<String>,
    user_agent: Option<String>,
) -> Result<(), String> {
    if url.starts_with("local://") || url.starts_with("file://") || url.is_empty() {
        return Ok(());
    }

    let mut pre_lock = match state.prewarmed.lock() {
        Ok(g) => g,
        Err(e) => e.into_inner(),
    };

    if let Some(existing) = pre_lock.as_ref() {
        if existing.url == url && existing.created_at.elapsed() < Duration::from_secs(60) {
            return Ok(());
        }
        abort_stream(&existing.shared);
    }

    println!("[audio_prewarm_stream] Pre-warming stream spool for: {}", url);
    let reader = HttpStreamSource::start(url.clone(), None, user_agent, Some(app));
    *pre_lock = Some(PrewarmedStream {
        url,
        shared: reader.shared,
        created_at: std::time::Instant::now(),
    });

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

