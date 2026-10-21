<template>
  <div
    ref="lyricsScrollContainer"
    class="lyrics-view-container flex-1 h-full w-full select-none overflow-y-auto no-scrollbar relative"
    :class="[`variant-${variant}`, { 'is-light-theme': isLight }, customClass]"
    :style="containerStyle"
    @wheel="onUserScroll"
    @touchstart="onUserScroll"
    @scroll="onContainerScroll"
  >
    <transition name="sync-fade">
      <button
        v-if="showSyncButton && userHasScrolled && supportAutoScroll"
        class="lyrics-sync-button"
        type="button"
        title="Sync to current lyric"
        @click="syncLyrics"
      >
        <i class="ri-focus-3-line text-sm" />
        <span>Sync</span>
      </button>
    </transition>

    <div class="lyrics-view-content flex flex-col w-full">
      <slot name="header" />

      <div class="lyrics-top-spacer flex-shrink-0" />

      <transition name="wave-fade" mode="out-in">
        <div v-if="isLyricsLoading" key="loading" class="lyrics-loading-wrapper">
          <slot name="loading">
            <lyric-interlude-wave
              :key="'loading-' + (playMusic?.id || 'idle')"
              :start-time="0"
              :duration="3000"
              :current-time="currentTrackTimeMs"
              :is-active="true"
              :is-first-line="true"
              :is-light="isLight"
              :backlit-color="activeBacklitColor"
              :theme-color="effectiveThemeColor"
            />
          </slot>
        </div>

        <div v-else-if="!lrcArray || lrcArray.length === 0" key="empty" class="lyrics-empty-wrapper">
          <slot name="empty">
            <lyric-interlude-wave
              :key="'empty-' + (playMusic?.id || 'idle')"
              :start-time="0"
              :duration="3000"
              :current-time="currentTrackTimeMs"
              :is-active="true"
              :is-first-line="true"
              :is-light="isLight"
              :backlit-color="activeBacklitColor"
              :theme-color="effectiveThemeColor"
            />
          </slot>
        </div>

        <div v-else key="content" class="lyrics-lines-container w-full">
          <div v-if="!supportAutoScroll" class="lyrics-line-row no-scroll-tip">
            <span>This lyrics does not support auto-scroll</span>
          </div>

          <div
            v-for="(line, idx) in lrcArray"
            :id="`lyric-line-${idx}`"
            :key="idx"
            :ref="(el) => setLineRef(el, idx)"
            class="lyrics-line-row"
            :class="{
              'is-active now-text': idx === nowIndex,
              'hover-text': line.text && line.startTime !== -1,
              'has-glow': config.lyricsGlowEffect !== false,
              'is-interlude': isInterlude(line)
            }"
            :style="getLineStyle(idx)"
            @click="onLineClick(line, idx)"
          >
            <lyric-interlude-wave
              v-if="isInterlude(line)"
              :start-time="line.startTime ?? 0"
              :duration="line.duration ?? 3000"
              :current-time="currentTrackTimeMs"
              :is-active="idx === nowIndex"
              :is-first-line="idx === 0"
              :is-light="isLight"
              :backlit-color="activeBacklitColor"
              :theme-color="effectiveThemeColor"
            />

            <div v-else-if="shouldRenderWordByWord(line)" class="word-by-word-lyric">
              <template v-for="(word, wordIdx) in line.words" :key="wordIdx">
                <span
                  class="lyric-word"
                  :style="getWordSweepStyle(idx, wordIdx, word, line.words?.length || 0)"
                >
                  {{ word.text ? word.text.replace('{bg}', '') : '' }}
                </span>
                <span v-if="word.space" class="lyric-space">&nbsp;</span>
              </template>
            </div>

            <span
              v-else
              class="standard-lyric-text"
              :style="getStandardLineStyle(idx)"
              :class="{
                'active-illuminated': idx === nowIndex,
                'bg-vocal': line.text ? line.text.startsWith('{bg}') : false
              }"
            >
              {{ line.text ? line.text.replace('{bg}', '') : '' }}
            </span>

            <transition name="roma-lane">
              <div v-if="shouldShowRoma(line, idx)" class="lyric-roma-text active-roma-glow">
                {{ line.romaText }}
              </div>
            </transition>

            <transition name="roma-lane">
              <div v-if="shouldShowTr(line, idx)" class="lyric-tr-text active-tr-glow">
                {{ line.trText }}
              </div>
            </transition>
          </div>
        </div>
      </transition>

      <div class="lyrics-bottom-spacer flex-shrink-0" />
    </div>
  </div>
