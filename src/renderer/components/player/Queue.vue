<template>
  <div v-if="internalVisible" class="fixed-overlay" @click="closePanel"></div>

  <div
    v-if="internalVisible"
    class="queue-panel"
    :class="[
      'animate__animated',
      closing
        ? isCompact
          ? 'animate__slideOutDown'
          : 'animate__slideOutRight'
        : isCompact
          ? 'animate__slideInUp'
          : 'animate__slideInRight'
    ]"
    :data-shell-layout="isShellLayout || undefined"
    :style="panelStyle"
    @animationend="onAnimationEnd"
  >
    <div class="panel-header" :style="headerStyle">
      <div class="tabs">
        <div
          class="tab"
          :class="{ active: activeTab === 'queue' }"
          :style="activeTab === 'queue' ? activeTabStyle : {}"
          @click="switchTab('queue')"
        >
          Queue
        </div>
        <div
          v-if="!isFullView"
          class="tab"
          :class="{ active: activeTab === 'lyrics' }"
          :style="activeTab === 'lyrics' ? activeTabStyle : {}"
          @click="switchTab('lyrics')"
        >
          Lyrics
        </div>
      </div>
      <div class="header-actions">
        <n-tooltip v-if="activeTab === 'queue'" trigger="hover">
          <template #trigger>
            <div class="action-btn" @click="handleClearQueue">
              <i class="ri-delete-bin-line"></i>
            </div>
          </template>
          Clear Queue
        </n-tooltip>
        <div class="close-btn" @click="closePanel">
          <i class="ri-close-line"></i>
        </div>
      </div>
    </div>

    <div class="panel-body">
      <!-- Queue Tab -->
      <template v-if="activeTab === 'queue'">
        <!-- Current Song Info -->
        <div
          class="now-playing-card"
          v-if="currentSong"
          :style="nowPlayingCardStyle"
          @click="scrollToCurrentSong(true)"
          title="Click to jump to current song in queue"
        >
          <div class="now-playing-art">
            <n-image
              :src="getImgUrl(currentSong?.picUrl, '80y80')"
              :fallback-src="getFallbackArt(currentSong)"
              class="art-img"
              preview-disabled
              object-fit="cover"
              :img-props="{
                crossorigin: 'anonymous',
                referrerpolicy: 'no-referrer',
                style: 'object-fit: cover;',
                alt: ''
              }"
            />
            <div class="now-playing-indicator" :style="{ backgroundColor: accentColor }">
              <i :class="isPlaying ? 'ri-equalizer-line' : 'ri-pause-line'" class="eq-icon"></i>
            </div>
          </div>
          <div class="now-playing-info">
            <div class="now-playing-label">Now Playing</div>
            <div class="now-playing-title" v-html="currentSong.name || 'Unknown Track'"></div>
            <div class="now-playing-artist">
              <template v-if="currentSongArtists && currentSongArtists.length > 0">
                <span v-for="(artist, i) in currentSongArtists" :key="i">
                  {{ artist.name || 'Unknown Artist' }}{{ i < currentSongArtists.length - 1 ? ', ' : '' }}
                </span>
              </template>
              <template v-else> Unknown Artist </template>
            </div>
          </div>
        </div>

        <!-- Controls: Shuffle / Repeat -->
        <div class="queue-controls" :style="controlsStyle">
          <button
            class="ctrl-btn"
            :class="{ 'ctrl-active': shuffleEnabled }"
            :style="shuffleEnabled ? ctrlActiveStyle : {}"
            @click="toggleShuffle"
          >
            <i class="ri-shuffle-line"></i>
            <span>Shuffle</span>
          </button>
          <button
            class="ctrl-btn"
            :class="{ 'ctrl-active': repeatMode !== 0 }"
            :style="repeatMode !== 0 ? ctrlActiveStyle : {}"
            @click="toggleRepeat"
          >
            <i :class="repeatMode === 2 ? 'ri-repeat-one-line' : 'ri-repeat-2-line'"></i>
            <span>{{
              repeatMode === 2 ? 'Repeat One' : repeatMode === 1 ? 'Repeat All' : 'Repeat Off'
            }}</span>
          </button>
        </div>

        <!-- Queue subtitle -->
        <div class="queue-subtitle" v-if="queueItems.length > 0">
          <div class="subtitle-left">
            <span class="subtitle-title">Next in queue</span>
          </div>
          <div class="subtitle-right">
            <span class="subtitle-count">
              {{ queueItems.length }} songs · {{ formatQueueDuration(totalQueueDuration) }}
            </span>
          </div>
        </div>

        <!-- Song List -->
        <div v-if="queueItems.length === 0" class="empty-queue">
          <i class="ri-music-2-line"></i>
          <p>Queue is empty</p>
        </div>

        <n-virtual-list
          v-else
          ref="queueListRef"
          :item-size="68"
          item-resizable
          :items="queueItems"
          class="queue-list"
        >
          <template #default="{ item, index }">
            <div
              class="queue-item"
              :class="{ 'is-playing': isCurrentItem(item) }"
              :style="isCurrentItem(item) ? playingItemStyle : {}"
              @click="playFromQueue(item, index, $event)"
              @dragover.prevent.stop
              @dragenter.prevent.stop
              @drop.prevent.stop="handleDrop(index)"
            >
              <div class="item-art">
                <n-image
                  :src="getImgUrl(item?.picUrl, '60y60')"
                  :fallback-src="getFallbackArt(item)"
                  class="item-img"
                  preview-disabled
                  object-fit="cover"
                  :img-props="{
                    crossorigin: 'anonymous',
                    referrerpolicy: 'no-referrer',
                    style: 'object-fit: cover;',
                    alt: ''
                  }"
                />
                <div
                  v-if="isCurrentItem(item)"
                  class="item-playing-overlay"
                  :style="{
                    backgroundColor: `color-mix(in srgb, ${accentColor} 80%, transparent)`
                  }"
                >
                  <i class="ri-equalizer-line" :style="{ color: '#fff' }"></i>
                </div>
              </div>

              <div class="item-info">
                <div
                  class="item-title"
                  :style="isCurrentItem(item) ? { color: accentColor } : {}"
                >
                  {{ item.name || 'Unknown Track' }}
                </div>
                <div class="item-artist">
                  <template v-if="getItemArtists(item).length > 0">
                    <span v-for="(ar, i) in getItemArtists(item)" :key="i">
                      {{ ar.name || 'Unknown Artist'
                      }}{{ i < getItemArtists(item).length - 1 ? ', ' : '' }}
                    </span>
                  </template>
                  <template v-else> Unknown Artist </template>
                </div>
              </div>

              <div class="item-actions">
                <div
                  class="drag-handle"
                  draggable="true"
                  title="Reorder queue"
                  @click.stop="suppressQueueItemClick"
                  @mousedown.stop
                  @dragstart="handleDragStart($event, index)"
                  @dragend="handleDragEnd"
                >
                  <i class="ri-drag-move-2-line"></i>
                </div>
                <n-dropdown
                  :options="queueItemOptions"
                  trigger="click"
                  placement="left-start"
                  @select="handleQueueAction($event, item)"
                >
                  <div class="more-btn" title="Queue actions" @click.stop>
                    <i class="ri-more-2-fill"></i>
                  </div>
                </n-dropdown>
              </div>
            </div>
          </template>
        </n-virtual-list>
      </template>

      <!-- Lyrics Tab -->
      <template v-else>
        <div class="queue-lyrics-container">
          <div v-if="isLyricsLoading" class="queue-lyrics-loading">
            <div
              v-for="n in 6"
              :key="n"
              class="lyrics-skeleton-line"
              :style="{ width: `${45 + (n % 4) * 15}%` }"
            ></div>
          </div>

          <div
            v-else-if="lrcArray && lrcArray.length > 0"
            ref="queueLyricsScrollerRef"
            class="queue-lyrics-scroller"
            :class="{
              'text-center': lyricConfig.lyricsTextPosition === 'CENTER' || lyricConfig.centerLyrics,
              'text-right': lyricConfig.lyricsTextPosition === 'RIGHT'
            }"
            @wheel="handleQueueLyricsScroll"
            @touchstart="handleQueueLyricsScroll"
          >
            <div class="queue-lyrics-padding-top"></div>

            <div
              v-for="(item, index) in lrcArray"
              :id="`queue-lyric-line-${index}`"
              :key="index"
              class="queue-lyric-line"
              :class="{
                'is-active': isLineActive(index),
                'is-clickable': lyricConfig.lyricsClick !== false && item.startTime !== -1 && item.text,
                'has-glow': lyricConfig.lyricsGlowEffect !== false
              }"
              :style="getQueueLineStyle(index)"
              @click="lyricConfig.lyricsClick !== false && item.startTime !== -1 ? handleLyricClick(index) : null"
            >
              <AmllInterludeDots
                v-if="item.isPreamble || item.text?.trim() === '•••'"
                :start-time="item.startTime ?? 0"
                :duration="item.duration ?? 3000"
                :current-time="(nowTime + correctionTime) * 1000"
                :is-active="isLineActive(index)"
                :is-first-line="index === 0"
              />

              <div
                v-else-if="shouldRenderWordByWord(item)"
                class="queue-word-by-word-lyric"
              >
                <template v-for="(word, wordIndex) in getQueueLineDisplayWords(item)" :key="wordIndex">
                  <span
                    class="queue-lyric-word"
                    :style="getQueueWordStyle(index, wordIndex, word)"
                  >
                    {{ word.text ? word.text.replace('{bg}', '') : '' }}
                  </span>
                  <span v-if="word.space" class="queue-lyric-space">&nbsp;</span>
                </template>
              </div>

              <span
                v-else
                class="queue-lyric-text"
                :style="getQueueLrcStyle(index)"
                :class="{ 'bg-vocal': item.text ? item.text.startsWith('{bg}') : false }"
              >
                {{ item.text ? item.text.replace('{bg}', '') : '' }}
              </span>

              <div v-if="lyricConfig.showRoma !== false && item.romaText" class="queue-lyric-roma">
                {{ item.romaText }}
              </div>
              <div v-if="lyricConfig.showTranslation !== false && item.trText" class="queue-lyric-tr">
                {{ item.trText }}
              </div>
            </div>

            <div class="queue-lyrics-padding-bottom"></div>
          </div>

          <div v-else class="queue-lyrics-empty">
            <i class="ri-music-2-line"></i>
            <p v-if="currentSong?.id">No lyrics found for this song</p>
            <p v-else>Play a song to view lyrics</p>
          </div>

          <button
            v-if="showQueueSyncBtn && lrcArray && lrcArray.length > 0"
            class="queue-lyrics-sync-btn"
            type="button"
            @click="syncQueueLyrics"
            title="Resume auto-scroll"
          >
            <i class="ri-focus-3-line"></i>
            <span>Sync</span>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NDropdown, useDialog, useMessage, useThemeVars } from 'naive-ui';
