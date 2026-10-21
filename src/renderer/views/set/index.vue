<template>
  <div class="h-full w-full flex flex-col">
    <!-- Top Header & Search Bar -->
    <div class="flex-shrink-0 z-10 pt-5 pb-3 px-[var(--content-padding-x)]">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <div
            v-if="currentSection !== 'main'"
            class="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
            @click="currentSection = 'main'"
          >
            <i class="ri-arrow-left-line text-lg text-neutral-900 dark:text-white"></i>
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {{ currentSection === 'main' ? 'Settings' : currentSectionTitle }}
          </h1>
        </div>
      </div>

      <!-- Search Input -->
      <div class="relative mb-3">
        <i
          class="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 text-base pointer-events-none"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search settings..."
          class="w-full pl-10 pr-10 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border-transparent text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-0 focus:border-transparent text-sm font-medium transition-all duration-200"
        />
        <button
          v-if="searchQuery"
          class="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          @click="searchQuery = ''"
        >
          <i class="ri-close-line text-base" />
        </button>
      </div>

      <!-- Category Filter Pills -->
      <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          class="px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer flex-shrink-0"
          :class="
            currentSection === 'main'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
          "
          @click="currentSection = 'main'"
        >
          All
        </button>
        <button
          v-for="item in allSettingsItems"
          :key="item.id"
          class="px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
          :class="
            currentSection === item.id
              ? 'bg-primary text-white shadow-sm'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
          "
          @click="currentSection = item.id"
        >
          <i :class="item.icon"></i>
          <span>{{ item.title }}</span>
        </button>
      </div>
    </div>

    <n-scrollbar class="flex-1">
      <div class="w-full mx-auto pb-32 pt-2 px-[var(--content-padding-x)]">
        <!-- Main Settings Menu -->
        <div
          v-show="currentSection === 'main'"
          class="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <div
            v-for="item in filteredSettings"
            :key="item.id"
            class="group flex items-center gap-3.5 p-3.5 rounded-xl bg-neutral-50/70 dark:bg-neutral-900/40 border border-black/5 dark:border-white/5 hover:bg-neutral-100 dark:hover:bg-neutral-850 cursor-pointer transition-all duration-200"
            @click="currentSection = item.id"
          >
            <div
              class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0"
            >
              <i v-if="!item.customIcon" :class="item.icon + ' text-xl'"></i>
              <span v-else class="text-lg font-bold font-sans">{{ item.customIcon }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div
                class="text-sm font-semibold text-neutral-900 dark:text-white mb-0.5 group-hover:text-primary transition-colors"
              >
                {{ item.title }}
              </div>
              <div
                v-if="item.description"
                class="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1"
              >
                {{ item.description }}
              </div>
            </div>
            <i
              class="ri-arrow-right-s-line text-neutral-400 group-hover:text-primary transition-colors"
            ></i>
          </div>
        </div>

        <!-- Sub Tabs -->
        <div v-show="currentSection === 'account'" class="animate-fade-in">
          <account-tab @navigate="(section: string) => (currentSection = section)" />
        </div>
        <div v-show="currentSection === 'discord'" class="animate-fade-in">
          <discord-tab />
        </div>
        <div v-show="currentSection === 'appearance'" class="animate-fade-in">
          <appearance-tab />
        </div>
        <div v-show="currentSection === 'player'" class="animate-fade-in">
          <player-tab />
        </div>
        <div v-show="currentSection === 'storage'" class="animate-fade-in">
          <storage-tab />
        </div>
        <div v-show="currentSection === 'about'" class="animate-fade-in">
          <about-tab />
        </div>

        <div class="h-20"></div>
        <play-bottom />
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { useDialog, useMessage } from 'naive-ui';
import { computed, onMounted, onUnmounted, provide, ref, watch } from 'vue';

import PlayBottom from '@/components/common/PlayBottom.vue';
import { useSettingsStore } from '@/store/modules/settings';
import { isDesktop } from '@/utils';

import config from '../../../../package.json';
import { createDefaultAppUpdateState } from '../../../shared/appUpdate';
import { SETTINGS_DATA_KEY, SETTINGS_DIALOG_KEY, SETTINGS_MESSAGE_KEY } from './keys';
import AboutTab from './tabs/AboutTab.vue';
import AccountTab from './tabs/AccountTab.vue';
import AppearanceTab from './tabs/AppearanceTab.vue';
import DiscordTab from './tabs/DiscordTab.vue';
import PlayerTab from './tabs/PlayerTab.vue';
import StorageTab from './tabs/StorageTab.vue';

const settingsStore = useSettingsStore();
const message = useMessage();
const dialog = useDialog();

const saveSettings = useDebounceFn((data) => {
  settingsStore.setSetData(data);
}, 500);

const localSetData = ref({ ...settingsStore.setData });

const setData = computed({
  get: () => localSetData.value,
  set: (newData) => {
    localSetData.value = newData;
  }
});

watch(
  () => localSetData.value,
  (newValue) => saveSettings(newValue),
  { deep: true }
);

watch(
  [
    () => localSetData.value?.dynamicIslandEnabled,
    () => localSetData.value?.dynamicIslandVisibility
  ],
  ([enabled, visibility]) => {
    try {
      if (typeof window !== 'undefined') {
        if (enabled !== undefined) {
          localStorage.setItem('dynamicIslandEnabled', JSON.stringify(enabled));
        }
        if (visibility !== undefined) {
          localStorage.setItem('dynamicIslandVisibility', JSON.stringify(visibility));
        }
      }
      import('@tauri-apps/api/event').then(({ emit }) => {
        emit('dynamic-island-settings', { enabled, visibility });
      });
    } catch {}
  }
);

watch(
  () => settingsStore.setData,
  (newValue) => {
    if (JSON.stringify(localSetData.value) !== JSON.stringify(newValue)) {
      localSetData.value = { ...newValue };
    }
  },
  { deep: true, immediate: true }
);

onUnmounted(() => {
  settingsStore.setSetData(localSetData.value);
});

provide(SETTINGS_DATA_KEY, setData);
provide(SETTINGS_MESSAGE_KEY, message);
provide(SETTINGS_DIALOG_KEY, dialog);

const searchQuery = ref('');
const currentSection = ref('main');

interface SettingsItem {
  id: string;
  title: string;
  icon: string;
  description: string;
  customIcon?: string;
}

const allSettingsItems = computed<SettingsItem[]>(() => [
  {
    id: 'account',
    title: 'Account',
    icon: 'ri-account-circle-line',
    description: 'Manage cookies and account details'
  },
  {
    id: 'discord',
    title: 'Discord',
    icon: 'ri-discord-line',
    description: 'Discord Rich Presence integration'
  },
  {
    id: 'appearance',
    title: 'Appearance',
    icon: 'ri-palette-line',
    description: 'Theme, animations, fonts, and layout'
  },
  {
    id: 'player',
    title: 'Audio and Player',
    icon: 'ri-headphone-line',
    description: 'Audio quality (Opus / Lossless), lyrics, dynamic island, equalizer, and playback settings'
  },
  {
    id: 'storage',
    title: 'Storage',
    icon: 'ri-database-2-line',
    description: 'Cache management and storage limits'
  },
  {
    id: 'about',
    title: 'About',
    icon: 'ri-information-line',
    description: 'App version and information'
  }
]);

const filteredSettings = computed(() => {
  if (!searchQuery.value) return allSettingsItems.value;
  const q = searchQuery.value.toLowerCase();
  return allSettingsItems.value.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
  );
});

const currentSectionTitle = computed(() => {
  if (currentSection.value === 'main') return 'Settings';
  if (currentSection.value === 'discord') return 'Discord Integration';
  const found = allSettingsItems.value.find((s) => s.id === currentSection.value);
  return found ? found.title : 'Settings';
});

onMounted(() => {
  if (isDesktop() && settingsStore.appUpdateState.currentVersion === '') {
    settingsStore.setAppUpdateState(createDefaultAppUpdateState(config.version));
  }
  if (setData.value.enableRealIP === undefined) {
    setData.value = { ...setData.value, enableRealIP: false };
  }
  if (setData.value.enableDiskCache === undefined) {
    setData.value = { ...setData.value, enableDiskCache: true };
  }
  if (!setData.value.diskCacheMaxSizeMB) {
    setData.value = { ...setData.value, diskCacheMaxSizeMB: 4096 };
  }
  if (!['lru', 'fifo'].includes(setData.value.diskCacheCleanupPolicy)) {
    setData.value = { ...setData.value, diskCacheCleanupPolicy: 'lru' };
  }
});
</script>

<style scoped>
:deep(.n-select .n-base-selection) {
  border-radius: 10px;
}
:deep(.n-input) {
  border-radius: 999px;
  background-color: transparent !important;
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
