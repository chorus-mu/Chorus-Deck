use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;
use parking_lot::RwLock;
use crate::audio::paced::Cue;

#[derive(Clone)]
pub struct PlaybackClock {
    cue: Cue,
    base_offset_secs: Arc<RwLock<f32>>,
    sample_rate: Arc<RwLock<u32>>,
    channels: Arc<RwLock<u16>>,
    is_playing: Arc<AtomicBool>,
    last_update: Arc<RwLock<Instant>>,
    last_computed_pos: Arc<RwLock<f32>>,
}

impl PlaybackClock {
    pub fn new(cue: Cue) -> Self {
        Self {
            cue,
            base_offset_secs: Arc::new(RwLock::new(0.0)),
            sample_rate: Arc::new(RwLock::new(44100)),
            channels: Arc::new(RwLock::new(2)),
            is_playing: Arc::new(AtomicBool::new(false)),
            last_update: Arc::new(RwLock::new(Instant::now())),
            last_computed_pos: Arc::new(RwLock::new(0.0)),
        }
    }

    pub fn reset_to(&self, seek_target_secs: f32, sample_rate: u32, channels: u16) {
        *self.base_offset_secs.write() = seek_target_secs;
        *self.sample_rate.write() = sample_rate.max(1);
        *self.channels.write() = channels.max(1);
        *self.last_update.write() = Instant::now();
        *self.last_computed_pos.write() = seek_target_secs;
    }

    pub fn set_playing(&self, playing: bool) {
        self.is_playing.store(playing, Ordering::SeqCst);
        *self.last_update.write() = Instant::now();
    }

    pub fn position_secs(&self) -> f32 {
        if !self.is_playing.load(Ordering::Relaxed) {
            return *self.last_computed_pos.read();
        }

        let base = *self.base_offset_secs.read();
        let rate = *self.sample_rate.read() as f32;
        let channels = *self.channels.read() as f32;
        let played = self.cue.played_samples() as f32;

        let sample_time = if rate > 0.0 && channels > 0.0 {
            played / (rate * channels)
        } else {
            0.0
        };

        let pos = base + sample_time;
        *self.last_computed_pos.write() = pos;
        pos
    }

    pub fn cue(&self) -> &Cue {
        &self.cue
    }
}
