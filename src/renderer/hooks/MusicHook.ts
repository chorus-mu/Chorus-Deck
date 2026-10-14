import { cloneDeep } from 'lodash';
import { computed, type ComputedRef, nextTick, ref, watch } from 'vue';

import useIndexedDB from '@/hooks/IndexDBHook';
import { audioService } from '@/services/audioService';
import type { usePlayerStore } from '@/store';
import type { Artist, ILyricText, SongResult } from '@/types/music';
import { isDesktop } from '@/utils';
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
        const clean = p.replace(/\s*[•·]\s*\d{4}\b.*$/g, '').replace(/\s*[\(\[]\s*\d{4}\s*[\)\]]$/g, '').trim();
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
            const clean = p.replace(/\s*[•·]\s*\d{4}\b.*$/g, '').replace(/\s*[\(\[]\s*\d{4}\s*[\)\]]$/g, '').trim();
            if (clean && !/^\d{4}$/.test(clean)) {
              rawList.push({ name: clean, id: item.id });
            }
          }
        } else {
          const clean = rawName.replace(/\s*[•·]\s*\d{4}\b.*$/g, '').replace(/\s*[\(\[]\s*\d{4}\s*[\)\]]$/g, '').trim();
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
export const currentLrcProgress = ref(0);
export const sound = ref<any>(null);
export const isLyricWindowOpen = ref(false);
export const textColors = ref<any>(getTextColors());

export let playMusic: ComputedRef<SongResult>;
export let artistList: ComputedRef<Artist[]>;

let lastIndex = -1;

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

let audioListenersInitialized = false;

export const processLyricsDualLanguage = (lines: ILyricText[]): ILyricText[] => {
  if (!lines || lines.length === 0) return [];
  const result: ILyricText[] = [];
  for (let i = 0; i < lines.length; i++) {
    const curr = lines[i];
    if (result.length > 0) {
      const prev = result[result.length - 1];
      const prevTime = prev.startTime ?? 0;
      const currTime = curr.startTime ?? 0;
      if (Math.abs(currTime - prevTime) <= 250 && !prev.trText && curr.text) {
        prev.trText = curr.text;
        continue;
      }
    }
    result.push({ ...curr });
  }
  return result;
};

export const insertPreambleIfNeeded = (lines: ILyricText[]): ILyricText[] => {
  if (!lines || lines.length === 0) return lines;

  const result: ILyricText[] = [];
  const first = lines[0];
  const firstTimeMs = first.startTime ?? 0;
  // Intro preamble only if the first vocal line starts after at least 5.0 seconds
  if (firstTimeMs >= 5000 && !first.isPreamble && first.text?.trim() !== '•••') {
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

  const MIN_INTERLUDE_GAP = 7000; // Genuine instrumental break (>= 7 seconds)
  for (let i = 0; i < lines.length; i++) {
    const curr = lines[i];
    const textTrimmed = curr.text ? curr.text.trim() : '';

    // If this line already represents explicit instrumental dots or preamble
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

    // Never convert a line that has words or lyrics into dots
    if (textTrimmed === '') {
      continue;
    }

    result.push(curr);

    // Check gap to the next vocal line
    if (i < lines.length - 1) {
      const next = lines[i + 1];
      const nextTrimmed = next.text ? next.text.trim() : '';
      if (!nextTrimmed || nextTrimmed === '•••') continue;

      const currStart = curr.startTime ?? 0;
      const nextStart = next.startTime ?? 0;
      const totalGap = nextStart - currStart;

      // Calculate actual end of vocals in the current line
      let vocalEnd = currStart;
      if (curr.words && curr.words.length > 0) {
        const lastWord = curr.words[curr.words.length - 1];
        const lastWordEnd = (lastWord.startTime ?? 0) + (lastWord.duration ?? 0);
        vocalEnd = Math.max(vocalEnd, lastWordEnd);
      }
      if (curr.duration && curr.duration > 0) {
        vocalEnd = Math.max(vocalEnd, currStart + curr.duration);
      }

      // If vocalEnd wasn't explicitly determined (e.g. standard line LRC without duration),
      // we must give the singer enough time so dots never overlap their singing.
      // An average sung line takes 3.5s - 4.5s.
      if (vocalEnd <= currStart) {
        vocalEnd = currStart + Math.min(Math.max(totalGap * 0.65, 3500), 5500);
      }

      const breakDuration = nextStart - vocalEnd;

      // Only insert interlude dots if there is a substantial instrumental gap (>= 7s)
      // and ensure the dots start after the singer has finished with a safety buffer.
      // In genuine Apple Music, dots appear as a lead-in / countdown (3-5s before the next line).
      if (totalGap >= MIN_INTERLUDE_GAP && breakDuration >= 4000) {
        const dotDuration = Math.min(breakDuration, 5000);
        const dotStartTime = nextStart - dotDuration;

        // Verify dots start strictly after the singer finished singing
        if (dotStartTime >= vocalEnd) {
          result.push({
            text: '•••',
            trText: '',
            romaText: '',
            startTime: dotStartTime,
            duration: dotDuration,
            isPreamble: true,
            hasWordByWord: false
          });
        }
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
  } else if (playMusic.value.playMusicUrl?.startsWith('local://')) {
    try {
      let filePath = decodeURIComponent(playMusic.value.playMusicUrl.replace('local://', ''));

      if (/^\/[a-zA-Z]:\//.test(filePath)) {
        filePath = filePath.slice(1);
      }
      const embeddedLyrics = await window.api.getEmbeddedLyrics(filePath);
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
                      return {
                        text: wordText.trim(),
                        word: wordText.trim(),
                        startTime: w.start,
                        duration: w.duration,
                        space: hasTrailingSpace || (wIdx < line.words.length - 1 && !/[\u4e00-\u9fa5\u3040-\u30ff]/.test(wordText))
                      };
                    })
                  : undefined
            }));
            const dual = processLyricsDualLanguage(rawLines);
            const finalLines = insertPreambleIfNeeded(dual);
            lrcArray.value = finalLines;
            lrcTimeArray.value = finalLines.map((l) => (l.startTime ?? 0) / 1000);
            
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

const setupMusicWatchers = () => {
  const store = getPlayerStore();

  watch(
    () => store.playMusic.id,
    async (newId, oldId) => {
      if (newId !== oldId) {
        isLyricsLoading.value = true;
        lrcArray.value = [];
        lrcTimeArray.value = [];
        nowTime.value = 0;
        nowIndex.value = 0;
        lastIndex = -1;
      }
      await ensureLyricsLoaded(true);
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
  const lyricThrottleCounter = 0;
  let lastSavedProgress = 0;

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

        nowTime.value = currentTime;
        allTime.value = audioService.getDuration() || 0;

        if (
          allTime.value > 5 &&
          nowTime.value >= allTime.value - 0.4 &&
          audioService.isActuallyPlaying()
        ) {
          console.log('[MusicHook] Playback reached duration in progress interval, advancing to next song');
          audioService.triggerPlaybackEnded();
          return;
        }

        const newIndex = getLrcIndex(nowTime.value);
        if (newIndex !== nowIndex.value) {
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

        let lyricLastSend = 0;
        const now = Date.now();
        if (now - lyricLastSend >= 50) {
          try {
            window.api.sendLyric(
              JSON.stringify({
                type: 'update',
                nowIndex: nowIndex.value,
                nowTime: nowTime.value,
                isPlay: getPlayerStore().play
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
            localStorage.setItem(
              'playProgress',
              JSON.stringify({
                songId: getPlayerStore().playMusic.id,
                progress: currentTime
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

  audioService.on('seek_start', (time: number) => {
    nowTime.value = time;
  });

  audioService.on('seek', async () => {
    try {
      const currentTime = await window.api.audioGetTime();
      if (typeof currentTime === 'number' && !Number.isNaN(currentTime)) {
        nowTime.value = currentTime;

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
        allTime.value = audioService.getDuration() || 0;
      }
    } catch (error) {
      console.error('Initialization time and progress failed:', error);
    }
  };

  updateCurrentTimeAndDuration();

  audioService.on('play', () => {
    getPlayerStore().setPlayMusic(true);
    window.api.sendSong(cloneDeep(getPlayerStore().playMusic));

    if (lrcArray.value.length === 0 && playMusic.value?.id) {
      ensureLyricsLoaded();
    }
    startProgressInterval();
  });

  audioService.on('pause', () => {
    console.log('Audio pause event triggered');
    getPlayerStore().setPlayMusic(false);
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
    nowIndex.value = 0;
    return 0;
  }

  const lastIndex = lrcTimeArray.value.length - 1;
  if (correctedTime >= lrcTimeArray.value[lastIndex]) {
    nowIndex.value = lastIndex;
    return lastIndex;
  }

  for (let i = 0; i < lrcTimeArray.value.length - 1; i++) {
    const currentTime = lrcTimeArray.value[i];
    const nextTime = lrcTimeArray.value[i + 1];

    if (correctedTime >= currentTime && correctedTime < nextTime) {
      nowIndex.value = i;
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
  const currentTime = nowTime.value + correctionTime.value;
  const start = lrcTimeArray.value[index];
  const end = lrcTimeArray.value[index + 1] ?? start + 1;

  if (currentTime >= start && currentTime < end) {
    const progress = ((currentTime - start) / (end - start)) * 100;
    return {
      backgroundImage: `linear-gradient(to right, #ffffff ${progress}%, #ffffff8a ${progress}%)`,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
      transition: 'background-image 0.1s linear'
    };
  }

  return {};
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