</template>
<script setup lang="ts">
import tinycolor from 'tinycolor2';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRefs, watch } from 'vue';

import {
  correctionTime,
  ensureLyricsLoaded,
  isLyricsLoading,
  lrcArray,
  nowIndex,
  nowTime,
  playMusic,
  setAudioTime,
  smoothTrackTimeMs,
  supportAutoScroll
} from '@/hooks/MusicHook';
import { useSettingsStore } from '@/store/modules/settings';
import type { LyricConfig, LyricGranularity } from '@/types/lyric';
import {
  computeLyricLineStyle,
  computeWordSweepStyle,
  ContinuousScrollSpring,
  LyricLayoutCache
} from '@/utils/lyricAnimation';
import { LYRIC_CONFIG_CHANGE_EVENT, readLyricConfig } from '@/utils/lyricConfig';

import LyricInterludeWave from './LyricInterludeWave.vue';

interface Props {
  variant?: 'full' | 'docked' | 'compact';
  alignment?: 'left' | 'center' | 'right';
  showSyncButton?: boolean;
  customClass?: string;
  activeGrowth?: number;
  morphState?: 'collapsed' | 'expanding' | 'morphing' | 'settling' | 'normal' | 'collapsing';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'full',
  alignment: undefined,
  showSyncButton: true,
  customClass: '',
  activeGrowth: undefined,
  morphState: 'normal'
});

const { variant, showSyncButton, customClass } = toRefs(props);

const emit = defineEmits<{
  (e: 'line-click', line: any, index: number): void;
  (e: 'scroll', event: Event): void;
}>();

const settingsStore = useSettingsStore();

const config = ref<LyricConfig>(readLyricConfig());

const handleConfigUpdate = () => {
  config.value = readLyricConfig();
};

const lyricsScrollContainer = ref<HTMLElement | null>(null);
const lineElements = ref<Map<number, HTMLElement>>(new Map());

const setLineRef = (el: any, index: number) => {
  if (el) {
    lineElements.value.set(index, el as HTMLElement);
  } else {
    lineElements.value.delete(index);
  }
};

const currentTrackTimeMs = computed(() => {
  return smoothTrackTimeMs.value || (nowTime.value + correctionTime.value) * 1000;
});

const isLight = computed(() => false);

const effectiveThemeColor = computed(() => {
  return (
    playMusic.value?.primaryColor ||
    (playMusic.value as any)?.backgroundColor ||
    document.documentElement.style.getPropertyValue('--current-album-color') ||
    document.documentElement.style.getPropertyValue('--primary-color') ||
    '#f59e0b'
  );
});

const activeBacklitColor = computed(() => {
  const base = effectiveThemeColor.value;
  const tc = tinycolor(base);
  if (!tc.isValid()) {
    return 'rgba(245, 158, 11, 0.9)';
  }
  const hsl = tc.toHsl();
  const glowHsl = {
    h: hsl.h,
    s: Math.min(1, Math.max(0.75, hsl.s * 1.35)),
    l: Math.min(0.82, Math.max(0.55, hsl.l))
  };
  return tinycolor(glowHsl).setAlpha(0.92).toRgbString();
});