import tinycolor from 'tinycolor2';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import AmllInterludeDots from '@/components/lyric/AmllInterludeDots.vue';
import {
  artistList,
  correctionTime,
  ensureLyricsLoaded,
  isLyricsLoading,
  lrcArray,
  normalizeArtistList,
  nowIndex,
  nowTime,
  playMusic,
  setAudioTime,
  textColors,
  useLyricProgress
} from '@/hooks/MusicHook';
import { usePlaybackControl } from '@/hooks/usePlaybackControl';
import { usePlayerStore } from '@/store/modules/player';
import { useSettingsStore } from '@/store/modules/settings';
import type { SongResult } from '@/types/music';
import { getImgUrl, isCompact, secondToMinute } from '@/utils';
import type { LyricGranularity } from '@/types/lyric';
import { computeLyricLineStyle } from '@/utils/lyricAnimation';
import { LYRIC_CONFIG_CHANGE_EVENT, readLyricConfig } from '@/utils/lyricConfig';
import logoImg from '@/assets/logo.png';

const lyricConfig = ref(readLyricConfig());
const handleLyricConfigChange = () => {
  lyricConfig.value = readLyricConfig();
};

const getFallbackArt = (item: any): string => {
  const sid = item?.id ? String(item.id) : '';
  if (sid.length === 11 && !sid.includes('/')) {
    return `https://i.ytimg.com/vi/${sid}/hqdefault.jpg`;
  }
  return logoImg;
};

