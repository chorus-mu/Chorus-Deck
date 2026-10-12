<template>
  <n-drawer
    v-model:show="isVisible"
    height="100%"
    placement="bottom"
    :style="drawerBaseStyle"
    :to="`#layout-main`"
    :z-index="9998"
  >
    <div
      v-if="
        config.useCustomBackground && config.backgroundMode === 'image' && config.backgroundImage
      "
      class="background-layer"
      :style="backgroundImageStyle"
    ></div>
    <div id="drawer-target" :class="[config.theme]" class="relative z-10">
      <div
        class="control-left absolute top-8 left-8 z-[9999]"
        :class="{ 'pure-mode': config.pureModeEnabled }"
      >
        <div class="control-btn" @click="closeMusicFull">
          <i class="ri-arrow-down-s-line"></i>
        </div>
      </div>

      <div
        class="control-right absolute top-8 right-8 z-[9999]"
        :class="{ 'pure-mode': config.pureModeEnabled }"
      >
        <n-popover v-model:show="settingsPopoverVisible" trigger="click" placement="bottom" raw>
          <template #trigger>
            <div class="control-btn" title="Lyrics Settings">
              <i class="ri-settings-3-line"></i>
            </div>
          </template>
          <lyric-settings ref="lyricSettingsRef" />
        </n-popover>

        <div class="control-btn" title="Toggle Fullscreen" @click="toggleFullScreen">
          <i
            :class="isFullScreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line'"
            style="font-size: 14px"
          ></i>
        </div>

        <template v-if="isDesktop()">
          <div class="control-btn" title="Maximize" @click="maximizeWindow">
            <svg
              width="11"
              height="11"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <rect x="3" y="3" width="10" height="10" rx="1.5" />
            </svg>
          </div>
          <div class="control-btn" title="Minimize" @click="minimizeWindow">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 8h10v1.5H3z" />
            </svg>
          </div>
          <div class="control-btn close-window-btn" title="Close" @click="handleCloseApp">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path
                d="M4.29 4.29a1 1 0 0 1 1.42 0L8 6.59l2.29-2.3a1 1 0 0 1 1.42 1.42L9.41 8l2.3 2.29a1 1 0 0 1-1.42 1.42L8 9.41l-2.29 2.3a1 1 0 0 1-1.42-1.42L6.59 8 4.29 5.71a1 1 0 0 1 0-1.42z"
              />
            </svg>
          </div>
        </template>
      </div>

      <transition name="fade">
        <div v-if="showPureModeTip" class="pure-mode-tip-layer">
          <transition name="fade" mode="out-in">
            <div v-if="pureModeTipStep === 1" key="right" class="absolute inset-0">
              <div class="pure-mode-tip-highlight"></div>
              <div class="pure-mode-tip-bubble">
                <div class="pure-mode-tip-content">
                  <i class="ri-cursor-line"></i>
                  <span
                    >The controls are tucked away here — hover over this spot to bring them back, or
                    turn them off anytime in Settings → Playback</span
                  >
                  <div class="pure-mode-tip-dots">
                    <span class="is-active"></span>
                    <span></span>
                  </div>
                </div>
                <div class="pure-mode-tip-actions">
                  <button
                    type="button"
                    class="pure-mode-tip-btn pure-mode-tip-btn--primary"
                    @click="nextPureModeTipStep"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
            <div v-else key="left" class="absolute inset-0">
              <div class="pure-mode-tip-highlight pure-mode-tip-highlight--left"></div>
              <div class="pure-mode-tip-bubble pure-mode-tip-bubble--left">
                <div class="pure-mode-tip-content">
                  <i class="ri-cursor-line"></i>
                  <span>The collapse button hides here — hover to reveal it, click to go back</span>
                  <div class="pure-mode-tip-dots">
                    <span></span>
                    <span class="is-active"></span>
                  </div>
                </div>
                <div class="pure-mode-tip-actions">
                  <button type="button" class="pure-mode-tip-btn" @click="prevPureModeTipStep">
                    Previous
                  </button>
                  <button
                    type="button"
                    class="pure-mode-tip-btn pure-mode-tip-btn--primary"
                    @click="finishPureModeTip"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </transition>

      <div class="content-wrapper" :style="{ width: `${config.contentWidth}%` }">
        <div
          v-if="!config.hideCover"
          class="left-side"
          :class="{ 'only-cover': config.hideLyrics }"
        >
          <div class="img-container">
            <cover3-d
              ref="PicImgRef"
              :src="thumbPlayer(playMusic?.picUrl)"
              :loading="playMusic?.playLoading"
              :max-tilt="12"
              :scale="1.03"
              :shine-intensity="0.25"
            />
          </div>
          <div class="music-info">
            <div class="music-content-name" v-html="playMusic.name"></div>
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
                  {{ item.name }}
                  {{ index < artistList.length - 1 ? ', ' : '' }}
                </span>
              </n-ellipsis>
            </div>
            <simple-play-bar
              class="mt-4"
              :pure-mode-enabled="config.pureModeEnabled"
              :isDark="textColors.theme === 'dark'"
            />
          </div>
        </div>

        <div
          class="right-side"
          :class="{
            center: config.centerLyrics,
            hide: config.hideLyrics,
            'full-width': config.hideCover
          }"
        >
          <button
            v-if="showSyncButton && supportAutoScroll"
            class="lyrics-sync-button"
            type="button"
            @click="syncLyrics"
          >
            <i class="ri-focus-3-line"></i>
            Sync
          </button>
          <n-layout
            ref="lrcSider"
            class="music-lrc"
            :native-scrollbar="false"
            @wheel="onUserManualScroll"
            @touchstart="onUserManualScroll"
            @mouseover="mouseOverLayout"
            @mouseleave="mouseLeaveLayout"
          >
            <div class="music-lrc-container">
              <div
                v-if="config.hideCover"
                class="music-info-header"
                :style="{ textAlign: config.centerLyrics ? 'center' : 'left' }"
              >
                <div class="music-info-name" v-html="playMusic.name"></div>
                <div class="music-info-singer">
                  <span
                    v-for="(item, index) in artistList"
                    :key="index"
                    class="cursor-pointer hover:text-primary"
                    @click="handleArtistClick(item.id)"
                  >
                    {{ item.name }}
                    {{ index < artistList.length - 1 ? ', ' : '' }}
                  </span>
                </div>
              </div>

              <div v-if="isLyricsLoading" class="music-lyrics-loading">
                <div
                  v-for="n in 8"
                  :key="n"
                  class="lyrics-skeleton-line"
                  :style="{ width: `${40 + (n % 5) * 12}%` }"
                ></div>
              </div>

              <template v-else-if="lrcArray.length">
                <div v-if="!supportAutoScroll" class="music-lrc-text no-scroll-tip">
                  <span>This lyrics does not support auto-scroll</span>
                </div>
                <div
                  v-for="(item, index) in lrcArray"
                  :id="`music-lrc-text-${index}`"
                  :key="index"
                  class="music-lrc-text"
                  :style="getFocusStyle(index)"
                  :class="{
                    'now-text': index === nowIndex,
                    'hover-text': item.text && item.startTime !== -1,
                    'right-side': config.lyricsTextPosition === 'RIGHT',
                    'has-glow': config.lyricsGlowEffect !== false
                  }"
                  @click="config.lyricsClick !== false && item.startTime !== -1 ? setAudioTime(index) : null"
                >
                  <AmllInterludeDots
                    v-if="item.isPreamble || !item.text || item.text.trim() === '•••' || item.text.trim() === ''"
                    :start-time="item.startTime ?? 0"
                    :duration="item.duration ?? 3000"
                    :current-time="(nowTime + correctionTime) * 1000"
                    :is-active="index === nowIndex"
                    :is-first-line="index === 0"
                  />

                  <div
                    v-else-if="shouldRenderWordByWord(item)"
                    class="word-by-word-lyric"
                  >
                    <template v-for="(word, wordIndex) in item.words" :key="wordIndex">
                      <span class="lyric-word" :style="getWordStyle(index, wordIndex, word)">
                        {{ word.text ? word.text.replace('{bg}', '') : '' }} </span
                      ><span class="lyric-word" v-if="word.space">&nbsp;</span></template
                    >
                  </div>

                  <span
                    v-else
                    :style="getLrcStyle(index)"
                    :class="{ 'bg-vocal': item.text ? item.text.startsWith('{bg}') : false }"
                    >{{ item.text ? item.text.replace('{bg}', '') : '' }}</span
                  >
                  <div v-show="config.showRoma && item.romaText" class="music-lrc-text-roma">
                    {{ item.romaText }}
                  </div>
                  <div v-show="config.showTranslation && item.trText" class="music-lrc-text-tr">
                    {{ item.trText }}
                  </div>
                </div>
              </template>

              <div v-else class="music-lrc-text">
                <span>No lyrics, please enjoy</span>
              </div>
            </div>

            <lyric-correction-control
              v-if="!isCompact"
              :correction-time="correctionTime"
              @adjust="adjustCorrectionTime"
            />
          </n-layout>
        </div>
      </div>
    </div>
  </n-drawer>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import AmllInterludeDots from '@/components/lyric/AmllInterludeDots.vue';
