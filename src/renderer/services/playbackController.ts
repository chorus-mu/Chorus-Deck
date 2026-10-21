import { createDiscreteApi } from 'naive-ui';

import { loadLrc, useSongDetail } from '@/hooks/usePlayerHooks';
import { audioService } from '@/services/audioService';
import { playbackRequestManager } from '@/services/playbackRequestManager';
import type { SongResult } from '@/types/music';
import { getImageLinearBackground } from '@/utils/linearColor';
import { thumbTiny } from '@/utils/thumbnail';

const { message } = createDiscreteApi(['message']);

let generation = 0;

export const getCurrentGeneration = (): number => generation;

export let startupFetchPromise: Promise<SongResult | null> | null = null;

const getPlayerCoreStore = async () => {
  const { usePlayerCoreStore } = await import('@/store/modules/playerCore');
  return usePlayerCoreStore();
};

const getPlaylistStore = async () => {
  const { useQueueStore } = await import('@/store/modules/queue');
  return useQueueStore();
};

const getPlayHistoryStore = async () => {
  const { usePlayHistoryStore } = await import('@/store/modules/playHistory');
  return usePlayHistoryStore();
};

const getSettingsStore = async () => {
  const { useSettingsStore } = await import('@/store/modules/settings');
  return useSettingsStore();
};

const loadMetadata = async (
  music: SongResult
): Promise<{
  lyrics: SongResult['lyric'];
  backgroundColor: string;
  primaryColor: string;
}> => {
  const [lyrics, { backgroundColor, primaryColor }] = await Promise.all([
    (async () => {
      if (music.lyric && music.lyric.lrcTimeArray.length > 0) {
        return music.lyric;
      }
      return await loadLrc(music.id);
    })(),
    (async () => {
      if (music.backgroundColor && music.primaryColor) {
        return { backgroundColor: music.backgroundColor, primaryColor: music.primaryColor };
      }
      return await getImageLinearBackground(thumbTiny(music?.picUrl));
    })()
  ]);

  return { lyrics, backgroundColor, primaryColor };
};

const loadAndPlayAudio = async (song: SongResult, shouldPlay: boolean): Promise<boolean> => {
  if (!song.playMusicUrl) {
    throw new Error('Song is not playingURL');
  }

  const initialPosition = (song as any).seekTargetTime || 0;

  console.log(`[playbackController] Start playing: ${song.name}`);
  await audioService.play(song.playMusicUrl, song, shouldPlay, initialPosition || 0);

  window.dispatchEvent(
    new CustomEvent('audio-ready', {
      detail: { shouldPlay }
    })
  );

  return true;
};

const triggerPreload = async (song: SongResult): Promise<void> => {
  try {
    const playlistStore = await getPlaylistStore();
    const list = playlistStore.queueItems;
    if (Array.isArray(list) && list.length > 0) {
      const idx = list.findIndex(
        (item: SongResult) => item.id === song.id && item.source === song.source
      );
      if (idx !== -1) {
        playlistStore.preloadNextSongs(idx);
      }
    }
  } catch (e) {
    console.warn(
      'Preloading trigger failed (maybe dependency not loaded or circular dependency), ignored:',
      e
    );
  }
};

const updateDocumentTitle = (music: SongResult): void => {
  let title = music.name;
  const artistNames = (music.ar || music.artists)?.map((a) => a.name).join(', ');
  if (artistNames) {
    title += ` - ${artistNames}`;
  }
  document.title = 'Chorus Deck - ' + title;
};