const getItemArtists = (item: any) => {
  const album = typeof item?.album === 'string' ? item.album : item?.al?.name;
  return normalizeArtistList(item?.ar || item?.artists || [], album);
};

const message = useMessage();
const dialog = useDialog();
const playerStore = usePlayerStore();
const settingsStore = useSettingsStore();
const { isPlaying } = usePlaybackControl();
const themeVars = useThemeVars();

const internalVisible = ref(false);
const closing = ref(false);
const isFullView = computed(() => !!playerStore.musicFull);
const activeTab = ref<'queue' | 'lyrics'>('queue');
const isShellLayout = computed(() => !isCompact.value && !isFullView.value);
const repeatMode = computed(() => playerStore.repeatMode);
const shuffleEnabled = computed(() => playerStore.shuffleEnabled);
const isDarkTheme = computed(() => {
  return settingsStore.theme === 'dark' || document.documentElement.classList.contains('dark');
});

watch(
  isFullView,
  (full) => {
    if (full) {
      activeTab.value = 'queue';
    }
  },
  { immediate: true }
);

const rawAlbumColor = computed(
  () =>
    playMusic.value?.primaryColor || themeVars.value.primaryColor || '#6366f1'
);

const accentColor = computed(() => {
  const base = rawAlbumColor.value;
  const tc = tinycolor(base);
  if (!tc.isValid()) return isDarkTheme.value ? '#c7d2fe' : '#1e1b4b';

  const hsl = tc.toHsl();
  if (isDarkTheme.value) {
    // In dark mode: high luminance & vivid saturation for radiant neon glow
    const sat = Math.min(Math.max(hsl.s, 0.5) * 1.1, 1);
    const lum = Math.min(Math.max(hsl.l, 0.72), 0.88);
    return tinycolor({ h: hsl.h, s: sat, l: lum }).toRgbString();
  } else {
    // In light mode: deep, rich, aggressive dark tone of the album art (strong contrast against light background)
    const sat = Math.min(Math.max(hsl.s, 0.6) * 1.25, 1);
    const lum = Math.min(Math.max(hsl.l, 0.14), 0.26);
    return tinycolor({ h: hsl.h, s: sat, l: lum }).toRgbString();
  }
});

// Inactive/dim text color adapted for light vs dark theme
const inactiveLyricColor = computed(() => {
  const base = rawAlbumColor.value;
  const tc = tinycolor(base);
  const h = tc.isValid() ? tc.toHsl().h : 230;

  if (isDarkTheme.value) {
    // Soft muted light tinted with subtle album hue
    return tinycolor({ h, s: 0.12, l: 0.52 }).toRgbString();
  } else {
    // Semi-transparent muted tone so active line pops decisively
    return tinycolor({ h, s: 0.18, l: 0.55 }).setAlpha(0.65).toRgbString();
  }
});

// Glow effect shadow based on theme
const lyricGlowStyle = computed(() => {
  if (isDarkTheme.value) {
    return `0 0 16px color-mix(in srgb, ${accentColor.value} 70%, transparent), 0 0 32px color-mix(in srgb, ${accentColor.value} 40%, transparent)`;
  } else {
    // In light theme: crisp, aggressive ambient halo highlighting the dark text
    return `0 3px 12px color-mix(in srgb, ${accentColor.value} 45%, transparent), 0 0 1px ${accentColor.value}`;
  }
});