import Cover3D from '@/components/cover/Cover3D.vue';
import LyricCorrectionControl from '@/components/lyric/LyricCorrectionControl.vue';
import LyricSettings from '@/components/lyric/LyricSettings.vue';
import SimplePlayBar from '@/components/player/SimplePlayBar.vue';
import {
  adjustCorrectionTime,
  artistList,
  correctionTime,
  isLyricsLoading,
  lrcArray,
  nowIndex,
  nowTime,
  playMusic,
  setAudioTime,
  textColors,
  useLyricProgress
} from '@/hooks/MusicHook';
import { useArtist } from '@/hooks/useArtist';
import { useLyricBackground } from '@/hooks/useLyricBackground';
import { usePlayerStore } from '@/store/modules/player';
import { useSettingsStore } from '@/store/modules/settings';
import { DEFAULT_LYRIC_CONFIG, LyricConfig } from '@/types/lyric';
import { isCompact, isDesktop } from '@/utils';
import { getTextColors } from '@/utils/linearColor';
import { computeLyricLineStyle } from '@/utils/lyricAnimation';
import { LYRIC_CONFIG_CHANGE_EVENT, readLyricConfig, writeLyricConfig } from '@/utils/lyricConfig';
import { thumbPlayer } from '@/utils/thumbnail';

