<template>
  <div
    class="music-play-bar rounded-t-3xl overflow-hidden"
    :class="{ 'play-bar-hidden': musicFullVisible }"
    :style="{
      backgroundColor: musicFullVisible ? 'transparent' : 'var(--shell-surface)',
      color: 'var(--text-color, inherit)',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
      '--fill-color': playMusic?.primaryColor || 'var(--primary-color)',
      '--fill-color-light': playMusic?.primaryColor
        ? playMusic.primaryColor + '99'
        : 'var(--primary-color)'
    }"
  >
    <div class="play-bar-left">
      <div class="play-bar-img-wrapper" @click.stop="setMusicFull">
        <img
          v-if="playMusic?.picUrl"
          :key="playMusic?.id"
          :src="getImgUrl(playMusic?.picUrl, '100y100')"
          class="play-bar-img"
          alt=""
          referrerpolicy="no-referrer"
          @error="handleImgError($event, playMusic, 'song')"
          style="object-fit: cover"
        />
        <img
          v-else
          :key="'logo'"
          :src="logoImg"
          class="play-bar-img"
          alt=""
          style="object-fit: cover"
        />
        <div class="hover-arrow">
          <div class="hover-content">
            <i
              class="text-3xl"
              :class="musicFullVisible ? 'ri-arrow-down-s-line' : 'ri-arrow-up-s-line'"
            ></i>
            <span class="hover-text">{{ musicFullVisible ? 'Collapse' : 'Expand' }}</span>
          </div>
        </div>
      </div>
      <div class="music-content">
        <div class="music-content-title flex items-center">
          <n-ellipsis class="text-ellipsis" line-clamp="1">
            <p v-if="playMusic?.name" v-html="playMusic.name"></p>
            <p v-else class="text-xs opacity-50">Ready to play</p>
          </n-ellipsis>
          <span v-if="(playMusic as any)?.qualityBadge" class="lossless-quality-badge">
            {{ (playMusic as any).qualityBadge }}
          </span>
          <span v-if="playbackRate !== 1.0" class="playback-rate-badge"> {{ playbackRate }}x </span>
        </div>
        <div class="music-content-name">
          <n-ellipsis
            class="text-ellipsis"
            line-clamp="1"
            :tooltip="{
              contentStyle: { maxWidth: '600px' },
              zIndex: 99999
            }"
          >
            <span
              v-for="(artists, artistsindex) in artistList"
              :key="artistsindex"
              class="cursor-pointer hover:text-primary"
              @click.stop="handleArtistClick(artists.id)"
            >
              {{ artists.name }}{{ artistsindex < artistList.length - 1 ? ', ' : '' }}
            </span>
          </n-ellipsis>
        </div>
      </div>
      <div class="favorite-btn" @click.stop="toggleFavorite">
        <i :class="isFavorite ? 'ri-heart-fill like-active' : 'ri-heart-line'"></i>
      </div>
    </div>

    <div class="play-bar-center">
      <div class="music-buttons">
        <div class="icon-btn tooltip-btn" @click.stop="playerStore.toggleShuffle()">
          <n-tooltip trigger="hover" :z-index="9999999">
            <template #trigger>
              <i
                :class="shuffleEnabled ? 'ri-shuffle-fill text-primary' : 'ri-shuffle-line'"
                class="text-lg"
              ></i>
            </template>
            Shuffle
          </n-tooltip>
        </div>
        <div
          class="music-buttons-prev"
          :style="{ color: playMusic?.primaryColor }"
          @click.stop="handlePrev"
        >
          <i class="ri-skip-back-line"></i>
        </div>
        <div class="music-buttons-play play-animated" @click.stop>
          <animated-play-pause
            :is-playing="hasSong && play && !isBuffering"
            :loading="hasSong && isBuffering"
            @click="playMusicEvent"
            :bg-color="playMusic?.primaryColor"
          />
        </div>
        <div
          class="music-buttons-next"
          :style="{ color: playMusic?.primaryColor }"
          @click.stop="handleNext"
        >
          <i class="ri-skip-forward-line"></i>
        </div>
        <div class="icon-btn tooltip-btn" @click.stop="playerStore.toggleRepeat()">
          <n-tooltip trigger="hover" :z-index="9999999">
            <template #trigger>
              <i
                :class="[
                  repeatMode === 1
                    ? 'ri-repeat-2-line text-primary'
                    : repeatMode === 2
                      ? 'ri-repeat-one-line text-primary'
                      : 'ri-repeat-2-line'
                ]"
                class="text-lg"
              ></i>
            </template>
            Repeat
          </n-tooltip>
        </div>
      </div>

      <div class="playback-timeline custom-slider">
        <span class="time-text">{{ secondToMinute(nowTime) }}</span>
        <div class="timeline-slider" :class="{ 'is-buffering': isBuffering }" @click.stop>
          <div v-if="isBuffering" class="buffer-loading-track">
            <div class="buffer-shimmer-bar"></div>
          </div>
          <n-slider
            v-else
            v-model:value="timeSlider"
            :step="1"
            :max="effectiveTotalTime > 0 ? effectiveTotalTime : 100"
            :min="0"
            :tooltip="false"
            @dragstart="handleSliderDragStart"
            @dragend="handleSliderDragEnd"
          ></n-slider>
        </div>
        <span class="time-text">{{ secondToMinute(effectiveTotalTime) }}</span>
      </div>
    </div>

    <!-- Right Side: Lyrics, Queue, Volume & Fullscreen -->
    <div class="play-bar-right audio-button flex items-center gap-2">
      <!-- Lyrics Drawer Toggle -->
      <n-tooltip trigger="hover" :z-index="9999999">
        <template #trigger>
          <div
            class="icon-btn pill-toggle-btn"
            :class="{ 'is-active': playerStore.asideOpen && playerStore.asideTab === 'lyrics' }"
            @click.stop="toggleLyrics"
          >
            <i class="ri-chat-quote-line text-lg"></i>
          </div>
        </template>
        Lyrics
      </n-tooltip>

      <!-- Queue Drawer Toggle -->
      <n-tooltip trigger="hover" :z-index="9999999">
        <template #trigger>
          <div
            class="icon-btn pill-toggle-btn"
            :class="{ 'is-active': playerStore.asideOpen && playerStore.asideTab === 'queue' }"
            @click.stop="openQueue"
          >
            <i class="ri-play-list-2-line text-lg"></i>
          </div>
        </template>
        Queue
      </n-tooltip>

      <!-- Volume -->
      <div class="audio-volume custom-slider" @click.stop @wheel.prevent="handleVolumeWheel">
        <div class="volume-icon" @click.stop="mute">
          <i class="text-lg" :class="getVolumeIcon"></i>
        </div>
        <div class="volume-slider-horizontal">
          <n-slider
            v-model:value="volumeSlider"
            :step="0.01"
            :tooltip="false"
            :disabled="isMuted"
          ></n-slider>
        </div>
      </div>

      <!-- Fullscreen Toggle -->
      <n-tooltip trigger="hover" :z-index="9999999">
        <template #trigger>
          <div class="icon-btn" @click.stop="setMusicFull">
            <i class="ri-fullscreen-line text-lg"></i>
          </div>
        </template>
        Fullscreen
      </n-tooltip>
    </div>

    <music-full-wrapper ref="MusicFullRef" v-model="musicFullVisible" :background="background" />
  </div>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';

