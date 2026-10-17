use regex::Regex;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use strsim::jaro_winkler;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LosslessMatch {
    pub url: String,
    pub bitrate: u32,
    pub mime_type: String,
    pub container: String,
    pub quality_badge: String,
    pub source: String,
    pub track_title: Option<String>,
    pub artist_name: Option<String>,
}

fn clean_string(input: &str) -> String {
    let re_parens = Regex::new(r"(?i)\s*[\(\[][^\)\]]*[\)\]]").unwrap();
    let re_feat = Regex::new(r"(?i)\b(feat\.|ft\.|official|music|video|audio)\b.*").unwrap();
    let s = input.to_lowercase();
    let s = re_parens.replace_all(&s, "");
    let s = re_feat.replace_all(&s, "");

    s.chars()
        .map(|c| {
            if c.is_alphanumeric() || c.is_whitespace() {
                c
            } else {
                ' '
            }
        })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join(" ")
}

fn verify_match(
    candidate_title: &str,
    candidate_artist: &str,
    candidate_dur_sec: Option<f64>,
    target_title: &str,
    target_artist: &str,
    target_dur_sec: Option<f64>,
) -> bool {
    let clean_cand_t = clean_string(candidate_title);
    let clean_targ_t = clean_string(target_title);

    if clean_cand_t.is_empty() || clean_targ_t.is_empty() {
        return false;
    }

    let title_sim = jaro_winkler(&clean_cand_t, &clean_targ_t);
    let title_ok = title_sim > 0.82
        || clean_cand_t.contains(&clean_targ_t)
        || clean_targ_t.contains(&clean_cand_t);

    if !title_ok {
        return false;
    }

    let clean_cand_a = clean_string(candidate_artist);
    let clean_targ_a = clean_string(target_artist);

    if !clean_targ_a.is_empty() && !clean_cand_a.is_empty() {
        let artist_sim = jaro_winkler(&clean_cand_a, &clean_targ_a);
        let artist_ok = artist_sim > 0.75
            || clean_cand_a.contains(&clean_targ_a)
            || clean_targ_a.contains(&clean_cand_a);
        if !artist_ok {
            return false;
        }
    }

    if let (Some(cand_d), Some(targ_d)) = (candidate_dur_sec, target_dur_sec) {
        if targ_d > 10.0 && cand_d > 10.0 {
            if (cand_d - targ_d).abs() > 4.0 {
                return false;
            }
        }
    }

    true
}

async fn query_hifi_mirror(
    client: &reqwest::Client,
    search_url: &str,
    target_title: &str,
    target_artist: &str,
    target_dur_sec: Option<f64>,
) -> Option<LosslessMatch> {
    let res = client
        .get(search_url)
        .header("User-Agent", "ChorusDeck/5.1.0")
        .header("Accept", "application/json")
        .timeout(Duration::from_millis(2500))
        .send()
        .await
        .ok()?;

    if !res.status().is_success() {
        return None;
    }

    let val: serde_json::Value = res.json().await.ok()?;

    let items = if let Some(arr) = val.as_array() {
        arr.clone()
    } else if let Some(data) = val.get("data").and_then(|d| d.as_array()) {
        data.clone()
    } else if let Some(items) = val
        .get("tracks")
        .and_then(|t| t.get("items"))
        .and_then(|i| i.as_array())
    {
        items.clone()
    } else if let Some(items) = val.get("items").and_then(|i| i.as_array()) {
        items.clone()
    } else {
        return None;
    };

    for item in items {
        let cand_title = item.get("title").and_then(|t| t.as_str()).unwrap_or("");
        let cand_artist = item
            .get("artist")
            .and_then(|a| {
                if let Some(s) = a.as_str() {
                    Some(s.to_string())
                } else if let Some(name) = a.get("name").and_then(|n| n.as_str()) {
                    Some(name.to_string())
                } else {
                    None
                }
            })
            .or_else(|| {
                item.get("artists")
                    .and_then(|arr| arr.as_array())
                    .and_then(|arr| arr.first())
                    .and_then(|a| a.get("name").and_then(|n| n.as_str()))
                    .map(|s| s.to_string())
            })
            .unwrap_or_default();

        let cand_duration = item
            .get("duration")
            .and_then(|d| d.as_f64())
            .or_else(|| item.get("durationMs").and_then(|d| d.as_f64()).map(|ms| ms / 1000.0));

        if verify_match(
            cand_title,
            &cand_artist,
            cand_duration,
            target_title,
            target_artist,
            target_dur_sec,
        ) {
            if let Some(stream_url) = item.get("streamUrl").and_then(|u| u.as_str()).or_else(|| {
                item.get("downloadUrl").and_then(|u| u.as_str())
            }).or_else(|| {
                item.get("url").and_then(|u| u.as_str())
            }) {
                let is_hires = item
                    .get("audioQuality")
                    .and_then(|q| q.as_str())
                    .map(|q| q.to_uppercase().contains("HI_RES") || q.to_uppercase().contains("HIRES"))
                    .unwrap_or(false);

                return Some(LosslessMatch {
                    url: stream_url.to_string(),
                    bitrate: if is_hires { 2116000 } else { 1411200 },
                    mime_type: "audio/flac".to_string(),
                    container: "flac".to_string(),
                    quality_badge: if is_hires { "HI-RES".to_string() } else { "LOSSLESS".to_string() },
                    source: "tidal".to_string(),
                    track_title: Some(cand_title.to_string()),
                    artist_name: Some(cand_artist),
                });
            }
        }
    }

    None
}