const panelStyle = computed(() => ({
  '--accent': accentColor.value,
  '--lyric-inactive': inactiveLyricColor.value,
  '--lyric-glow': lyricGlowStyle.value
}));

const headerStyle = computed(() => ({
  borderBottomColor: `color-mix(in srgb, ${accentColor.value} 30%, transparent)`
}));

const activeTabStyle = computed(() => ({
  color: accentColor.value,
  borderBottomColor: accentColor.value
}));

const nowPlayingCardStyle = computed(() => ({
  background: `color-mix(in srgb, ${accentColor.value} 12%, transparent)`,
  borderColor: `color-mix(in srgb, ${accentColor.value} 25%, transparent)`
}));

const controlsStyle = computed(() => ({
  borderBottomColor: `color-mix(in srgb, ${accentColor.value} 15%, transparent)`
}));

const ctrlActiveStyle = computed(() => ({
  background: `color-mix(in srgb, ${accentColor.value} 20%, transparent)`,
  color: accentColor.value,
  borderColor: `color-mix(in srgb, ${accentColor.value} 40%, transparent)`
}));

const playingItemStyle = computed(() => ({
  background: `color-mix(in srgb, ${accentColor.value} 15%, transparent)`
}));

const currentSong = computed(() => {
  if (playerStore.playMusic && playerStore.playMusic.id) {
    return playerStore.playMusic;
  }
  return playMusic.value && playMusic.value.id ? playMusic.value : null;
});

const currentSongArtists = computed(() => {
  const song = currentSong.value as any;
  if (!song) return [];
  const raw = (song.ar || song.artists) as any[];
  const album: any = song.al || song.album;
  const albumStr = typeof album === 'string' ? album : album?.name;
  return normalizeArtistList(raw, albumStr);
});

const isCurrentItem = (item: any) => {
  if (!item?.id || !currentSong.value?.id) return false;
  return String(item.id) === String(currentSong.value.id);
};

const queueLyricsScrollerRef = ref<HTMLElement | null>(null);
const isUserScrolledLyrics = ref(false);
const showQueueSyncBtn = ref(false);
let lyricsUserScrollTimeout: ReturnType<typeof setTimeout> | null = null;
const { getLrcStyle: originalLrcStyle } = useLyricProgress();

const handleQueueLyricsScroll = () => {
  isUserScrolledLyrics.value = true;
  showQueueSyncBtn.value = true;
  if (lyricsUserScrollTimeout) {
    clearTimeout(lyricsUserScrollTimeout);
  }
  lyricsUserScrollTimeout = setTimeout(() => {
    isUserScrolledLyrics.value = false;
    showQueueSyncBtn.value = false;
    scrollToActiveLyric(false);
  }, 3500);
};

const syncQueueLyrics = () => {
  if (lyricsUserScrollTimeout) {
    clearTimeout(lyricsUserScrollTimeout);
    lyricsUserScrollTimeout = null;
  }
  isUserScrolledLyrics.value = false;
  showQueueSyncBtn.value = false;
  scrollToActiveLyric(false);
};

const scrollToActiveLyric = (immediate = false) => {
  if (!queueLyricsScrollerRef.value || !lrcArray.value.length) return;
  if (isUserScrolledLyrics.value && !immediate) return;
  if (lyricConfig.value.lyricsScroll === false && !immediate) return;

  const activeEl = document.getElementById(`queue-lyric-line-${nowIndex.value}`);
  if (!activeEl) return;

  const scroller = queueLyricsScrollerRef.value;
  const containerRect = scroller.getBoundingClientRect();
  const lineRect = activeEl.getBoundingClientRect();

  const targetScrollTop =
    scroller.scrollTop +
    (lineRect.top - containerRect.top) -
    containerRect.height / 2 +
    lineRect.height / 2;

  scroller.scrollTo({
    top: Math.max(0, targetScrollTop),
    behavior: immediate ? 'auto' : 'smooth'
  });
};

const handleLyricClick = (index: number) => {
  setAudioTime(index);
  isUserScrolledLyrics.value = false;
  showQueueSyncBtn.value = false;
  nextTick(() => {
    scrollToActiveLyric(false);
  });
};

const isLineActive = (index: number) => {
  return index === nowIndex.value;
};

const currentGranularity = computed<LyricGranularity>(() => {
  return (settingsStore.setData?.lyricGranularity || lyricConfig.value?.lyricGranularity || 'auto') as LyricGranularity;
});

const shouldRenderWordByWord = (item: any) => {
  if (currentGranularity.value === 'sentence') return false;
  return !!(item?.hasWordByWord && item?.words && item?.words.length > 0);
};