const lrcSider = ref<any>(null);
const isMouse = ref(false);
const showSyncButton = ref(false);
const isProgrammaticScroll = ref(false);
const { currentBackground, applyBackground } = useLyricBackground();

const customBackgroundStyle = computed(() => {
  if (!config.value.useCustomBackground) {
    return null;
  }

  switch (config.value.backgroundMode) {
    case 'solid':
      return config.value.solidColor;
    case 'gradient': {
      const { colors, direction } = config.value.gradientColors;
      return `linear-gradient(${direction}, ${colors.join(', ')})`;
    }
    case 'image':
      if (!config.value.backgroundImage) return null;

      return config.value.backgroundImage;
    case 'css':
      return config.value.customCss || null;
    default:
      return null;
  }
});

const drawerBaseStyle = computed(() => {
  if (config.value.useCustomBackground && config.value.backgroundMode === 'image') {
    return { background: 'transparent' };
  }

  if (config.value.useCustomBackground && customBackgroundStyle.value) {
    return { background: customBackgroundStyle.value };
  }
  return { background: currentBackground.value || props.background };
});

const backgroundImageStyle = computed(() => {
  const blur = config.value.imageBlur || 0;
  const brightness = config.value.imageBrightness || 100;
  return {
    backgroundImage: `url(${config.value.backgroundImage})`,
    filter: `blur(${blur}px) brightness(${brightness}%)`
  };
});
const showStickyHeader = ref(false);
const lyricSettingsRef = ref<InstanceType<typeof LyricSettings>>();
const isSongChanging = ref(false);
const isFullScreen = ref(false);

const config = ref<LyricConfig>({ ...DEFAULT_LYRIC_CONFIG });

watch(
  () => lyricSettingsRef.value?.config,
  (newConfig) => {
    if (newConfig) {
      config.value = newConfig;
    }
  },
  { deep: true, immediate: true }
);

watch(
  () => config.value,
  (newConfig) => {
    writeLyricConfig(newConfig);
    if (lyricSettingsRef.value) {
      lyricSettingsRef.value.config = newConfig;
    }
  },
  { deep: true }
);

const handleLyricConfigChange = () => {
  const nextConfig = readLyricConfig();
  if (JSON.stringify(nextConfig) !== JSON.stringify(config.value)) {
    config.value = nextConfig;
  }
};

const PURE_MODE_ONBOARDED_KEY = 'pureModeOnboarded';
const settingsPopoverVisible = ref(false);
const showPureModeTip = ref(false);
const pureModeTipStep = ref(1);
const pendingPureModeTip = ref(false);

const showPureModeTipStep = (step: number) => {
  pureModeTipStep.value = step;
  showPureModeTip.value = true;
};

const displayPureModeTip = () => {
  pendingPureModeTip.value = false;
  localStorage.setItem(PURE_MODE_ONBOARDED_KEY, 'true');
  showPureModeTipStep(1);
};

