<template>
  <n-drawer
    v-model:show="isVisible"
    :height="isFullScreen ? '100%' : '100%'"
    placement="bottom"
    :style="drawerBaseStyle"
    to="#layout-main"
    :z-index="9998"
  >
    <lyric-dynamic-background
      v-if="!config.useCustomBackground"
      :fallback-color="props.background || '#09070f'"
    />

    <div
      v-if="
        config.useCustomBackground && config.backgroundMode === 'image' && config.backgroundImage
      "
      class="background-layer"
      :style="backgroundImageStyle"
    ></div>

    <div
      id="drawer-target"
      :class="[config.theme, 'morph-state-' + morphState]"
      class="relative z-10 w-full h-full"
    >
      <div
        class="control-left absolute top-8 left-8 z-[9999]"
        :class="{ 'pure-mode': config.pureModeEnabled }"
      >
        <div class="control-btn" title="Collapse" @click="closeMusicFull">
          <i class="ri-arrow-down-s-line"></i>
        </div>
      </div>

      <div
        class="window-controls-top-right absolute top-8 right-8 z-[9999] flex items-center gap-1.5"
        @mousedown.stop
      >
        <div class="window-control-btn" @click="minimizeWindow" title="Minimize">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3 8h10v1.5H3z" />
          </svg>
        </div>
        <div class="window-control-btn" @click="maximizeWindow" title="Maximize">
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <rect x="3" y="3" width="10" height="10" rx="1.5" />
          </svg>
        </div>
        <div class="window-control-btn close-btn" @click="closeAppWindow" title="Close">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M4.29 4.29a1 1 0 0 1 1.42 0L8 6.59l2.29-2.3a1 1 0 0 1 1.42 1.42L9.41 8l2.3 2.29a1 1 0 0 1-1.42 1.42L8 9.41l-2.29 2.3a1 1 0 0 1-1.42-1.42L6.59 8 4.29 5.71a1 1 0 0 1 0-1.42z"
            />
          </svg>
        </div>
      </div>

      <div
        class="content-wrapper"
        :style="{ width: config.contentWidth ? `${Math.max(config.contentWidth, 92)}%` : '95%' }"
      >
        <div
          v-if="!config.hideCover"
          class="left-side"
          :class="{ 'only-cover': config.hideLyrics }"
        >
          <div class="img-container">
            <cover3-d
              :key="playMusic?.id"
              :src="thumbPlayer(playMusic?.picUrl)"
              :loading="false"
              :max-tilt="12"
              :scale="1.03"
              :shine-intensity="0.25"
            />
          </div>

          <div class="music-info">
            <div class="music-content-name flex items-center justify-center gap-2">
              <span v-html="playMusic?.name || ''"></span>
              <span v-if="(playMusic as any)?.qualityBadge" class="lossless-quality-badge">
                {{ (playMusic as any).qualityBadge }}
              </span>
            </div>

            <div class="music-content-singer">
              <n-ellipsis
                class="text-ellipsis"
                line-clamp="2"
                :tooltip="{
                  contentStyle: { maxWidth: '600px' },
                  zIndex: 99999
                }"
              >
                <span
                  v-for="(item, index) in artistList"
                  :key="index"
                  class="cursor-pointer hover:text-primary"
                  @click="handleArtistClick(item.id)"
                >
                  {{ item.name }}{{ index < artistList.length - 1 ? ', ' : '' }}
                </span>
              </n-ellipsis>
            </div>

            <simple-play-bar
              class="mt-4"
              :pure-mode-enabled="config.pureModeEnabled"
              :is-dark="textColors.theme === 'dark'"
            />
          </div>
        </div>

        <div
          class="right-side"
          :class="{
            hide: config.hideLyrics,
            'full-width': config.hideCover
          }"
        >
          <lyrics-view
            ref="lyricsViewRef"
            variant="full"
            alignment="left"
            :morph-state="morphState"
          />
        </div>
      </div>
      <div
        class="control-bottom-right absolute bottom-6 right-6 z-[9999]"
        :class="{ 'pure-mode': config.pureModeEnabled }"
      >
        <div
          class="control-btn"
          :title="isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'"
          @click="toggleFullScreen"
        >
          <i
            :class="isFullScreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line'"
            style="font-size: 15px"
          ></i>
        </div>
      </div>
    </div>
  </n-drawer>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';