const getQueueLineDisplayWords = (item: any) => {
  if (!item?.words || item.words.length === 0) return [];
  const granularity = currentGranularity.value;
  if (granularity === 'sentence') return [];

  if (granularity === 'word') {
    const combined: any[] = [];
    let curText = '';
    let curStartTime = 0;
    let curEndTime = 0;

    for (let i = 0; i < item.words.length; i++) {
      const w = item.words[i];
      if (!curText) {
        curText = w.text || '';
        curStartTime = w.startTime;
        curEndTime = w.startTime + (w.duration || 0);
      } else {
        curText += w.text || '';
        curEndTime = Math.max(curEndTime, w.startTime + (w.duration || 0));
      }

      if (w.space || i === item.words.length - 1) {
        combined.push({
          text: curText,
          startTime: curStartTime,
          duration: Math.max(50, curEndTime - curStartTime),
          space: !!w.space
        });
        curText = '';
      }
    }
    return combined;
  }

  return item.words;
};

const getQueueLineStyle = (index: number) => {
  const active = isLineActive(index);
  const userFontSize = lyricConfig.value.fontSize ? `${lyricConfig.value.fontSize * 0.9}px` : undefined;
  const userLineHeight = lyricConfig.value.lineHeight ? `${lyricConfig.value.lineHeight}` : undefined;
  const userAlign: 'left' | 'center' | 'right' =
    lyricConfig.value.lyricsTextPosition === 'CENTER' || lyricConfig.value.centerLyrics
      ? 'center'
      : lyricConfig.value.lyricsTextPosition === 'RIGHT'
        ? 'right'
        : 'left';

  const animStyle = computeLyricLineStyle({
    index,
    nowIndex: nowIndex.value,
    style: lyricConfig.value.lyricsAnimationStyle || 'apple_spring',
    alignment: userAlign,
    focusEnabled: true
  });

  if (active) {
    return {
      ...animStyle,
      fontSize: userFontSize,
      lineHeight: userLineHeight
    };
  }

  return {
    ...animStyle,
    fontSize: userFontSize,
    lineHeight: userLineHeight
  };
};

const getQueueLrcStyle = (index: number) => {
  const activeClr = accentColor.value;
  const inactiveClr = inactiveLyricColor.value;

  if (index !== nowIndex.value) {
    return {
      color: inactiveClr
    };
  }

  const currentTime = (nowTime.value + correctionTime.value) * 1000;
  const item = lrcArray.value[index];
  if (!item) return { color: inactiveClr };

  const start = item.startTime ?? 0;
  const nextItem = lrcArray.value[index + 1];
  const nextStart = nextItem?.startTime;
  const duration = (item.duration && item.duration > 0)
    ? item.duration
    : (nextStart && nextStart > start ? nextStart - start : 3000);
  const end = start + Math.max(duration, 500);

  if (currentTime >= start && currentTime < end) {
    const progress = Math.min(Math.max((currentTime - start) / Math.max(duration, 500), 0), 1);
    const progressPercent = Math.round(progress * 100);
    return {
      backgroundImage: `linear-gradient(to right, ${activeClr} 0%, ${activeClr} ${progressPercent}%, ${inactiveClr} ${progressPercent}%, ${inactiveClr} 100%)`,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      color: 'transparent',
      transition: 'none'
    };
  } else if (currentTime >= end) {
    return {
      color: activeClr,
      WebkitTextFillColor: 'initial',
      transition: 'none'
    };
  } else {
    return {
      color: inactiveClr,
      WebkitTextFillColor: 'initial',
      transition: 'color 0.25s ease'
    };
  }
};

const getQueueWordStyle = (lineIndex: number, _wordIndex: number, word: any) => {
  const activeClr = accentColor.value;
  const inactiveClr = inactiveLyricColor.value;

  if (lineIndex !== nowIndex.value) {
    return {
      color: inactiveClr,
      transition: 'color 0.25s ease'
    };
  }

  const currentTime = (nowTime.value + correctionTime.value) * 1000;
  const wordStartTime = word.startTime;
  const wordEndTime = word.startTime + word.duration;

  if (currentTime >= wordStartTime && currentTime < wordEndTime) {
    const progress = Math.min((currentTime - wordStartTime) / word.duration, 1);
    const progressPercent = Math.round(progress * 100);

    return {
      backgroundImage: `linear-gradient(to right, ${activeClr} 0%, ${activeClr} ${progressPercent}%, ${inactiveClr} ${progressPercent}%, ${inactiveClr} 100%)`,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      transition: 'all 0.1s ease'
    };
  } else if (currentTime >= wordEndTime) {
    return {
      color: activeClr,
      WebkitTextFillColor: 'initial',
      transition: 'none'
    };
  } else {
    return {
      color: inactiveClr,
      WebkitTextFillColor: 'initial',
      transition: 'color 0.25s ease'
    };
  }
};

watch(nowIndex, () => {
  if (activeTab.value === 'lyrics' && internalVisible.value) {
    scrollToActiveLyric(false);
  }
});

const switchTab = (tab: 'queue' | 'lyrics') => {
  activeTab.value = tab;
  window.dispatchEvent(new CustomEvent('queue-tab-changed', { detail: tab }));
  if (tab === 'queue') {
    scrollToCurrentSong(true);
  } else if (tab === 'lyrics') {
    void ensureLyricsLoaded(false);
    nextTick(() => {
      scrollToActiveLyric(true);
    });
  }
};

const show = computed({
  get: () => playerStore.queueVisible,
  set: (value) => {
    playerStore.setQueueVisible(value);
  }
});