const prevPureModeTipStep = () => {
  if (pureModeTipStep.value > 1) {
    showPureModeTipStep(1);
  }
};

const nextPureModeTipStep = () => {
  if (pureModeTipStep.value < 2) {
    showPureModeTipStep(2);
  }
};

const finishPureModeTip = () => {
  showPureModeTip.value = false;
};

const showPureModeOnboarding = () => {
  if (!isVisible.value || localStorage.getItem(PURE_MODE_ONBOARDED_KEY)) return;

  if (settingsPopoverVisible.value) {
    pendingPureModeTip.value = true;
    return;
  }
  displayPureModeTip();
};

watch(settingsPopoverVisible, (visible) => {
  if (!visible && pendingPureModeTip.value && isVisible.value) {
    displayPureModeTip();
  }
});

watch(
  () => config.value.pureModeEnabled,
  (newValue, oldValue) => {
    if (newValue && !oldValue) {
      showPureModeOnboarding();
    }
  }
);

const supportAutoScroll = computed(() => {
  return lrcArray.value.length > 0 && lrcArray.value[0].startTime !== -1;
});

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

const themeMusic = {
  light: 'linear-gradient(to bottom, #ffffff, #f5f5f5)',
  dark: 'linear-gradient(to bottom, #1a1a1a, #000000)'
};

const emit = defineEmits(['update:modelValue']);

const isVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

let userScrollTimeout: any = null;

const onUserManualScroll = () => {
  if (isSongChanging.value) return;
  showSyncButton.value = true;

  if (userScrollTimeout) {
    clearTimeout(userScrollTimeout);
  }
  userScrollTimeout = setTimeout(() => {
    showSyncButton.value = false;
    lrcScroll('smooth');
  }, 3500);
};

const syncLyrics = () => {
  if (userScrollTimeout) {
    clearTimeout(userScrollTimeout);
    userScrollTimeout = null;
  }
  showSyncButton.value = false;
  isMouse.value = false;
  lrcScroll('smooth');
};

const lrcScroll = (behavior: ScrollBehavior = 'smooth', forceTop: boolean = false) => {
  if (!isVisible.value || !lrcSider.value || !supportAutoScroll.value) return;
  if (!forceTop && config.value.lyricsScroll === false) return;

  if (forceTop) {
    isProgrammaticScroll.value = true;
    lrcSider.value.scrollTo({
      top: 0,
      behavior
    });
    window.setTimeout(() => {
      isProgrammaticScroll.value = false;
    }, 250);
    return;
  }

  if (showSyncButton.value) return;

  const nowEl = document.querySelector(`#music-lrc-text-${nowIndex.value}`) as HTMLElement;
  if (nowEl) {
    const containerHeight = lrcSider.value.$el.clientHeight;
    const elementTop = nowEl.offsetTop;
    const scrollTop = elementTop - containerHeight / 2 + nowEl.clientHeight / 2;

    isProgrammaticScroll.value = true;
    lrcSider.value.scrollTo({
      top: Math.max(0, scrollTop),
      behavior
    });
    window.setTimeout(
      () => {
        isProgrammaticScroll.value = false;
      },
      behavior === 'smooth' ? 500 : 100
    );
  }
};

const debouncedLrcScroll = useDebounceFn(lrcScroll, 120);

const mouseOverLayout = () => {
  if (isCompact.value) {
    return;
  }
  isMouse.value = true;
};

const mouseLeaveLayout = () => {
  if (isCompact.value) {
    return;
  }
  setTimeout(() => {
    isMouse.value = false;
  }, 1000);
};

watch(nowIndex, () => {
  if (isSongChanging.value || showSyncButton.value) return;
  debouncedLrcScroll();
});

watch(
  () => isVisible.value,
  () => {
    if (isVisible.value) {
      if (config.value.pureModeEnabled) {
        showPureModeOnboarding();
      }
      nextTick(() => {
        lrcScroll('instant');
      });
    } else {
      showPureModeTip.value = false;
    }
  }
);

