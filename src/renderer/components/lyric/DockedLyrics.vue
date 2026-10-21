<template>
  <div
    class="docked-lyrics-panel flex flex-col h-full w-full select-none"
    :class="{ 'is-light-theme': isLight }"
    :style="panelGlowStyle"
  >
    <!-- Header -->
    <div
      class="docked-lyrics-header flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0"
    >
      <span
        class="text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500"
      >
        Lyrics
      </span>
      <button
        class="p-1.5 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        title="Close Lyrics"
        @click="closePanel"
      >
        <i class="ri-close-line text-lg" />
      </button>
    </div>

    <!-- Centralized Lyrics View -->
    <div class="flex-1 overflow-hidden relative w-full h-full">
      <lyrics-view ref="lyricsViewRef" variant="docked" />
    </div>
  </div>
</template>

<script setup lang="ts">
import tinycolor from 'tinycolor2';
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { nowIndex, playMusic, textColors } from '@/hooks/MusicHook';
import { usePlayerStore } from '@/store/modules/player';
import { getTextColors } from '@/utils/linearColor';

import LyricsView from './LyricsView.vue';

const playerStore = usePlayerStore();
const lyricsViewRef = ref<InstanceType<typeof LyricsView> | null>(null);

const triggerScrollToActive = (snap = false) => {
  requestAnimationFrame(() => {
    lyricsViewRef.value?.refreshLayoutCache();
    lyricsViewRef.value?.scrollToActive(snap, true);
  });
};

watch(
  () => playerStore.asideOpen && playerStore.asideTab === 'lyrics',
  (isOpen) => {
    if (isOpen) {
      nextTick(() => {
        triggerScrollToActive(true);
      });
      window.setTimeout(() => {
        triggerScrollToActive(true);
      }, 100);
      window.setTimeout(() => {
        triggerScrollToActive(false);
      }, 250);
    }
  },
  { immediate: true }
);

watch(
  () => nowIndex.value,
  () => {
    if (playerStore.asideOpen && playerStore.asideTab === 'lyrics') {
      triggerScrollToActive(false);
    }
  }
);

onMounted(() => {
  if (playerStore.asideOpen && playerStore.asideTab === 'lyrics') {
    nextTick(() => {
      triggerScrollToActive(true);
    });
    window.setTimeout(() => {
      triggerScrollToActive(false);
    }, 200);
  }
});

const isLight = computed(() => {
  const colors = textColors.value || getTextColors();
  return colors.theme === 'dark' || colors.active === '#111827';
});

const albumGlowColor = computed(() => {
  const base = playMusic.value?.primaryColor;
  const tc = tinycolor(base);
  if (!tc.isValid()) {
    return isLight.value ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.45)';
  }
  if (isLight.value) {
    return tc.clone().darken(10).setAlpha(0.35).toRgbString();
  } else {
    const hsl = tc.toHsl();
    const glowHsl = {
      h: hsl.h,
      s: Math.min(1, Math.max(0.6, hsl.s * 1.25)),
      l: Math.min(0.85, Math.max(0.55, hsl.l))
    };
    return tinycolor(glowHsl).setAlpha(0.65).toRgbString();
  }
});

const panelGlowStyle = computed(() => {
  return {
    '--panel-album-glow': albumGlowColor.value
  };
});

const closePanel = () => {
  playerStore.toggleAside('lyrics');
};

defineExpose({
  lyricsViewRef
});
</script>

<style scoped>
.docked-lyrics-panel {
  background-color: var(--shell-surface);
  border-left: 1px solid var(--border-color, rgba(128, 128, 128, 0.12));
}
</style>
