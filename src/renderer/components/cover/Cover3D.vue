<template>
  <div
    ref="coverContainer"
    class="cover-3d-container relative cursor-pointer"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    @mouseenter="handleMouseEnter"
  >
    <div ref="coverImage" class="cover-wrapper" :style="coverTransformStyle">
      <n-image
        :key="currentSrc"
        :src="currentSrc"
        class="cover-image"
        :class="{ 'has-black-bars': hasBlackBars }"
        preview-disabled
        :fallback-src="fallbackArt"
        :object-fit="objectFit"
        :img-props="{ referrerpolicy: 'no-referrer', alt: '' }"
        @load="onImageLoad"
        @error="onImageError"
      />
      <div class="cover-shine" :style="shineStyle"></div>
    </div>
    <div v-if="loading" class="loading-overlay">
      <i class="ri-loader-4-line loading-icon"></i>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import logoImg from '@/assets/logo.png';

interface Props {
  src: string;
  loading?: boolean;
  maxTilt?: number;
  scale?: number;
  shineIntensity?: number;
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  maxTilt: 18,
  scale: 1.05,
  shineIntensity: 0.38,
  objectFit: 'cover',
  disabled: false
});

const coverContainer = ref<HTMLElement | null>(null);
const coverImage = ref<HTMLElement | null>(null);
const mouseX = ref(0.5);
const mouseY = ref(0.5);
const isHovering = ref(false);
const rafId = ref<number | null>(null);

const currentSrc = ref(props.src);

watch(
  () => props.src,
  (newVal) => {
    currentSrc.value = newVal;
  }
);

const hasBlackBars = computed(() => {
  return (
    currentSrc.value?.includes('sddefault') ||
    currentSrc.value?.includes('mqdefault') ||
    currentSrc.value?.includes('hqdefault') ||
    currentSrc.value?.includes('default.jpg')
  );
});

const fallbackArt = computed(() => {
  if (currentSrc.value?.includes('i.ytimg.com')) {
    const match = currentSrc.value.match(/\/vi\/([^\/]+)\//);
    if (match) {
      return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
    }
  }
  return logoImg;
});

const doFallback = () => {
  if (currentSrc.value?.includes('maxresdefault.jpg')) {
    currentSrc.value = currentSrc.value.replace('maxresdefault.jpg', 'sddefault.jpg');
  } else if (currentSrc.value?.includes('sddefault.jpg')) {
    currentSrc.value = currentSrc.value.replace('sddefault.jpg', 'mqdefault.jpg');
  } else if (currentSrc.value?.includes('mqdefault.jpg')) {
    currentSrc.value = currentSrc.value.replace('mqdefault.jpg', 'hqdefault.jpg');
  } else {
    currentSrc.value = fallbackArt.value;
  }
};

const onImageError = () => {
  doFallback();
};

const onImageLoad = (e: Event) => {
  const img = e.target as HTMLImageElement;
  if (img && img.naturalWidth <= 120) {
    doFallback();
  }
};

const coverTransformStyle = computed(() => {
  if (!isHovering.value || props.disabled) {
    return {
      transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)',
      boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.45)',
      transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.5s cubic-bezier(0.25, 1, 0.5, 1)'
    };
  }

  const tiltX = Math.round((mouseY.value - 0.5) * props.maxTilt * 100) / 100;
  const tiltY = Math.round((mouseX.value - 0.5) * -props.maxTilt * 100) / 100;

  const shadowX = Math.round((mouseX.value - 0.5) * -20);
  const shadowY = Math.round((mouseY.value - 0.5) * -20 + 20);

  return {
    transform: `perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(${props.scale}, ${props.scale}, ${props.scale})`,
    boxShadow: `${shadowX}px ${shadowY}px 45px -8px rgba(0, 0, 0, 0.65)`,
    transition: 'none'
  };
});

const shineStyle = computed(() => {
  if (!isHovering.value || props.disabled) {
    return {
      opacity: 0,
      background: 'transparent',
      transition: 'opacity 0.4s ease-out'
    };
  }

  const shineX = Math.round(mouseX.value * 100);
  const shineY = Math.round(mouseY.value * 100);

  return {
    opacity: props.shineIntensity,
    background: `radial-gradient(380px circle at ${shineX}% ${shineY}%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.18) 35%, transparent 75%)`,
    transition: 'none'
  };
});

const updateMousePosition = (x: number, y: number) => {
  if (rafId.value) {
    cancelAnimationFrame(rafId.value);
  }

  rafId.value = requestAnimationFrame(() => {
    const deltaX = Math.abs(mouseX.value - x);
    const deltaY = Math.abs(mouseY.value - y);

    if (deltaX > 0.01 || deltaY > 0.01) {
      mouseX.value = x;
      mouseY.value = y;
    }
  });
};

const handleMouseMove = (event: MouseEvent) => {
  if (!coverContainer.value || !isHovering.value || props.disabled) return;

  const rect = coverContainer.value.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

  updateMousePosition(x, y);
};

const handleMouseEnter = () => {
  if (!props.disabled) {
    isHovering.value = true;
  }
};

const handleMouseLeave = () => {
  isHovering.value = false;
  if (rafId.value) {
    cancelAnimationFrame(rafId.value);
    rafId.value = null;
  }

  updateMousePosition(0.5, 0.5);
};

onBeforeUnmount(() => {
  if (rafId.value) {
    cancelAnimationFrame(rafId.value);
  }
});
</script>

<style scoped lang="scss">
.cover-3d-container {
  @apply w-full h-full;
  isolation: isolate;
}

.cover-wrapper {
  @apply relative w-full h-full rounded-xl overflow-hidden;
  transform-style: preserve-3d;
  will-change: transform, box-shadow;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  contain: layout;
}

.cover-image {
  @apply w-full h-full;
  border-radius: inherit;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transition: transform 0.2s ease;

  :deep(img) {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }
}

.cover-image.has-black-bars :deep(img) {
  width: 135% !important;
  height: 135% !important;
  max-width: 135% !important;
  max-height: 135% !important;
  position: absolute;
  top: -17.5%;
  left: -17.5%;
}

.cover-shine {
  @apply absolute inset-0 pointer-events-none rounded-xl;
  z-index: 1;
  will-change: background, opacity;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.cover-3d-container:hover .cover-wrapper {
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.4);
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-overlay {
  @apply absolute inset-0 flex items-center justify-center rounded-xl;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 2;
}

.loading-icon {
  font-size: 48px;
  color: white;
  animation: spin 1s linear infinite;
}

@media (max-width: 768px) {
  .cover-wrapper {
    transform: none !important;
  }

  .cover-shine {
    display: none;
  }
}
</style>
