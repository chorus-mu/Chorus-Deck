pub mod betterlyrics;
pub mod kugou;
pub mod lrclib;
pub mod paxsenix;
pub mod simpmusic;
pub mod youlyplus;

use regex::Regex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LyricLine {
    pub time: i64,
    pub text: String,
    pub words: Option<Vec<LyricWord>>,
    pub translation: Option<String>,
    pub romaji: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LyricWord {
    pub word: String,
    pub start: i64,
    pub duration: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LyricResult {
    pub provider: String,
    pub is_synced: bool,
    pub lines: Vec<LyricLine>,
}

pub fn parse_timestamp_ms(time_str: &str) -> Option<i64> {
    let parts: Vec<&str> = time_str.split(':').collect();
    let seconds: f64 = match parts.len() {
        3 => {
            let h = parts[0].parse::<f64>().ok()?;
            let m = parts[1].parse::<f64>().ok()?;
            let s = parts[2].parse::<f64>().ok()?;
            h * 3600.0 + m * 60.0 + s
        }
        2 => {
            let m = parts[0].parse::<f64>().ok()?;
            let s = parts[1].parse::<f64>().ok()?;
            m * 60.0 + s
        }
        1 => parts[0].parse::<f64>().ok()?,
        _ => return None,
    };

    Some((seconds * 1000.0).round() as i64)
}

/// Parse an Enhanced LRC (ELRC) line or standard LRC line.
/// Supports both:
/// - Standard: `[00:12.34]Hello world`
/// - Enhanced / Syllables: `[00:12.34]<00:12.34>Hello <00:13.00>world<00:14.20>`
pub fn parse_lrc_or_elrc_line(line: &str) -> Option<LyricLine> {
    let trimmed = line.trim();
    if !trimmed.starts_with('[') {
        return None;
    }

    let close_bracket = trimmed.find(']')?;
    if close_bracket < 2 {
        return None;
    }

    let line_time_str = &trimmed[1..close_bracket];
    let line_time = parse_timestamp_ms(line_time_str)?;
    let content = trimmed[close_bracket + 1..].trim();

    if content.is_empty() {
        return Some(LyricLine {
            time: line_time,
            text: String::new(),
            words: None,
            translation: None,
            romaji: None,
        });
    }

    // Check if the content contains ELRC `<time>word` tags
    if content.contains('<') && content.contains('>') {
        lazy_static::lazy_static! {
            static ref TAG_REGEX: Regex = Regex::new(r"<([^>]+)>([^<]*)").unwrap();
        }

        let mut words = Vec::new();
        let mut full_text = String::new();
        let mut tag_matches: Vec<(i64, String)> = Vec::new();

        for cap in TAG_REGEX.captures_iter(content) {
            let t_str = cap.get(1).map_or("", |m| m.as_str());
            let w_text = cap.get(2).map_or("", |m| m.as_str());
            if let Some(t_ms) = parse_timestamp_ms(t_str) {
                tag_matches.push((t_ms, w_text.to_string()));
            }
        }

        if !tag_matches.is_empty() {
            let count = tag_matches.len();
            for i in 0..count {
                let (start, ref text) = tag_matches[i];
                let next_start = if i + 1 < count {
                    tag_matches[i + 1].0
                } else {
                    start + 500 // Default 500ms duration for last syllable
                };

                let duration = if next_start > start {
                    next_start - start
                } else {
                    200
                };

                full_text.push_str(text);

                if !text.trim().is_empty() {
                    words.push(LyricWord {
                        word: text.clone(),
                        start,
                        duration,
                    });
                }
            }

            let final_text = if full_text.trim().is_empty() {
                TAG_REGEX.replace_all(content, "$2").trim().to_string()
            } else {
                full_text.trim().to_string()
            };

            return Some(LyricLine {
                time: line_time,
                text: final_text,
                words: if words.is_empty() { None } else { Some(words) },
                translation: None,
                romaji: None,
            });
        }
    }

    // Standard LRC line
    Some(LyricLine {
        time: line_time,
        text: content.to_string(),
        words: None,
        translation: None,
        romaji: None,
    })
}

/// Normalizes a track or artist string for fuzzy comparison.
pub fn normalize_string(s: &str) -> String {
    let lower = s.to_lowercase();
    lazy_static::lazy_static! {
        static ref CLEAN_REGEX: Regex = Regex::new(r"[\(\[\{].*?[\)\]\}]").unwrap();
        static ref PUNCT_REGEX: Regex = Regex::new(r"[^\p{L}\p{N}\s]").unwrap();
    }
    let without_parentheses = CLEAN_REGEX.replace_all(&lower, " ");
    let cleaned = PUNCT_REGEX.replace_all(&without_parentheses, " ");
    cleaned.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Calculate match confidence between expected and candidate (0.0 to 1.0).
pub fn score_match(
    expected_title: &str,
    expected_artist: &str,
    expected_duration: Option<f64>,
    candidate_title: &str,
    candidate_artist: &str,
    candidate_duration: Option<f64>,
) -> f64 {
    let norm_exp_title = normalize_string(expected_title);
    let norm_cand_title = normalize_string(candidate_title);
    let norm_exp_artist = normalize_string(expected_artist);
    let norm_cand_artist = normalize_string(candidate_artist);

    let title_sim = strsim::jaro_winkler(&norm_exp_title, &norm_cand_title);
    let artist_sim = if norm_exp_artist.is_empty() || norm_cand_artist.is_empty() {
        0.8
    } else {
        strsim::jaro_winkler(&norm_exp_artist, &norm_cand_artist)
    };

    let mut score = title_sim * 0.65 + artist_sim * 0.35;

    // Check duration match if both are available
    if let (Some(exp_d), Some(cand_d)) = (expected_duration, candidate_duration) {
        if exp_d > 0.0 && cand_d > 0.0 {
            let diff = (exp_d - cand_d).abs();
            if diff > 15.0 {
                score *= 0.5;
            } else if diff > 6.0 {
                score *= 0.85;
            } else {
                score *= 1.05;
            }
        }
    }

    score.min(1.0)
}
