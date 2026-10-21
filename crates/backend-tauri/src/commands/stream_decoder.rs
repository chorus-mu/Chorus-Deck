use std::io::{Read, Seek};
use std::time::Duration;

use rodio::source::SeekError;
use rodio::Source;
use symphonia::core::audio::{Channels, SampleBuffer, SignalSpec};
use symphonia::core::codecs::{Decoder as CodecDecoder, DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::errors::Error as SymphoniaError;
use symphonia::core::formats::{FormatOptions, FormatReader, Packet, SeekMode, SeekTo, SeekedTo};
use symphonia::core::io::{MediaSource, MediaSourceStream};
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use symphonia::core::units;
use symphonia::default::{get_codecs, get_probe};

const MAX_DECODE_RETRIES: usize = 3;

const STEREO: Channels = Channels::from_bits_truncate(0x3);

struct LengthSource<R, F> {
    inner: R,
    len: F,
    seekable: bool,
}

impl<R, F> Read for LengthSource<R, F>
where
    R: Read,
{
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        self.inner.read(buf)
    }
}

impl<R, F> Seek for LengthSource<R, F>
where
    R: Seek,
{
    fn seek(&mut self, pos: std::io::SeekFrom) -> std::io::Result<u64> {
        self.inner.seek(pos)
    }
}

impl<R, F> MediaSource for LengthSource<R, F>
where
    R: Read + Seek + Send + Sync + 'static,
    F: Fn() -> Option<u64> + Send + Sync + 'static,
{
    fn is_seekable(&self) -> bool {
        self.seekable
    }

    fn byte_len(&self) -> Option<u64> {
        if self.seekable {
            (self.len)()
        } else {
            None
        }
    }
}

fn sniff_note<R, F>(source: &mut LengthSource<R, F>) -> String
where
    R: Read + Seek + Send + Sync + 'static,
    F: Fn() -> Option<u64> + Send + Sync + 'static,
{
    use std::io::{Read, Seek, SeekFrom};

    let saved = source.stream_position().unwrap_or(0);
    let mut head = [0u8; 16];

    let read = match source.read(&mut head) {
        Ok(n) => n,
        Err(e) => {
            let _ = source.seek(SeekFrom::Start(saved));
            return format!(" (the stream failed before delivering data: {e})");
        }
    };
    let _ = source.seek(SeekFrom::Start(saved));

    if read == 0 {
        return " (the stream delivered no bytes)".to_string();
    }

    let looks_like = if head[..read.min(4)] == *b"ftyp" {
        " (bytes start with an MP4 `ftyp` box, so the container hint is wrong)"
    } else if head[0] == 0x1A && head[1] == 0x45 && head[2] == 0xDF && head[3] == 0xA3 {
        " (bytes start with an EBML header, so this is Matroska/WebM)"
    } else if head[..read.min(4)] == *b"OggS" {
        " (bytes start with an Ogg header)"
    } else if head[0] == b'<' || head[..read.min(14)] == *b"<!DOCTYPE html" {
        " (bytes look like HTML, so the request was probably rate limited)"
    } else {
        " (unrecognised leading bytes)"
    };

    format!(
        "{looks_like}; first bytes: {}",
        head[..read]
            .iter()
            .map(|b| format!("{b:02x}"))
            .collect::<Vec<_>>()
            .join(" ")
    )
}

pub struct StreamDecoder {
    format: Box<dyn FormatReader>,
    codec: Box<dyn CodecDecoder>,
    buffer: SampleBuffer<i16>,
    spec: SignalSpec,
    frame_offset: usize,
    track_id: u32,
    total_time: Option<units::Time>,
}

impl StreamDecoder {
    pub fn new<R, F>(source: R, extension: &str, len: F) -> Result<Self, String>
    where
        R: Read + Seek + Send + Sync + 'static,
        F: Fn() -> Option<u64> + Send + Sync + 'static,
    {
        Self::create(source, extension, len, true)
    }

