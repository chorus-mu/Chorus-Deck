<template>
  <div
    class="amll-interlude-dots"
    :style="containerStyle"
    :class="{ 'is-active': isActive }"
  >
    <span class="amll-dot dot-1" :style="{ opacity: dotOpacities[0] }"></span>
    <span class="amll-dot dot-2" :style="{ opacity: dotOpacities[1] }"></span>
    <span class="amll-dot dot-3" :style="{ opacity: dotOpacities[2] }"></span>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    startTime: number;
    duration: number;
    currentTime: number;
    isActive: boolean;
    isFirstLine?: boolean;
  }>(),
  {
    isFirstLine: false
  }
);

// Cubic Bezier Solver (exact match to bezier-easing library)
function cubicBezier(mX1: number, mY1: number, mX2: number, mY2: number): (x: number) => number {
  if (mX1 === mY1 && mX2 === mY2) return (x: number) => x;

  const a = (aA1: number, aA2: number) => 1.0 - 3.0 * aA2 + 3.0 * aA1;
  const b = (aA1: number, aA2: number) => 3.0 * aA2 - 6.0 * aA1;
  const c = (aA1: number) => 3.0 * aA1;

  const calcBezier = (aT: number, aA1: number, aA2: number) =>
    ((a(aA1, aA2) * aT + b(aA1, aA2)) * aT + c(aA1)) * aT;

  const getSlope = (aT: number, aA1: number, aA2: number) =>
    3.0 * a(aA1, aA2) * aT * aT + 2.0 * b(aA1, aA2) * aT + c(aA1);

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; ++i) {
      const currentSlope = getSlope(t, mX1, mX2);
      if (currentSlope === 0.0) break;
      const currentX = calcBezier(t, mX1, mX2) - x;
      t -= currentX / currentSlope;
    }
    return calcBezier(t, mY1, mY2);
  };
}

// AMLL constants & curves
const lightingEasing = cubicBezier(0.56, 0.01, 0.45, 1);
const enterFadeEasing = cubicBezier(0.59, 0.02, 0.07, 1);
const exitPhase1Easing = cubicBezier(0.14, 0.06, 0.25, 1);
const exitPhase2Easing = cubicBezier(0.29, 0.03, 1, 0.38);
const exitFadeEasing = cubicBezier(0.43, 0.08, 0.83, 0.31);

const DOT3_TRAILING_MS = 750;
const EXIT_PHASE1_MS = 750;
const EXIT_PHASE2_MS = 250;
const EXIT_TOTAL_MS = EXIT_PHASE1_MS + EXIT_PHASE2_MS; // 1000ms
const EXIT_FADE_MS = 250;
const ENTER_HOLD_MS = 500;
const ENTER_FADE_MS = 180;
const DOT_ENTER_FADE_MS = 750;
const DOT_ENTER_STAGGER_MS = 80;
const DOT_ENTER_TOTAL_MS = 2 * DOT_ENTER_STAGGER_MS + DOT_ENTER_FADE_MS; // 910ms

const BREATHE_BASE_PERIOD_MS = 4000;
const FALLBACK_HOLD_THRESHOLD_MS = 3000;
const BREATHE_MAX_SCALE = 1.25;
const BREATHE_MIN_SCALE = 0.4;

const DOT_INACTIVE_OPACITY = 0.2;
const DOT_ACTIVE_OPACITY = 0.9;
const DOT_COUNT = 3;

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function dotOpacity(fraction: number): number {
  return DOT_INACTIVE_OPACITY + (DOT_ACTIVE_OPACITY - DOT_INACTIVE_OPACITY) * clamp01(fraction);
}

function enterOpacity(internalMs: number): number {
  return enterFadeEasing(clamp01(internalMs / ENTER_FADE_MS));
}

function dotEnterAlpha(index: number, internalMs: number): number {
  const t = clamp01((internalMs - index * DOT_ENTER_STAGGER_MS) / DOT_ENTER_FADE_MS);
  return t * t;
}