import logoImg from '@/assets/logo.png';
import MusicFullWrapper from '@/components/lyric/MusicFullWrapper.vue';
import AnimatedPlayPause from '@/components/player/AnimatedPlayPause.vue';
import {
  allTime,
  artistList,
  ensureLyricsLoaded,
  getExactSongDuration,
  nowTime,
  playMusic
} from '@/hooks/MusicHook';
import { useArtist } from '@/hooks/useArtist';
import { useFavorite } from '@/hooks/useFavorite';
import { usePlaybackControl } from '@/hooks/usePlaybackControl';
import { useVolumeControl } from '@/hooks/useVolumeControl';
import { audioService } from '@/services/audioService';
import { handleImgError } from '@/services/coverService';
import { usePlayerStore } from '@/store/modules/player';
import { useSettingsStore } from '@/store/modules/settings';
import { getImgUrl, secondToMinute, setAnimationClass } from '@/utils';

const playerStore = usePlayerStore();
const settingsStore = useSettingsStore();

const effectiveTotalTime = computed(() => {
  const metaDur = getExactSongDuration(playMusic.value);
  if (metaDur > 0) return metaDur;
  if (allTime.value > 0) return allTime.value;
  return 0;
});

const { isPlaying: play, playMusicEvent, handleNext, handlePrev } = usePlaybackControl();

