import { computed } from 'vue';

import { useSettingsStore } from '@/store/modules/settings';

export const setBackgroundImg = (url: String) => {
  return `background-image:url(${url})`;
};

export const setAnimationClass = (type: String) => {
  const settingsStore = useSettingsStore();
  if (settingsStore.setData && settingsStore.setData.noAnimate) {
    return '';
  }
  const speed = settingsStore.setData?.animationSpeed || 1;

  let speedClass = '';
  if (speed <= 0.3) speedClass = 'animate__slower';
  else if (speed <= 0.8) speedClass = 'animate__slow';
  else if (speed >= 2.5) speedClass = 'animate__faster';
  else if (speed >= 1.5) speedClass = 'animate__fast';

  return `animate__animated ${type}${speedClass ? ` ${speedClass}` : ''}`;
};

export const setAnimationDelay = (index: number = 6, time: number = 50) => {
  const settingsStore = useSettingsStore();
  if (settingsStore.setData?.noAnimate) {
    return '';
  }
  const speed = settingsStore.setData?.animationSpeed || 1;
  return `animation-delay:${(index * time) / (speed * 2)}ms`;
};

export const calculateAnimationDelay = (index: any, baseDelay: number = 0.03): string => {
  const settingsStore = useSettingsStore();
  if (settingsStore.setData?.noAnimate) {
    return '0s';
  }
  const speed = settingsStore.setData?.animationSpeed || 1;

  const delay = (index * baseDelay) / speed;
  return `${delay.toFixed(3)}s`;
};

export const secondToMinute = (s: number) => {
  if (!s || s < 0) {
    return '00:00';
  }
  const hour: number = Math.floor(s / 3600);
  const minute: number = Math.floor((s % 3600) / 60);
  const second: number = Math.floor(s % 60);
  const pad = (n: number): string => (n > 9 ? `${n}` : `0${n}`);
  if (hour > 0) {
    return `${hour}:${pad(minute)}:${pad(second)}`;
  }
  return `${pad(minute)}:${pad(second)}`;
};

export const parseDurationToSeconds = (dur?: string | number): number | undefined => {
  if (!dur) return undefined;
  if (typeof dur === 'number') {
    return dur > 1000 ? Math.round(dur / 1000) : Math.round(dur);
  }
  if (typeof dur === 'string') {
    if (dur.includes(':')) {
      const parts = dur.split(':').map((p) => parseInt(p, 10));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return parts[0] * 60 + parts[1];
      }
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
    }
    const parsed = Number(dur);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed > 1000 ? Math.round(parsed / 1000) : Math.round(parsed);
    }
  }
  return undefined;
};

const units = [
  { value: 1e8, symbol: '100 million' },
  { value: 1e4, symbol: 'Ten thousand' }
];

export const formatNumber = (num: string | number) => {
  num = Number(num);
  for (let i = 0; i < units.length; i++) {
    if (num >= units[i].value) {
      return `${(num / units[i].value).toFixed(1)}${units[i].symbol}`;
    }
  }
  return num.toString();
};

export { getImgUrl } from './thumbnail';

export const isCompact = computed(() => {
  const settingsStore = useSettingsStore();
  return settingsStore.isCompact;
});

export { isDesktop } from './env';

export const isDynamicIslandWindow = computed(() => {
  return typeof window !== 'undefined' && window.location.hash.includes('dynamic-island');
});

export const isLyricWindow = computed(() => {
  return typeof window !== 'undefined' && window.location.hash.includes('lyric');
});

export const isOverlayWindow = computed(() => {
  return isLyricWindow.value || isDynamicIslandWindow.value;
});

export const getSetData = async (): Promise<any> => {
  if (window.api) {
    return window.api.getStoreValue('set');
  }
  const settingsStore = useSettingsStore();
  return settingsStore.setData;
};
