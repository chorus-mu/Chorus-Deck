use std::io::{self, Read, Seek, SeekFrom};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use parking_lot::{Condvar, Mutex};

pub const PREROLL: usize = 256 * 1024;

const CHUNK_PATIENCE: Duration = Duration::from_secs(20);

struct SpoolInner {
    data: Vec<u8>,
    is_complete: bool,
    error: Option<String>,
}

#[derive(Clone)]
pub struct Spool {
    inner: Arc<Mutex<SpoolInner>>,
    available: Arc<Condvar>,
    aborted: Arc<AtomicBool>,
}

impl Spool {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(SpoolInner {
                data: Vec::with_capacity(PREROLL * 4),
                is_complete: false,
                error: None,
            })),
            available: Arc::new(Condvar::new()),
            aborted: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn push_bytes(&self, bytes: &[u8]) {
        let mut inner = self.inner.lock();
        inner.data.extend_from_slice(bytes);
        self.available.notify_all();
    }

    pub fn mark_complete(&self) {
        let mut inner = self.inner.lock();
        inner.is_complete = true;
        self.available.notify_all();
    }

    pub fn set_error(&self, err: String) {
        let mut inner = self.inner.lock();
        inner.error = Some(err);
        self.available.notify_all();
    }

    pub fn abort(&self) {
        self.aborted.store(true, Ordering::SeqCst);
        self.available.notify_all();
    }
    pub fn is_preroll_ready(&self) -> bool {
        let inner = self.inner.lock();
        inner.is_complete || inner.data.len() >= PREROLL
    }

    pub fn reader(&self) -> SpoolReader {
        SpoolReader {
            spool: self.clone(),
            cursor: 0,
        }
    }

    pub fn len(&self) -> usize {
        self.inner.lock().data.len()
    }

    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

impl Default for Spool {
    fn default() -> Self {
        Self::new()
    }
}

pub struct SpoolReader {
    spool: Spool,
    cursor: usize,
}

impl Read for SpoolReader {
    fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
        if buf.is_empty() {
            return Ok(0);
        }

        let mut inner = self.spool.inner.lock();
        loop {
            if self.spool.aborted.load(Ordering::SeqCst) {
                return Err(io::Error::new(io::ErrorKind::Interrupted, "spool aborted"));
            }

            if let Some(ref err) = inner.error {
                return Err(io::Error::new(io::ErrorKind::Other, err.clone()));
            }

            let available = inner.data.len();
            if self.cursor < available {
                let to_read = (available - self.cursor).min(buf.len());
                buf[..to_read].copy_from_slice(&inner.data[self.cursor..self.cursor + to_read]);
                self.cursor += to_read;
                return Ok(to_read);
            }

            if inner.is_complete {
                return Ok(0); // EOF reached
            }

            // Wait for next bytes with timeout
            let wait_res = self.spool.available.wait_for(&mut inner, CHUNK_PATIENCE);
            if wait_res.timed_out() {
                return Err(io::Error::new(
                    io::ErrorKind::TimedOut,
                    "timed out waiting for incoming stream bytes",
                ));
            }
        }
    }
}

impl Seek for SpoolReader {
    fn seek(&mut self, pos: SeekFrom) -> io::Result<u64> {
        let mut inner = self.spool.inner.lock();

        let new_pos = match pos {
            SeekFrom::Start(offset) => offset as i64,
            SeekFrom::Current(offset) => (self.cursor as i64) + offset,
            SeekFrom::End(offset) => {
                while !inner.is_complete && inner.error.is_none() && !self.spool.aborted.load(Ordering::SeqCst) {
                    let wait_res = self.spool.available.wait_for(&mut inner, CHUNK_PATIENCE);
                    if wait_res.timed_out() {
                        return Err(io::Error::new(
                            io::ErrorKind::TimedOut,
                            "timed out waiting for stream completion during SeekFrom::End",
                        ));
                    }
                }
                (inner.data.len() as i64) + offset
            }
        };

        if new_pos < 0 {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "invalid seek to negative position",
            ));
        }

        self.cursor = new_pos as usize;
        Ok(self.cursor as u64)
    }
}