const {
  isMuted,
  volumeSlider,
  volumeIcon: getVolumeIcon,
  mute,
  handleVolumeWheel
} = useVolumeControl();

const { isFavorite, toggleFavorite } = useFavorite();

const { playbackRate, shuffleEnabled, repeatMode } = storeToRefs(playerStore);

const background = ref('#000');

watch(
  () => playerStore.playMusic,
  async () => {
    if (playMusic && playMusic.value && playMusic.value.backgroundColor) {
      background.value = playMusic.value.backgroundColor as string;
    }
  },
  { immediate: true, deep: true }
);

const dragValue = ref(0);
const isDragging = ref(false);
const isSeeking = ref(false);
const targetSeekTime = ref<number | null>(null);
let seekTimeout: any = null;

watch(nowTime, (newTime) => {
  if (isSeeking.value && targetSeekTime.value !== null) {
    if (Math.abs(newTime - targetSeekTime.value) <= 1.0) {
      isSeeking.value = false;
      targetSeekTime.value = null;
      if (seekTimeout) {
        clearTimeout(seekTimeout);
        seekTimeout = null;
      }
    }
  }
});

const hasSong = computed(() => {
  const m = playMusic?.value;
  return Boolean(
    m && m.id !== undefined && m.id !== null && m.id !== '' && (m.name || (m as any).title)
  );
});

const isBuffering = computed(() => {
  if (!hasSong.value) return false;
  if (isSeeking.value) return true;
  if (Boolean(playMusic?.value?.playLoading) || audioService.isLoading() || audioService.isBuffering()) {
    return true;
  }
  return false;
});

const timeSlider = computed({
  get: () => (isDragging.value ? dragValue.value : nowTime.value),
  set: (value) => {
    if (isDragging.value) {
      dragValue.value = value;
      return;
    }
    executeSeek(value);
  }
});

const executeSeek = (targetTime: number) => {
  if (isSeeking.value && Math.abs(nowTime.value - targetTime) < 0.5) return;
  isSeeking.value = true;
  targetSeekTime.value = targetTime;
  if (seekTimeout) clearTimeout(seekTimeout);
  nowTime.value = targetTime;
  audioService.seek(targetTime);
  seekTimeout = setTimeout(() => {
    isSeeking.value = false;
    targetSeekTime.value = null;
  }, 1200);
};

const handleSliderDragStart = () => {
  isDragging.value = true;
  dragValue.value = nowTime.value;
};

const handleSliderDragEnd = () => {
  isDragging.value = false;
  const target = dragValue.value;
  if (effectiveTotalTime.value > 2 && target >= effectiveTotalTime.value - 0.8) {
    audioService.triggerPlaybackEnded();
  } else {
    executeSeek(target);
  }
};

const formatTooltip = (value: number) => {
  return `${secondToMinute(value)} / ${secondToMinute(effectiveTotalTime.value)}`;
};

const MusicFullRef = ref<any>(null);
const showSliderTooltip = ref(false);

const musicFullVisible = computed({
  get: () => playerStore.musicFull,
  set: (value) => {
    playerStore.setMusicFull(value);
  }
});

const setMusicFull = () => {
  musicFullVisible.value = !musicFullVisible.value;
  playerStore.setMusicFull(musicFullVisible.value);
  if (musicFullVisible.value) {
    settingsStore.showArtistDrawer = false;
    playerStore.setQueueVisible(false);
  }
};

