import { cloneDeep } from 'lodash';
import { computed, type ComputedRef, nextTick, ref, watch } from 'vue';

import useIndexedDB from '@/hooks/IndexDBHook';
import { audioService } from '@/services/audioService';
import type { usePlayerStore } from '@/store';
import type { Artist, ILyricText, SongResult } from '@/types/music';
import { isDesktop, parseDurationToSeconds } from '@/utils';
import { getTextColors } from '@/utils/linearColor';
import { readLyricConfig } from '@/utils/lyricConfig';
import { parseLyrics } from '@/utils/yrcParser';

const windowData = window as any;

let playerStore: ReturnType<typeof usePlayerStore> | null = null;

export const normalizeArtistList = (artists: any[] | undefined, albumName?: string): Artist[] => {
  if (!artists || !Array.isArray(artists)) return [];
  const rawList: { name: string; id?: string }[] = [];
  for (const item of artists) {
    if (!item) continue;
    if (typeof item === 'string') {
      const parts = item.split(/\s*[/]\s*/).map((s) => s.trim()).filter(Boolean);
      for (const p of parts) {
        if (/^\d{4}$/.test(p) || /(plays|views)/i.test(p)) continue;
        const clean = p.replace(/\s*[•·]\s*\d{4}\b.*$/g, '').replace(/\s*[([]\s*\d{4}\s*[)\]]$/g, '').trim();
        if (clean && !/^\d{4}$/.test(clean)) {
          rawList.push({ name: clean });
        }
      }
    } else if (item.name) {
      if (typeof item.name === 'string') {
        const rawName = item.name.trim();
        if (/^\d{4}$/.test(rawName) || /(plays|views)/i.test(rawName)) continue;
        if (rawName.includes(' / ')) {
          const parts = rawName.split(/\s*[/]\s*/).map((s: string) => s.trim()).filter(Boolean);
          for (const p of parts) {
            if (/^\d{4}$/.test(p) || /(plays|views)/i.test(p)) continue;
            const clean = p.replace(/\s*[•·]\s*\d{4}\b.*$/g, '').replace(/\s*[([]\s*\d{4}\s*[)\]]$/g, '').trim();
            if (clean && !/^\d{4}$/.test(clean)) {
              rawList.push({ name: clean, id: item.id });
            }
          }
        } else {
          const clean = rawName.replace(/\s*[•·]\s*\d{4}\b.*$/g, '').replace(/\s*[([]\s*\d{4}\s*[)\]]$/g, '').trim();
          if (clean && !/^\d{4}$/.test(clean)) {
            rawList.push({ ...item, name: clean });
          }
        }
      }
    }
  }

  // Pre-scan: if any item has an album browseId, use it as albumName
  if (!albumName) {
    for (const entry of rawList) {
      if (entry.id && (entry.id.startsWith('MPREb') || entry.id.startsWith('OLAK5uy_'))) {
        albumName = entry.name;
        break;
      }
    }
  }

  const result: Artist[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < rawList.length; i++) {
    let name = rawList[i].name.trim();
    if (!name) continue;

    const id = rawList[i].id;
    if (id && (id.startsWith('MPREb') || id.startsWith('OLAK5uy_'))) {
      if (!albumName) albumName = name;
      continue;
    }

    // If single entry contains "Artist - Album/Release", extract just the artist
    if (rawList.length === 1 && /\s+[-–—]\s+/.test(name)) {
      const parts = name.split(/\s+[-–—]\s+/);
      if (parts[0] && parts[0].trim()) {
        name = parts[0].trim();
      }
    }

    const lower = name.toLowerCase();
    if (seen.has(lower)) continue;

    if (albumName && lower === albumName.toLowerCase().trim()) continue;

    let isAlbumSubtitle = false;
    for (const accepted of result) {
      const acceptedLower = accepted.name.toLowerCase();
      if (
        lower.startsWith(acceptedLower + ' - ') ||
        lower.startsWith(acceptedLower + ' – ') ||
        lower.startsWith(acceptedLower + ' — ')
      ) {
        isAlbumSubtitle = true;
        break;
      }
    }
    if (isAlbumSubtitle) continue;

    seen.add(lower);
    result.push({ ...rawList[i], name });
  }

  return result;
};

export const initMusicHook = (store: ReturnType<typeof usePlayerStore>) => {
  playerStore = store;

  playMusic = computed(() => getPlayerStore().playMusic as SongResult);
  artistList = computed(() => {
    const song = getPlayerStore().playMusic;
    const raw = (song?.ar || song?.artists) as Artist[];
    const album = song?.al?.name || (song as any)?.album;
    let albumStr = typeof album === 'string' ? album : album?.name;
    if (!albumStr && raw && Array.isArray(raw)) {
      for (const item of raw) {
        const id = (item as any)?.id;
        if (id && (id.startsWith('MPREb') || id.startsWith('OLAK5uy_'))) {
          albumStr = item.name;
          break;
        }
      }
    }
    return normalizeArtistList(raw, albumStr);
  });

  setupKeyboardListeners();
  setupMusicWatchers();
  setupCorrectionTimeWatcher();
  setupPlayStateWatcher();
  setupAudioListeners();
  void initPlatform();
};

const getPlayerStore = () => {
  if (!playerStore) {
    throw new Error('MusicHook not initialized. Call initMusicHook first.');
  }
  return playerStore;
};
export const isLyricsLoading = ref(false);
export const lrcArray = ref<ILyricText[]>([]);
export const lrcTimeArray = ref<number[]>([]);
export const nowTime = ref(0);
export const allTime = ref(0);
export const nowIndex = ref(0);
export const smoothTrackTimeMs = ref(0);
export const currentLrcProgress = ref(0);
export const sound = ref<any>(null);
export const isLyricWindowOpen = ref(false);
export const textColors = ref<any>(getTextColors());

export const supportAutoScroll = computed(() => {
  if (!lrcArray.value || lrcArray.value.length === 0) return false;
  return lrcArray.value.some((line) => line.startTime !== undefined && line.startTime !== -1);
});

export let playMusic: ComputedRef<SongResult>;
export let artistList: ComputedRef<Artist[]>;