watch(
  show,
  (newValue) => {
    if (newValue) {
      internalVisible.value = true;
      closing.value = false;
      scrollToCurrentSong(false);
    } else {
      if (!internalVisible.value) return;
      closing.value = true;
    }
  },
  { immediate: true }
);

const handleOpenTab = (e: CustomEvent) => {
  if (e.detail) {
    if (isFullView.value && e.detail === 'lyrics') {
      activeTab.value = 'queue';
    } else {
      activeTab.value = e.detail;
    }
    if (activeTab.value === 'queue') {
      scrollToCurrentSong(true);
    }
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && internalVisible.value) closePanel();
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('open-queue-tab', handleOpenTab as any);
  window.addEventListener(LYRIC_CONFIG_CHANGE_EVENT, handleLyricConfigChange);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('open-queue-tab', handleOpenTab as any);
  window.removeEventListener(LYRIC_CONFIG_CHANGE_EVENT, handleLyricConfigChange);
});

const queueItems = computed(() => playerStore.queueItems as SongResult[]);
const queueListRef = ref<any>(null);
const draggedIndex = ref<number | null>(null);
const totalQueueDuration = computed(() =>
  queueItems.value.reduce((total, song) => {
    const duration = song.dt ?? song.duration ?? 0;
    return total + (duration > 100000 ? duration : duration * 1000);
  }, 0)
);

const formatQueueDuration = (durationMs: number) => secondToMinute(durationMs / 1000);
const queueItemOptions = [
  { label: 'Play next', key: 'play-next' },
  { label: 'Add to queue', key: 'add-to-queue' },
  { label: 'Remove', key: 'remove' }
];

const closePanel = () => {
  show.value = false;
};
const onAnimationEnd = () => {
  if (closing.value) {
    internalVisible.value = false;
  } else if (internalVisible.value) {
    if (activeTab.value === 'queue') {
      scrollToCurrentSong(false);
    } else if (activeTab.value === 'lyrics') {
      void ensureLyricsLoaded(false);
      nextTick(() => {
        scrollToActiveLyric(true);
      });
    }
  }
};

const scrollToCurrentSong = (smooth = true) => {
  const performScroll = () => {
    if (!queueListRef.value || queueItems.value.length === 0) return;

    const currentSongId = currentSong.value?.id;
    let targetIndex = playerStore.queueIndex;

    if (currentSongId !== undefined && currentSongId !== null) {
      const found = queueItems.value.findIndex(
        (item) => String(item.id) === String(currentSongId)
      );
      if (found !== -1) {
        targetIndex = found;
      }
    }

    if (targetIndex < 0 || targetIndex >= queueItems.value.length) return;

    // Leave context of 1 song above so the user clearly sees the current song
    const scrollIndex = targetIndex > 1 ? targetIndex - 1 : 0;

    try {
      queueListRef.value.scrollTo({
        index: scrollIndex,
        behavior: smooth ? 'smooth' : 'auto'
      });
    } catch {
      const topPos = Math.max(0, scrollIndex * 68);
      queueListRef.value.scrollTo({ top: topPos });
    }
  };

  nextTick(() => {
    performScroll();
    requestAnimationFrame(performScroll);
    setTimeout(performScroll, 80);
    setTimeout(performScroll, 220);
    setTimeout(performScroll, 360);
  });
};

watch(
  () => currentSong.value?.id,
  (newId, oldId) => {
    if (newId && newId !== oldId && internalVisible.value && activeTab.value === 'queue') {
      scrollToCurrentSong(true);
    }
  }
);

watch(
  () => playerStore.queueIndex,
  (newIdx, oldIdx) => {
    if (newIdx !== oldIdx && internalVisible.value && activeTab.value === 'queue') {
      scrollToCurrentSong(true);
    }
  }
);

watch(
  () => queueItems.value.length,
  (newLen, oldLen) => {
    if (newLen > 0 && oldLen === 0 && internalVisible.value && activeTab.value === 'queue') {
      scrollToCurrentSong(false);
    }
  }
);

const handleDeleteSong = (song: SongResult) => {
  playerStore.removeFromQueue(song.id);
};

const handleQueueAction = (action: string, song: SongResult) => {
  if (action === 'play-next') {
    playerStore.addToNextPlay(song);
  } else if (action === 'add-to-queue') {
    playerStore.addToQueue(song);
  } else if (action === 'remove') {
    handleDeleteSong(song);
  }
};

const playFromQueue = async (song: SongResult, index: number, event?: MouseEvent) => {
  if ((event?.target as HTMLElement | null)?.closest('.item-actions')) return;
  playerStore.queueIndex = index;
  await playerStore.setPlay(song);
};

const suppressQueueItemClick = () => undefined;

const toggleShuffle = () => {
  playerStore.toggleShuffle();
};

const toggleRepeat = () => {
  playerStore.toggleRepeat();
};

const handleDragStart = (event: DragEvent, index: number) => {
  event.stopPropagation();
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  }
  draggedIndex.value = index;
};

const handleDragEnd = () => {
  draggedIndex.value = null;
};

const handleDrop = (toIndex: number) => {
  if (draggedIndex.value !== null) {
    playerStore.moveInQueue(draggedIndex.value, toIndex);
  }
  draggedIndex.value = null;
};