const activeBacklitHaloColor = computed(() => {
  const base = effectiveThemeColor.value;
  const tc = tinycolor(base);
  if (!tc.isValid()) {
    return 'rgba(245, 158, 11, 0.55)';
  }
  const hsl = tc.toHsl();
  const haloHsl = {
    h: hsl.h,
    s: Math.min(1, Math.max(0.8, hsl.s * 1.3)),
    l: Math.min(0.75, Math.max(0.5, hsl.l))
  };
  return tinycolor(haloHsl).setAlpha(0.58).toRgbString();
});

const activeBacklitSoftColor = computed(() => {
  const base = effectiveThemeColor.value;
  const tc = tinycolor(base);
  if (!tc.isValid()) {
    return 'rgba(245, 158, 11, 0.25)';
  }
  return tc.clone().setAlpha(0.28).toRgbString();
});

const containerStyle = computed(() => {
  return {
    '--lrc-active-text-color': '#ffffff',
    '--lrc-inactive-text-color': 'rgba(255, 255, 255, 0.45)',
    '--lrc-active-backlit': activeBacklitColor.value,
    '--lrc-active-backlit-halo': activeBacklitHaloColor.value,
    '--lrc-active-backlit-soft': activeBacklitSoftColor.value,
    '--fill-color': effectiveThemeColor.value,
    '--lrc-translation-color': 'rgba(255, 255, 255, 0.85)',
    '--lrc-alignment': effectiveAlignment.value === 'center' ? 'center' : 'flex-start'
  };
});

const effectiveAlignment = computed<'left' | 'center' | 'right'>(() => {
  if (props.alignment) return props.alignment;
  if (props.variant === 'docked' || props.variant === 'full') return 'left';
  if (config.value.centerLyrics) return 'center';
  const pos = config.value.lyricsTextPosition;
  if (pos === 'CENTER') return 'center';
  if (pos === 'RIGHT') return 'right';
  return 'left';
});

const currentGranularity = computed<LyricGranularity>(() => {
  const g = settingsStore.setData?.lyricGranularity || config.value?.lyricGranularity || 'karaoke';
  return g === 'phrase' || (g as string) === 'sentence' ? 'phrase' : 'karaoke';
});

const isInterlude = (line: any) => {
  if (!line) return false;
  return line.isPreamble || line.text?.trim() === '•••' || !line.text || line.text.trim() === '';
};

const shouldRenderWordByWord = (line: any) => {
  if (currentGranularity.value === 'phrase') return false;
  if (!line?.hasWordByWord || !line?.words || line.words.length === 0) return false;
  return true;
};

const shouldShowRoma = (line: any, _index: number) => {
  if (!line?.romaText) return false;
  return config.value.showRoma !== false;
};

const shouldShowTr = (line: any, _index: number) => {
  if (!line?.trText) return false;
  if (line.trText === line.romaText) return false;
  return config.value.showTranslation !== false;
};

const getLineStyle = (index: number) => {
  const animStyle =
    config.value.lyricsAnimationStyle ||
    settingsStore.setData?.lyricsAnimationStyle ||
    'fluid_motion';

  const baseStyle = computeLyricLineStyle({
    index,
    nowIndex: nowIndex.value,
    style: animStyle,
    alignment: effectiveAlignment.value,
    focusEnabled: config.value.focusCurrentLyric !== false,
    morphState: props.morphState
  });

  if (props.variant === 'docked' || props.variant === 'full') {
    return {
      ...baseStyle,
      textAlign: 'left' as const
    };
  }

  const userFontSize = config.value.fontSize ? `${config.value.fontSize}px` : undefined;
  const userLineHeight = config.value.lineHeight ? `${config.value.lineHeight}` : undefined;
  const userLetterSpacing =
    config.value.letterSpacing !== undefined ? `${config.value.letterSpacing}px` : undefined;
  const userFontWeight = config.value.fontWeight || 800;

  return {
    ...baseStyle,
    ...(userFontSize ? { fontSize: userFontSize } : {}),
    ...(userLineHeight ? { lineHeight: userLineHeight } : {}),
    ...(userLetterSpacing ? { letterSpacing: userLetterSpacing } : {}),
    fontWeight: userFontWeight,
    textAlign: effectiveAlignment.value
  };
};