let lastIndex = -1;
let lastAudioTimeSec = 0;
let lastAudioPerfTime = 0;
let smoothRafId: number | null = null;

export const updateSmoothProgress = () => {
  if (typeof window === 'undefined') return;
  const store = getPlayerStore();
  const isPlaying = store ? Boolean(store.isPlay ?? store.play) : false;
  if (isPlaying) {
    const elapsedSec = (performance.now() - lastAudioPerfTime) / 1000;
    const estTime = Math.max(0, lastAudioTimeSec + elapsedSec + correctionTime.value);
    smoothTrackTimeMs.value = estTime * 1000;
    smoothRafId = requestAnimationFrame(updateSmoothProgress);
  } else {
    smoothTrackTimeMs.value = Math.max(0, (nowTime.value + correctionTime.value) * 1000);
    smoothRafId = null;
  }
};

export const syncAudioTimestamp = (timeSecs: number) => {
  lastAudioTimeSec = timeSecs;
  lastAudioPerfTime = performance.now();
  smoothTrackTimeMs.value = Math.max(0, (timeSecs + correctionTime.value) * 1000);
  if (!smoothRafId && typeof window !== 'undefined') {
    smoothRafId = requestAnimationFrame(updateSmoothProgress);
  }
};

// Tauri has no synchronous IPC, so the platform is resolved once at startup.
let cachedPlatform = 'web';

/**
 * Resolve the host platform via the Tauri backend.
 * Linux-only features (tray lyrics) depend on this.
 */
export const initPlatform = async (): Promise<void> => {
  if (!isDesktop()) return;
  try {
    cachedPlatform = await window.api.getPlatform();
  } catch (error) {
    console.error('Failed to resolve host platform:', error);
  }
};

export const musicDB = await useIndexedDB(
  'musicDB',
  [
    { name: 'music', keyPath: 'id' },
    { name: 'music_lyric', keyPath: 'id' },
    { name: 'api_cache', keyPath: 'id' },
    { name: 'music_url_cache', keyPath: 'id' },
    { name: 'music_failed_cache', keyPath: 'id' }
  ],
  3
);

const handleKeyUp = (e: KeyboardEvent) => {
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    return;
  }

  const store = getPlayerStore();
  switch (e.code) {
    case 'Space':
      if (store.playMusic?.id) {
        void store.setPlay({ ...store.playMusic });
      }
      break;
    default:
  }
};

const setupKeyboardListeners = () => {
  document.removeEventListener('keyup', handleKeyUp);
  document.addEventListener('keyup', handleKeyUp);
};

import { containsKana, romanizeJapaneseLine } from '@/utils/romanize/japaneseRomanizer';

let audioListenersInitialized = false;

export const processLyricsDualLanguage = (lines: ILyricText[]): ILyricText[] => {
  if (!lines || lines.length === 0) return [];
  const hasJapanese = lines.some((l) => containsKana(l.text || ''));
  const isCjkText = (t: string) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/.test(t || '');
  const result: ILyricText[] = [];
  for (let i = 0; i < lines.length; i++) {
    const curr = lines[i];
    if (result.length > 0) {
      const prev = result[result.length - 1];
      const prevTime = prev.startTime ?? 0;
      const currTime = curr.startTime ?? 0;
      if (
        Math.abs(currTime - prevTime) <= 50 &&
        !prev.trText &&
        curr.text &&
        ((isCjkText(prev.text) && !isCjkText(curr.text)) || (!isCjkText(prev.text) && isCjkText(curr.text)))
      ) {
        prev.trText = curr.text;
        continue;
      }
    }
    const cloned = { ...curr };
    if (hasJapanese && (!cloned.romaText || !cloned.romaText.trim()) && cloned.text && cloned.text !== '•••') {
      const rom = romanizeJapaneseLine(cloned.text);
      if (rom && rom !== cloned.text) {
        cloned.romaText = rom;
      }
    }
    result.push(cloned);
  }
  return result;
};