const handleClearQueue = () => {
  if (queueItems.value.length === 0) {
    message.info('Queue is already empty');
    return;
  }
  if (isCompact.value) closePanel();
  dialog.warning({
    title: 'Clear Queue',
    content: 'This will clear all songs in the queue and stop the current playback. Continue?',
    positiveText: 'Confirm',
    negativeText: 'Cancel',
    positiveButtonProps: { round: true },
    negativeButtonProps: { round: true },
    style: { zIndex: 999999999, borderRadius: '16px' },
    onPositiveClick: () => {
      playerStore.clearPlayAll();
      message.success('Queue cleared');
    }
  });
};
</script>

<style lang="scss" scoped>
// The click-catcher only exists for the overlay presentations. In the desktop
// shell Queue is a real layout column, so there is nothing to dismiss.
.fixed-overlay {
  @apply fixed inset-0;
  pointer-events: auto;
  cursor: default;
  z-index: 9999998;
  display: v-bind('isShellLayout ? "none" : "block"');
}

.queue-panel {
  @apply flex flex-col overflow-hidden;

  position: v-bind('isShellLayout ? "relative" : "fixed"');
  z-index: v-bind('isShellLayout ? "var(--shell-z-queue)" : "9999999"');
  right: v-bind('isShellLayout ? "auto" : "0"');
  top: v-bind('isShellLayout ? "auto" : "0"');
  width: v-bind('isShellLayout ? "clamp(260px, 28vw, 360px)" : "360px"');
  height: v-bind('isShellLayout ? "100%" : "100vh"');
  left: 'auto';
  flex-shrink: 0;

  // Own four edges + subtle outer corners when acting as a shell surface.
  border-radius: v-bind('isShellLayout ? "var(--shell-radius)" : "0"');
  border-left: v-bind('isShellLayout ? "none" : "1px solid rgba(255,255,255,0.08)"');

  animation-duration: 0.3s !important;
  backdrop-filter: blur(20px);
  background-color: var(--shell-surface, rgba(255, 255, 255, 0.95));
  .dark & {
    background-color: var(--shell-surface, rgba(23, 23, 23, 0.95));
  }
}

.panel-header {
  @apply flex items-center justify-between px-4 py-3 flex-shrink-0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);

  .dark & {
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }

  .tabs {
    @apply flex items-center gap-5;

    .tab {
      @apply text-sm font-semibold cursor-pointer pb-1 transition-all duration-200;
      @apply text-gray-400 dark:text-gray-500;
      border-bottom: 2px solid transparent;

      &.active {
        @apply text-gray-800 dark:text-gray-100;
        border-bottom-width: 2px;
      }

      &:hover:not(.active) {
        @apply text-gray-600 dark:text-gray-300;
      }
    }
  }

  .header-actions {
    @apply flex items-center gap-1;
  }

  .action-btn,
  .close-btn {
    @apply w-8 h-8 flex items-center justify-center rounded-full cursor-pointer;
    @apply text-gray-500 dark:text-gray-400;
    @apply hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors;

    i {
      font-size: 18px;
    }
  }

  .action-btn:hover {
    @apply text-red-500;
  }
}

.panel-body {
  @apply flex flex-col flex-1 overflow-hidden;
}

.now-playing-card {
  @apply flex items-center gap-3 mx-3 my-2 p-3 rounded-2xl flex-shrink-0 cursor-pointer;
  border: 1px solid transparent;
  transition: opacity 0.15s ease, transform 0.15s ease;

  &:hover {
    opacity: 0.92;
  }

  .now-playing-art {
    @apply relative flex-shrink-0;
    width: 48px;
    height: 48px;

    .art-img {
      @apply w-full h-full rounded-xl object-cover;
      :deep(img) {
        @apply rounded-xl w-full h-full object-cover;
      }
    }

    .now-playing-indicator {
      @apply absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center;

      .eq-icon {
        font-size: 11px;
        color: white;
      }
    }
  }

  .now-playing-info {
    @apply flex flex-col min-w-0 flex-1;

    .now-playing-label {
      @apply text-xs font-medium mb-0.5 opacity-60;
      @apply text-gray-600 dark:text-gray-400;
    }

    .now-playing-title {
      @apply text-sm font-bold truncate;
      @apply text-gray-900 dark:text-gray-100;
    }

    .now-playing-artist {
      @apply text-xs truncate opacity-70 mt-0.5;
      @apply text-gray-600 dark:text-gray-400;
    }
  }
}

.queue-controls {
  @apply flex items-center gap-2 px-3 pb-3 flex-shrink-0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);

  .dark & {
    border-bottom-color: rgba(255, 255, 255, 0.06);
  }

  .ctrl-btn {
    @apply flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-200;
    @apply border text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700;
    @apply bg-transparent;

    &:hover {
      @apply bg-gray-100 dark:bg-gray-800;
    }

    i {
      font-size: 14px;
    }

    &.ctrl-active {
    }
  }
}

.queue-subtitle {
  @apply flex items-center justify-between px-4 py-2 flex-shrink-0;

  .subtitle-title {
    @apply text-xs font-semibold uppercase tracking-wider;
    @apply text-gray-500 dark:text-gray-400;
  }

  .subtitle-count {
    @apply text-xs;
    @apply text-gray-400 dark:text-gray-500;
  }
}