const getStandardLineStyle = (index: number) => {
  if (index !== nowIndex.value) {
    return {
      color: 'rgba(255, 255, 255, 0.45)',
      textShadow: 'none',
      transition: 'color 0.25s ease'
    };
  }

  const hasGlow = config.value.lyricsGlowEffect !== false;
  return {
    color: '#ffffff',
    textShadow: hasGlow
      ? `0 0 10px ${activeBacklitColor.value}, 0 0 24px ${activeBacklitColor.value}, 0 0 44px ${activeBacklitColor.value}`
      : 'none',
    filter: hasGlow ? `drop-shadow(0 0 18px ${activeBacklitColor.value})` : 'none',
    transition: 'color 0.25s ease'
  };
};

const getWordSweepStyle = (
  lineIndex: number,
  wordIndex: number,
  word: any,
  totalWords?: number
) => {
  if (lineIndex !== nowIndex.value) {
    return {
      color: 'rgba(255, 255, 255, 0.45)',
      textShadow: 'none',
      filter: 'none',
      transition: 'color 0.25s ease'
    };
  }

  return computeWordSweepStyle({
    lineIndex,
    nowIndex: nowIndex.value,
    currentTime: currentTrackTimeMs.value,
    word,
    isTailWord: totalWords ? wordIndex === totalWords - 1 : false,
    activeClr: '#ffffff',
    inactiveClr: 'rgba(255, 255, 255, 0.45)',
    backlitClr: activeBacklitColor.value,
    config: config.value
  });
};

const onLineClick = (line: any, idx: number) => {
  emit('line-click', line, idx);
  if (config.value.lyricsClick === false) return;
  if (line?.startTime !== undefined && line.startTime >= 0) {
    setAudioTime(idx);
  }
};

const userHasScrolled = ref(false);
let userScrollTimeout: any = null;
let lastScrolledIndex = -1;
let previousActiveIndex = -1;
let isProgrammaticScroll = false;

const layoutCache = new LyricLayoutCache();
const scrollSpring = new ContinuousScrollSpring({
  style: config.value.lyricsAnimationStyle || 'fluid_motion'
});
let springRafId: number | null = null;
let lastFrameTimestamp = 0;
const isAutoScrollSuspended = ref(false);

watch(
  () => config.value.lyricsAnimationStyle,
  (newStyle) => {
    if (newStyle) {
      scrollSpring.setStyle(newStyle);
    }
  }
);

const refreshLayoutCache = () => {
  for (const [idx, el] of lineElements.value.entries()) {
    layoutCache.set(idx, el.offsetTop, el.clientHeight);
  }
};

const suspendAutoScroll = (suspended: boolean) => {
  isAutoScrollSuspended.value = suspended;
  if (suspended && springRafId !== null) {
    cancelAnimationFrame(springRafId);
    springRafId = null;
  }
};

const onUserScroll = () => {
  if (isProgrammaticScroll) return;
  userHasScrolled.value = true;
  if (springRafId !== null) {
    cancelAnimationFrame(springRafId);
    springRafId = null;
  }
  scrollSpring.reset();
  if (userScrollTimeout) clearTimeout(userScrollTimeout);
  userScrollTimeout = setTimeout(() => {
    userHasScrolled.value = false;
    scrollToActive(false);
  }, 3500);
};

const onContainerScroll = (e: Event) => {
  emit('scroll', e);
};

const syncLyrics = () => {
  if (userScrollTimeout) {
    clearTimeout(userScrollTimeout);
    userScrollTimeout = null;
  }
  userHasScrolled.value = false;
  scrollToActive(false, true);
};