const IGNORE_FULL_TRIGGER_SELECTOR = [
  '.music-time',
  '.music-buttons-prev',
  '.music-buttons-play',
  '.music-buttons-next',
  '.audio-button'
].join(', ');

const handleBarClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null;
  if (!target || target.closest(IGNORE_FULL_TRIGGER_SELECTOR)) return;
  setMusicFull();
};

const { navigateToArtist } = useArtist();

const handleArtistClick = (id: string | undefined) => {
  musicFullVisible.value = false;
  navigateToArtist(id);
};

const openQueue = (e?: Event) => {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  playerStore.toggleAside('queue');
};

const toggleLyrics = (e?: Event) => {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  playerStore.toggleAside('lyrics');
  if (playerStore.asideOpen && playerStore.asideTab === 'lyrics') {
    void ensureLyricsLoaded(false);
  }
};
</script>

<style lang="scss" scoped>
.text-ellipsis {
  width: 100%;
}

.music-play-bar {
  @apply h-16 relative flex-shrink-0 flex items-center justify-between box-border px-4 py-1.5;
  margin-left: var(--shell-gap, 12px);
  margin-right: var(--shell-gap, 12px);
  margin-bottom: var(--shell-gap, 12px);
  border-radius: var(--shell-radius, 16px);
  width: calc(100% - calc(var(--shell-gap, 12px) * 2));
  z-index: var(--shell-z-player, 20);
  cursor: default;
  will-change: transform, opacity;
  transition:
    transform 0.42s cubic-bezier(0.32, 0.72, 0, 1),
    opacity 0.32s cubic-bezier(0.32, 0.72, 0, 1),
    background-color 0.35s ease;

  &.play-bar-hidden {
    opacity: 0 !important;
    pointer-events: none;
    transform: scale(0.96) translateY(12px);
    box-shadow: none !important;
  }
}

.play-bar-left {
  @apply flex items-center gap-3 w-1/3 min-w-[200px];

  .music-content {
    @apply flex flex-col justify-center overflow-hidden;

    &-title {
      @apply text-sm font-semibold;
    }
    &-name {
      @apply text-xs opacity-70;
    }
  }

  .favorite-btn {
    @apply flex items-center justify-center rounded-full transition-all w-7 h-7 ml-1 cursor-pointer;
    i {
      @apply text-base;
    }
    &:hover {
      @apply bg-gray-100 dark:bg-dark-300;
    }
  }
}

.play-bar-center {
  @apply flex flex-col items-center justify-center w-1/3 min-w-[280px];

  .music-buttons {
    @apply flex items-center justify-center gap-2 mb-0.5;

    .tooltip-btn {
      @apply text-gray-500 hover:text-primary transition-colors cursor-pointer flex items-center justify-center w-7 h-7 rounded-full;
      &:hover {
        @apply bg-gray-100 dark:bg-dark-300;
      }
    }

    &-prev,
    &-next {
      @apply flex items-center justify-center rounded-full bg-gray-100 dark:bg-dark-300 transition-all cursor-pointer;
      width: 32px;
      height: 32px;

      i {
        font-size: 18px !important;
      }

      &:hover {
        @apply bg-gray-200 dark:bg-dark-200;
        transform: scale(1.05);
      }
    }

    &-play {
      @apply flex justify-center items-center rounded-full transition-all cursor-pointer;
      width: 38px;
      height: 38px;

      &.play-animated {
        background: transparent !important;
        &:hover {
          background: transparent !important;
          transform: scale(1.05);
        }
        :deep(.animated-play-pause) {
          width: 100%;
          height: 100%;
          border-radius: 50%;
        }
      }
    }
  }

  .playback-timeline {
    @apply flex items-center w-full gap-2;

    .time-text {
      @apply text-[11px] opacity-60 w-9 text-center;
      font-variant-numeric: tabular-nums;
    }

    .timeline-slider {
      @apply flex-1;
      padding: 2px 0;
    }
  }
}