.queue-list {
  @apply flex-1 overflow-auto;
}

.queue-item {
  @apply flex items-center gap-3 px-3 py-2 mx-2 mb-1 cursor-pointer transition-all duration-150 rounded-xl;
  @apply hover:bg-gray-100 dark:hover:bg-gray-800/60;
  min-height: 68px;
  border: 1px solid transparent;

  &.is-playing {
  }

  .item-art {
    @apply relative flex-shrink-0;
    width: 44px;
    height: 44px;

    .item-img {
      @apply w-full h-full rounded-lg object-cover;
      :deep(img) {
        @apply rounded-lg w-full h-full object-cover;
      }
    }

    .item-playing-overlay {
      @apply absolute inset-0 rounded-lg flex items-center justify-center;

      i {
        font-size: 16px;
      }
    }
  }

  .item-info {
    @apply flex flex-col min-w-0 flex-1;

    .item-title {
      @apply text-sm font-semibold truncate;
      @apply text-gray-800 dark:text-gray-200;
      transition: color 0.2s;
    }

    .item-artist {
      @apply text-xs truncate mt-0.5 opacity-70;
      @apply text-gray-500 dark:text-gray-400;
    }
  }

  .item-actions {
    @apply flex items-center gap-1 flex-shrink-0;

    .drag-handle,
    .more-btn {
      @apply w-8 h-8 flex items-center justify-center rounded-full cursor-pointer;
      @apply text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-all;

      i {
        font-size: 16px;
      }
    }

    .drag-handle {
      cursor: grab;

      &:active {
        cursor: grabbing;
      }
    }
  }
}

.empty-queue {
  @apply flex flex-col items-center justify-center flex-1 py-16;
  @apply text-gray-400 dark:text-gray-500;

  i {
    font-size: 48px;
    @apply mb-3;
  }
  p {
    @apply text-sm;
  }
}

.queue-lyrics-container {
  @apply relative flex flex-col flex-1 h-full overflow-hidden;
  user-select: none;

  .queue-lyrics-scroller {
    @apply flex-1 overflow-y-auto px-5 py-4;
    scroll-behavior: smooth;
    mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      black 10%,
      black 88%,
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      black 10%,
      black 88%,
      transparent 100%
    );

    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }

  .queue-lyrics-padding-top {
    height: 38%;
  }

  .queue-lyrics-padding-bottom {
    height: 48%;
  }

  .queue-lyric-line {
    @apply py-2.5 px-3 rounded-xl transition-all duration-300;
    line-height: 1.5;
    font-size: 1.05rem;
    font-weight: 500;
    color: var(--lyric-inactive, rgba(120, 120, 120, 0.75));
    transform-origin: left center;
    cursor: default;

    &.is-clickable {
      cursor: pointer;

      &:hover:not(.is-active) {
        opacity: 0.9;
        transform: scale(1.015);
      }
    }

    &.is-active {
      color: var(--accent, #6366f1) !important;
      font-size: 1.35rem;
      font-weight: 800;
      position: relative;

      .queue-lyric-text {
        color: var(--accent, #6366f1);
        font-weight: 800;
      }
    }

    .queue-lyric-text {
      display: inline-block;
      transition: all 0.2s ease;
      word-break: break-word;
    }

    .queue-word-by-word-lyric {
      display: inline;
      word-break: break-word;

      .queue-lyric-word {
        display: inline;
      }
      .queue-lyric-space {
        display: inline;
      }
    }

    .queue-lyric-roma {
      @apply text-xs mt-1 font-normal opacity-70;
    }

    .queue-lyric-tr {
      @apply text-xs mt-0.5 font-normal opacity-85;
    }
  }

  .queue-lyrics-loading {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 40px 24px;
    width: 100%;

    .lyrics-skeleton-line {
      height: 24px;
      border-radius: 8px;
      background: linear-gradient(
        90deg,
        rgba(150, 150, 150, 0.12) 25%,
        rgba(150, 150, 150, 0.24) 37%,
        rgba(150, 150, 150, 0.12) 63%
      );
      background-size: 400% 100%;
      animation: shimmerSkeleton 1.4s ease infinite;
    }
  }

  .queue-lyrics-empty {
    @apply flex flex-col items-center justify-center flex-1 gap-3 py-20 text-gray-400 dark:text-gray-500;
    i {
      font-size: 42px;
      opacity: 0.8;
    }
    p {
      @apply text-sm font-medium;
    }
  }

  .queue-lyrics-sync-btn {
    @apply absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg;
    background: var(--accent, #6366f1);
    color: #ffffff;
    border: none;
    cursor: pointer;
    backdrop-filter: blur(8px);
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
    animation: fadeIn 0.25s ease-out;
    z-index: 10;

    &:hover {
      transform: scale(1.06);
    }
    &:active {
      transform: scale(0.96);
    }
  }
}

@keyframes shimmerSkeleton {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}

@media (max-width: 768px) {
  .queue-panel:not([data-shell-layout]) {
    position: fixed;
    width: 100%;
    height: 80vh;
    top: auto;
    bottom: 0;
    border-radius: 24px 24px 0 0;
    border-left: none;
  }
}
</style>