const targetBackground = computed(() => {
  if (config.value.useCustomBackground && customBackgroundStyle.value) {
    if (typeof customBackgroundStyle.value === 'string') {
      return customBackgroundStyle.value;
    }
  }
  if (config.value.theme !== 'default') {
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

const { getLrcStyle: originalLrcStyle } = useLyricProgress();

const getLrcStyle = (index: number) => {
  const colors = textColors.value || getTextColors();
  const originalStyle = originalLrcStyle(index);
  const focusOn = config.value.focusCurrentLyric;

  if (index === nowIndex.value) {
    if (originalStyle.backgroundImage) {
      return {
        ...originalStyle,
        backgroundImage: originalStyle.backgroundImage
          .replace(/#ffffff/g, colors.active)
          .replace(/#ffffff8a/g, `${colors.primary}`),
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        color: 'transparent'
      };
    } else {
      return {
        color: focusOn ? colors.active : colors.primary
      };
    }
  }

  return {
    color: colors.primary
  };
};

const shouldRenderWordByWord = (item: any) => {
  if (config.value.lyricGranularity === 'sentence') return false;
  return item.hasWordByWord && item.words && item.words.length > 0;
};

const getFocusStyle = (index: number) => {
  const alignment = config.value.centerLyrics
    ? 'center'
    : config.value.lyricsTextPosition === 'RIGHT'
      ? 'right'
      : 'left';

  return computeLyricLineStyle({
    index,
    nowIndex: nowIndex.value,
    style: config.value.lyricsAnimationStyle || 'apple_spring',
    alignment,
    focusEnabled: config.value.focusCurrentLyric !== false
  });
};

const getWordStyle = (lineIndex: number, _wordIndex: number, word: any) => {
  const colors = textColors.value || getTextColors();

  if (lineIndex !== nowIndex.value) {
    return {
      color: colors.primary,
      transition: 'color 0.45s cubic-bezier(0.25, 1, 0.5, 1)',
      backgroundImage: 'none',
      WebkitTextFillColor: 'initial'
    };
  }

  const currentTime = (nowTime.value + correctionTime.value) * 1000;
  const wordStartTime = word.startTime;
  const wordEndTime = word.startTime + word.duration;

  const bgOffset = word.text.startsWith('{bg}') ? 0.8 : 1;
  const isBg = word.text.startsWith('{bg}');
  const scale = isBg ? '0.9' : '1.02';

  if (currentTime >= wordStartTime && currentTime < wordEndTime) {
    const progress = Math.max(0, Math.min((currentTime - wordStartTime) / word.duration, 1));
    const progressPercent = progress * 100;
    const feather = config.value.featherEdge ? 2 : 0;
    const startPercent = Math.max(0, progressPercent - feather);
    const endPercent = Math.min(100, progressPercent + feather);

    return {
      backgroundImage: `linear-gradient(to right, ${colors.active} 0%, ${colors.active} ${startPercent}%, ${colors.primary}66 ${endPercent}%, ${colors.primary}66 100%)`,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      opacity: bgOffset,
      transform: `scale(${scale})`,
      transformOrigin: 'left center',
      display: 'inline-block',
      fontStyle: isBg ? 'italic' : 'normal',
      transition: 'background-image 0.05s linear, transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)'
    };
  } else if (currentTime >= wordEndTime) {
    return {
      color: colors.active,
      WebkitTextFillColor: 'initial',
      opacity: bgOffset,
      transform: 'scale(1)',
      display: 'inline-block',
      fontStyle: isBg ? 'italic' : 'normal',
      transition: 'color 0.3s ease-out, transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
    };
  } else {
    return {
      color: colors.primary,
      WebkitTextFillColor: 'initial',
      opacity: bgOffset * 0.6,
      transform: 'scale(1)',
      display: 'inline-block',
      fontStyle: isBg ? 'italic' : 'normal',
      transition: 'color 0.3s ease-out, transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
    };
  }
};

const settingsStore = useSettingsStore();
const router = useRouter();

const { navigateToArtist } = useArtist();

const handleArtistClick = (id: string | undefined) => {
  isVisible.value = false;
  navigateToArtist(id);
};

const setData = computed(() => settingsStore.setData);

watch(
  () => [setData.value.fontFamily, setData.value.fontScope],
  ([newFont, fontScope]) => {
    const defaultFonts =
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

    if (fontScope !== 'lyric' && fontScope !== 'global') {
      document.documentElement.style.setProperty('--current-font-family', defaultFonts);
      return;
    }

    if (!newFont || newFont === 'system-ui') {
      document.documentElement.style.setProperty('--current-font-family', defaultFonts);
    } else {
      const fontList = newFont.split(',').map((font: string) => {
        const trimmedFont = font.trim();

        return /[\s'"()]/.test(trimmedFont) && !/^['"].*['"]$/.test(trimmedFont)
          ? `"${trimmedFont}"`
          : trimmedFont;
      });

      document.documentElement.style.setProperty(
        '--current-font-family',
        `${fontList.join(', ')}, ${defaultFonts}`
      );
    }
  },
  { immediate: true }
);

const handleScroll = () => {
  if (!lrcSider.value) return;
  const { scrollTop } = lrcSider.value.$el;
  if (config.value.hideCover) {
    showStickyHeader.value = scrollTop > 100;
  }
};

const playerStore = usePlayerStore();

const closeMusicFull = () => {
  if (isFullScreen.value && document.fullscreenElement) {
    document.exitFullscreen();
  }
  isVisible.value = false;
  playerStore.setMusicFull(false);
};

const minimizeWindow = () => {
  if (!isDesktop()) return;
  window.api.minimize();
};

const maximizeWindow = () => {
  if (!isDesktop()) return;
  window.api.maximize();
};

const handleCloseApp = () => {
  if (!isDesktop()) return;
  const { closeAction } = settingsStore.setData;
  if (closeAction === 'minimize' || closeAction === 'close') {
    window.api.close();
  } else {
    window.api.close();
  }
};

const toggleFullScreen = async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      isFullScreen.value = true;
    } else {
      await document.exitFullscreen();
      isFullScreen.value = false;
    }
  } catch (error) {
    console.error('Full screen switch failed:', error);
  }
};

const handleFullScreenChange = () => {
  isFullScreen.value = !!document.fullscreenElement;
};

onMounted(() => {
  config.value = readLyricConfig();
  if (lrcSider.value?.$el) {
    lrcSider.value.$el.addEventListener('scroll', handleScroll);
  }
  document.addEventListener('fullscreenchange', handleFullScreenChange);
  window.addEventListener(LYRIC_CONFIG_CHANGE_EVENT, handleLyricConfigChange);
});

onBeforeUnmount(() => {
  if (userScrollTimeout) {
    clearTimeout(userScrollTimeout);
    userScrollTimeout = null;
  }
  if (lrcSider.value?.$el) {
    lrcSider.value.$el.removeEventListener('scroll', handleScroll);
  }
  document.removeEventListener('fullscreenchange', handleFullScreenChange);
  window.removeEventListener(LYRIC_CONFIG_CHANGE_EVENT, handleLyricConfigChange);

  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
});

watch(
  () => config.value.fontSize,
  (newSize) => {
    document.documentElement.style.setProperty('--lyric-font-size', `${newSize}px`);
  },
  { immediate: true }
);

watch(
  () => config.value.fontWeight,
  (newWeight) => {
    document.documentElement.style.setProperty('--lyric-font-weight', newWeight.toString());
  },
  { immediate: true }
);

watch(
  () => config.value.letterSpacing,
  (newSpacing) => {
    document.documentElement.style.setProperty('--lyric-letter-spacing', `${newSpacing}px`);
  },
  { immediate: true }
);

watch(
  () => config.value.lineHeight,
  (newLineHeight) => {
    document.documentElement.style.setProperty('--lyric-line-height', newLineHeight.toString());
  },
  { immediate: true }
);

watch(
  () => playMusic.value.id,
  (newId, oldId) => {
    if (newId !== oldId && newId) {
      isSongChanging.value = true;

      setTimeout(() => {
        showSyncButton.value = false;
        lrcScroll('instant', true);

        setTimeout(() => {
          isSongChanging.value = false;
        }, 300);
      }, 100);
    }
  }
);

defineExpose({
  lrcScroll,
  config
});
</script>

<style scoped lang="scss">
@keyframes round {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
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

@keyframes amllDotPulse {
  0%, 100% {
    transform: scale(0.85);
    opacity: 0.35;
  }
  50% {
    transform: scale(1.35);
    opacity: 1;
  }
}

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

.drawer-back {
  @apply absolute bg-cover bg-center;
  z-index: -1;
  width: 200%;
  height: 200%;
  top: -50%;
  left: -50%;
}

.drawer-back.paused {
  animation-play-state: paused;
}

#drawer-target {
  @apply top-0 left-0 absolute overflow-hidden rounded w-full h-full;
  animation-duration: 300ms;

  .content-wrapper {
    @apply grid items-center mx-auto h-full;
    grid-template-columns: minmax(300px, 40%) 1fr;
    gap: 4rem;
    max-width: 1600px;
    padding: 2rem;
    transition: width 0.3s ease;

    @media (max-width: 1024px) {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
      gap: 2rem;
    }
  }

  .left-side {
    @apply flex flex-col items-center justify-center h-full;
    transition: all 0.3s ease;

    &.only-cover {
      @apply col-span-2;

      .img-container {
        @apply w-[60vh] aspect-square;
      }

      .music-info {
        @apply max-w-[800px];
      }
    }

    .img-container {
      @apply relative w-[45vh] mb-8 aspect-square;
      max-width: 100%;
    }

    .music-info {
      @apply w-full text-center max-w-[400px];

      .music-content-name {
        @apply text-3xl font-bold mb-2 line-clamp-2;
        color: var(--text-color-active);
      }

      .music-content-singer {
        @apply text-lg opacity-80;
        color: var(--text-color-primary);
      }
    }
  }

  .right-side {
    @apply flex flex-col justify-center h-full relative overflow-hidden;

    .lyrics-sync-button {
      @apply absolute right-5 top-5 z-20 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold;
      @apply bg-black/70 text-white shadow-lg backdrop-blur-md transition-colors;

      &:hover {
        @apply bg-black/85;
      }
    }

    &.full-width {
      @apply col-span-2;
    }

    &.center {
      .music-lrc {
        @apply w-full mx-auto text-center;
      }

      .music-lrc-text {
        @apply text-center;
        transform-origin: center center;
      }

      .word-by-word-lyric {
        @apply justify-center;
      }
    }

    &.hide {
      @apply hidden;
    }

    .music-lrc {
      @apply w-full h-full bg-transparent;
      mask-image: linear-gradient(
        to bottom,
        transparent 0%,
        black 15%,
        black 85%,
        transparent 100%
      );
      -webkit-mask-image: linear-gradient(
        to bottom,
        transparent 0%,
        black 15%,
        black 85%,
        transparent 100%
      );

      .music-info-header {
        @apply mb-8;

        .music-info-name {
          @apply text-4xl font-bold mb-2 line-clamp-2;
          color: var(--text-color-active);
        }

        .music-info-singer {
          @apply text-xl opacity-80;
          color: var(--text-color-primary);
        }
      }
    }

    .music-lrc-container {
      padding: 50vh 0;
      min-height: 100%;
    }

    .music-lrc-text {
      @apply text-2xl cursor-pointer font-bold px-4 py-3;
      font-family: var(--current-font-family);
      font-weight: var(--lyric-font-weight, bold) !important;
      transition: transform 0.45s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.45s cubic-bezier(0.25, 1, 0.5, 1);
      background-color: transparent;
      font-size: var(--lyric-font-size, 22px) !important;
      letter-spacing: var(--lyric-letter-spacing, 0) !important;
      line-height: var(--lyric-line-height, 2) !important;
      opacity: 0.6;
      transform-origin: left center;

      max-width: 94.3%;

      &.now-text {
        opacity: 1;
        transform: scale(1.05);
      }

      &.no-scroll-tip {
        @apply text-base opacity-60 cursor-default py-2;
        color: var(--text-color-primary);
        font-weight: normal;

        span {
          padding-right: 0;
        }

        &:hover {
          background-color: transparent;
        }
      }

      span {
        padding-right: 30px;
      }

      &-tr {
        @apply font-normal;
        opacity: 0.7;
        color: var(--text-color-primary);
      }

      .music-preamble-dots {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        padding: 8px 0;

        .preamble-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: currentColor;
          opacity: 0.35;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        &.is-active {
          .preamble-dot {
            animation: amllDotPulse 1.4s ease-in-out infinite;

            &.dot-1 {
              animation-delay: 0s;
            }
            &.dot-2 {
              animation-delay: 0.25s;
            }
            &.dot-3 {
              animation-delay: 0.5s;
            }
          }
        }
      }

      .word-by-word-lyric {
        @apply flex flex-wrap;

        .lyric-word {
          @apply inline-block;
          padding-right: 0;
          font-weight: inherit;
          font-size: inherit;
          letter-spacing: inherit;
          line-height: inherit;
          cursor: inherit;
          position: relative;

          &:hover {
            background-color: rgba(255, 255, 255, 0.1);
          }
        }
      }
    }

    .music-lyrics-loading {
      display: flex;
      flex-direction: column;
      gap: 28px;
      padding: 20px 16px;
      width: 100%;

      .lyrics-skeleton-line {
        height: 36px;
        border-radius: 12px;
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.08) 25%,
          rgba(255, 255, 255, 0.18) 37%,
          rgba(255, 255, 255, 0.08) 63%
        );
        background-size: 400% 100%;
        animation: shimmerSkeleton 1.4s ease infinite;
      }
    }

    .hover-text {
      &:hover {
        @apply font-bold rounded-xl;

        opacity: 1 !important;
        filter: none !important;
        background-color: var(--hover-bg-color);

        span {
          color: var(--text-color-active) !important;
        }
      }
    }
  }
}