export const playTrack = async (
  music: SongResult,
  shouldPlay: boolean = true,
  isContinuous: boolean = false
): Promise<boolean> => {
  const gen = ++generation;
  const requestId = playbackRequestManager.createRequest(music);
  console.log(
    `[playbackController] playTrack gen=${gen}, song: ${music.name}, requestId: ${requestId}, continuous=${isContinuous}`
  );

  const playerCore = await getPlayerCoreStore();
  const hasPreloadedUrl = Boolean(music.playMusicUrl);

  const seamless = isContinuous && hasPreloadedUrl;

  playerCore.play = shouldPlay;
  playerCore.userPlayIntent = shouldPlay;

  const initialSeek = (music as any).seekTargetTime || 0;

  if (!seamless) {
    playerCore.isPlay = false;
    music.playLoading = true;
    playerCore.playMusic = { ...music, playLoading: true };
    audioService.setLoading(true);
    audioService.setBuffering(true);
    audioService.prepareNextTrack().catch(() => {});
  } else {
    music.playLoading = false;
    playerCore.playMusic = { ...music, playLoading: false };
    audioService.setLoading(false);
    audioService.setBuffering(false);
  }

  try {
    const { nowTime, allTime, smoothTrackTimeMs, nowIndex, lrcArray, getExactSongDuration } =
      await import('@/hooks/MusicHook');
    const dur = getExactSongDuration(music);
    if (dur > 0) {
      allTime.value = dur;
      (music as any).duration = dur;
    }
    if (!seamless) {
      nowTime.value = initialSeek > 0 ? initialSeek : 0;
      smoothTrackTimeMs.value = nowTime.value * 1000;
      nowIndex.value = 0;
      const lyricObj = (music as any).lyric;
      if (lyricObj?.lyrics && lyricObj.lyrics.length > 0) {
        lrcArray.value = lyricObj.lyrics;
      } else {
        lrcArray.value = [];
      }
    }
  } catch {
    // Non-critical metadata initialization
  }

  if (startupFetchPromise && String(playerCore.playMusic?.id) === String(music.id)) {
    try {
      const detailed = await startupFetchPromise;
      if (detailed) {
        music = { ...music, ...detailed };
      }
    } catch {
      // ignore
    }
  }

  if (!playbackRequestManager.isRequestValid(requestId)) {
    console.log(`[playbackController] The request expires after it is created: ${requestId}`);
    audioService.setLoading(false);
    audioService.setBuffering(false);
    return false;
  }
  if (!playbackRequestManager.activateRequest(requestId)) {
    console.log(`[playbackController] Unable to activate request: ${requestId}`);
    audioService.setLoading(false);
    audioService.setBuffering(false);
    return false;
  }

  updateDocumentTitle(music);
  window.api.sendSong({ ...music, is_playing: false });
  window.api.updatePlayState(false);

  const originalMusic = { ...music };

  let loadedMetadata: {
    lyrics: SongResult['lyric'];
    backgroundColor: string;
    primaryColor: string;
  } | null = null;
  const applyLoadedMetadata = () => {
    if (!loadedMetadata || gen !== generation) return;
    playerCore.playMusic.lyric = loadedMetadata.lyrics;
    playerCore.playMusic.backgroundColor = loadedMetadata.backgroundColor;
    playerCore.playMusic.primaryColor = loadedMetadata.primaryColor;

    playerCore.playMusic = { ...playerCore.playMusic };
  };
  loadMetadata(originalMusic)
    .then((result) => {
      loadedMetadata = result;
      applyLoadedMetadata();
    })
    .catch((error) => {
      console.warn('[playbackController] Metadata loading failed:', error);
    });

  try {
    const playHistoryStore = await getPlayHistoryStore();
    playHistoryStore.addMusic(music);
  } catch (e) {
    console.warn('[playbackController] Failed to add playback history:', e);
  }

  try {
    const { getSongDetail } = useSongDetail();
    const updatedPlayMusic = await getSongDetail(originalMusic, requestId);

    if (gen !== generation) {
      console.log(
        `[playbackController] gen=${gen} Expired (after obtaining details), currently gen=${generation}`
      );
      audioService.setBuffering(false);
      return false;
    }

    playerCore.playMusic = updatedPlayMusic;
    playerCore.playMusicUrl = updatedPlayMusic.playMusicUrl as string;
    music.playMusicUrl = updatedPlayMusic.playMusicUrl as string;
    window.api.sendSong({ ...updatedPlayMusic, is_playing: false });

    if (originalMusic.urlRejectedAt) {
      playerCore.playMusic.urlRejectedAt = originalMusic.urlRejectedAt;
    }

    applyLoadedMetadata();
  } catch (error) {
    if (gen !== generation) {
      audioService.setBuffering(false);
      return false;
    }
    console.error('[playbackController] Failed to get song details:', error);
    message.error('Play Failed, Play Next Song');
    if (playerCore.playMusic) {
      playerCore.playMusic.playLoading = false;
    }
    audioService.setLoading(false);
    audioService.setBuffering(false);
    playerCore.setIsPlay(false);
    window.api.updatePlayState(false);
    playbackRequestManager.failRequest(requestId);
    return false;
  }

  try {
    const success = await loadAndPlayAudio(playerCore.playMusic, shouldPlay);

    if (gen !== generation) {
      console.log(
        `[playbackController] gen=${gen} Expired (after playing audio), currently gen=${generation}`
      );
      await audioService.stop();
      audioService.setLoading(false);
      audioService.setBuffering(false);
      return false;
    }

    if (success) {
      resetUrlExpiredRetry();
      playerCore.playMusic.playLoading = false;
      audioService.setLoading(false);
      audioService.setBuffering(false);
      playerCore.playMusic.isFirstPlay = false;
      playerCore.setIsPlay(true);
      playbackRequestManager.completeRequest(requestId);
      console.log(`[playbackController] gen=${gen} Played successfully: ${music.name}`);

      triggerPreload(playerCore.playMusic);

      return true;
    } else {
      if (playerCore.playMusic) {
        playerCore.playMusic.playLoading = false;
      }
      audioService.setLoading(false);
      audioService.setBuffering(false);
      playerCore.setIsPlay(false);
      window.api.updatePlayState(false);
      playbackRequestManager.failRequest(requestId);
      return false;
    }
  } catch (error) {
    if (gen !== generation) {
      console.log(`[playbackController] gen=${gen} Expired (abnormal playback), return silently`);
      audioService.setBuffering(false);
      return false;
    }

    console.error('[playbackController] Failed to play audio:', error);

    const errorMsg = error instanceof Error ? error.message : String(error);

    if (errorMsg.includes('Operation lock activated')) {
      try {
        audioService.forceResetOperationLock();
        console.log('[playbackController] Action lock has been forcefully reset');
      } catch (e) {
        console.error('[playbackController] Failed to reset operation lock:', e);
      }
    }

    const isStreamFailure =
      errorMsg.includes('Stream URL failed') ||
      errorMsg.includes('re-resolving') ||
      errorMsg.includes('Lossless stream failed');

    if (isStreamFailure) {
      console.warn(
        '[playbackController] Stream failed; automatic recovery in progress via url_expired event:',
        errorMsg
      );
      return false;
    }

    message.error('Play Failed, Play Next Song');
    if (playerCore.playMusic) {
      playerCore.playMusic.playLoading = false;
    }
    audioService.setLoading(false);
    audioService.setBuffering(false);
    playerCore.setIsPlay(false);
    playbackRequestManager.failRequest(requestId);
    return false;
  }
};
const MAX_URL_EXPIRED_RETRIES = 1;
let urlExpiredRetrySongId: string | number | null = null;
let urlExpiredRetryCount = 0;

