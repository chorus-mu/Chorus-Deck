use std::collections::VecDeque;
use std::sync::atomic::{AtomicU8, AtomicU32, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;
use parking_lot::{Condvar, Mutex};

pub const QUEUED_CHUNKS: usize = 26;

pub const SPARES: usize = QUEUED_CHUNKS + 2;

pub const CHUNK_SAMPLES: usize = 4096;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum Admit {
    Open = 0,
    Cleared = 1,
    Armed = 2,
}

impl Admit {
    pub fn from_u8(v: u8) -> Self {
        match v {
            1 => Self::Cleared,
            2 => Self::Armed,
            _ => Self::Open,
        }
    }
}

pub struct Packet {
    pub samples: Vec<f32>,
    pub channels: u16,
    pub sample_rate: u32,
    pub generation: u32,
}

#[derive(Clone)]
pub struct Spares(Arc<Mutex<Vec<Vec<f32>>>>);

impl Spares {
    pub fn new() -> Self {
        let mut initial = Vec::with_capacity(SPARES);
        for _ in 0..SPARES {
            initial.push(Vec::with_capacity(CHUNK_SAMPLES * 2));
        }
        Self(Arc::new(Mutex::new(initial)))
    }

    pub fn take(&self, wanted: usize) -> Vec<f32> {
        let mut guard = self.0.lock();
        if let Some(mut buf) = guard.pop() {
            buf.clear();
            if buf.capacity() < wanted {
                buf.reserve(wanted - buf.capacity());
            }
            buf
        } else {
            Vec::with_capacity(wanted)
        }
    }

    pub fn recycle(&self, mut buf: Vec<f32>) {
        let mut guard = self.0.lock();
        if guard.len() < SPARES {
            buf.clear();
            guard.push(buf);
        }
    }
}

impl Default for Spares {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Clone)]
pub struct Cue {
    state: Arc<AtomicU8>,
    pub generation: Arc<AtomicU32>,
    pub played: Arc<AtomicU64>,
}

impl Cue {
    pub fn new() -> Self {
        Self {
            state: Arc::new(AtomicU8::new(Admit::Open as u8)),
            generation: Arc::new(AtomicU32::new(0)),
            played: Arc::new(AtomicU64::new(0)),
        }
    }

    pub fn clear(&self) {
        self.generation.fetch_add(1, Ordering::SeqCst);
        self.state.store(Admit::Cleared as u8, Ordering::SeqCst);
        self.played.store(0, Ordering::SeqCst);
    }

    pub fn arm(&self) {
        self.state.store(Admit::Armed as u8, Ordering::SeqCst);
    }

    pub fn is_cleared(&self) -> bool {
        self.state.load(Ordering::SeqCst) == Admit::Cleared as u8
    }

    pub fn admit(&self) -> bool {
        match Admit::from_u8(self.state.load(Ordering::SeqCst)) {
            Admit::Cleared => false,
            Admit::Armed => {
                let armed = self
                    .state
                    .compare_exchange(
                        Admit::Armed as u8,
                        Admit::Open as u8,
                        Ordering::SeqCst,
                        Ordering::SeqCst,
                    )
                    .is_ok();
                armed
            }
            Admit::Open => true,
        }
    }

    pub fn played_samples(&self) -> u64 {
        self.played.load(Ordering::Relaxed)
    }

    pub fn record_played(&self, count: u64) {
        self.played.fetch_add(count, Ordering::Relaxed);
    }
}

impl Default for Cue {
    fn default() -> Self {
        Self::new()
    }
}

pub struct PacedQueue {
    queue: Mutex<VecDeque<Packet>>,
    not_full: Condvar,
    not_empty: Condvar,
    spares: Spares,
    cue: Cue,
}

impl PacedQueue {
    pub fn new(cue: Cue, spares: Spares) -> Self {
        Self {
            queue: Mutex::new(VecDeque::with_capacity(QUEUED_CHUNKS)),
            not_full: Condvar::new(),
            not_empty: Condvar::new(),
            spares,
            cue,
        }
    }

    pub fn push(&self, packet: Packet) -> bool {
        let mut queue = self.queue.lock();

        while queue.len() >= QUEUED_CHUNKS {
            if packet.generation != self.cue.generation.load(Ordering::SeqCst) {
                self.spares.recycle(packet.samples);
                return false;
            }
            self.not_full.wait_for(&mut queue, Duration::from_millis(15));
        }

        if packet.generation != self.cue.generation.load(Ordering::SeqCst) {
            self.spares.recycle(packet.samples);
            return false;
        }

        queue.push_back(packet);
        self.not_empty.notify_one();
        true
    }

    pub fn pop(&self, timeout: Duration) -> Option<Packet> {
        let mut queue = self.queue.lock();
        if queue.is_empty() {
            let res = self.not_empty.wait_for(&mut queue, timeout);
            if res.timed_out() {
                return None;
            }
        }

        let packet = queue.pop_front()?;
        self.not_full.notify_one();
        Some(packet)
    }

    pub fn drain_and_recycle(&self) {
        let mut queue = self.queue.lock();
        while let Some(packet) = queue.pop_front() {
            self.spares.recycle(packet.samples);
        }
        self.not_full.notify_all();
    }
}