const stepContinuousScroll = (timestamp: number) => {
  if (!lastFrameTimestamp) lastFrameTimestamp = timestamp;
  const dt = (timestamp - lastFrameTimestamp) / 1000;
  lastFrameTimestamp = timestamp;

  const container = lyricsScrollContainer.value;
  let scrollSettled = true;
  if (container) {
    const scrollResult = scrollSpring.step(dt);
    scrollSettled = scrollResult.settled;
    isProgrammaticScroll = true;
    container.scrollTop = scrollResult.current;
    isProgrammaticScroll = false;
  }

  if (!scrollSettled && !userHasScrolled.value && !isAutoScrollSuspended.value) {
    springRafId = requestAnimationFrame(stepContinuousScroll);
  } else {
    springRafId = null;
    lastFrameTimestamp = 0;
    isProgrammaticScroll = false;
  }
};

const scrollToActive = (snap: boolean | ScrollBehavior = false, force = false, fromIndex = -1) => {
  const isSnap = snap === true || snap === 'instant';
  if (isAutoScrollSuspended.value && !force) return;
  const currentIndex = nowIndex.value;
  if (!force && currentIndex === lastScrolledIndex && currentIndex === previousActiveIndex) return;
  if (!force && userHasScrolled.value) return;
  if (config.value.lyricsScroll === false && !force) return;

  const container = lyricsScrollContainer.value;
  if (!container) return;

  let cachedLayout = layoutCache.get(currentIndex);
  const target = lineElements.value.get(currentIndex);
  if (!cachedLayout && target) {
    cachedLayout = { index: currentIndex, top: target.offsetTop, height: target.clientHeight };
    layoutCache.set(currentIndex, cachedLayout.top, cachedLayout.height);
  }
  if (!cachedLayout && !target) return;

  const targetTop = cachedLayout ? cachedLayout.top : target!.offsetTop;
  const targetHeight = cachedLayout ? cachedLayout.height : target!.clientHeight;
  const containerHeight = container.clientHeight;

  const scrollGoal = Math.max(0, targetTop - containerHeight * 0.44 + targetHeight / 2);

  const prevIdx = fromIndex >= 0 ? fromIndex : previousActiveIndex;
  const lineDelta = prevIdx >= 0 ? Math.abs(currentIndex - prevIdx) : 0;

  previousActiveIndex = currentIndex;
  lastScrolledIndex = currentIndex;

  if (isSnap || lineDelta > 3) {
    if (springRafId !== null) {
      cancelAnimationFrame(springRafId);
      springRafId = null;
    }
    scrollSpring.setPosition(scrollGoal);
    scrollSpring.setTarget(scrollGoal, true);
    isProgrammaticScroll = true;
    container.scrollTop = scrollGoal;
    window.setTimeout(() => {
      isProgrammaticScroll = false;
    }, 50);
    return;
  }

  // Smooth continuous scroll spring follow
  if (scrollSpring.isSettled()) {
    scrollSpring.setPosition(container.scrollTop);
  }
  scrollSpring.setTarget(scrollGoal, false);

  if (springRafId === null) {
    lastFrameTimestamp = 0;
    springRafId = requestAnimationFrame(stepContinuousScroll);
  }
};

watch(
  () => nowIndex.value,
  (newIdx, oldIdx) => {
    if (!userHasScrolled.value && !isAutoScrollSuspended.value) {
      scrollToActive(false, false, oldIdx ?? -1);
    }
  }
);

watch(
  () => playMusic.value?.id,
  (newId) => {
    if (newId) {
      lastScrolledIndex = -1;
      previousActiveIndex = -1;
      userHasScrolled.value = false;
      layoutCache.clear();
      lineElements.value.clear();
      void ensureLyricsLoaded(false);
      nextTick(() => {
        refreshLayoutCache();
        scrollToActive(true, true);
      });
      window.setTimeout(() => {
        refreshLayoutCache();
        scrollToActive(true, true);
      }, 150);
    }
  }
);