    pub fn new_streaming<R, F>(source: R, extension: &str, len: F) -> Result<Self, String>
    where
        R: Read + Seek + Send + Sync + 'static,
        F: Fn() -> Option<u64> + Send + Sync + 'static,
    {
        Self::create(source, extension, len, false)
    }

    fn create<R, F>(source: R, extension: &str, len: F, seekable: bool) -> Result<Self, String>
    where
        R: Read + Seek + Send + Sync + 'static,
        F: Fn() -> Option<u64> + Send + Sync + 'static,
    {
        let mut wrapped = LengthSource { inner: source, len, seekable };
        let on_probe_failure = sniff_note(&mut wrapped);
        let stream = MediaSourceStream::new(Box::new(wrapped), Default::default());

        let mut hint = Hint::new();
        hint.with_extension(extension);

        let probed = get_probe()
            .format(
                &hint,
                stream,
                &FormatOptions {
                    enable_gapless: true,
                    ..Default::default()
                },
                &MetadataOptions::default(),
            )
            .map_err(|e| format!("could not probe the audio stream: {e}{on_probe_failure}"))?;

        let stream = probed
            .format
            .default_track()
            .ok_or_else(|| "audio stream contains no tracks".to_string())?;

        let track_id = probed
            .format
            .tracks()
            .iter()
            .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
            .ok_or_else(|| "audio stream has no decodable track".to_string())?
            .id;

        let track = probed
            .format
            .tracks()
            .iter()
            .find(|t| t.id == track_id)
            .ok_or_else(|| "audio track disappeared during probe".to_string())?;

        let codec = get_codecs()
            .make(&track.codec_params, &DecoderOptions::default())
            .map_err(|e| {
                format!("unsupported audio codec in this stream: {e}{on_probe_failure}")
            })?;

        let total_time = stream
            .codec_params
            .time_base
            .zip(stream.codec_params.n_frames)
            .map(|(base, frames)| base.calc_time(frames));

        let mut decoder = Self {
            format: probed.format,
            codec,
            buffer: SampleBuffer::new(0, SignalSpec::new(44_100, STEREO)),
            spec: SignalSpec::new(44_100, STEREO),
            frame_offset: 0,
            track_id,
            total_time,
        };

        decoder.prime()?;

        Ok(decoder)
    }

    fn prime(&mut self) -> Result<(), String> {
        let mut decode_errors = 0usize;

        loop {
            let packet = match self.format.next_packet() {
                Ok(packet) => packet,
                Err(SymphoniaError::IoError(e)) => {
                    return Err(format!("audio stream read failed: {e}"));
                }
                Err(e) => return Err(format!("could not read an audio packet: {e}")),
            };

            if packet.track_id() != self.track_id {
                continue;
            }

            match self.fill_from_packet(&packet) {
                Ok(()) => return Ok(()),
                Err(SymphoniaError::DecodeError(_)) => {
                    decode_errors += 1;
                    if decode_errors > MAX_DECODE_RETRIES {
                        return Err("audio packets could not be decoded".to_string());
                    }
                }
                Err(e) => return Err(format!("could not decode audio: {e}")),
            }
        }
    }

    fn fill_from_packet(&mut self, packet: &Packet) -> Result<(), SymphoniaError> {
        let decoded = self.codec.decode(packet)?;
        decoded.spec().clone_into(&mut self.spec);

        let duration = units::Duration::from(decoded.capacity() as u64);
        let mut buffer = SampleBuffer::<i16>::new(duration, self.spec);
        buffer.copy_interleaved_ref(decoded);

        self.buffer = buffer;
        self.frame_offset = 0;
        Ok(())
    }