import Cover3D from '@/components/cover/Cover3D.vue';
import LyricDynamicBackground from '@/components/lyric/LyricDynamicBackground.vue';
import LyricsView from '@/components/lyric/LyricsView.vue';
import SimplePlayBar from '@/components/player/SimplePlayBar.vue';
import { artistList, playMusic, textColors } from '@/hooks/MusicHook';
import { useArtist } from '@/hooks/useArtist';
import { useLyricBackground } from '@/hooks/useLyricBackground';
import { usePlayerStore } from '@/store/modules/player';
import { type LyricConfig } from '@/types/lyric';
import { isDesktop } from '@/utils';
import { LYRIC_CONFIG_CHANGE_EVENT, readLyricConfig, writeLyricConfig } from '@/utils/lyricConfig';
import { thumbPlayer } from '@/utils/thumbnail';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  background: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue']);

const playerStore = usePlayerStore();
const { navigateToArtist } = useArtist();

const lyricsViewRef = ref<InstanceType<typeof LyricsView> | null>(null);

const isFullScreen = ref(false);

const minimizeWindow = () => {
  if (window?.api?.minimize) {
    window.api.minimize();
  }
};

const maximizeWindow = () => {
  if (window?.api?.maximize) {
    window.api.maximize();
  }
};

const closeAppWindow = () => {
  if (window?.api?.close) {
    window.api.close();
  } else {
    closeMusicFull();
  }
};

const openGpuiCanvas = async () => {
  if (window?.api?.launchPerformanceWindow) {
    try {
      await window.api.launchPerformanceWindow();
    } catch (e) {
      console.error('Failed to launch GPUI window:', e);
    }
  }
};

const { applyBackground } = useLyricBackground();

type PlayerMorphState =
  'collapsed' | 'expanding' | 'morphing' | 'settling' | 'normal' | 'collapsing';

const morphState = ref<PlayerMorphState>(props.modelValue ? 'normal' : 'collapsed');
let morphTimer1: any = null;
let morphTimer2: any = null;
let morphTimer3: any = null;

const clearMorphTimers = () => {
  if (morphTimer1) clearTimeout(morphTimer1);
  if (morphTimer2) clearTimeout(morphTimer2);
  if (morphTimer3) clearTimeout(morphTimer3);
  morphTimer1 = null;
  morphTimer2 = null;
  morphTimer3 = null;
};

const isVisible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => {
    emit('update:modelValue', val);
    playerStore.setMusicFull(val);
  }
});

const closeMusicFull = () => {
  isVisible.value = false;
};

const config = ref<LyricConfig>(readLyricConfig());
provide('lyricSetting', config);

watch(
  () => config.value,
  (newConfig) => {
    writeLyricConfig(newConfig);
  },
  { deep: true }
);

const handleLyricConfigChange = () => {
  const nextConfig = readLyricConfig();
  if (JSON.stringify(nextConfig) !== JSON.stringify(config.value)) {
    config.value = nextConfig;
  }
};

const themeMusic: Record<string, string> = {
  default: '',
  dark: '#000000',
  white: '#ffffff',
  gray: '#242424',
  blue: '#092147',
  green: '#00372d',
  purple: '#280c44',
  pink: '#5e0035',
  warm: '#4a2c00',
  red: '#4a0808'
};

const customBackgroundStyle = computed(() => {
  if (!config.value.useCustomBackground) return null;
  switch (config.value.backgroundMode) {
    case 'solid':
      return config.value.solidColor || null;
    case 'gradient':
      if (config.value.gradientColors?.colors?.length) {
        return `linear-gradient(${config.value.gradientColors.direction || '180deg'}, ${config.value.gradientColors.colors.join(', ')})`;
      }
      return null;
    case 'image':
      return null;
    case 'css':
      return config.value.customCss || null;
    default:
      return null;
  }
});

const targetBackground = computed(() => {
  if (config.value.useCustomBackground && customBackgroundStyle.value) {
    return customBackgroundStyle.value;
  }
  if (config.value.theme && config.value.theme !== 'default') {
    return themeMusic[config.value.theme] || props.background;
  }
  return props.background;
});

watch(
  targetBackground,
  (newBg) => {
    if (newBg) {
      applyBackground(newBg);
    }
  },
  { immediate: true }
);

const backgroundImageStyle = computed(() => {
  const blur = config.value.imageBlur || 0;
  const brightness = config.value.imageBrightness || 100;
  return {
    backgroundImage: `url(${config.value.backgroundImage})`,
    filter: `blur(${blur}px) brightness(${brightness}%)`
  };
});

const isQueueVisibleInFull = computed(() => {
  return !isFullScreen.value && playerStore.queueVisible;
});