watch(
  () => lrcArray.value,
  () => {
    nextTick(() => {
      refreshLayoutCache();
      scrollToActive(true, true);
    });
  }
);

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  window.addEventListener(LYRIC_CONFIG_CHANGE_EVENT, handleConfigUpdate);
  void ensureLyricsLoaded(false);
  nextTick(() => {
    refreshLayoutCache();
    scrollToActive(true, true);
  });

  if (lyricsScrollContainer.value && typeof ResizeObserver !== 'undefined') {
    let prevHeight = lyricsScrollContainer.value.clientHeight;
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        if (height > 0 && Math.abs(height - prevHeight) > 20) {
          prevHeight = height;
          layoutCache.clear();
          refreshLayoutCache();
          scrollToActive(true, true);
        }
      }
    });
    resizeObserver.observe(lyricsScrollContainer.value);
  }
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  window.removeEventListener(LYRIC_CONFIG_CHANGE_EVENT, handleConfigUpdate);
  if (springRafId !== null) {
    cancelAnimationFrame(springRafId);
    springRafId = null;
  }
  if (userScrollTimeout) {
    clearTimeout(userScrollTimeout);
  }
});

defineExpose({
  scrollToActive,
  syncLyrics,
  suspendAutoScroll,
  refreshLayoutCache,
  lyricsScrollContainer,
  scrollContainer: lyricsScrollContainer,
  config
});
</script>

<style scoped lang="scss">
.lyrics-view-container {
  contain: content;
  transform: translateZ(0);
  will-change: scroll-position;
  mask-image: linear-gradient(to bottom, transparent 0%, black 6%, black 92%, transparent 100%);
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 6%,
    black 92%,
    transparent 100%
  );
}

.lyrics-sync-button {
  position: absolute;
  top: 16px;
  right: 18px;
  z-index: 30;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 9999px;
  background-color: rgba(0, 0, 0, 0.75);
  color: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.9);
    transform: scale(1.04);
  }
}

.sync-fade-enter-active,
.sync-fade-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.sync-fade-enter-from,
.sync-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.lyrics-top-spacer {
  height: 42vh;
  min-height: 42vh;
}

.lyrics-bottom-spacer {
  height: 46vh;
  min-height: 46vh;
}

.lyrics-line-row {
  display: flex;
  flex-direction: column;
  cursor: pointer;
  border-radius: 14px;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  margin: 0;
  position: relative;
  isolation: isolate;
  word-break: normal;
  overflow-wrap: break-word;
  opacity: 0.42;
  transform: translateZ(0);
  will-change: opacity, transform;
  transition:
    opacity 0.35s cubic-bezier(0.25, 1, 0.5, 1),
    transform 0.35s cubic-bezier(0.25, 1, 0.5, 1),
    background-color 0.2s ease;

  &.now-text,
  &.is-active {
    opacity: 1 !important;
  }

  &:hover {
    opacity: 0.95 !important;
    background-color: rgba(255, 255, 255, 0.05);
  }

  &.no-scroll-tip {
    font-size: 1rem;
    opacity: 0.6;
    cursor: default;
    padding: 8px 16px;
    color: var(--lrc-inactive-text-color);
  }
}

