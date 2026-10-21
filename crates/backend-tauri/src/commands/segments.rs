use std::time::Duration;

#[derive(Clone, Copy, Debug)]
pub struct Segment {
    pub at: usize,
    pub start: Duration,
}

#[derive(Clone, Debug)]
pub struct Segments {
    pub head: usize,
    pub segments: Vec<Segment>,
}

#[derive(Clone, Copy, Debug)]
pub struct Entry {
    pub head: usize,
    pub graft: usize,
    pub into: Duration,
}

impl Segments {
    pub fn read(data: &[u8]) -> Option<Self> {
        let mut at = 0;
        let mut head = None;
        while let Some((kind, body, end)) = next_box(data, at) {
            match &kind {
                b"moov" => head = Some(end),
                b"sidx" => return index(body, end, head?),
                b"moof" | b"mdat" => return None,
                _ => {}
            }
            at = end;
        }
        None
    }

    pub fn entry(&self, at: Duration) -> Option<Entry> {
        let found = self
            .segments
            .iter()
            .rev()
            .find(|segment| segment.start <= at)?;
        Some(Entry {
            head: self.head,
            graft: found.at,
            into: at.saturating_sub(found.start),
        })
    }

    pub fn count(&self) -> usize {
        self.segments.len()
    }
}

fn next_box(data: &[u8], at: usize) -> Option<([u8; 4], &[u8], usize)> {
    let size = u32::from_be_bytes(data.get(at..at + 4)?.try_into().ok()?) as u64;
    let kind: [u8; 4] = data.get(at + 4..at + 8)?.try_into().ok()?;
    let (header, size) = match size {
        1 => {
            let large = data.get(at + 8..at + 16)?;
            (16usize, u64::from_be_bytes(large.try_into().ok()?))
        }
        0 => (8usize, (data.len() - at) as u64),
        _ => (8usize, size),
    };
    let end = at.checked_add(usize::try_from(size).ok()?)?;
    if size < header as u64 {
        return None;
    }
    let body = data.get(at + header..end)?;
    Some((kind, body, end))
}

fn index(sidx: &[u8], end: usize, head: usize) -> Option<Segments> {
    let version = *sidx.first()?;
    let timescale = u64::from(read_u32(sidx, 8)?);
    if timescale == 0 {
        return None;
    }
    let (earliest, first, mut at) = match version {
        0 => (
            u64::from(read_u32(sidx, 12)?),
            u64::from(read_u32(sidx, 16)?),
            20,
        ),
        _ => (read_u64(sidx, 12)?, read_u64(sidx, 20)?, 28),
    };
    let count = u16::from_be_bytes(sidx.get(at + 2..at + 4)?.try_into().ok()?);
    at += 4;
    let mut offset = end.checked_add(usize::try_from(first).ok()?)?;
    let mut ticks = earliest;
    let mut segments = Vec::with_capacity(usize::from(count));
    for _ in 0..count {
        let reference = read_u32(sidx, at)?;
        let duration = read_u32(sidx, at + 4)?;
        at += 12;
        if reference >> 31 == 1 {
            return None;
        }
        segments.push(Segment {
            at: offset,
            start: Duration::from_secs_f64(ticks as f64 / timescale as f64),
        });
        offset = offset.checked_add((reference & 0x7fff_ffff) as usize)?;
        ticks += u64::from(duration);
    }
    Some(Segments { head, segments })
}

fn read_u32(data: &[u8], at: usize) -> Option<u32> {
    Some(u32::from_be_bytes(data.get(at..at + 4)?.try_into().ok()?))
}

fn read_u64(data: &[u8], at: usize) -> Option<u64> {
    Some(u64::from_be_bytes(data.get(at..at + 8)?.try_into().ok()?))
}