const resetUrlExpiredRetry = (): void => {
  urlExpiredRetrySongId = null;
  urlExpiredRetryCount = 0;
};

export const stopAll = async (): Promise<void> => {
  generation++;
  resetUrlExpiredRetry();

  audioService.stop();
  audioService.setLoading(false);
  audioService.setBuffering(false);

  const playerCore = await getPlayerCoreStore();
  playerCore.setIsPlay(false);
  playerCore.userPlayIntent = false;
  playerCore.isFmPlaying = false;
  playerCore.playMusic = {} as SongResult;
  playerCore.playMusicUrl = '';

  try {
    const { nowTime, allTime, nowIndex } = await import('@/hooks/MusicHook');
    nowTime.value = 0;
    allTime.value = 0;
    nowIndex.value = 0;
  } catch (error) {
    console.error('[playbackController] Failed to reset the progress display:', error);
  }

  localStorage.removeItem('playProgress');
};

export const setupUrlExpiredHandler = (): void => {
  audioService.on('url_expired', async (expiredTrack: SongResult) => {
    if (!expiredTrack) return;

    const currentGen = generation;

    console.log(
      '[playbackController] detectedURLExpired events, ready to be reacquiredURL',
      expiredTrack.name
    );

    const playerCore = await getPlayerCoreStore();
    const isCurrentRequestedTrack = String(playerCore.playMusic?.id) === String(expiredTrack.id);

    if (!playerCore.userPlayIntent && !playerCore.play && !isCurrentRequestedTrack) {
      console.log(
        '[playbackController] The user has no intention to play and skipsURLExpiration processing'
      );
      return;
    }

    if (currentGen !== generation || !isCurrentRequestedTrack) {
      console.log(
        '[playbackController] The current song has been changed and skippedURLExpiration processing'
      );
      return;
    }

    if (urlExpiredRetrySongId === expiredTrack.id) {
      urlExpiredRetryCount++;
    } else {
      urlExpiredRetrySongId = expiredTrack.id;
      urlExpiredRetryCount = 1;
    }

    if (urlExpiredRetryCount > MAX_URL_EXPIRED_RETRIES) {
      console.warn(
        `[playbackController] ${expiredTrack.name} Recovery retry failed, switch to next song`
      );
      resetUrlExpiredRetry();
      try {
        const playlistStore = await getPlaylistStore();
        if (playlistStore.queueItems.length > 1 || playerCore.isFmPlaying) {
          playlistStore.nextPlay();
        } else {
          playerCore.setIsPlay(false);
        }
      } catch (error) {
        console.error('[playbackController] Failed to switch to next song:', error);
        playerCore.setIsPlay(false);
      }
      return;
    }

    let seekPosition = (expiredTrack as any)?.seekTargetTime || 0;
    if (!seekPosition) {
      try {
        seekPosition = await window.api.audioGetTime();
        const duration = audioService.getDuration();
        if (duration > 0 && seekPosition > 0 && duration - seekPosition < 5) {
          console.log(
            '[playbackController] The song is nearing the end, skipURLExpiration processing'
          );
          return;
        }
      } catch (error) {
        console.warn('[playbackController] Could not read playback position', error);
      }
    }

    if (currentGen !== generation || String(playerCore.playMusic?.id) !== String(expiredTrack.id)) {
      return;
    }

    try {
      const trackToPlay = {
        ...expiredTrack,
        losslessAttemptFailed: (expiredTrack as any)?.losslessAttemptFailed,
        qualityBadge: (expiredTrack as any)?.losslessAttemptFailed
          ? undefined
          : (expiredTrack as any)?.qualityBadge,
        isFirstPlay: true,
        playMusicUrl: undefined,
        mimeType: undefined,
        streamUserAgent: undefined,
        urlRejectedAt: (expiredTrack as any)?.urlRejectedAt || Date.now()
      } as SongResult;

      const success = await playTrack(trackToPlay, true);

      if (success && seekPosition > 0) {
        setTimeout(() => {
          try {
            audioService.seek(seekPosition);
          } catch {
            console.warn('[playbackController] Failed to restore playback position');
          }
        }, 300);
      }
    } catch (error) {
      console.error('[playbackController] deal withURLExpiration event failed:', error);
    }
  });
};