.play-bar-right {
  @apply flex items-center justify-end w-1/3 min-w-[200px] gap-1;

  .audio-volume {
    @apply flex items-center gap-2 ml-1 w-24;

    .volume-icon {
      @apply cursor-pointer flex items-center;
      i {
        @apply text-base hover:text-primary transition-colors;
      }
    }

    .volume-slider-horizontal {
      @apply flex-1 flex items-center;
    }
  }
}

.play-bar-img {
  @apply w-11 h-11 rounded-lg object-cover;
}

.icon-btn {
  @apply flex items-center justify-center rounded-full transition-all w-8 h-8 mx-0.5;
  &:hover {
    @apply bg-gray-100 dark:bg-dark-300 text-primary;
  }
  &.pill-toggle-btn.is-active {
    @apply text-primary bg-primary/15 !important;
  }
  &.close-btn:hover {
    @apply text-red-500;
  }
}

.custom-slider {
  :deep(.n-slider) {
    --n-rail-height: 5px !important;
    --n-rail-color: rgba(128, 128, 128, 0.25);
    --n-rail-color-dark: rgba(255, 255, 255, 0.12);
    --n-fill-color: var(--fill-color, var(--primary-color));
    --n-fill-color-hover: var(--fill-color, var(--primary-color));
    --n-handle-size: 14px !important;
    --n-handle-color: var(--fill-color, #fff);

    .n-slider-rail {
      @apply transition-all duration-200 rounded-full;
      overflow: visible;
    }

    .n-slider-handle {
      @apply transition-all duration-200;
      opacity: 0;
      transform: scale(0.5);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
    }

    &:hover {
      .n-slider-handle {
        opacity: 1;
        transform: scale(1);
      }
    }
  }

  .buffer-loading-track {
    @apply w-full relative overflow-hidden rounded-full;
    height: 5px;
    background: rgba(128, 128, 128, 0.22);
    pointer-events: none;

    .buffer-shimmer-bar {
      @apply absolute inset-0 rounded-full;
      width: 50%;
      background: linear-gradient(
        90deg,
        transparent 0%,
        var(--fill-color, var(--primary-color)) 50%,
        transparent 100%
      );
      will-change: transform, opacity;
      animation: buffer-rail-slide 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }
  }

  .timeline-slider.is-buffering {
    pointer-events: none !important;
    cursor: wait !important;
  }
}

@keyframes buffer-rail-slide {
  0% {
    transform: translateX(-100%);
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateX(250%);
    opacity: 0.3;
  }
}

.play-bar-img-wrapper {
  @apply relative cursor-pointer w-11 h-11 shrink-0 rounded-lg overflow-hidden;

  .hover-arrow {
    @apply absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 rounded-lg;
    background: rgba(0, 0, 0, 0.5);

    .hover-content {
      @apply flex flex-col items-center justify-center;

      i {
        @apply text-white mb-0.5;
      }

      .hover-text {
        @apply text-white text-xs scale-90;
      }
    }
  }

  &:hover {
    .hover-arrow {
      @apply opacity-100;
    }
  }
}

.tooltip-content {
  @apply text-sm py-1 px-2;
}

.like-active {
  @apply text-red-500 hover:text-red-600 !important;
}

.disabled-icon {
  @apply opacity-50 cursor-not-allowed !important;
  &:hover {
    @apply text-inherit !important;
  }
}

.loading-overlay {
  @apply absolute inset-0 flex items-center justify-center rounded-md;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 2;
}

.loading-icon {
  font-size: 24px;
  color: white;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.playback-rate-badge {
  @apply ml-2 px-1.5 h-4 flex items-center text-xs rounded text-primary bg-opacity-15 text-primary dark:text-primary;
  font-weight: 500;
  vertical-align: 1px;
}

.lossless-quality-badge {
  @apply ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded tracking-wider uppercase border border-current;
  color: var(--fill-color, var(--primary-color));
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(4px);
  line-height: 1;
}

.compact {
  .music-play-bar {
    @apply px-4 bottom-[56px] transition-all duration-300;
  }
  .play-bar-center {
    display: none;
  }
  .play-bar-right {
    display: none;
  }
}
</style>