async fn query_archive_flac(
    client: &reqwest::Client,
    target_title: &str,
    target_artist: &str,
    target_dur_sec: Option<f64>,
) -> Option<LosslessMatch> {
    let clean_t = clean_string(target_title);
    let clean_a = clean_string(target_artist);

    if clean_t.len() < 3 {
        return None;
    }

    let query_param = format!("{} {}", clean_a, clean_t).trim().to_string();
    let encoded_query = urlencoding::encode(&query_param);
    let search_url = format!(
        "https://archive.org/advancedsearch.php?q={}+AND+mediatype:audio+AND+format:FLAC&fl[]=identifier,title,creator&rows=5&output=json",
        encoded_query
    );

    let res = client
        .get(&search_url)
        .header("User-Agent", "ChorusDeck/5.1.0 (Preservation Player)")
        .timeout(Duration::from_millis(2500))
        .send()
        .await
        .ok()?;

    if !res.status().is_success() {
        return None;
    }

    let data: serde_json::Value = res.json().await.ok()?;
    let docs = data.get("response").and_then(|r| r.get("docs")).and_then(|d| d.as_array())?;

    for doc in docs {
        let identifier = doc.get("identifier").and_then(|i| i.as_str())?;
        let doc_creator = doc.get("creator").and_then(|c| c.as_str()).unwrap_or("");
        let doc_title = doc.get("title").and_then(|t| t.as_str()).unwrap_or("");

        if !clean_a.is_empty() && clean_a.len() >= 2 {
            let clean_creator = clean_string(doc_creator);
            let clean_doc_t = clean_string(doc_title);
            let artist_found = clean_creator.contains(&clean_a)
                || clean_a.contains(&clean_creator)
                || clean_doc_t.contains(&clean_a);
            if !artist_found {
                continue;
            }
        }

        let meta_url = format!("https://archive.org/metadata/{}/files", identifier);
        let meta_res = client
            .get(&meta_url)
            .timeout(Duration::from_millis(2000))
            .send()
            .await
            .ok()?;

        if !meta_res.status().is_success() {
            continue;
        }

        let meta_val: serde_json::Value = meta_res.json().await.ok()?;
        let files = meta_val.get("result").and_then(|r| r.as_array())?;

        for file in files {
            let file_name = file.get("name").and_then(|n| n.as_str()).unwrap_or("");
            if !file_name.to_lowercase().ends_with(".flac") {
                continue;
            }

            let file_title = file.get("title").and_then(|t| t.as_str()).unwrap_or("");
            let file_dur: Option<f64> = file.get("length").and_then(|l| {
                if let Some(s) = l.as_str() {
                    s.parse::<f64>().ok()
                } else {
                    l.as_f64()
                }
            });

            if verify_match(
                if !file_title.is_empty() { file_title } else { file_name },
                doc_creator,
                file_dur,
                target_title,
                target_artist,
                target_dur_sec,
            ) {
                let stream_url = format!(
                    "https://archive.org/download/{}/{}",
                    identifier,
                    urlencoding::encode(file_name)
                );
                let format_str = file.get("format").and_then(|f| f.as_str()).unwrap_or("");
                let file_size = file.get("size").and_then(|s| {
                    if let Some(str_sz) = s.as_str() {
                        str_sz.parse::<u64>().ok()
                    } else {
                        s.as_u64()
                    }
                }).unwrap_or(0);

                let is_hires = format_str.contains("24bit") || file_size > 35 * 1024 * 1024;

                return Some(LosslessMatch {
                    url: stream_url,
                    bitrate: if is_hires { 2116000 } else { 1411200 },
                    mime_type: "audio/flac".to_string(),
                    container: "flac".to_string(),
                    quality_badge: if is_hires { "HI-RES".to_string() } else { "LOSSLESS".to_string() },
                    source: "archive".to_string(),
                    track_title: Some(file_title.to_string()),
                    artist_name: Some(doc_creator.to_string()),
                });
            }
        }
    }

    None
}

#[tauri::command(rename = "lossless:resolve-track")]
pub async fn lossless_resolve_track(
    title: String,
    artist: String,
    duration_sec: Option<f64>,
) -> Result<Option<LosslessMatch>, String> {
    if title.trim().is_empty() {
        return Ok(None);
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(3000))
        .build()
        .map_err(|e| e.to_string())?;

    let full_query = format!("{} {}", artist, title);
    let trimmed_query = full_query.trim();
    let encoded_query = urlencoding::encode(trimmed_query);

    let mirrors = vec![
        format!("https://hifi.binimum.org/search/?query={}", encoded_query),
        format!("https://lossless.wtf/api/search?q={}", encoded_query),
        format!("https://tracks.monochrome.st/search?q={}", encoded_query),
    ];

    let query_futures: Vec<_> = mirrors
        .into_iter()
        .map(|mirror_url| {
            let client = client.clone();
            let title = title.clone();
            let artist = artist.clone();
            Box::pin(async move {
                match query_hifi_mirror(&client, &mirror_url, &title, &artist, duration_sec).await {
                    Some(matched) => Ok(matched),
                    None => Err(()),
                }
            })
        })
        .collect();

    if let Ok((matched, _remaining)) = futures_util::future::select_ok(query_futures).await {
        return Ok(Some(matched));
    }

    if let Some(archive_match) = query_archive_flac(&client, &title, &artist, duration_sec).await {
        return Ok(Some(archive_match));
    }

    Ok(None)
}
