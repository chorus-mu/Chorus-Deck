<template>
  <div
    class="lyric-dynamic-background-container absolute inset-0 overflow-hidden pointer-events-none select-none"
  >
    <transition name="bg-crossfade">
      <div
        :key="currentKey"
        class="ambient-mesh-layer absolute inset-0"
        :style="meshContainerStyle"
      ></div>
    </transition>

    <div class="ambient-vignette-overlay absolute inset-0"></div>
  </div>
</template>

<script setup lang="ts">
import tinycolor from 'tinycolor2';
import { computed } from 'vue';

import { playMusic } from '@/hooks/MusicHook';

interface Props {
  fallbackColor?: string;
}

const props = withDefaults(defineProps<Props>(), {
  fallbackColor: '#18181b'
});

const currentKey = computed(() => {
  return String(playMusic.value?.id || 'idle');
});

const palette = computed(() => {
  const rawBase =
    playMusic.value?.primaryColor || playMusic.value?.backgroundColor || props.fallbackColor;
  const tc = tinycolor(rawBase);

  if (!tc.isValid()) {
    return {
      base: '#09090d',
      c1: 'rgba(49, 46, 129, 0.72)',
      c2: 'rgba(76, 29, 149, 0.68)',
      c3: 'rgba(30, 27, 75, 0.6)',
      c4: 'rgba(15, 23, 42, 0.65)'
    };
  }

  const hsl = tc.toHsl();

  const c1 = tinycolor({
    h: hsl.h,
    s: Math.min(1, Math.max(0.65, hsl.s * 1.15)),
    l: Math.min(0.48, Math.max(0.28, hsl.l))
  })
    .setAlpha(0.72)
    .toRgbString();

  const c2 = tinycolor({
    h: (hsl.h + 38) % 360,
    s: Math.min(1, Math.max(0.7, hsl.s * 1.2)),
    l: Math.min(0.46, Math.max(0.26, hsl.l * 0.95))
  })
    .setAlpha(0.68)
    .toRgbString();

  const c3 = tinycolor({
    h: (hsl.h + 290) % 360,
    s: Math.min(1, Math.max(0.6, hsl.s)),
    l: Math.min(0.42, Math.max(0.22, hsl.l * 0.85))
  })
    .setAlpha(0.6)
    .toRgbString();

  const c4 = tinycolor({
    h: (hsl.h + 180) % 360,
    s: Math.min(1, Math.max(0.5, hsl.s * 0.8)),
    l: Math.min(0.38, Math.max(0.18, hsl.l * 0.8))
  })
    .setAlpha(0.65)
    .toRgbString();

  const base = tinycolor({
    h: hsl.h,
    s: 0.32,
    l: 0.06
  }).toHexString();

  return { base, c1, c2, c3, c4 };
});

const meshContainerStyle = computed(() => {
  const p = palette.value;
  return {
    backgroundColor: p.base,
    backgroundImage: `
      radial-gradient(circle at 18% 22%, ${p.c1} 0%, transparent 58%),
      radial-gradient(circle at 82% 16%, ${p.c2} 0%, transparent 54%),
      radial-gradient(circle at 74% 82%, ${p.c3} 0%, transparent 62%),
      radial-gradient(circle at 22% 78%, ${p.c4} 0%, transparent 52%)
    `
  };
});
</script>

<style scoped lang="scss">
.lyric-dynamic-background-container {
  z-index: 0;
  background-color: #09090b;
  contain: strict;
  transform: translateZ(0);
}

.ambient-mesh-layer {
  contain: strict;
  transform: translateZ(0);
  will-change: transform, opacity;
  transition: opacity 0.85s cubic-bezier(0.25, 1, 0.35, 1);
}

.ambient-vignette-overlay {
  contain: strict;
  transform: translateZ(0);
  pointer-events: none;
  background:
    radial-gradient(circle at center, rgba(0, 0, 0, 0.12) 0%, rgba(0, 0, 0, 0.62) 100%),
    linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.35) 0%,
      transparent 18%,
      transparent 82%,
      rgba(0, 0, 0, 0.65) 100%
    );
}

.bg-crossfade-enter-active,
.bg-crossfade-leave-active {
  transition: opacity 0.85s cubic-bezier(0.25, 1, 0.35, 1);
}

.bg-crossfade-enter-from,
.bg-crossfade-leave-to {
  opacity: 0;
}
</style>