.variant-full {
  .lyrics-line-row {
    padding: 10px 18px;
    font-family: var(--current-font-family, system-ui, -apple-system, sans-serif);
    font-size: var(--lyric-font-size, clamp(22px, 2vw, 32px));
    letter-spacing: -0.015em;
    line-height: var(--lyric-line-height, 1.4);
    font-weight: 800;
    align-items: flex-start;
    text-align: left;
    transform-origin: left center;
    word-break: normal;
    overflow-wrap: break-word;

    &.now-text {
      font-weight: 800 !important;
      opacity: 1 !important;

      > .standard-lyric-text,
      .standard-lyric-text {
        color: #ffffff !important;
        text-shadow:
          0 0 8px var(--lrc-active-backlit),
          0 0 20px var(--lrc-active-backlit-halo),
          0 0 36px var(--lrc-active-backlit-soft) !important;
        filter: drop-shadow(0 0 12px var(--lrc-active-backlit)) !important;
      }

      .word-by-word-lyric {
        filter: drop-shadow(0 0 12px var(--lrc-active-backlit)) !important;
      }

      .lyric-roma-text {
        color: #ffffff !important;
        opacity: 0.95 !important;
        text-shadow:
          0 0 8px var(--lrc-active-backlit),
          0 0 20px var(--lrc-active-backlit-halo) !important;
      }

      .lyric-tr-text {
        color: var(--lrc-translation-color, rgba(255, 255, 255, 0.9)) !important;
        opacity: 0.95 !important;
        text-shadow: none !important;
      }
    }

    &:hover {
      border-radius: 16px;
      opacity: 0.95 !important;
      filter: none !important;
      background-color: rgba(255, 255, 255, 0.05);
    }
  }

  .lyric-roma-text {
    position: relative;
    z-index: 1;
    font-weight: 600;
    font-size: 0.54em;
    line-height: 1.35;
    margin-top: 5px;
    letter-spacing: 0.02em;
    color: var(--lrc-inactive-text-color, rgba(255, 255, 255, 0.45));
    opacity: 0.72;
    text-shadow: none;
    transition: color 0.3s ease, text-shadow 0.3s ease, opacity 0.3s ease;
  }

  .lyric-tr-text {
    position: relative;
    z-index: 1;
    font-weight: 500;
    font-size: 0.54em;
    line-height: 1.35;
    margin-top: 4px;
    color: var(--lrc-inactive-text-color, rgba(255, 255, 255, 0.45));
    opacity: 0.65;
    text-shadow: none;
    transition: color 0.3s ease, text-shadow 0.3s ease, opacity 0.3s ease;
  }
}

.variant-docked {
  .lyrics-top-spacer {
    height: 44vh;
    min-height: 44vh;
  }
  .lyrics-bottom-spacer {
    height: 48vh;
    min-height: 48vh;
  }

  .lyrics-line-row {
    padding: 8px 14px;
    font-family: var(--current-font-family, system-ui, -apple-system, sans-serif);
    font-size: clamp(18px, 1.4vw, 22px);
    letter-spacing: -0.012em;
    line-height: 1.4;
    font-weight: 800;
    align-items: flex-start;
    text-align: left;
    transform-origin: left center;
    word-break: normal;
    overflow-wrap: break-word;

    &.now-text {
      font-weight: 800 !important;
      opacity: 1 !important;

      > .standard-lyric-text,
      .standard-lyric-text {
        color: #ffffff !important;
        text-shadow:
          0 0 8px var(--lrc-active-backlit),
          0 0 20px var(--lrc-active-backlit-halo),
          0 0 36px var(--lrc-active-backlit-soft) !important;
        filter: drop-shadow(0 0 12px var(--lrc-active-backlit)) !important;
      }

      .word-by-word-lyric {
        filter: drop-shadow(0 0 12px var(--lrc-active-backlit)) !important;
      }

      .lyric-roma-text {
        color: #ffffff !important;
        opacity: 1 !important;
        text-shadow:
          0 0 8px var(--lrc-active-backlit),
          0 0 20px var(--lrc-active-backlit-halo) !important;
      }

      .lyric-tr-text {
        color: var(--lrc-translation-color, rgba(255, 255, 255, 0.9)) !important;
        opacity: 1 !important;
        text-shadow: none !important;
      }
    }

    &:hover {
      border-radius: 12px;
      opacity: 0.95 !important;
      filter: none !important;
      background-color: rgba(255, 255, 255, 0.05);
    }
  }

  .lyric-roma-text {
    position: relative;
    z-index: 1;
    font-weight: 700;
    font-size: 0.88rem;
    line-height: 1.4;
    margin-top: 6px;
    letter-spacing: 0.025em;
    color: var(--lrc-inactive-text-color, rgba(255, 255, 255, 0.5));
    opacity: 0.75;
    text-shadow: none;
    text-align: left;
    transition: color 0.3s ease, text-shadow 0.3s ease, opacity 0.3s ease;
  }

  .lyric-tr-text {
    position: relative;
    z-index: 1;
    font-weight: 600;
    font-size: 0.85rem;
    line-height: 1.4;
    margin-top: 4px;
    color: var(--lrc-inactive-text-color, rgba(255, 255, 255, 0.45));
    opacity: 0.7;
    text-shadow: none;
    transition: color 0.3s ease, text-shadow 0.3s ease, opacity 0.3s ease;
  }
}