.compact {
  #drawer-target {
    @apply p-4 pt-8;

    .content-wrapper {
      @apply flex-col justify-start p-0;
    }

    .music-img {
      display: none;
    }

    .music-lrc {
      height: calc(100vh - 260px) !important;
      width: 100vw;

      span {
        padding-right: 0px !important;
      }

      .hover-text {
        &:hover {
          background-color: transparent;
        }
      }

      .music-lrc-text {
        @apply text-xl text-center;
      }
    }

    .music-content {
      @apply h-[calc(100vh-120px)];
      width: 100vw !important;
    }
  }
}

.music-drawer {
  transition: none;
}

:root {
  --current-font-family:
    system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    sans-serif;
}

.close-btn {
  opacity: 0.3;
  transition: opacity 0.3s ease;

  &:hover {
    opacity: 1;
  }
}

.control-left,
.control-right {
  &.pure-mode {
    @apply pointer-events-auto;

    .control-btn {
      @apply opacity-0 transition-all duration-300;
      pointer-events: none;
    }

    &:hover .control-btn {
      @apply opacity-100;
      pointer-events: auto;
    }
  }

  &:not(.pure-mode) .control-btn {
    pointer-events: auto;
  }
}

.control-right {
  @apply flex items-center gap-2;
}

.pure-mode-tip-layer {
  @apply absolute inset-0 z-[9999] pointer-events-none;
  --tip-accent: rgba(255, 255, 255, 0.8);
}