function computeDotFraction(startDelay: number, duration: number, internalMs: number, target: number): number {
  if (internalMs <= startDelay) return 0;
  if (duration <= 0) return target;
  const localT = (internalMs - startDelay) / duration;
  return lightingEasing(clamp01(localT)) * target;
}

function breathingProgress(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const angle = 4.0 * Math.PI * t;
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  return t - 0.084 * s + 0.008 * (1 - c) + 0.0046 * s * (c - s);
}

// Reactive frame state
const scale = ref(1);
const opacity = ref(props.isActive ? 1 : 0.35);
const dotOpacities = ref<[number, number, number]>([0.35, 0.35, 0.35]);

let animFrameId: number | null = null;
let lastSyncMediaTime = props.currentTime;
let lastSyncPerfTime = performance.now();

const containerStyle = computed(() => {
  return {
    transform: `scale(${scale.value.toFixed(4)})`,
    opacity: opacity.value.toFixed(3)
  };
});

function calculateSnapshot(currentMs: number) {
  if (!props.isActive) {
    scale.value = 1;
    opacity.value = 0.35;
    dotOpacities.value = [0.35, 0.35, 0.35];
    return;
  }

  const elapsedMs = Math.max(0, currentMs - props.startTime);
  const delayEndMs = props.isFirstLine ? 0 : ENTER_HOLD_MS;
  const remainingMs = Math.max(0, props.duration);
  const bodyMs = remainingMs - delayEndMs - EXIT_TOTAL_MS;

  if (bodyMs < DOT_ENTER_TOTAL_MS) {
    // Duration too short for full AMLL interlude cycle, fallback to gentle glow
    scale.value = 1;
    opacity.value = 0.85;
    dotOpacities.value = [0.85, 0.85, 0.85];
    return;
  }

  const bodyEndMs = delayEndMs + bodyMs;
  const totalEndMs = bodyEndMs + EXIT_TOTAL_MS;

  if (elapsedMs >= totalEndMs) {
    scale.value = 1;
    opacity.value = 0;
    dotOpacities.value = [0, 0, 0];
    return;
  }

  if (elapsedMs < delayEndMs) {
    scale.value = 1;
    opacity.value = 0;
    dotOpacities.value = [0, 0, 0];
    return;
  }

  const internalMs = elapsedMs - delayEndMs;
  const isFallback = bodyMs < FALLBACK_HOLD_THRESHOLD_MS;
  const dot3Target = isFallback ? 1.0 : Math.max(0.1, (bodyMs - Math.round((bodyMs + DOT3_TRAILING_MS) / DOT_COUNT) * 2) / Math.round((bodyMs + DOT3_TRAILING_MS) / DOT_COUNT));

  // Exit Phase: [bodyEndMs, totalEndMs) -> Swell then collapse
  if (elapsedMs >= bodyEndMs) {
    const exitElapsedMs = elapsedMs - bodyEndMs;
    const fadeT = clamp01((exitElapsedMs - (EXIT_TOTAL_MS - EXIT_FADE_MS)) / EXIT_FADE_MS);
    opacity.value = enterOpacity(internalMs) * (1 - exitFadeEasing(fadeT));

    // Phase 1: Swell to charge up (1.0 -> 1.25)
    if (exitElapsedMs < EXIT_PHASE1_MS) {
      scale.value = 1 + exitPhase1Easing(exitElapsedMs / EXIT_PHASE1_MS) * (BREATHE_MAX_SCALE - 1);
    } else {
      // Phase 2: Collapse & dismiss (1.25 -> 0.4)
      const phase2T = clamp01((exitElapsedMs - EXIT_PHASE1_MS) / EXIT_PHASE2_MS);
      scale.value = BREATHE_MAX_SCALE - exitPhase2Easing(phase2T) * (BREATHE_MAX_SCALE - BREATHE_MIN_SCALE);
    }

    const trailing = clamp01(exitElapsedMs / DOT3_TRAILING_MS);
    const d3Fraction = dot3Target + (1 - dot3Target) * trailing;
    dotOpacities.value = [
      dotOpacity(1) * dotEnterAlpha(0, internalMs),
      dotOpacity(1) * dotEnterAlpha(1, internalMs),
      dotOpacity(d3Fraction) * dotEnterAlpha(2, internalMs)
    ];
    return;
  }

  // Main Body Phase: [delayEndMs, bodyEndMs)
  opacity.value = enterOpacity(internalMs);

  if (isFallback) {
    scale.value = 1;
    dotOpacities.value = [
      dotOpacity(1) * dotEnterAlpha(0, internalMs),
      dotOpacity(1) * dotEnterAlpha(1, internalMs),
      dotOpacity(1) * dotEnterAlpha(2, internalMs)
    ];
    return;
  }

  // Breathe mode
  const breatheCycles = Math.max(1, Math.floor(bodyMs / BREATHE_BASE_PERIOD_MS));
  const breathePeriodMs = bodyMs / breatheCycles;
  const segmentMs = Math.round((bodyMs + DOT3_TRAILING_MS) / DOT_COUNT);
  const dot3DurationMs = bodyMs - segmentMs * 2;

  const cycleT = (internalMs % breathePeriodMs) / breathePeriodMs;
  const progress = breathingProgress(cycleT);
  scale.value =
    progress <= 0.5
      ? 1 + (progress / 0.5) * (BREATHE_MAX_SCALE - 1)
      : BREATHE_MAX_SCALE - ((progress - 0.5) / 0.5) * (BREATHE_MAX_SCALE - 1);

  const f0 = computeDotFraction(0, segmentMs, internalMs, 1);
  const f1 = computeDotFraction(segmentMs, segmentMs, internalMs, 1);
  const f2 = computeDotFraction(segmentMs * 2, dot3DurationMs, internalMs, dot3Target);

  dotOpacities.value = [
    dotOpacity(f0) * dotEnterAlpha(0, internalMs),
    dotOpacity(f1) * dotEnterAlpha(1, internalMs),
    dotOpacity(f2) * dotEnterAlpha(2, internalMs)
  ];
}

