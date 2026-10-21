use crate::lyrics::{parse_lrc_or_elrc_line, score_match, LyricLine, LyricResult};
use reqwest::Client;
use serde::Deserialize;
use std::time::Duration;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct PaxsenixSearchResult {
    id: String,
    title: Option<String>,
    name: Option<String>,
    artist: Option<String>,
    artist_name: Option<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct PaxsenixLyricsResponse {
    elrc_multi_person: Option<String>,
    elrc: Option<String>,
    plain: Option<String>,
}

pub async fn fetch(title: &str, artist: &str, duration: Option<f64>) -> Option<LyricResult> {
    let client = Client::builder()
        .timeout(Duration::from_secs(8))
        .build()
        .ok()?;

    let query = format!("{} {}", title, artist);
    let search_url = format!(
        "https://lyrics.paxsenix.org/apple-music/search?q={}",
        urlencoding::encode(&query)
    );

    let user_agent = "ChorusDeck/5.1.0 (https://github.com/chorus-mu)";

    let search_resp: Vec<PaxsenixSearchResult> = client
        .get(&search_url)
        .header("User-Agent", user_agent)
        .send()
        .await
        .ok()?
        .json()
        .await
        .ok()?;

    if search_resp.is_empty() {
        return None;
    }

    // Score candidates if title/artist are in search results
    let mut best_match = None;
    let mut highest_score = 0.45;

    for cand in search_resp {
        let cand_title = cand.title.as_deref().or(cand.name.as_deref()).unwrap_or("");
        let cand_artist = cand.artist.as_deref().or(cand.artist_name.as_deref()).unwrap_or("");

        let score = if cand_title.is_empty() {
            0.6 // Fallback if Paxsenix only returns id
        } else {
            score_match(title, artist, duration, cand_title, cand_artist, None)
        };

        if score > highest_score || best_match.is_none() {
            highest_score = score;
            best_match = Some(cand);
        }
    }

    let match_item = best_match?;

    let lyrics_url = format!(
        "https://lyrics.paxsenix.org/apple-music/lyrics?id={}",
        urlencoding::encode(&match_item.id)
    );

    let lyrics_resp: PaxsenixLyricsResponse = client
        .get(&lyrics_url)
        .header("User-Agent", user_agent)
        .send()
        .await
        .ok()?
        .json()
        .await
        .ok()?;

    // Check ELRC formats first (they have word/syllable sync)
    let (lyrics_str, is_synced) = if let Some(elrc) = lyrics_resp.elrc_multi_person.filter(|s| !s.is_empty()) {
        (elrc, true)
    } else if let Some(elrc) = lyrics_resp.elrc.filter(|s| !s.is_empty()) {
        (elrc, true)
    } else if let Some(plain) = lyrics_resp.plain.filter(|s| !s.is_empty()) {
        (plain, false)
    } else {
        return None;
    };

    let mut lines = Vec::new();
    for line in lyrics_str.lines() {
        if is_synced {
            if let Some(parsed) = parse_lrc_or_elrc_line(line) {
                lines.push(parsed);
            }
        } else if !line.trim().is_empty() {
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
        provider: "Paxsenix".to_string(),
        is_synced,
        lines,
    })
}