.pure-mode-tip-highlight {
  @apply absolute top-8 right-8 w-20 h-9 rounded-lg;
  border: 1.5px dashed rgba(255, 255, 255, 0.75);
  animation: pure-tip-pulse 1.8s ease-out infinite;

  &--left {
    @apply right-auto left-8 w-9;
  }
}

.pure-mode-tip-bubble {
  @apply absolute top-[4.75rem] right-8 flex w-fit max-w-[320px] flex-col gap-2 rounded-xl px-4 py-3 text-sm pointer-events-auto;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);

  &--left {
    @apply right-auto left-8;
  }
}

.pure-mode-tip-content {
  @apply flex items-start gap-2;

  i {
    @apply mt-0.5 shrink-0 text-base;
    color: rgba(255, 255, 255, 0.85);
  }
}

.pure-mode-tip-actions {
  @apply flex items-center justify-end gap-2;
}

.pure-mode-tip-btn {
  @apply cursor-pointer rounded-lg border px-3 py-1 text-xs transition-colors;
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.75);

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.14);
    color: rgba(255, 255, 255, 0.9);
  }

  &:disabled {
    @apply cursor-not-allowed opacity-40;
  }

  &--primary {
    background: rgba(255, 255, 255, 0.22);
    border-color: rgba(255, 255, 255, 0.35);
    color: #fff;
    font-weight: 600;

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.32);
      border-color: rgba(255, 255, 255, 0.5);
      color: #fff;
    }
  }
}

