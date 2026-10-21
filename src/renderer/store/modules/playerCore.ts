import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

import { audioService } from '@/services/audioService';
import type { AudioOutputDevice } from '@/types/audio';
import type { SongResult } from '@/types/music';
import { debouncedLocalStorage } from '@/utils/debouncedStorage';
import { ensureDiscordToken } from '@/utils/discordToken';
import { minifySong } from '@/utils/persistedSong';
import { extractCleanSongMeta } from '@/utils/songMeta';

import { useSettingsStore } from './settings';

export const usePlayerCoreStore = defineStore(
  'playerCore',
  () => {
    const play = ref(false);
    const isPlay = ref(false);
    const playMusic = ref<SongResult>({} as SongResult);
    const playMusicUrl = ref('');
    const musicFull = ref(false);
    const asideOpen = ref(false);
    const asideTab = ref<'queue' | 'lyrics'>('queue');
    const lyricsDrawer = computed(() => asideOpen.value && asideTab.value === 'lyrics');
    const playbackRate = ref(1.0);
    const volume = ref(1);
    const isMuted = ref(false);
    const userPlayIntent = ref(false);
    const isFmPlaying = ref(false);

    const audioOutputDeviceId = ref<string>(
      localStorage.getItem('audioOutputDeviceId') || 'default'
    );
    const availableAudioDevices = ref<AudioOutputDevice[]>([]);

    const currentSong = computed(() => playMusic.value);
    const isPlaying = computed(() => isPlay.value);

    const setIsPlay = (value: boolean) => {
      isPlay.value = value;
      play.value = value;
      window.api.updatePlayState(value);
    };

    const setMusicFull = (value: boolean) => {
      musicFull.value = value;
    };

    const setAsideOpen = (value: boolean) => {
      asideOpen.value = value;
    };

    const setAsideTab = (tab: 'queue' | 'lyrics') => {
      asideTab.value = tab;
    };

    const toggleAside = (tab: 'queue' | 'lyrics') => {
      if (asideOpen.value && asideTab.value === tab) {
        asideOpen.value = false;
      } else {
        asideTab.value = tab;
        asideOpen.value = true;
      }
    };

    const setLyricsDrawer = (value: boolean) => {
      if (value) {
        asideTab.value = 'lyrics';
        asideOpen.value = true;
      } else if (asideTab.value === 'lyrics') {
        asideOpen.value = false;
      }
    };

    const toggleLyricsDrawer = () => {
      toggleAside('lyrics');
    };

    const setPlaybackRate = (rate: number) => {
      playbackRate.value = rate;
      audioService.setPlaybackRate(rate);
    };

    const setVolume = (newVolume: number) => {
      const normalizedVolume = Math.max(0, Math.min(1, newVolume));
      volume.value = normalizedVolume;

      if (isMuted.value && normalizedVolume > 0) {
        isMuted.value = false;
      }
      audioService.setVolume(isMuted.value ? 0 : normalizedVolume);
    };

    const setMuted = (value: boolean) => {
      if (isMuted.value === value) return;
      isMuted.value = value;
      audioService.setVolume(isMuted.value ? 0 : volume.value);
    };

    const toggleMute = () => {
      setMuted(!isMuted.value);
    };

    const getVolume = () => volume.value;

    const increaseVolume = (step: number = 0.1) => {
      const newVolume = Math.min(1, volume.value + step);
      setVolume(newVolume);
      return newVolume;
    };

    const decreaseVolume = (step: number = 0.1) => {
      const newVolume = Math.max(0, volume.value - step);
      setVolume(newVolume);
      return newVolume;
    };

    const handlePause = async () => {
      try {
        audioService.pause();
        setPlayMusic(false);
        userPlayIntent.value = false;
      } catch (error) {
        console.error('Failed to pause playback:', error);
      }
    };

    const setPlayMusic = async (value: boolean | SongResult) => {
      if (typeof value === 'boolean') {
        setIsPlay(value);
        userPlayIntent.value = value;
      } else {
        const { playTrack } = await import('@/services/playbackController');
        await playTrack(value);
        setIsPlay(true);
        userPlayIntent.value = true;
      }
    };

    const refreshAudioDevices = async () => {
      availableAudioDevices.value = await audioService.getAudioOutputDevices();
    };

    const setAudioOutputDevice = async (deviceId: string): Promise<boolean> => {
      const success = await audioService.setAudioOutputDevice(deviceId);
      if (success) {
        audioOutputDeviceId.value = deviceId;
      }
      return success;
    };

    const initAudioDeviceListener = () => {
      if (navigator.mediaDevices) {
        navigator.mediaDevices.addEventListener('devicechange', async () => {
          await refreshAudioDevices();
          const exists = availableAudioDevices.value.some(
            (d) => d.deviceId === audioOutputDeviceId.value
          );
          if (!exists && audioOutputDeviceId.value !== 'default') {
            await setAudioOutputDevice('default');
          }
        });
      }
    };
    const sendDiscordPresence = () => {
      const newSong = playMusic.value;
      const newIsPlay = isPlay.value;
      
      if (window.api) {
        if (newSong && newSong.name) {
          const settingsStore = useSettingsStore();
          const s = settingsStore.setData;
          if (!s.discordRPCEnabled || !s.discordToken) {
            window.api.clearDiscordPresence().catch(() => {});
            return;
          }

          const { title, artist, album } = extractCleanSongMeta(newSong);
          if (album && album !== 'Unknown Album' && !(newSong as any).album) {
            (newSong as any).album = album;
          }

          const albumArt = newSong.al?.picUrl || (newSong as any).picUrl || '';
          const artistArt = (newSong.ar?.[0] as any)?.picUrl || (newSong.ar?.[0] as any)?.img1v1Url || (newSong as any).artists?.[0]?.picUrl || (newSong as any).artists?.[0]?.img1v1Url || '';
          const songId = newSong.id?.toString() || '';
          const artistId = newSong.ar?.[0]?.id?.toString() || (newSong as any).artists?.[0]?.id?.toString() || '';
          const albumId = newSong.al?.id?.toString() || '';
          const songUrl = songId
            ? `https://music.youtube.com/watch?v=${songId}`
            : '';
          const artistUrl = artistId
            ? `https://music.youtube.com/channel/${artistId}`
            : '';
          const albumUrl = albumId
            ? `https://music.youtube.com/playlist?list=${albumId}`
            : '';

          const resolveButtonUrl = (source: string, custom: string): string => {
            switch ((source || 'songurl').toLowerCase()) {
              case 'songurl': return songUrl || '';
              case 'artisturl': return artistUrl || songUrl || '';
              case 'albumurl': return albumUrl || songUrl || '';
              case 'custom': return custom || '';
              default: return '';
            }
          };

          const btn1Url = resolveButtonUrl(
            s.discordActivityButton1UrlSource || 'custom',
            s.discordActivityButton1CustomUrl || 'https://github.com/chorus-mu/Chorus-Deck'
          );
          const btn2Url = resolveButtonUrl(
            s.discordActivityButton2UrlSource || 'custom',
            s.discordActivityButton2CustomUrl || 'https://github.com/chorus-mu/Chorus-Deck'
          );

          window.api
            .audioGetTime()
            .then(async (time) => {
              const currentTime = time * 1000;
              const currentDur = audioService.getDuration();
              const duration = Math.floor(currentDur > 0 ? currentDur * 1000 : newSong.dt || 0);
              console.log("[Discord RPC] currentDur:", currentDur, "newSong.dt:", newSong.dt, "final duration:", duration);


              let startTimestamp: number | undefined = undefined;
              if (newIsPlay) {
                startTimestamp = Math.floor(Date.now() - currentTime);
              }

              return window.api.updateDiscordPresence({
                title,
                artist,
                album,
                albumArt,
                artistArt,
                songId,
                artistId,
                albumId,
                duration,
                isPlaying: newIsPlay,
                startTimestamp,
                activityName: s.discordActivityName || 'SONG',
                activityDetails: s.discordActivityDetails || 'ARTIST',
                activityState: s.discordActivityState || 'ALBUM',
                activityType: s.discordActivityType || 'LISTENING',
                largeImageType: s.discordLargeImageType || 'thumbnail',
                largeImageCustomUrl: s.discordLargeImageCustomUrl || '',
                smallImageType: s.discordSmallImageType || 'artist',
                smallImageCustomUrl: s.discordSmallImageCustomUrl || '',
                showWhenPaused: s.discordShowWhenPaused ?? false,

                button1Enabled: s.discordActivityButton1Enabled ?? true,
                button1Label: s.discordActivityButton1Label || 'Listen on Chorus Deck',
                button1Url: btn1Url,
                button2Enabled: s.discordActivityButton2Enabled ?? false,
                button2Label: s.discordActivityButton2Label || 'Go to Chorus Deck',
                button2Url: btn2Url,
                token: await ensureDiscordToken(s),
              });
            })
            .catch((e) => {
              console.debug('Discord presence unavailable:', e?.message || e);
            });
        } else {
          window.api.clearDiscordPresence().catch(() => {});
        }
      }
    };

    watch(
      [playMusic, isPlay],
      () => {
        sendDiscordPresence();
      },
      { deep: true }
    );

    let discordSeekTimer: ReturnType<typeof setTimeout> | null = null;
    audioService.on('seek', () => {
      if (discordSeekTimer) clearTimeout(discordSeekTimer);
      discordSeekTimer = setTimeout(() => {
        sendDiscordPresence();
      }, 400);
    });

    // Recovery: re-send presence every 60s so a dropped gateway session or a
    // restarted Discord client heals without any user action.
    setInterval(() => {
      if (playMusic.value?.name) sendDiscordPresence();
    }, 60_000);


    return {
      play,
      isPlay,
      playMusic,
      playMusicUrl,
      musicFull,
      asideOpen,
      asideTab,
      lyricsDrawer,
      playbackRate,
      volume,
      isMuted,
      userPlayIntent,
      isFmPlaying,
      audioOutputDeviceId,
      availableAudioDevices,

      currentSong,
      isPlaying,

      setIsPlay,
      setMusicFull,
      setAsideOpen,
      setAsideTab,
      toggleAside,
      setLyricsDrawer,
      toggleLyricsDrawer,
      setPlayMusic,
      setPlaybackRate,
      setVolume,
      getVolume,
      increaseVolume,
      decreaseVolume,
      setMuted,
      toggleMute,
      handlePause,
      refreshAudioDevices,
      setAudioOutputDevice,
      initAudioDeviceListener
    };
  },
  {
    persist: {
      key: 'player-core-store',

      storage: {
        getItem: (k: string) => localStorage.getItem(k),
        setItem: (k: string, v: string) => debouncedLocalStorage.setItem(k, v),
        removeItem: (k: string) => debouncedLocalStorage.removeItem(k)
      },
      pick: [
        'playMusic',
        'playMusicUrl',
        'playbackRate',
        'volume',
        'isMuted',
        'isPlay',
        'audioOutputDeviceId'
      ],

      serializer: {
        serialize: (state: any) =>
          JSON.stringify({
            ...state,
            playMusic: state.playMusic?.id ? minifySong(state.playMusic as SongResult) : {}
          }),
        deserialize: JSON.parse
      }
    }
  }
);
