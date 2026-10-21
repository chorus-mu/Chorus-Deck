use crate::lyrics::{parse_lrc_or_elrc_line, score_match, LyricLine, LyricResult};
use base64::{engine::general_purpose, Engine as _};
use regex::Regex;
use reqwest::Client;
use serde::Deserialize;
use std::time::Duration;

#[derive(Deserialize, Debug)]
struct KuGouSearchResponse {
    candidates: Option<Vec<KuGouCandidate>>,
}

#[derive(Deserialize, Debug)]
struct KuGouCandidate {
    id: String,
    accesskey: String,
    song: Option<String>,
    singer: Option<String>,
    duration: Option<f64>,
}

#[derive(Deserialize, Debug)]
struct KuGouDownloadResponse {
    content: String,
}

pub async fn fetch(title: &str, artist: &str, duration: Option<f64>) -> Option<LyricResult> {
    let client = Client::builder()
        .timeout(Duration::from_secs(8))
        .build()
        .ok()?;

    let query = format!("{} {}", title, artist);
    let mut search_url = format!(
        "http://lyrics.kugou.com/search?ver=1&man=yes&client=pc&keyword={}",
        urlencoding::encode(&query)
    );

    if let Some(dur) = duration {
        if dur > 5.0 {
            let dur_ms = (dur * 1000.0).round() as i64;
            search_url.push_str(&format!("&duration={}", dur_ms));
        }
    }

    let search_resp: KuGouSearchResponse = client
        .get(&search_url)
        .header("User-Agent", "KuGouMusic/1.0")
        .send()
        .await
        .ok()?
        .json()
        .await
        .ok()?;

    let candidates = search_resp.candidates?;
    if candidates.is_empty() {
        return None;
    }

    // Rank candidates by match confidence
    let mut best_candidate = None;
    let mut highest_score = 0.45; // Threshold

    for cand in candidates {
        let cand_song = cand.song.as_deref().unwrap_or("");
        let cand_singer = cand.singer.as_deref().unwrap_or("");
        let cand_dur_sec = cand.duration.map(|d| if d > 1000.0 { d / 1000.0 } else { d });

        let score = score_match(title, artist, duration, cand_song, cand_singer, cand_dur_sec);
        if score > highest_score {
            highest_score = score;
            best_candidate = Some(cand);
        }
    }

    let candidate = best_candidate?;

    let download_url = format!(
        "http://lyrics.kugou.com/download?ver=1&client=pc&id={}&accesskey={}&fmt=lrc&charset=utf8",
        candidate.id, candidate.accesskey
    );

    let dl_resp: KuGouDownloadResponse = client
        .get(&download_url)
        .header("User-Agent", "KuGouMusic/1.0")
        .send()
        .await
        .ok()?
        .json()
        .await
        .ok()?;

    let decoded = general_purpose::STANDARD.decode(&dl_resp.content).ok()?;
    let lrc_str = String::from_utf8(decoded).ok()?;

    // Strip KuGou metadata tags like [id:$00000000], [hash:...], [qq:...], etc.
    lazy_static::lazy_static! {
        static ref META_REGEX: Regex = Regex::new(r"\[(id|hash|qq|total|al|by):.*?\]\r?\n?").unwrap();
    }
    let cleaned = META_REGEX.replace_all(&lrc_str, "").to_string();

    let mut lines = Vec::new();
    for line in cleaned.lines() {
        if let Some(parsed) = parse_lrc_or_elrc_line(line) {
            lines.push(parsed);
        } else if !line.trim().is_empty() && !line.trim().starts_with('[') {
            lines.push(LyricLine {
                time: 0,
                text: line.trim().to_string(),
                words: None,
                translation: None,
                romaji: None,
            });
        }
    }

    if lines.is_empty() {
        return None;
    }

    Some(LyricResult {
        provider: "KuGou".to_string(),
        is_synced: true,
        lines,
    })
}
