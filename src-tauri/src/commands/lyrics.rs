use tauri::command;
use crate::lyrics::{betterlyrics, kugou, lrclib, paxsenix, simpmusic, youlyplus, LyricResult};

#[command]
pub async fn fetch_best_lyrics(
    title: String,
    artist: String,
    video_id: Option<String>,
    duration: Option<f64>,
    preferred_provider: Option<String>,
) -> Result<Option<LyricResult>, String> {
    let clean_title = title.trim();
    let clean_artist = artist.trim();
    let target_pref = preferred_provider
        .map(|p| p.trim().to_lowercase())
        .filter(|p| !p.is_empty() && p != "auto");

    let (lrclib_res, kugou_res, better_res, pax_res, simp_res, youlyplus_res) = tokio::join!(
        lrclib::fetch(clean_title, clean_artist, None, duration),
        kugou::fetch(clean_title, clean_artist, duration),
        betterlyrics::fetch(clean_title, clean_artist, duration),
        paxsenix::fetch(clean_title, clean_artist, duration),
        simpmusic::fetch(&video_id),
        youlyplus::fetch(clean_title, clean_artist, duration)
    );

    let candidates: Vec<LyricResult> = vec![lrclib_res, kugou_res, better_res, pax_res, simp_res, youlyplus_res]
        .into_iter()
        .flatten()
        .filter(|res| !res.lines.is_empty())
        .collect();

    if candidates.is_empty() {
        return Ok(None);
    }

    let mut scored: Vec<(i32, LyricResult)> = candidates
        .into_iter()
        .map(|res| {
            let mut score = 0;
            let total_lines = res.lines.len() as i32;
            let word_lines = res.lines.iter().filter(|l| l.words.as_ref().map_or(false, |w| !w.is_empty())).count() as i32;

            if let Some(ref pref) = target_pref {
                if res.provider.to_lowercase().contains(pref) {
                    score += 10000;
                }
            }

            if word_lines > 0 {
                score += 1000 + (word_lines * 5);
            } else if res.is_synced {
                score += 500 + total_lines.min(50);
            } else {
                score += 100 + total_lines.min(30);
            }
            match res.provider.as_str() {
                "BetterLyrics" | "Paxsenix" => score += 50,
                "YouLyPlus" => score += 40,
                "SimpMusic" => score += 30,
                "LrcLib" => score += 20,
                "KuGou" => score += 10,
                _ => {}
            }

            (score, res)
        })
        .collect();

    scored.sort_by(|a, b| b.0.cmp(&a.0));

    Ok(scored.into_iter().next().map(|(_, res)| res))
}

