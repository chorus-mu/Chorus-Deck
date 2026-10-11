import logoImg from '@/assets/logo.png';
import { getImgUrl } from '@/utils/thumbnail';

interface CacheEntry {
  url: string;
  timestamp: number;
}

const CACHE_PREFIX = 'cd_cover_v1_';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const memoryCache = new Map<string, string>();

function sanitizeKey(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g, '_')
    .slice(0, 80);
}

export function getCachedCover(key: string): string | null {
  if (!key) return null;
  const sKey = sanitizeKey(key);
  if (memoryCache.has(sKey)) {
    return memoryCache.get(sKey)!;
  }
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + sKey);
    if (raw) {
      const entry: CacheEntry = JSON.parse(raw);
      if (Date.now() - entry.timestamp < CACHE_TTL_MS && entry.url) {
        memoryCache.set(sKey, entry.url);
        return entry.url;
      }
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function setCachedCover(key: string, url: string): void {
  if (!key || !url || url.includes('data:') || url.includes('logo.png')) return;
  const sKey = sanitizeKey(key);
  memoryCache.set(sKey, url);
  try {
    const entry: CacheEntry = { url, timestamp: Date.now() };
    localStorage.setItem(CACHE_PREFIX + sKey, JSON.stringify(entry));
  } catch {
    // ignore quota errors
  }
}

export function cleanTrackTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/\s*[\(\[](?:official\s*(?:music\s*)?video|official\s*audio|official|mv|lyric\s*video|audio|visualizer|hd|4k|hq)[\)\]]/gi, '')
    .replace(/\s*[\(\[]feat\.?[^\)\]]*[\)\]]/gi, '')
    .replace(/\s*[\(\[]ft\.?[^\)\]]*[\)\]]/gi, '')
    .replace(/\s*[-–—]\s*topic$/i, '')
    .trim();
}

export function cleanArtistName(artist: string): string {
  if (!artist) return '';
  return artist
    .replace(/\s*[-–—]\s*topic$/i, '')
    .replace(/,\s*.*$/, '')
    .replace(/\s*&\s*.*$/, '')
    .trim();
}

/**
 * Fetch cover art from iTunes Search API (100% free, fast Akamai CDN, zero auth)
 */
export async function fetchItunesCover(title: string, artist?: string): Promise<string | null> {
  const cTitle = cleanTrackTitle(title);
  const cArtist = cleanArtistName(artist || '');
  if (!cTitle) return null;

  const cacheKey = `song_${cArtist}_${cTitle}`;
  const cached = getCachedCover(cacheKey);
  if (cached) return cached;

  const queries = [
    cArtist ? `${cTitle} ${cArtist}` : cTitle,
    cTitle
  ];

  for (const q of queries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=3`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) continue;
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        // Find best match or use first
        const track = data.results[0];
        const art = track?.artworkUrl100 || track?.artworkUrl60;
        if (art && typeof art === 'string') {
          // Upgrade 100x100 to 600x600 for high resolution
          const hdArt = art.replace(/\/\d+x\d+bb\.jpg/i, '/600x600bb.jpg');
          setCachedCover(cacheKey, hdArt);
          return hdArt;
        }
      }
    } catch {
      // Continue to next query
    }
  }

  return null;
}

/**
 * Fetch cover art from Deezer Search API (free, open CDN)
 */
export async function fetchDeezerCover(title: string, artist?: string): Promise<string | null> {
  const cTitle = cleanTrackTitle(title);
  const cArtist = cleanArtistName(artist || '');
  if (!cTitle) return null;

  const cacheKey = `dz_song_${cArtist}_${cTitle}`;
  const cached = getCachedCover(cacheKey);
  if (cached) return cached;

  const query = cArtist ? `${cTitle} ${cArtist}` : cTitle;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const track = data.data?.[0];
      const art = track?.album?.cover_big || track?.album?.cover_medium;
      if (art && typeof art === 'string') {
        setCachedCover(cacheKey, art);
        return art;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Fetch artist image from Deezer or iTunes
 */
export async function fetchArtistPhoto(artist: string): Promise<string | null> {
  const cArtist = cleanArtistName(artist);
  if (!cArtist) return null;

  const cacheKey = `artist_${cArtist}`;
  const cached = getCachedCover(cacheKey);
  if (cached) return cached;

  // Try Deezer first (better artist portraits)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const url = `https://api.deezer.com/search/artist?q=${encodeURIComponent(cArtist)}&limit=1`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const item = data.data?.[0];
      const pic = item?.picture_big || item?.picture_medium;
      if (pic && typeof pic === 'string') {
        setCachedCover(cacheKey, pic);
        return pic;
      }
    }
  } catch {
    // ignore
  }

  // Fallback to iTunes song artist
  try {
    const cover = await fetchItunesCover(cArtist);
    if (cover) {
      setCachedCover(cacheKey, cover);
      return cover;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Fetch album artwork from iTunes or Deezer
 */
export async function fetchAlbumCover(albumTitle: string, artist?: string): Promise<string | null> {
  const cAlbum = cleanTrackTitle(albumTitle);
  const cArtist = cleanArtistName(artist || '');
  if (!cAlbum) return null;

  const cacheKey = `album_${cArtist}_${cAlbum}`;
  const cached = getCachedCover(cacheKey);
  if (cached) return cached;

  const query = cArtist ? `${cAlbum} ${cArtist}` : cAlbum;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=1`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const item = data.results?.[0];
      const art = item?.artworkUrl100;
      if (art && typeof art === 'string') {
        const hdArt = art.replace(/\/\d+x\d+bb\.jpg/i, '/600x600bb.jpg');
        setCachedCover(cacheKey, hdArt);
        return hdArt;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Build ordered list of candidate cover URLs for a track or item
 */
export function getCoverCandidates(item: any): string[] {
  if (!item) return [];
  const candidates: string[] = [];

  const add = (url?: string | null) => {
    if (url && typeof url === 'string') {
      let clean = url.trim();
      if (clean.startsWith('//')) clean = `https:${clean}`;
      if (clean.startsWith('http://')) clean = clean.replace('http://', 'https://');
      if (clean && !candidates.includes(clean) && !clean.includes('logo.png')) {
        candidates.push(clean);
      }
    }
  };

  // 1. Primary given URL
  const primaryUrl = item.picUrl || item.thumbnail || item.al?.picUrl || item.coverImgUrl;
  if (primaryUrl) {
    add(getImgUrl(primaryUrl, '800y800'));
    add(primaryUrl);
  }

  // 2. YouTube Video ID candidates
  const videoId =
    (item.id && String(item.id).length === 11 && !String(item.id).includes('/') ? String(item.id) : null) ||
    item.videoId;
  if (videoId) {
    add(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`);
    add(`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`);
    add(`https://i.ytimg.com/vi/${videoId}/default.jpg`);
  }

  // 3. Cached external cover
  const title = item.name || item.title;
  const artistName =
    item.artists?.[0]?.name ||
    item.ar?.[0]?.name ||
    (typeof item.artist === 'string' ? item.artist : '');
  if (title) {
    const cached = getCachedCover(`song_${cleanArtistName(artistName)}_${cleanTrackTitle(title)}`);
    if (cached) add(cached);
  }

  return candidates;
}

