<template>
  <div
    class="lyric-interlude-wave"
    :class="{ 'is-active': isActive, 'is-light': isLight }"
    :style="containerStyle"
  >
    <div class="wave-track">
      <span
        v-for="(bar, i) in bars"
        :key="i"
        class="wave-bar"
        :class="[`bar-${i + 1}`, { 'bar-active': isActive }]"
        :style="getBarStyle(i)"
      ></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    startTime: number;
    duration: number;
    currentTime: number;
    isActive: boolean;
    isFirstLine?: boolean;
    isLight?: boolean;
    backlitColor?: string;
    themeColor?: string;
  }>(),
  {
    isFirstLine: false,
    isLight: false,
    backlitColor: '',
    themeColor: ''
  }
);

const BAR_COUNT = 7;
const bars = Array.from({ length: BAR_COUNT }, (_, i) => i);

const progress = computed(() => {
  if (!props.isActive) return 0;
  const start = props.startTime;
  const dur = Math.max(props.duration || 3000, 1000);
  const elapsed = props.currentTime - start;
  if (elapsed <= 0) return 0;
  return Math.min(elapsed / dur, 1);
});

const containerStyle = computed(() => {
  const theme = props.themeColor || 'var(--fill-color, var(--primary-color, currentColor))';
  const glow = props.backlitColor || theme;
  return {
    '--wave-progress': progress.value.toFixed(3),
    '--wave-theme-color': theme,
    '--wave-backlit-glow': glow
  };
});

const getBarStyle = (index: number) => {
  // Staggered rhythmic phase offsets
  const delays = [0, 0.15, 0.3, 0.45, 0.3, 0.15, 0];
  const delay = delays[index] ?? 0;
  return {
    animationDelay: `${delay}s`
  };
};
</script>

<style scoped>
.lyric-interlude-wave {
  display: flex;
  align-items: center;
  justify-content: var(--lrc-alignment, flex-start);
  width: 100%;
  pointer-events: none;
  user-select: none;
  transform-origin: center center;
  min-height: 48px;
  opacity: 0.35;
  padding: 10px 0;
  transition:
    opacity 0.4s ease,
    transform 0.4s ease;
}

.lyric-interlude-wave.is-active {
  opacity: 1;
}

.wave-track {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 52px;
  padding: 0 20px;
  border-radius: 9999px;
  transition: filter 0.4s ease;
}

.is-active .wave-track {
  filter: drop-shadow(0 0 18px var(--wave-backlit-glow, rgba(255, 255, 255, 0.35)));
}

.wave-bar {
  display: inline-block;
  width: 8.5px;
  min-height: 14px;
  border-radius: 9999px;
  background: var(--wave-theme-color, var(--fill-color, currentColor));
  opacity: 0.45;
  transform: scaleY(0.4);
  transform-origin: center center;
  transition:
    opacity 0.35s ease,
    transform 0.35s ease,
    background 0.35s ease,
    box-shadow 0.35s ease;
}

.is-active .wave-bar {
  opacity: 1;
  background: linear-gradient(
    180deg,
    #ffffff 0%,
    var(--wave-theme-color, var(--fill-color, rgba(255, 255, 255, 0.9))) 100%
  );
  box-shadow:
    0 0 10px var(--wave-backlit-glow, rgba(255, 255, 255, 0.5)),
    0 0 24px var(--wave-backlit-glow, rgba(255, 255, 255, 0.35)),
    0 0 44px var(--wave-backlit-glow, rgba(255, 255, 255, 0.2));
  animation: harmonicWave 1.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite alternate;
}

.is-active.is-light .wave-bar {
  background: linear-gradient(
    180deg,
    #111827 0%,
    var(--wave-theme-color, var(--fill-color, rgba(17, 24, 39, 0.85))) 100%
  );
  box-shadow:
    0 0 10px var(--wave-backlit-glow, rgba(17, 24, 39, 0.3)),
    0 0 24px var(--wave-backlit-glow, rgba(17, 24, 39, 0.2));
}

.is-active .bar-1 {
  animation-duration: 1.2s;
  --max-scale: 0.7;
}
.is-active .bar-2 {
  animation-duration: 1.35s;
  --max-scale: 1.1;
}
.is-active .bar-3 {
  animation-duration: 1.1s;
  --max-scale: 1.6;
}
.is-active .bar-4 {
  animation-duration: 1.45s;
  --max-scale: 2.1;
}
.is-active .bar-5 {
  animation-duration: 1.15s;
  --max-scale: 1.6;
}
.is-active .bar-6 {
  animation-duration: 1.35s;
  --max-scale: 1.1;
}
.is-active .bar-7 {
  animation-duration: 1.2s;
  --max-scale: 0.7;
}

@keyframes harmonicWave {
  0% {
    transform: scaleY(0.4);
    opacity: 0.65;
  }
  50% {
    transform: scaleY(var(--max-scale, 1));
    opacity: 1;
    filter: brightness(1.25);
  }
  100% {
    transform: scaleY(0.5);
    opacity: 0.75;
  }
}
</style>