    fn advance(&mut self) -> Result<(), SymphoniaError> {
        let mut decode_errors = 0usize;

        loop {
            let packet = self.format.next_packet()?;

            if packet.track_id() != self.track_id {
                continue;
            }

            match self.fill_from_packet(&packet) {
                Ok(()) => return Ok(()),
                Err(SymphoniaError::DecodeError(_)) => {
                    decode_errors += 1;
                    if decode_errors > MAX_DECODE_RETRIES {
                        return Err(SymphoniaError::ResetRequired);
                    }
                }
                Err(e) => return Err(e),
            }
        }
    }

    fn refine_position(&mut self, seeked: SeekedTo) -> Result<(), SeekError> {
        let mut to_pass = seeked.required_ts - seeked.actual_ts;

        let mut scanned = 0;
        let packet = loop {
            let candidate = self.format.next_packet().map_err(other)?;
            scanned += 1;
            if candidate.dur() > to_pass || scanned >= 16 {
                break candidate;
            }
            to_pass -= candidate.dur();
        };

        let mut decoded = self.codec.decode(&packet);
        for _ in 0..MAX_DECODE_RETRIES {
            if decoded.is_err() {
                let next = self.format.next_packet().map_err(other)?;
                decoded = self.codec.decode(&next);
            }
        }

        let decoded = decoded.map_err(other)?;
        decoded.spec().clone_into(&mut self.spec);

        let duration = units::Duration::from(decoded.capacity() as u64);
        let mut buffer = SampleBuffer::<i16>::new(duration, self.spec);
        buffer.copy_interleaved_ref(decoded);

        self.buffer = buffer;
        self.frame_offset = to_pass as usize * self.channels() as usize;
        Ok(())
    }
}

impl Iterator for StreamDecoder {
    type Item = i16;

    fn next(&mut self) -> Option<i16> {
        while self.frame_offset >= self.buffer.samples().len() {
            self.advance().ok()?;
        }

        let sample = *self.buffer.samples().get(self.frame_offset)?;
        self.frame_offset += 1;
        Some(sample)
    }
}

impl Source for StreamDecoder {
    fn current_frame_len(&self) -> Option<usize> {
        Some(self.buffer.samples().len())
    }

    fn channels(&self) -> u16 {
        self.spec.channels.count() as u16
    }

    fn sample_rate(&self) -> u32 {
        self.spec.rate
    }

    fn total_duration(&self) -> Option<Duration> {
        self.total_time
            .map(|t| Duration::new(t.seconds, (t.frac * 1e9).clamp(0.0, 1e9) as u32))
    }

    fn try_seek(&mut self, to: Duration) -> Result<(), SeekError> {
        let seconds = to.as_secs_f64();
        let past_end = self
            .total_time
            .is_some_and(|t| seconds >= t.seconds as f64 + t.frac - 0.001);

        let time = if past_end {
            skip_back_a_tiny_bit(units::Time::from(seconds))
        } else {
            units::Time::from(seconds)
        };

        let to_skip = self.frame_offset % self.channels() as usize;

        let seek_res = self
            .format
            .seek(
                SeekMode::Coarse,
                SeekTo::Time {
                    time,
                    track_id: None,
                },
            );

        let seeked = match seek_res {
            Ok(s) => s,
            Err(_) => self
                .format
                .seek(
                    SeekMode::Accurate,
                    SeekTo::Time {
                        time,
                        track_id: None,
                    },
                )
                .map_err(other)?,
        };

        self.refine_position(seeked)?;
        self.frame_offset += to_skip;

        Ok(())
    }
}

fn other<E>(e: E) -> SeekError
where
    E: std::error::Error + Send + 'static,
{
    SeekError::Other(Box::new(e))
}

/// Steps a timestamp back a hair so the seek target stays inside the stream.
fn skip_back_a_tiny_bit(mut time: units::Time) -> units::Time {
    time.frac -= 0.0001;
    if time.frac < 0.0 {
        time.seconds = time.seconds.saturating_sub(1);
        time.frac = 1.0 - time.frac;
    }
    time
}