const drawerBaseStyle = computed(() => {
  if (isFullScreen.value) {
    const fullStyle = {
      borderRadius: '0',
      overflow: 'hidden',
      top: '0',
      bottom: '0',
      left: '0',
      right: '0',
      width: '100%',
      height: '100%'
    };
    if (config.value.useCustomBackground && config.value.backgroundMode === 'image') {
      return { ...fullStyle, background: 'transparent' };
    }
    if (config.value.useCustomBackground && customBackgroundStyle.value) {
      return { ...fullStyle, background: customBackgroundStyle.value };
    }
    return { ...fullStyle, background: 'transparent' };
  }

  const queueWidth = 'clamp(260px, 28vw, 360px)';
  const queueOffset = isQueueVisibleInFull.value
    ? `calc(${queueWidth} + var(--shell-gap, 12px))`
    : '0px';

  const shellStyle = {
    borderRadius: 'var(--shell-radius, 12px)',
    overflow: 'hidden',
    top: 'var(--shell-gap, 12px)',
    bottom: 'var(--shell-gap, 12px)',
    left: 'var(--shell-gap, 12px)',
    right: `calc(var(--shell-gap, 12px) + ${queueOffset})`,
    height: 'calc(100% - calc(var(--shell-gap, 12px) * 2))',
    maxHeight: 'calc(100% - calc(var(--shell-gap, 12px) * 2))',
    boxSizing: 'border-box' as const,
    transition: 'right 0.35s cubic-bezier(0.25, 1, 0.5, 1)'
  };

  if (config.value.useCustomBackground && config.value.backgroundMode === 'image') {
    return { ...shellStyle, background: 'transparent' };
  }
  if (config.value.useCustomBackground && customBackgroundStyle.value) {
    return { ...shellStyle, background: customBackgroundStyle.value };
  }
  return { ...shellStyle, background: 'transparent' };
});

const toggleFullScreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    isFullScreen.value = true;
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
      isFullScreen.value = false;
    }
  }
};

const handleFullScreenChange = () => {
  isFullScreen.value = !!document.fullscreenElement;
};

const handleArtistClick = (id: string | number | undefined) => {
  if (!id) return;
  isVisible.value = false;
  navigateToArtist(String(id));
};

const lrcScroll = (behavior: ScrollBehavior | boolean = 'smooth', force: boolean = false) => {
  if (!isVisible.value) return;
  const isSnap = behavior === 'instant' || behavior === true;
  lyricsViewRef.value?.scrollToActive(isSnap, force);
};

onMounted(() => {
  config.value = readLyricConfig();
  document.addEventListener('fullscreenchange', handleFullScreenChange);
  window.addEventListener(LYRIC_CONFIG_CHANGE_EVENT, handleLyricConfigChange);
});

onBeforeUnmount(() => {
  clearMorphTimers();
  document.removeEventListener('fullscreenchange', handleFullScreenChange);
  window.removeEventListener(LYRIC_CONFIG_CHANGE_EVENT, handleLyricConfigChange);
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
});

watch(
  isVisible,
  (newVal) => {
    clearMorphTimers();
    if (newVal) {
      morphState.value = 'normal';
      nextTick(() => {
        lrcScroll('instant', true);
      });
    } else {
      morphState.value = 'collapsed';
    }
  },
  { immediate: true }
);

defineExpose({
  lrcScroll,
  config
});
</script>

<style scoped lang="scss">
.background-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
}