export const insertPreambleIfNeeded = (lines: ILyricText[]): ILyricText[] => {
  if (!lines || lines.length === 0) return lines;

  const result: ILyricText[] = [];
  const first = lines[0];
  const firstTimeMs = first.startTime ?? 0;
  if (firstTimeMs >= 4000 && !first.isPreamble && first.text?.trim() !== '•••') {
    result.push({
      text: '•••',
      trText: '',
      romaText: '',
      startTime: 0,
      duration: firstTimeMs,
      isPreamble: true,
      hasWordByWord: false
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const curr = lines[i];
    const textTrimmed = curr.text ? curr.text.trim() : '';

    if (curr.isPreamble || textTrimmed === '•••') {
      const duration = curr.duration ?? 0;
      if (duration >= 3000) {
        result.push({
          ...curr,
          text: '•••',
          isPreamble: true,
          hasWordByWord: false
        });
      }
      continue;
    }

    if (textTrimmed === '') {
      continue;
    }

    result.push(curr);

    if (i < lines.length - 1) {
      const next = lines[i + 1];
      const nextTrimmed = next.text ? next.text.trim() : '';
      if (!nextTrimmed || nextTrimmed === '•••') continue;

      const currStart = curr.startTime ?? 0;
      const nextStart = next.startTime ?? 0;

      let vocalEnd = currStart;
      if (curr.words && curr.words.length > 0) {
        const lastWord = curr.words[curr.words.length - 1];
        const lastWordEnd = (lastWord.startTime ?? 0) + (lastWord.duration ?? 0);
        vocalEnd = Math.max(vocalEnd, lastWordEnd);
      } else if (curr.duration && curr.duration > 0) {
        vocalEnd = Math.max(vocalEnd, currStart + curr.duration);
      } else {
        const totalGap = nextStart - currStart;
        const wordCount = (curr.text || '').trim().split(/\s+/).length;
        const estimatedSungMs = Math.max(2200, Math.min(wordCount * 280 + 800, 5000));
        vocalEnd = currStart + Math.min(estimatedSungMs, totalGap * 0.7);
      }

      const musicStart = vocalEnd + 200;
      const musicEnd = nextStart;
      const breakDuration = musicEnd - musicStart;
      if (breakDuration >= 4500 && musicStart < musicEnd) {
        result.push({
          text: '•••',
          trText: '',
          romaText: '',
          startTime: musicStart,
          duration: breakDuration,
          isPreamble: true,
          hasWordByWord: false
        });
      }
    } else {
      const currStart = curr.startTime ?? 0;
      let vocalEnd = currStart;
      if (curr.words && curr.words.length > 0) {
        const lastWord = curr.words[curr.words.length - 1];
        const lastWordEnd = (lastWord.startTime ?? 0) + (lastWord.duration ?? 0);
        vocalEnd = Math.max(vocalEnd, lastWordEnd);
      } else if (curr.duration && curr.duration > 0) {
        vocalEnd = Math.max(vocalEnd, currStart + curr.duration);
      } else {
        const wordCount = (curr.text || '').trim().split(/\s+/).length;
        const estimatedSungMs = Math.max(2200, Math.min(wordCount * 280 + 800, 5000));
        vocalEnd = currStart + estimatedSungMs;
      }

      const totalMs = (allTime.value > 0 ? allTime.value : getExactSongDuration(getPlayerStore().playMusic)) * 1000;
      const musicStart = vocalEnd + 200;
      const breakDuration = totalMs - musicStart;
      if (totalMs > 0 && breakDuration >= 4000) {
        result.push({
          text: '•••',
          trText: '',
          romaText: '',
          startTime: musicStart,
          duration: breakDuration,
          isPreamble: true,
          hasWordByWord: false
        });
      }
    }
  }

  return result;
};

const parseLyricsString = async (
  lyricsStr: string
): Promise<{ lrcArray: ILyricText[]; lrcTimeArray: number[]; hasWordByWord: boolean }> => {
  if (!lyricsStr || typeof lyricsStr !== 'string') {
    return { lrcArray: [], lrcTimeArray: [], hasWordByWord: false };
  }

  try {
    const parseResult = parseLyrics(lyricsStr);
    if (!parseResult.success) {
      console.error('Lyrics parsing failed:', parseResult.error.message);
      return { lrcArray: [], lrcTimeArray: [], hasWordByWord: false };
    }

    const { lyrics } = parseResult.data;
    const lrcArray: ILyricText[] = [];
    let hasWordByWord = false;

    for (const line of lyrics) {
      const hasWords = line.words && line.words.length > 0;
      if (hasWords) {
        hasWordByWord = true;
      }

      lrcArray.push({
        text: line.fullText,
        trText: '',
        words: hasWords
          ? line.words.map((word) => ({
              ...word
            }))
          : undefined,
        hasWordByWord: hasWords,
        startTime: line.startTime,
        duration: line.duration
      });
    }
    const dual = processLyricsDualLanguage(lrcArray);
    const finalLines = insertPreambleIfNeeded(dual);
    const finalTimes = finalLines.map((l) => (l.startTime ?? 0) / 1000);
    return { lrcArray: finalLines, lrcTimeArray: finalTimes, hasWordByWord };
  } catch (error) {
    console.error('An error occurred while parsing lyrics:', error);
    return { lrcArray: [], lrcTimeArray: [], hasWordByWord: false };
  }
};

export const ensureLyricsLoaded = async (force = false) => {
  const songId = playMusic.value?.id;
  if (!songId) {
    lrcArray.value = [];
    lrcTimeArray.value = [];
    nowIndex.value = 0;
    isLyricsLoading.value = false;
    return;
  }
  if (!force && lrcArray.value.length > 0) {
    isLyricsLoading.value = false;
    return;
  }

  isLyricsLoading.value = true;
  await nextTick();

  try {

  const attemptBackgroundKaraokeUpgrade = async () => {
    if (!playMusic.value || playMusic.value.playMusicUrl?.startsWith('local://')) return;
    try {
      const title = playMusic.value.name || '';
      const artist = playMusic.value.ar?.[0]?.name || playMusic.value.artists?.[0]?.name || '';
      const videoId = playMusic.value.id;
      const durationSec = playMusic.value.dt
        ? playMusic.value.dt / 1000
        : (playMusic.value.duration || undefined);
      const config = readLyricConfig();
      const preferredProvider = config.preferredLyricProvider || 'auto';
      const fetchedLyrics = await window.api.fetchBestLyrics(title, artist, videoId, durationSec, preferredProvider);
      if (fetchedLyrics?.lines?.some((l: any) => l.words && l.words.length > 0)) {
        const rawLines = fetchedLyrics.lines.map((line: any) => ({
          text: line.text,
          trText: line.translation || line.trText || '',
          romaText: line.romaji || line.romaText || '',
          startTime: line.time,
          hasWordByWord: Array.isArray(line.words) && line.words.length > 0,
          words: Array.isArray(line.words)
            ? line.words.map((w: any, wIdx: number) => {
                const wordText = String(w.word || '');
                const nextWord = line.words[wIdx + 1];
                const nextText = nextWord ? String(nextWord.word || '') : '';
                const hasTrailingSpace = wordText.endsWith(' ') || nextText.startsWith(' ');
                const rawStart = Number(w.start) || 0;
                const lineTime = Number(line.time) || 0;
                const startTime = (rawStart < lineTime && rawStart < 60000 && lineTime > 5000)
                  ? lineTime + rawStart
                  : rawStart;
                return {
                  text: wordText.trim(),
                  word: wordText.trim(),
                  startTime,
                  duration: Math.max(Number(w.duration) || 0, 50),
                  space: hasTrailingSpace || (wIdx < line.words.length - 1 && !/[\u4e00-\u9fa5\u3040-\u30ff]/.test(wordText))
                };
              })
            : undefined
        }));
        const dualUpgraded = processLyricsDualLanguage(rawLines);
        const upgraded = insertPreambleIfNeeded(dualUpgraded);
        lrcArray.value = upgraded;
        lrcTimeArray.value = upgraded.map((l) => (l.startTime ?? 0) / 1000);
        if (playMusic.value) {
          (playMusic.value as any).lyric = {
            lrcArray: upgraded,
            lrcTimeArray: lrcTimeArray.value,
            hasWordByWord: true
          };
        }
      }
    } catch (upgradeErr) {
      console.warn('Background syllable upgrade check error:', upgradeErr);
    }
  };

  const lyricData = playMusic.value.lyric;
  if (lyricData && typeof lyricData === 'string') {
    const {
      lrcArray: parsedLrcArray,
      lrcTimeArray: parsedTimeArray,
      hasWordByWord
    } = await parseLyricsString(lyricData);
    lrcArray.value = parsedLrcArray;
    lrcTimeArray.value = parsedTimeArray;

    if (playMusic.value.lyric && typeof playMusic.value.lyric === 'object') {
      playMusic.value.lyric.hasWordByWord = hasWordByWord;
    }
    if (!hasWordByWord) {
      void attemptBackgroundKaraokeUpgrade();
    }
  } else if (lyricData && typeof lyricData === 'object' && lyricData.lrcArray?.length > 0) {
    const rawLrc = lyricData.lrcArray || [];

    let translated = rawLrc as any;
    try {
      const { translateLyrics } = await import('@/services/lyricTranslation');
      translated = await translateLyrics(rawLrc as any);
    } catch (e) {
      console.error('Failed to translate lyrics, use original lyrics:', e);
    }
    const dual = processLyricsDualLanguage(translated);
    const finalLines = insertPreambleIfNeeded(dual);
    lrcArray.value = finalLines;
    lrcTimeArray.value = finalLines.map((l) => (l.startTime ?? 0) / 1000);

    const hasAnyWordSync = finalLines.some((l) => l.hasWordByWord && l.words && l.words.length > 0);
    if (!hasAnyWordSync) {
      void attemptBackgroundKaraokeUpgrade();
    }
  } else if (playMusic.value.playMusicUrl?.startsWith('local://')) {
    try {
      let filePath = decodeURIComponent(playMusic.value.playMusicUrl.replace('local://', ''));

      if (/^\/[a-zA-Z]:\//.test(filePath)) {
        filePath = filePath.slice(1);
      }
      const embeddedLyrics = typeof (window.api as any)?.getEmbeddedLyrics === 'function'
        ? await (window.api as any).getEmbeddedLyrics(filePath)
        : null;
      if (embeddedLyrics) {
        const {
          lrcArray: parsedLrcArray,
          lrcTimeArray: parsedTimeArray,
          hasWordByWord
        } = await parseLyricsString(embeddedLyrics);
        lrcArray.value = parsedLrcArray;
        lrcTimeArray.value = parsedTimeArray;
        if (playMusic.value.lyric && typeof playMusic.value.lyric === 'object') {
          (playMusic.value.lyric as any).hasWordByWord = hasWordByWord;
        }
      }
    } catch (err) {
      console.error('Failed to extract embedded lyrics:', err);
    }
  } else {
    try {
        const title = playMusic.value.name || "";
        const artist =
          playMusic.value.ar?.[0]?.name || playMusic.value.artists?.[0]?.name || '';
        const videoId = playMusic.value.id;
        const durationSec = playMusic.value.dt
          ? playMusic.value.dt / 1000
          : (playMusic.value.duration || undefined);
        
        const config = readLyricConfig();
        const preferredProvider = config.preferredLyricProvider || 'auto';
        const fetchedLyrics = await window.api.fetchBestLyrics(title, artist, videoId, durationSec, preferredProvider);
        
        if (fetchedLyrics && fetchedLyrics.lines) {
            const rawLines = fetchedLyrics.lines.map((line: any) => ({
                text: line.text,
                trText: line.translation || line.trText || '',
                romaText: line.romaji || line.romaText || '',
                startTime: line.time,
                hasWordByWord: Array.isArray(line.words) && line.words.length > 0,
                words: Array.isArray(line.words)
                  ? line.words.map((w: any, wIdx: number) => {
                      const wordText = String(w.word || '');
                      const nextWord = line.words[wIdx + 1];
                      const nextText = nextWord ? String(nextWord.word || '') : '';
                      const hasTrailingSpace = wordText.endsWith(' ') || nextText.startsWith(' ');
                      const rawStart = Number(w.start) || 0;
                      const lineTime = Number(line.time) || 0;
                      const startTime = (rawStart < lineTime && rawStart < 60000 && lineTime > 5000)
                        ? lineTime + rawStart
                        : rawStart;
                      return {
                        text: wordText.trim(),
                        word: wordText.trim(),
                        startTime,
                        duration: Math.max(Number(w.duration) || 0, 50),
                        space: hasTrailingSpace || (wIdx < line.words.length - 1 && !/[\u4e00-\u9fa5\u3040-\u30ff]/.test(wordText))
                      };
                    })
                  : undefined
            }));
            const dual = processLyricsDualLanguage(rawLines);
            const finalLines = insertPreambleIfNeeded(dual);
            lrcArray.value = finalLines;
            lrcTimeArray.value = finalLines.map((l) => (l.startTime ?? 0) / 1000);
            
            const anyWords = finalLines.some((l) => l.hasWordByWord && l.words && l.words.length > 0);
            if (playMusic.value) {
              (playMusic.value as any).lyric = {
                lrcArray: finalLines,
                lrcTimeArray: lrcTimeArray.value,
                hasWordByWord: anyWords
              };
            }
            
            console.log(`Successfully loaded lyrics from provider: ${fetchedLyrics.provider} (synced: ${fetchedLyrics.is_synced})`);
        }
    } catch (err) {
        console.error("Failed to fetch lyrics from network providers:", err);
    }
  }
} finally {
  isLyricsLoading.value = false;
}

  if (isLyricWindowOpen.value) {
    sendLyricToWin();
    setTimeout(() => sendLyricToWin(), 500);
  }
};

export const getExactSongDuration = (song: SongResult | null | undefined): number => {
  if (!song) return 0;

  const rawDuration = (song as any).duration;
  if (typeof rawDuration === 'number' && !isNaN(rawDuration) && rawDuration > 0) {
    return rawDuration > 1000 ? Math.round(rawDuration / 1000) : Math.round(rawDuration);
  }
  if (typeof rawDuration === 'string') {
    const parsed = parseDurationToSeconds(rawDuration);
    if (parsed && parsed > 0) return parsed;
  }

  const rawDt = song.dt ?? (song as any).durationMs;
  if (typeof rawDt === 'number' && !isNaN(rawDt) && rawDt > 0) {
    return rawDt > 1000 ? Math.round(rawDt / 1000) : Math.round(rawDt);
  }
  if (typeof rawDt === 'string') {
    const parsed = parseDurationToSeconds(rawDt);
    if (parsed && parsed > 0) return parsed;
  }

  const other =
    (song as any).durationSeconds ??
    (song as any).duration_seconds ??
    (song as any).lengthSeconds ??
    (song as any).length_seconds ??
    (song as any).approxDurationMs ??
    (song as any).time;
  if (typeof other === 'number' && !isNaN(other) && other > 0) {
    return other > 1000 ? Math.round(other / 1000) : Math.round(other);
  }
  if (typeof other === 'string') {
    const parsed = parseDurationToSeconds(other);
    if (parsed && parsed > 0) return parsed;
  }

  if (song.id && typeof window !== 'undefined') {
    try {
      const queueRaw = localStorage.getItem('queue-store');
      if (queueRaw) {
        const queueParsed = JSON.parse(queueRaw);
        const items = queueParsed.queueItems || queueParsed.originalQueueItems;
        if (Array.isArray(items)) {
          const match = items.find((item: any) => String(item?.id) === String(song.id));
          if (match) {
            const mDur = (match as any).duration ?? match.dt;
            if (typeof mDur === 'number' && mDur > 0) {
              return mDur > 1000 ? Math.round(mDur / 1000) : Math.round(mDur);
            }
            if (typeof mDur === 'string') {
              const parsed = parseDurationToSeconds(mDur);
              if (parsed && parsed > 0) return parsed;
            }
          }
        }
      }
    } catch {
    }
  }

  if (song.id && typeof window !== 'undefined') {
    try {
      const saved = JSON.parse(localStorage.getItem('playProgress') || '{}');
      if (saved.songId && String(saved.songId) === String(song.id) && saved.duration > 0) {
        return Math.round(saved.duration);
      }
    } catch {
    }
  }

  return 0;
};

const setupMusicWatchers = () => {
  const store = getPlayerStore();

  watch(
    () => store.playMusic?.id,
    async (newId, oldId) => {
      if (oldId !== undefined && newId !== oldId) {
        isLyricsLoading.value = true;
        lrcArray.value = [];
        lrcTimeArray.value = [];
        const targetSeek = (store.playMusic as any)?.seekTargetTime || 0;
        nowTime.value = targetSeek;
        syncAudioTimestamp(targetSeek);
        nowIndex.value = 0;
        lastIndex = -1;
      }
      if (store.playMusic?.id) {
        const dur = getExactSongDuration(store.playMusic);
        allTime.value = dur > 0 ? dur : 0;
      } else {
        allTime.value = 0;
      }
      await ensureLyricsLoaded(true);
    },
    { immediate: true }
  );

  watch(
    [() => store.playMusic?.dt, () => (store.playMusic as any)?.duration],
    () => {
      if (store.playMusic?.id) {
        const dur = getExactSongDuration(store.playMusic);
        if (dur > 0) {
          allTime.value = dur;
        }
      }
    },
    { immediate: true }
  );

  watch(
    () => playMusic.value?.lyric,
    (newLyric) => {
      if (!playMusic.value?.id) return;

      const isRichLyric =
        !!newLyric && typeof newLyric === 'object' && (newLyric.lrcArray?.length ?? 0) > 0;
      if (lrcArray.value.length === 0 || isRichLyric) {
        ensureLyricsLoaded(isRichLyric);
      }
    }
  );
};

const setupAudioListeners = () => {
  if (audioListenersInitialized) {
    return () => {};
  }
  audioListenersInitialized = true;

  let interval: number | null = null;
  let recoveryTimer: number | null = null;
  let lastSavedProgress = 0;
  let lyricLastSend = 0;

  const clearInterval = () => {
    if (interval) {
      window.clearInterval(interval);
      interval = null;
    }
  };

  const stopRecovery = () => {
    if (recoveryTimer) {
      window.clearInterval(recoveryTimer);
      recoveryTimer = null;
    }
  };

  const startProgressInterval = () => {
    clearInterval();
    interval = window.setInterval(async () => {
      try {
        if (!audioService.isActuallyPlaying()) {
          return;
        }

        const currentTime = await window.api.audioGetTime();
        if (typeof currentTime !== 'number' || Number.isNaN(currentTime)) {
          return;
        }

        if (audioService.isSeeking()) {
          const target = audioService.getTargetSeekTime();
          if (target !== null) {
            if (Math.abs(currentTime - target) <= 1.2) {
              audioService.clearSeeking();
            } else {
              return;
            }
          }
        }

        nowTime.value = currentTime;
        syncAudioTimestamp(currentTime);
        const nativeDur = audioService.getDuration();
        if (nativeDur && nativeDur > 0) {
          allTime.value = nativeDur;
        }

        if (
          allTime.value > 2 &&
          nowTime.value >= allTime.value - 0.5
        ) {
          console.log('[MusicHook] Playback reached duration in progress interval, advancing to next song');
          audioService.triggerPlaybackEnded();
          return;
        }

        const newIndex = getLrcIndex(nowTime.value);
        if (newIndex !== nowIndex.value) {
          if (newIndex < nowIndex.value) {
            const currentLineStart = lrcTimeArray.value[nowIndex.value] ?? 0;
            if (nowTime.value >= currentLineStart - 0.25) {
              return;
            }
          }
          nowIndex.value = newIndex;
          currentLrcProgress.value = 0;
          if (isLyricWindowOpen.value) {
            sendLyricToWin();
          }
        }
        if (lrcArray.value[nowIndex.value]) {
          if (lastIndex !== nowIndex.value) {
            sendTrayLyric(nowIndex.value);
            lastIndex = nowIndex.value;
          }
        }

        const { start, end } = currentLrcTiming.value;
        if (typeof start === 'number' && typeof end === 'number' && start !== end) {
          const elapsed = currentTime - start;
          const duration = end - start;
          const progress = (elapsed / duration) * 100;
          currentLrcProgress.value = Math.min(Math.max(progress, 0), 100);
        }

        const now = Date.now();
        if (now - lyricLastSend >= 50) {
          try {
            const currentLine = lrcArray.value[nowIndex.value];
            window.api.sendLyric(
              JSON.stringify({
                type: 'update',
                nowIndex: nowIndex.value,
                nowTime: nowTime.value,
                isPlay: getPlayerStore().play,
                text: currentLine?.text || '',
                romaText: currentLine?.romaText || '',
                trText: currentLine?.trText || ''
              })
            );
            lyricLastSend = now;
          } catch {
            /* empty */
          }
        }

        if (
          Math.floor(currentTime) % 2 === 0 &&
          Math.floor(currentTime) !== Math.floor(lastSavedProgress)
        ) {
          lastSavedProgress = currentTime;
          if (getPlayerStore().playMusic?.id) {
            const currentDur =
              allTime.value > 0 ? allTime.value : getExactSongDuration(getPlayerStore().playMusic);
            localStorage.setItem(
              'playProgress',
              JSON.stringify({
                songId: getPlayerStore().playMusic.id,
                progress: currentTime,
                duration: currentDur > 0 ? currentDur : undefined
              })
            );
          }
        }
      } catch (error) {
        console.error('progress update interval Error:', error);
      }
    }, 50);
  };

  const startRecoveryMonitor = () => {
    stopRecovery();
    recoveryTimer = window.setInterval(() => {
      try {
        const store = getPlayerStore();
        if (store.play && !interval) {
          if (audioService.isActuallyPlaying()) {
            console.warn('[MusicHook] Playing detected but interval Lost, automatically restored');
            startProgressInterval();
          }
        }
      } catch {
        /* empty */
      }
    }, 500);
  };

  startRecoveryMonitor();

  audioService.on('play', () => {
    const store = getPlayerStore();
    store.setIsPlay(true);
    audioService.setBuffering(false);
    audioService.setLoading(false);
    const curr = store.playMusic;
    if (curr) {
      curr.playLoading = false;
      const dur = audioService.getDuration();
      if (dur && dur > 0) {
        allTime.value = dur;
        curr.dt = Math.round(dur * 1000);
        (curr as any).duration = Math.round(dur);
      }
    }
  });

  audioService.on('pause', () => {
    const store = getPlayerStore();
    store.setIsPlay(false);
  });

  audioService.on('timeupdate', (timeSecs: number) => {
    nowTime.value = timeSecs;
    syncAudioTimestamp(timeSecs);
    const store = getPlayerStore();
    if (!store.isPlay && audioService.isActuallyPlaying()) {
      store.setIsPlay(true);
    }
    const dur = audioService.getDuration() || 0;
    if (dur > 0) {
      allTime.value = dur;
    }
    const curr = store.playMusic;
    if (curr) {
      if (dur > 0 && (!curr.dt || !curr.duration)) {
        curr.dt = Math.round(dur * 1000);
        (curr as any).duration = Math.round(dur);
      }
      if (curr.playLoading) {
        curr.playLoading = false;
      }
    }
  });

  audioService.on('buffering', (isBuffering: boolean) => {
    if (!isBuffering) {
      const curr = getPlayerStore().playMusic;
      if (curr && curr.playLoading) {
        curr.playLoading = false;
      }
    }
  });

  audioService.on('seek_start', (time: number) => {
    nowTime.value = time;
    syncAudioTimestamp(time);
  });

  audioService.on('seek', async () => {
    try {
      const currentTime = await window.api.audioGetTime();
      if (typeof currentTime === 'number' && !Number.isNaN(currentTime)) {
        if (audioService.isSeeking()) {
          const target = audioService.getTargetSeekTime();
          if (target !== null && Math.abs(currentTime - target) > 1.2) {
            return;
          }
          audioService.clearSeeking();
        }
        nowTime.value = currentTime;
        syncAudioTimestamp(currentTime);

        if (lrcArray.value[nowIndex.value]) {
          if (lastIndex !== nowIndex.value) {
            sendTrayLyric(nowIndex.value);
            lastIndex = nowIndex.value;
          }
        }

        const newIndex = getLrcIndex(nowTime.value);
        if (newIndex !== nowIndex.value) {
          nowIndex.value = newIndex;
          if (isLyricWindowOpen.value) {
            sendLyricToWin();
          }
        }
      }
    } catch (error) {
      console.error('deal withseekEvent error:', error);
    }
  });

  const updateCurrentTimeAndDuration = async () => {
    try {
      const currentTime = await window.api.audioGetTime();
      if (typeof currentTime === 'number' && !Number.isNaN(currentTime)) {
        nowTime.value = currentTime;
        const dur = audioService.getDuration();
        if (dur && dur > 0) {
          allTime.value = dur;
        }
      }
    } catch (error) {
      console.error('Initialization time and progress failed:', error);
    }
  };

  updateCurrentTimeAndDuration();

  audioService.on('play', () => {
    getPlayerStore().setPlayMusic(true);
    const curr = getPlayerStore().playMusic;
    if (curr) {
      curr.playLoading = false;
    }
    window.api.sendSong({ ...cloneDeep(curr), is_playing: true });
    window.api.updatePlayState(true);

    if (lrcArray.value.length === 0 && playMusic.value?.id) {
      ensureLyricsLoaded();
    }
    startProgressInterval();
  });

  audioService.on('pause', () => {
    const curr = getPlayerStore().playMusic;
    if (curr?.playLoading || audioService.isLoading() || audioService.isBuffering()) {
      return;
    }
    console.log('Audio pause event triggered');
    getPlayerStore().setPlayMusic(false);
    if (curr?.id && nowTime.value > 0) {
      localStorage.setItem(
        'playProgress',
        JSON.stringify({
          songId: curr.id,
          progress: nowTime.value
        })
      );
    }
    window.api.sendSong({ ...cloneDeep(curr), is_playing: false });
    window.api.updatePlayState(false);
    clearInterval();
    if (isLyricWindowOpen.value) {
      sendLyricToWin();
    }
  });

  audioService.on('stop', () => {
    clearInterval();
    nowTime.value = 0;
    nowIndex.value = 0;
    lrcArray.value = [];
    lrcTimeArray.value = [];
    getPlayerStore().setPlayMusic(false);
    const curr = getPlayerStore().playMusic;
    window.api.sendSong({ ...cloneDeep(curr), is_playing: false });
    window.api.updatePlayState(false);
    if (isLyricWindowOpen.value) {
      sendLyricToWin();
    }
  });

  const replayMusic = async (retryCount = 0) => {
    const MAX_REPLAY_RETRIES = 3;
    try {
      if (getPlayerStore().playMusicUrl && playMusic.value) {
        await audioService.play(getPlayerStore().playMusicUrl, playMusic.value);
        setupAudioListeners();
      } else {
        console.error('Single loop: None available URL or song data');
        const { useQueueStore } = await import('@/store/modules/queue');
        useQueueStore().nextPlayOnEnd();
      }
    } catch (error) {
      console.error('Single loop replay failed:', error);
      if (retryCount < MAX_REPLAY_RETRIES) {
        setTimeout(() => replayMusic(retryCount + 1), 1000 * (retryCount + 1));
      } else {
        const { useQueueStore } = await import('@/store/modules/queue');
        useQueueStore().nextPlayOnEnd();
      }
    }
  };

  audioService.on('end', async () => {
    console.log('[MusicHook] Audio playback end event triggered');
    clearInterval();

    const { useQueueStore } = await import('@/store/modules/queue');
    useQueueStore().nextPlayOnEnd();
  });

  audioService.on('previoustrack', () => {
    getPlayerStore().prevPlay();
  });

  audioService.on('nexttrack', () => {
    getPlayerStore().nextPlay();
  });

  return () => {
    clearInterval();
    stopRecovery();
  };
};

export const play = () => {
  audioService.resume();
};

export const pause = async () => {
  try {
    const currentTime = await window.api.audioGetTime();
    if (getPlayerStore().playMusic && getPlayerStore().playMusic.id) {
      localStorage.setItem(
        'playProgress',
        JSON.stringify({
          songId: getPlayerStore().playMusic.id,
          progress: currentTime
        })
      );
    }

    audioService.pause();
  } catch (error) {
    console.error('Pause playback error:', error);
  }
};

const CORRECTION_KEY = 'lyric-correction-map';
const correctionTimeMap = ref<Record<string, number>>({});

const loadCorrectionMap = () => {
  try {
    const raw = localStorage.getItem(CORRECTION_KEY);
    correctionTimeMap.value = raw ? JSON.parse(raw) : {};
  } catch {
    correctionTimeMap.value = {};
  }
};
const saveCorrectionMap = () => {
  localStorage.setItem(CORRECTION_KEY, JSON.stringify(correctionTimeMap.value));
};

loadCorrectionMap();

export const correctionTime = ref(0);

const setupCorrectionTimeWatcher = () => {
  watch(
    () => playMusic.value?.id,
    (id) => {
      if (!id) return;
      correctionTime.value = correctionTimeMap.value[id] ?? 0;
    },
    { immediate: true }
  );
};

export const adjustCorrectionTime = (delta: number) => {
  const id = playMusic.value?.id;
  if (!id) return;
  const newVal = Math.max(-10, Math.min(10, (correctionTime.value ?? 0) + delta));
  correctionTime.value = newVal;
  correctionTimeMap.value[id] = newVal;
  saveCorrectionMap();
};

export const isCurrentLrc = (index: number, time: number): boolean => {
  const currentTime = lrcTimeArray.value[index];

  if (index === lrcTimeArray.value.length - 1) {
    const correctedTime = time + correctionTime.value;
    return correctedTime >= currentTime;
  }

  const nextTime = lrcTimeArray.value[index + 1];
  const correctedTime = time + correctionTime.value;
  return correctedTime >= currentTime && correctedTime < nextTime;
};

export const getLrcIndex = (time: number): number => {
  const correctedTime = time + correctionTime.value;

  if (lrcTimeArray.value.length === 0) {
    return nowIndex.value;
  }

  if (correctedTime < lrcTimeArray.value[0]) {
    const isPreamble = !!lrcArray.value[0]?.isPreamble;
    return isPreamble ? 0 : -1;
  }

  const lastIndex = lrcTimeArray.value.length - 1;
  if (correctedTime >= lrcTimeArray.value[lastIndex]) {
    return lastIndex;
  }

  for (let i = 0; i < lrcTimeArray.value.length - 1; i++) {
    const currentTime = lrcTimeArray.value[i];
    const nextTime = lrcTimeArray.value[i + 1];

    if (correctedTime >= currentTime && correctedTime < nextTime) {
      return i;
    }
  }

  return nowIndex.value;
};

const currentLrcTiming = computed(() => {
  const start = lrcTimeArray.value[nowIndex.value] || 0;
  const end = lrcTimeArray.value[nowIndex.value + 1] || start + 1;
  return { start, end };
});

export const getLrcStyle = (index: number) => {
  if (index === nowIndex.value) {
    return {
      color: '#ffffff',
      transition: 'color 0.25s ease'
    };
  }

  return {
    color: '#ffffff8a',
    transition: 'color 0.25s ease'
  };
};

export const useLyricProgress = () => {
  return {
    getLrcStyle
  };
};

export const setAudioTime = (index: number) => {
  const time = lrcTimeArray.value[index] || 0;
  nowTime.value = time;
  nowIndex.value = index;
  audioService.seek(time);
  audioService.resume();
};

export const getCurrentLrc = () => {
  const index = getLrcIndex(nowTime.value);
  return {
    currentLrc: lrcArray.value[index],
    nextLrc: lrcArray.value[index + 1]
  };
};

export const getLrcTimeRange = (index: number) => ({
  currentTime: lrcTimeArray.value[index],
  nextTime: lrcTimeArray.value[index + 1]
});

watch(
  () => lrcArray.value,
  (newLrcArray) => {
    if (newLrcArray.length > 0 && isLyricWindowOpen.value) {
      sendLyricToWin();
    }
  }
);

export const sendLyricToWin = () => {
  if (!playMusic.value || !playMusic.value.id) {
    return;
  }

  try {
    if (lrcArray.value && lrcArray.value.length > 0) {
      const nowIndex = getLrcIndex(nowTime.value);

      const updateData = {
        type: 'full',
        nowIndex,
        nowTime: nowTime.value,
        startCurrentTime: lrcTimeArray.value[nowIndex] || 0,
        nextTime: lrcTimeArray.value[nowIndex + 1] || 0,
        isPlay: getPlayerStore().play,
        lrcArray: lrcArray.value,
        lrcTimeArray: lrcTimeArray.value,
        allTime: allTime.value,
        playMusic: playMusic.value
      };

      window.api.sendLyric(JSON.stringify(updateData));
    } else {
      console.log('No lyric data available, sending empty lyric message');

      const emptyLyricData = {
        type: 'empty',
        nowIndex: 0,
        nowTime: nowTime.value,
        startCurrentTime: 0,
        nextTime: 0,
        isPlay: getPlayerStore().play,
        lrcArray: [{ text: 'The current song has no lyrics yet', trText: '' }],
        lrcTimeArray: [0],
        allTime: allTime.value,
        playMusic: playMusic.value
      };
      window.api.sendLyric(JSON.stringify(emptyLyricData));
    }
  } catch (error) {
    console.error('Error sending lyric update:', error);
  }
};

const sendTrayLyric = (index: number) => {
  if (cachedPlatform !== 'linux') return;

  try {
    const lyric = lrcArray.value[index];
    if (!lyric) return;

    const currentTime = lrcTimeArray.value[index] || 0;
    const nextTime = lrcTimeArray.value[index + 1] || currentTime + 3;
    const duration = nextTime - currentTime;

    const lrcObj = JSON.stringify({
      content: lyric.text || '',
      time: duration.toFixed(1),
      sender: 'ChorusDeck'
    });

    window.api.send('tray-lyric-update', lrcObj);
  } catch (error) {
    console.error('[TrayLyric] Failed to send:', error);
  }
};

let lyricSyncInterval: any = null;

const startLyricSync = () => {
  if (lyricSyncInterval) {
    clearInterval(lyricSyncInterval);
  }

  lyricSyncInterval = setInterval(() => {
    if (getPlayerStore().play && playMusic.value?.id) {
      try {
        const updateData = {
          type: 'update',
          nowIndex: getLrcIndex(nowTime.value),
          nowTime: nowTime.value,
          isPlay: getPlayerStore().play
        };
        window.api.sendLyric(JSON.stringify(updateData));
      } catch (error) {
        console.error('Failed to send lyrics progress update:', error);
      }
    }
  }, 1000);
};

const stopLyricSync = () => {
  if (lyricSyncInterval) {
    clearInterval(lyricSyncInterval);
    lyricSyncInterval = null;
  }
};

export const openLyric = async () => {
  isLyricWindowOpen.value = !isLyricWindowOpen.value;
  if (isLyricWindowOpen.value) {
    window.api.openLyric();

    if (!lrcArray.value || lrcArray.value.length === 0) {
      const emptyLyricData = {
        type: 'empty',
        nowIndex: 0,
        nowTime: nowTime.value,
        startCurrentTime: 0,
        nextTime: 0,
        isPlay: getPlayerStore().play,
        lrcArray: [{ text: 'Loading lyrics...', trText: '' }],
        lrcTimeArray: [0],
        allTime: allTime.value,
        playMusic: playMusic.value
      };
      window.api.sendLyric(JSON.stringify(emptyLyricData));

      await ensureLyricsLoaded(true);
    } else {
      sendLyricToWin();
    }

    setTimeout(() => {
      if (isLyricWindowOpen.value) {
        sendLyricToWin();
      }
    }, 500);

    startLyricSync();
  } else {
    closeLyric();

    stopLyricSync();
  }
};

export const closeLyric = () => {
  isLyricWindowOpen.value = false;
  windowData.api.onLyricWindowClosed?.();
  stopLyricSync();
};

const setupPlayStateWatcher = () => {
  watch(
    () => getPlayerStore().play,
    (isPlaying) => {
      if (isLyricWindowOpen.value) {
        if (isPlaying) {
          startLyricSync();
        } else {
          const pauseData = {
            type: 'update',
            isPlay: false
          };
          window.api.sendLyric(JSON.stringify(pauseData));
        }
      }
    }
  );
};

export const destroyMusicHook = () => {
  stopLyricSync();
};

export { parseLyricsString };

export const initAudioListeners = async () => {
  try {
    if (!getPlayerStore().playMusic || !getPlayerStore().playMusic.id) {
      console.log('No music playing, skipping audio listener initialization');
      return;
    }

    setupAudioListeners();

    if (isDesktop()) {
      window.api.onLyricWindowClosed(() => {
        isLyricWindowOpen.value = false;
      });
      window.api.onLyricWindowReady(async () => {
        if (!isLyricWindowOpen.value) return;

        if (lrcArray.value.length === 0 && playMusic.value?.id) {
          await ensureLyricsLoaded(true);
        }
        sendLyricToWin();
      });
    }
  } catch (error) {
    console.error('Failed to initialize audio listener:', error);
  }
};

const handleAudioReady = ((event: CustomEvent) => {
  try {
    setupAudioListeners();
  } catch (error) {
    console.error('Error handling audio ready event:', error);
  }
}) as EventListener;

window.removeEventListener('audio-ready', handleAudioReady);
window.addEventListener('audio-ready', handleAudioReady);

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    try {
      const store = getPlayerStore();
      if (store?.playMusic?.id && nowTime.value > 0) {
        const dur = allTime.value > 0 ? allTime.value : getExactSongDuration(store.playMusic);
        localStorage.setItem(
          'playProgress',
          JSON.stringify({
            songId: store.playMusic.id,
            progress: nowTime.value,
            duration: dur > 0 ? dur : undefined
          })
        );
      }
    } catch {
      // ignore
    }
  });
}