.pure-mode-tip-dots {
  @apply ml-0.5 flex items-center gap-1 self-center;

  span {
    @apply h-1.5 w-1.5 rounded-full bg-white/25 transition-colors;
  }

  span.is-active {
    background: rgba(255, 255, 255, 0.8);
  }
}

@keyframes pure-tip-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.3);
  }

  70%,
  100% {
    box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
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

.control-btn {
  @apply flex items-center justify-center cursor-pointer transition-all duration-200;
  width: 36px;
  height: 28px;
  border-radius: 8px;
  background: rgba(142, 142, 142, 0.18);
  backdrop-filter: blur(12px);
  color: var(--text-color-active);

  i {
    font-size: 16px;
    line-height: 1;
  }

  svg {
    flex-shrink: 0;
    opacity: 0.85;
    transition: opacity 0.15s ease;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.18);

    svg {
      opacity: 1;
    }

    i {
      opacity: 1;
    }
  }
}

.close-window-btn {
  &:hover {
    background: rgba(239, 68, 68, 0.85) !important;
    color: #fff !important;

    svg {
      opacity: 1;
    }
  }
}

.lyric-correction {
  .music-lrc:hover & {
    opacity: 1 !important;
    pointer-events: auto !important;
  }
}
.bg-vocal {
  font-size: 0.85em !important;
  font-style: italic !important;
  opacity: 0.85 !important;
}
</style>