.variant-compact {
  .lyrics-line-row {
    padding: 8px 12px;
    font-family: var(--current-font-family, system-ui, -apple-system, sans-serif);
    font-size: clamp(18px, 2.2vw, 24px);
    line-height: 1.35;
    font-weight: 800;

    &.now-text {
      font-weight: 800 !important;
      opacity: 1 !important;

      > .standard-lyric-text,
      .standard-lyric-text {
        color: #ffffff !important;
        text-shadow:
          0 0 8px var(--lrc-active-backlit),
          0 0 20px var(--lrc-active-backlit-halo),
          0 0 36px var(--lrc-active-backlit-soft) !important;
        filter: drop-shadow(0 0 12px var(--lrc-active-backlit)) !important;
      }

      .word-by-word-lyric {
        filter: drop-shadow(0 0 12px var(--lrc-active-backlit)) !important;
      }

      .lyric-roma-text {
        color: #ffffff !important;
        opacity: 1 !important;
        text-shadow:
          0 0 8px var(--lrc-active-backlit),
          0 0 20px var(--lrc-active-backlit-halo) !important;
      }

      .lyric-tr-text {
        color: var(--lrc-translation-color, rgba(255, 255, 255, 0.9)) !important;
        opacity: 1 !important;
        text-shadow: none !important;
      }
    }

    &:hover {
      opacity: 0.95 !important;
      filter: none !important;
    }
  }

  .lyric-roma-text {
    position: relative;
    z-index: 1;
    font-size: 0.65em;
    line-height: 1.35;
    margin-top: 4px;
    color: var(--lrc-inactive-text-color, rgba(255, 255, 255, 0.5));
    opacity: 0.75;
    text-shadow: none;
    transition: color 0.3s ease, text-shadow 0.3s ease, opacity 0.3s ease;
  }

  .lyric-tr-text {
    position: relative;
    z-index: 1;
    font-size: 0.6em;
    line-height: 1.35;
    margin-top: 3px;
    color: var(--lrc-inactive-text-color, rgba(255, 255, 255, 0.45));
    opacity: 0.7;
    text-shadow: none;
    transition: color 0.3s ease, text-shadow 0.3s ease, opacity 0.3s ease;
  }
}

.word-by-word-lyric {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  word-break: normal;
  overflow-wrap: break-word;

  .lyric-word {
    display: inline;
    padding-right: 0 !important;
    font-weight: inherit;
    font-size: inherit;
    letter-spacing: inherit;
    line-height: inherit;
    position: relative;
  }

  .lyric-space {
    display: inline;
    padding-right: 0 !important;
  }
}

.standard-lyric-text {
  position: relative;
  z-index: 1;
  word-break: normal;
  overflow-wrap: break-word;
  transition: color 0.25s ease;
}

.roma-lane-enter-active,
.roma-lane-leave-active {
  transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.roma-lane-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.roma-lane-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.wave-fade-enter-active,
.wave-fade-leave-active {
  transition: opacity 0.3s cubic-bezier(0.2, 0, 0, 1), transform 0.3s cubic-bezier(0.2, 0, 0, 1);
}

.wave-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.wave-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.lyrics-loading-wrapper,
.lyrics-empty-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 16px;
  width: 100%;
  min-height: 220px;
}

.is-light-theme .lyrics-skeleton-line {
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.06) 25%,
    rgba(0, 0, 0, 0.14) 37%,
    rgba(0, 0, 0, 0.06) 63%
  ) !important;
}

@keyframes shimmerSkeleton {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