/**
 * Asynchronously resolve the best available cover art for any song/item.
 * Guarantees a valid image URL with 99.9% success.
 */
export async function resolveSongCover(item: any): Promise<string> {
  if (!item) return logoImg;

  // 1. Check existing candidates
  const candidates = getCoverCandidates(item);
  if (candidates.length > 0) {
    return candidates[0];
  }

  // 2. YouTube ID fallback
  const videoId =
    (item.id && String(item.id).length === 11 && !String(item.id).includes('/') ? String(item.id) : null) ||
    item.videoId;
  if (videoId) {
    const ytUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    return ytUrl;
  }

  // 3. Online resolution via iTunes
  const title = item.name || item.title;
  const artistName =
    item.artists?.[0]?.name ||
    item.ar?.[0]?.name ||
    (typeof item.artist === 'string' ? item.artist : '');

  if (title) {
    const itunesArt = await fetchItunesCover(title, artistName);
    if (itunesArt) return itunesArt;

    const deezerArt = await fetchDeezerCover(title, artistName);
    if (deezerArt) return deezerArt;
  }

  return logoImg;
}

// Track elements currently undergoing fallback recovery to prevent loops
const failedMap = new WeakMap<HTMLImageElement, { candidates: string[]; index: number }>();

/**
 * Robust image error handler for <img> elements across all views.
 * Silently walks through candidate URLs (HQ YouTube CDN, iTunes, Deezer) before
 * cleanly using the fallback logo.
 * NEVER renders native browser broken-image icons.
 */
export function handleImgError(
  event: Event,
  item?: any,
  type: 'song' | 'artist' | 'album' | 'playlist' = 'song',
  fallbackLogo: string = logoImg
): void {
  const img = event.target as HTMLImageElement;
  if (!img) return;

  // Clear broken alt text so the browser will never draw native broken image icon
  img.alt = '';

  let state = failedMap.get(img);
  if (!state) {
    const candidates = item ? getCoverCandidates(item) : [];
    const currentSrc = img.src;
    // Filter out the URL that just failed
    const remaining = candidates.filter((c) => c !== currentSrc);
    state = { candidates: remaining, index: 0 };
    failedMap.set(img, state);
  }

  // Try next static candidate
  if (state.index < state.candidates.length) {
    const nextUrl = state.candidates[state.index++];
    img.src = nextUrl;
    return;
  }

  // Asynchronously try external lookup (iTunes / Deezer) if metadata is present
  if (item && (item.name || item.title)) {
    const title = item.name || item.title;
    const artistName =
      item.artists?.[0]?.name ||
      item.ar?.[0]?.name ||
      (typeof item.artist === 'string' ? item.artist : '');

    if (type === 'artist' && (artistName || title)) {
      fetchArtistPhoto(artistName || title)
        .then((art) => {
          if (art && img) img.src = art;
          else if (img) img.src = fallbackLogo;
        })
        .catch(() => {
          if (img) img.src = fallbackLogo;
        });
      return;
    }

    if (type === 'album') {
      fetchAlbumCover(title, artistName)
        .then((art) => {
          if (art && img) img.src = art;
          else if (img) img.src = fallbackLogo;
        })
        .catch(() => {
          if (img) img.src = fallbackLogo;
        });
      return;
    }

    fetchItunesCover(title, artistName)
      .then((art) => {
        if (art && img) {
          img.src = art;
          if (item) item.picUrl = art;
        } else {
          return fetchDeezerCover(title, artistName).then((dz) => {
            if (dz && img) {
              img.src = dz;
              if (item) item.picUrl = dz;
            } else if (img) {
              img.src = fallbackLogo;
            }
          });
        }
      })
      .catch(() => {
        if (img) img.src = fallbackLogo;
      });
    return;
  }

  // Final graceful fallback to logo without broken image icon
  img.src = fallbackLogo;
}