#drawer-target {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  width: 100%;
  height: 100%;
  border-radius: inherit;

  .content-wrapper {
    display: grid;
    align-items: center;
    margin: 0 auto;
    height: 100%;
    grid-template-columns: minmax(260px, 34%) 1fr;
    gap: 2rem;
    max-width: 1750px;
    padding: 2rem 2.5rem;
    box-sizing: border-box;

    @media (max-width: 1024px) {
      grid-template-columns: minmax(220px, 36%) 1fr;
      gap: 1.5rem;
      padding: 1.5rem 2rem;
    }

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
      grid-template-rows: auto;
      gap: 1rem;
      padding: 1rem 1.5rem;
      overflow-y: auto;

      .right-side {
        display: none;
      }
    }
  }

  .left-side {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 0;

    &.only-cover {
      grid-column: span 2;

      .img-container {
        width: 50vh;
        max-height: 50vh;
        aspect-ratio: 1 / 1;
      }

      .music-info {
        max-width: 800px;
      }
    }

    .img-container {
      position: relative;
      width: clamp(160px, 28vh, 360px);
      max-height: 32vh;
      margin-bottom: 1rem;
      aspect-ratio: 1 / 1;
      flex-shrink: 0;
      max-width: 100%;
      transform-origin: bottom center;
      transition:
        transform 0.42s cubic-bezier(0.32, 0.72, 0, 1),
        opacity 0.35s cubic-bezier(0.32, 0.72, 0, 1);
    }

    .music-info {
      width: 100%;
      text-align: center;
      max-width: 440px;
      transition:
        transform 0.42s cubic-bezier(0.32, 0.72, 0, 1),
        opacity 0.35s cubic-bezier(0.32, 0.72, 0, 1);

      .music-content-name {
        font-size: clamp(1.4rem, 2vw, 1.85rem);
        font-weight: 700;
        margin-bottom: 0.35rem;
        color: var(--text-color-active, #ffffff);
        line-height: 1.25;
      }

      .music-content-singer {
        font-size: 1rem;
        opacity: 0.8;
        color: var(--text-color-primary, rgba(255, 255, 255, 0.7));
      }

      :deep(.simple-play-bar) {
        transition:
          transform 0.42s cubic-bezier(0.32, 0.72, 0, 1),
          opacity 0.35s cubic-bezier(0.32, 0.72, 0, 1);
      }
    }
  }

  .right-side {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    text-align: left;
    width: 100%;
    max-width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    transition:
      transform 0.42s cubic-bezier(0.32, 0.72, 0, 1),
      opacity 0.35s cubic-bezier(0.32, 0.72, 0, 1);

    &.full-width {
      grid-column: span 2;
    }

    &.hide {
      display: none;
    }
  }

  &.morph-state-expanding {
    .left-side .img-container {
      transform: scale(0.68) translateY(36px) translateX(-18px);
      opacity: 0.82;
      transition: none;
    }

    .left-side .music-info {
      transform: translateY(28px) translateX(-10px);
      opacity: 0.6;
      transition: none;

      :deep(.simple-play-bar) {
        transform: translateY(20px) scale(0.96);
        opacity: 0.4;
        transition: none;
      }
    }

    .right-side {
      opacity: 0.75;
      transform: translateY(16px);
      transition: none;
    }
  }

  &.morph-state-morphing,
  &.morph-state-settling,
  &.morph-state-normal {
    .left-side .img-container {
      transform: scale(1) translateY(0) translateX(0);
      opacity: 1;
    }

    .left-side .music-info {
      transform: translateY(0) translateX(0);
      opacity: 1;

      :deep(.simple-play-bar) {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
    }

    .right-side {
      transform: translateY(0);
      opacity: 1;
    }
  }

  &.morph-state-collapsing {
    .left-side .img-container {
      transform: scale(0.68) translateY(36px) translateX(-18px);
      opacity: 0.45;
    }

    .left-side .music-info {
      transform: translateY(28px) translateX(-10px);
      opacity: 0.3;

      :deep(.simple-play-bar) {
        transform: translateY(20px) scale(0.96);
        opacity: 0.2;
      }
    }

    .right-side {
      transform: translateY(20px);
      opacity: 0;
    }
  }
}

.control-left,
.control-bottom-right {
  transition: opacity 0.3s ease;

  &.pure-mode {
    pointer-events: auto;

    .control-btn {
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s ease;
    }

    &:hover .control-btn {
      opacity: 1;
      pointer-events: auto;
    }
  }

  &:not(.pure-mode) .control-btn {
    pointer-events: auto;
  }
}

@media (max-height: 720px) {
  #drawer-target {
    .content-wrapper {
      padding: 1rem 1.5rem;
      gap: 1.25rem;
    }

    .left-side {
      .img-container {
        width: clamp(130px, 22vh, 220px);
        max-height: 24vh;
        margin-bottom: 0.5rem;
      }

      .music-info {
        .music-content-name {
          font-size: 1.25rem;
          margin-bottom: 0.2rem;
        }

        .music-content-singer {
          font-size: 0.875rem;
        }

        :deep(.simple-play-bar) {
          margin-top: 0.5rem;
        }
      }
    }
  }
}

.window-controls-top-right {
  display: flex !important;
  align-items: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  padding: 4px 6px;
  gap: 4px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28);
  z-index: 99999 !important;
  pointer-events: auto !important;

  .window-control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 26px;
    border-radius: 6px;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.9);
    transition: all 0.15s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }

    &.close-btn:hover {
      background: #ef4444;
      color: #ffffff;
    }
  }
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 36px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--text-color-active, #ffffff);
  transition: all 0.25s cubic-bezier(0.25, 1, 0.5, 1);

  &:hover {
    background: rgba(255, 255, 255, 0.16);
    transform: scale(1.05);
  }

  i {
    font-size: 16px;
    line-height: 1;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-leave-to {
  opacity: 0;
}

.lossless-quality-badge {
  @apply ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded tracking-wider uppercase border border-current;
  color: var(--primary-color, #ff4e4e);
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(4px);
  line-height: 1;
}

:global(.n-drawer-container .n-drawer.n-drawer--bottom-placement) {
  transition: transform 0.42s cubic-bezier(0.32, 0.72, 0, 1) !important;
  box-sizing: border-box !important;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.25);
}

:global(.n-drawer-container .n-drawer-mask) {
  transition: opacity 0.42s cubic-bezier(0.32, 0.72, 0, 1) !important;
}
</style>