function updateFrame() {
  if (props.isActive) {
    const interpolatedMs = lastSyncMediaTime + (performance.now() - lastSyncPerfTime);
    calculateSnapshot(interpolatedMs);
    animFrameId = requestAnimationFrame(updateFrame);
  }
}

watch(
  () => props.currentTime,
  (newTime) => {
    lastSyncMediaTime = newTime;
    lastSyncPerfTime = performance.now();
    if (!props.isActive) {
      calculateSnapshot(newTime);
    }
  }
);

watch(
  () => props.isActive,
  (active) => {
    if (active) {
      lastSyncMediaTime = props.currentTime;
      lastSyncPerfTime = performance.now();
      if (!animFrameId) {
        animFrameId = requestAnimationFrame(updateFrame);
      }
    } else {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      calculateSnapshot(props.currentTime);
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (props.isActive) {
    lastSyncMediaTime = props.currentTime;
    lastSyncPerfTime = performance.now();
    animFrameId = requestAnimationFrame(updateFrame);
  } else {
    calculateSnapshot(props.currentTime);
  }
});

onBeforeUnmount(() => {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
});
</script>

<style scoped>
.amll-interlude-dots {
  display: inline-flex;
  align-items: center;
  gap: 0.18em;
  width: fit-content;
  height: clamp(0.5em, 1.2vh, 3em);
  padding: 0.3em 0;
  transform-origin: left center;
  user-select: none;
  pointer-events: none;
  will-change: transform, opacity;
}

.amll-dot {
  display: inline-block;
  width: 0.32em;
  height: 0.32em;
  min-width: 8px;
  min-height: 8px;
  max-width: 16px;
  max-height: 16px;
  border-radius: 50%;
  background-color: currentColor;
  aspect-ratio: 1 / 1;
  will-change: opacity;
}
</style>