let lastYtmRequestKey: string | null = null;

export const setupYTMusicPlayHandler = (): void => {
  const handler = async (event: Event): Promise<void> => {
    const detail = (event as CustomEvent).detail as SongResult | undefined;

    if (!detail?.id || !detail?.name) {
      console.warn('[playbackController] ytm:play received a track without an id or name');
      return;
    }

    const requestKey = `${detail.source ?? 'ytmusic'}:${detail.id}`;

    if (lastYtmRequestKey === requestKey) return;
    lastYtmRequestKey = requestKey;
    setTimeout(() => {
      if (lastYtmRequestKey === requestKey) lastYtmRequestKey = null;
    }, 500);

    console.log(`[playbackController] ytm:play -> ${detail.name}`);

    try {
      await playTrack({ ...detail, playMusicUrl: undefined }, true);
    } catch (error) {
      console.error('[playbackController] Failed to start YouTube Music playback:', error);
      message.error('Play Failed, Play Next Song');
    }
  };

  window.addEventListener('ytm:play', handler as EventListener);
};

export const initializePlayState = async (): Promise<void> => {
  const playerCore = await getPlayerCoreStore();
  const settingsStore = await getSettingsStore();

  if (!playerCore.playMusic || Object.keys(playerCore.playMusic).length === 0) {
    console.log('[playbackController] No saved playback state, skipping initialization');

    setTimeout(() => {
      audioService.setPlaybackRate(playerCore.playbackRate);
    }, 2000);
    return;
  }

  try {
    console.log('[playbackController] Restore last played music:', playerCore.playMusic.name);
    const isPlaying = settingsStore.setData.autoPlay;

    if (!isPlaying) {
      console.log('[playbackController] Autoplay is disabled, only metadata is loaded');

      try {
        const { lyrics, backgroundColor, primaryColor } = await loadMetadata(playerCore.playMusic);
        playerCore.playMusic.lyric = lyrics;
        playerCore.playMusic.backgroundColor = backgroundColor;
        playerCore.playMusic.primaryColor = primaryColor;
      } catch (e) {
        console.warn('[playbackController] Loading metadata failed:', e);
      }

      playerCore.play = false;
      playerCore.isPlay = false;
      playerCore.userPlayIntent = false;
      if (playerCore.playMusic) {
        playerCore.playMusic.playLoading = false;
        if (!playerCore.playMusic.playMusicUrl?.startsWith('local://')) {
          playerCore.playMusic.playMusicUrl = undefined;
          playerCore.playMusicUrl = '';
        }
      }

      updateDocumentTitle(playerCore.playMusic);

      try {
        const queue = await getPlaylistStore();
        const { allTime, nowTime, getExactSongDuration } = await import('@/hooks/MusicHook');
        let initialDur = getExactSongDuration(playerCore.playMusic);
        if ((!initialDur || initialDur <= 0) && queue.queueItems?.length) {
          const match = queue.queueItems.find(
            (item: SongResult) => String(item.id) === String(playerCore.playMusic.id)
          );
          if (match) {
            initialDur = getExactSongDuration(match);
          }
        }
        if (initialDur > 0) {
          allTime.value = initialDur;
          playerCore.playMusic.duration = initialDur;
          playerCore.playMusic.dt = initialDur * 1000;
        }

        const savedProgress = JSON.parse(localStorage.getItem('playProgress') || '{}');
        if (
          savedProgress.songId &&
          String(savedProgress.songId) === String(playerCore.playMusic.id)
        ) {
          if (savedProgress.progress > 0) {
            nowTime.value = savedProgress.progress;
          }
          if ((!allTime.value || allTime.value <= 0) && savedProgress.duration > 0) {
            allTime.value = savedProgress.duration;
            playerCore.playMusic.duration = savedProgress.duration;
            playerCore.playMusic.dt = savedProgress.duration * 1000;
          }
        }
      } catch (e) {
        console.warn('[playbackController] Failed to resume playback progress:', e);
      }

      startupFetchPromise = (async () => {
        try {
          const { allTime, nowTime } = await import('@/hooks/MusicHook');
          const videoId =
            playerCore.playMusic.videoId ||
            (typeof playerCore.playMusic.id === 'string' &&
            playerCore.playMusic.id.length === 11 &&
            !playerCore.playMusic.id.includes('/')
              ? playerCore.playMusic.id
              : '');

          if ((!allTime.value || allTime.value <= 0) && videoId) {
            try {
              const { getYTMStream } = await import('@/api/ytmusic');
              const stream = await getYTMStream(videoId);
              const durSec =
                stream?.durationSeconds ||
                (stream?.approxDurationMs ? Math.round(stream.approxDurationMs / 1000) : 0);
              if (durSec > 0) {
                playerCore.playMusic.duration = durSec;
                playerCore.playMusic.dt = durSec * 1000;
                allTime.value = durSec;
                localStorage.setItem(
                  'playProgress',
                  JSON.stringify({
                    songId: playerCore.playMusic.id,
                    progress: nowTime.value,
                    duration: durSec
                  })
                );
              }
            } catch (err) {
              console.debug('[playbackController] Startup stream duration probe fallback:', err);
            }
          }
        } catch (err) {
          console.warn(
            '[playbackController] Automatic initial song stream resolution non-fatal:',
            err
          );
        } finally {
          startupFetchPromise = null;
        }
        return null;
      })();
    } else {
      const isLocalMusic = playerCore.playMusic.playMusicUrl?.startsWith('local://');

      await playTrack(
        {
          ...playerCore.playMusic,
          isFirstPlay: true,
          playMusicUrl: isLocalMusic ? playerCore.playMusic.playMusicUrl : undefined
        },
        true
      );
    }
  } catch (error) {
    console.error('[playbackController] Failed to restore playback status:', error);
    playerCore.play = false;
    playerCore.isPlay = false;
    playerCore.playMusic = {} as SongResult;
    playerCore.playMusicUrl = '';
  }

  setTimeout(() => {
    audioService.setPlaybackRate(playerCore.playbackRate);
  }, 2000);
};
