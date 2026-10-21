use crate::lyrics::{parse_lrc_or_elrc_line, score_match, LyricLine, LyricResult};
use reqwest::Client;
use serde::Deserialize;
use std::time::Duration;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
struct LrcLibTrack {
    id: Option<i64>,
    track_name: Option<String>,
    artist_name: Option<String>,
    album_name: Option<String>,
    duration: Option<f64>,
    synced_lyrics: Option<String>,
    plain_lyrics: Option<String>,
}

pub async fn fetch(
    title: &str,
    artist: &str,
    album: Option<&str>,
    duration: Option<f64>,
) -> Option<LyricResult> {
    let client = Client::builder()
        .timeout(Duration::from_secs(8))
        .build()
        .ok()?;

    let user_agent = "ChorusDeck/5.1.0 (https://github.com/chorus-mu)";

    // 1. Try exact match /api/get if duration or title is available
    if let Some(dur) = duration {
        if dur > 10.0 {
            let mut params = vec![
                ("track_name", title.to_string()),
                ("artist_name", artist.to_string()),
                ("duration", (dur.round() as i64).to_string()),
            ];
            if let Some(alb) = album.filter(|a| !a.is_empty()) {
                params.push(("album_name", alb.to_string()));
            }

            let resp = client
                .get("https://lrclib.net/api/get")
                .header("User-Agent", user_agent)
                .query(&params)
                .send()
                .await;

            if let Ok(r) = resp {
                if r.status().is_success() {
                    if let Ok(track) = r.json::<LrcLibTrack>().await {
                        if track.synced_lyrics.is_some() || track.plain_lyrics.is_some() {
                            if let Some(res) = parse_track(track) {
                                return Some(res);
                            }
                        }
                    }
                }
            }
        }
    }

    // 2. Fall back to /api/search
    let query = format!("{} {}", title, artist);
    let resp = client
        .get("https://lrclib.net/api/search")
        .header("User-Agent", user_agent)
        .query(&[("q", &query)])
        .send()
        .await
        .ok()?;

    if !resp.status().is_success() {
        return None;
    }

    let tracks: Vec<LrcLibTrack> = resp.json().await.ok()?;
    if tracks.is_empty() {
        return None;
    }

    let mut best_track = None;
    let mut highest_score = 0.50; // Threshold

    for track in tracks {
        if track.synced_lyrics.is_none() && track.plain_lyrics.is_none() {
            continue;
        }

        let cand_title = track.track_name.as_deref().unwrap_or("");
        let cand_artist = track.artist_name.as_deref().unwrap_or("");
        let score = score_match(title, artist, duration, cand_title, cand_artist, track.duration);

        // Prioritize synced lyrics
        let adjusted_score = if track.synced_lyrics.is_some() {
            score * 1.15
        } else {
            score * 0.85
        };

        if adjusted_score > highest_score {
            highest_score = adjusted_score;
            best_track = Some(track);
        }
    }

    let track = best_track?;
    parse_track(track)
}

fn parse_track(track: LrcLibTrack) -> Option<LyricResult> {
    let is_synced = track.synced_lyrics.is_some();
    let raw_lyrics = track
        .synced_lyrics
        .clone()
        .or(track.plain_lyrics)
        .unwrap_or_default();

    let mut lines = Vec::new();
    for line in raw_lyrics.lines() {
        if let Some(parsed) = parse_lrc_or_elrc_line(line) {
            lines.push(parsed);
        } else if !line.trim().is_empty() {
            lines.push(LyricLine {
                time: 0,
                text: line.to_string(),
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
        provider: "LrcLib".to_string(),
        is_synced,
        lines,
    })
}
