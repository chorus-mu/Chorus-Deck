use crate::lyrics::{LyricLine, LyricResult, LyricWord};
use reqwest::Client;
use serde::Deserialize;
use std::time::Duration;
use regex::Regex;

#[derive(Deserialize)]
struct TTMLResponse {
    ttml: String,
}

pub async fn fetch(title: &str, artist: &str, _duration: Option<f64>) -> Option<LyricResult> {
    let client = Client::builder().timeout(Duration::from_secs(10)).build().ok()?;
    let url = "https://lyrics-api.boidu.dev/getLyrics";
    
    let resp = client.get(url)
        .query(&[("s", title), ("a", artist)])
        .header("User-Agent", "ChorusDeck/5.1.0 (https://github.com/chorus-mu)")
        .send()
        .await
        .ok()?;

    if !resp.status().is_success() {
        return None;
    }

    let ttml_res: TTMLResponse = resp.json().await.ok()?;
    if ttml_res.ttml.trim().is_empty() {
        return None;
    }
    
    let p_regex = Regex::new(r#"<p[^>]*begin="([^"]+)"[^>]*>(.*?)</p>"#).ok()?;
    let span_regex = Regex::new(r#"<span([^>]*)begin="([^"]+)"[^>]*end="([^"]+)"[^>]*>(.*?)</span>"#).ok()?;
    let trans_regex = Regex::new(r#"<span[^>]*role="x-translation"[^>]*>(.*?)</span>"#).ok()?;
    let roman_regex = Regex::new(r#"<span[^>]*role="x-roman"[^>]*>(.*?)</span>"#).ok()?;
    let strip_tags = Regex::new(r#"<[^>]+>"#).ok()?;
    
    let mut lines = Vec::new();
    
    for cap in p_regex.captures_iter(&ttml_res.ttml) {
        let begin_str = cap.get(1).map_or("", |m| m.as_str());
        let inner_html = cap.get(2).map_or("", |m| m.as_str());
        
        let line_time = parse_time(begin_str);
        
        let mut translation = None;
        if let Some(t_cap) = trans_regex.captures(inner_html) {
            let t_text = t_cap.get(1).map_or("", |m| m.as_str());
            let clean_t = strip_tags.replace_all(t_text, "");
            let decoded = decode_html_entities(&clean_t).trim().to_string();
            if !decoded.is_empty() {
                translation = Some(decoded);
            }
        }

        let mut romaji = None;
        if let Some(r_cap) = roman_regex.captures(inner_html) {
            let r_text = r_cap.get(1).map_or("", |m| m.as_str());
            let clean_r = strip_tags.replace_all(r_text, "");
            let decoded = decode_html_entities(&clean_r).trim().to_string();
            if !decoded.is_empty() {
                romaji = Some(decoded);
            }
        }

        let mut words = Vec::new();
        for span_cap in span_regex.captures_iter(inner_html) {
            let span_attrs = span_cap.get(1).map_or("", |m| m.as_str());
            let word_begin = span_cap.get(2).map_or("", |m| m.as_str());
            let word_end = span_cap.get(3).map_or("", |m| m.as_str());
            let word_text = span_cap.get(4).map_or("", |m| m.as_str());
            
            if span_attrs.contains("x-translation") || span_attrs.contains("x-roman") {
                continue;
            }

            let is_bg = span_attrs.contains("bg") || span_attrs.contains("background");
            let clean_word = strip_tags.replace_all(word_text, "").into_owned();
            let decoded_word = decode_html_entities(&clean_word).trim().to_string();
            
            if !decoded_word.is_empty() {
                let start = parse_time(word_begin);
                let end = parse_time(word_end);
                let text = if is_bg {
                    format!("{{bg}}{}", decoded_word)
                } else {
                    decoded_word
                };
                
                words.push(LyricWord {
                    word: text,
                    start,
                    duration: if end > start { end - start } else { 0 },
                });
            }
        }
        
        let without_trans = trans_regex.replace_all(inner_html, "");
        let without_both = roman_regex.replace_all(&without_trans, "");
        let line_text = strip_tags.replace_all(&without_both, "").into_owned();
        let clean_line_text = decode_html_entities(&line_text).trim().to_string();
        
        if !clean_line_text.is_empty() {
            lines.push(LyricLine {
                time: line_time,
                text: clean_line_text,
                words: if words.is_empty() { None } else { Some(words) },
                translation,
                romaji,
            });
        }
    }
    
    if lines.is_empty() {
        return None;
    }
    
    Some(LyricResult {
        provider: "BetterLyrics".to_string(),
        is_synced: true,
        lines,
    })
}

fn parse_time(time_str: &str) -> i64 {
    let parts: Vec<&str> = time_str.split(':').collect();
    let mut seconds = 0.0;
    
    if parts.len() == 3 {
        if let (Ok(h), Ok(m), Ok(s)) = (parts[0].parse::<f64>(), parts[1].parse::<f64>(), parts[2].parse::<f64>()) {
            seconds = h * 3600.0 + m * 60.0 + s;
        }
    } else if parts.len() == 2 {
        if let (Ok(m), Ok(s)) = (parts[0].parse::<f64>(), parts[1].parse::<f64>()) {
            seconds = m * 60.0 + s;
        }
    } else if parts.len() == 1 {
        if let Ok(s) = parts[0].parse::<f64>() {
            seconds = s;
        }
    }
    
    (seconds * 1000.0) as i64
}

fn decode_html_entities(text: &str) -> String {
    text.replace("&apos;", "'")
        .replace("&#39;", "'")
        .replace("&quot;", "\"")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&nbsp;", " ")
}
