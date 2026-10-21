<template>
  <compact-layout v-if="isPhone && !settingsStore.setData?.tabletMode" :is-phone="isPhone" />

  <div v-else-if="settingsStore.isCompact" class="layout-page compact">
    <div id="layout-main" class="layout-main">
      <title-bar />
      <div class="layout-main-page">
        <div class="main">
          <div class="main-content compact-content">
            <router-view
              v-slot="{ Component }"
              class="main-page"
              :class="route.meta.noScroll ? 'pr-3' : ''"
            >
              <transition name="fade" mode="out-in">
                <keep-alive :include="keepAliveInclude">
                  <component :is="Component" :key="route.fullPath" />
                </keep-alive>
              </transition>
            </router-view>
          </div>
          <app-sidebar :menus="menuStore.menus" />
        </div>
      </div>

      <compact-play-bar />
    </div>
    <update-modal v-if="isDesktop()" />
    <queue />
  </div>

  <div v-else class="layout-page">
    <div id="layout-main" class="layout-main">
      <title-bar />

      <div class="shell">
        <div class="shell-row">
          <div class="shell-surface shell-sidebar">
            <app-sidebar :menus="menuStore.menus" />
          </div>
          <div class="shell-surface shell-main relative">
            <div v-if="!isDesktop()" class="absolute top-4 right-6 z-20">
              <button
                class="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors shadow-sm"
                @click="openDownloadPage"
                title="Download desktop version"
              >
                <i class="ri-download-cloud-2-line text-sm text-primary"></i>
                <span>Download desktop version</span>
              </button>
            </div>

            <div class="main-viewport">
              <router-view v-slot="{ Component }">
                <div class="main-page" :class="{ 'no-scroll': route.meta.noScroll }">
                  <transition name="fade" mode="out-in">
                    <keep-alive :include="keepAliveInclude">
                      <component :is="Component" :key="route.fullPath" />
                    </keep-alive>
                  </transition>
                </div>
              </router-view>
            </div>
          </div>

          <div
            class="shell-surface shell-aside-col"
            :class="{ 'is-open': !playerStore.musicFull && playerStore.asideOpen }"
          >
            <div v-show="playerStore.asideTab === 'queue'" class="h-full w-full">
              <queue key="queue" mode="shell" />
            </div>
            <docked-lyrics v-show="playerStore.asideTab === 'lyrics'" key="lyrics" />
          </div>
        </div>
      </div>
      <play-bar />
      <queue v-if="playerStore.musicFull" mode="full" />
    </div>
    <update-modal v-if="isDesktop()" />
    <sleep-timer-top />
  </div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, onMounted, provide, ref } from 'vue';
import { useRoute } from 'vue-router';

import UpdateModal from '@/components/common/UpdateModal.vue';
import SleepTimerTop from '@/components/player/SleepTimerTop.vue';
import { useMenuStore } from '@/store/modules/menu';
import { usePlayerStore } from '@/store/modules/player';
import { useSettingsStore } from '@/store/modules/settings';
import { isDesktop } from '@/utils';

import CompactLayout from './CompactLayout.vue';
import AppSidebar from './components/AppSidebar.vue';
import TitleBar from './components/TitleBar.vue';

const keepAliveInclude = [
  'Home',
  'Search',
  'Toplist',
  'History',
  'LocalMusic',
  'PlaylistDetail',
  'AlbumDetail',
  'MoodDetail',
  'Setting',
  'PlaylistIndex'
];

import DockedLyrics from '@/components/lyric/DockedLyrics.vue';
import CompactPlayBar from '@/components/player/CompactPlayBar.vue';
import PlayBar from '@/components/player/PlayBar.vue';

const Queue = defineAsyncComponent(() => import('@/components/player/Queue.vue'));

const playerStore = usePlayerStore();
const settingsStore = useSettingsStore();
const menuStore = useMenuStore();

const route = useRoute();

const shouldShowCompactMenu = computed(() => {
  const menuPaths = menuStore.menus.map((item: any) => item.path);

  return menuPaths.includes(route.path) && settingsStore.isCompact && !playerStore.musicFull;
});

provide('shouldShowCompactMenu', shouldShowCompactMenu);

const isPhone = computed(() => settingsStore.isCompact);

const openDownloadPage = () => {
  if (!isDesktop()) {
    window.open('https://github.com/chorus-mu/Chorus-Deck/releases', '_blank');
  }
};

onMounted(() => {
  settingsStore.initializeSettings();
  settingsStore.initializeTheme();
});
</script>

<style lang="scss" scoped>
.layout-page {
  @apply w-screen h-screen overflow-hidden;
  background-color: var(--shell-canvas, #e9ecef);
}

.layout-main {
  @apply w-full h-full relative flex flex-col text-gray-900 dark:text-white;
}

.layout-main-page {
  @apply flex h-full;
}

/*
 * Shell canvas: owns the top/bottom/right outer insets via padding and
 * the vertical Main/Queue -> Player gap. `gap` collapses to 0 whenever a
 * surface is display:none, so gaps appear and disappear with their surface.
 */
.shell {
  @apply flex flex-col flex-1 min-h-0;
  gap: var(--shell-gap);
  padding: var(--shell-gap);
}
.shell-row {
  @apply flex flex-1 min-h-0;
  gap: var(--shell-gap);
  overflow: hidden;
  transition: gap 0.35s cubic-bezier(0.25, 1, 0.5, 1);
}

.shell-aside-col {
  height: 100%;
  flex-shrink: 0;
  overflow: hidden;
  width: 0;
  opacity: 0;
  pointer-events: none;
  background-color: var(--shell-surface);
  border-radius: var(--shell-radius);
  transition:
    width 0.35s cubic-bezier(0.25, 1, 0.5, 1),
    opacity 0.25s ease;
  will-change: width, opacity;

  &.is-open {
    width: clamp(254px, 20vw, 360px);
    opacity: 1;
    pointer-events: auto;
  }
}

.aside-fade-enter-active,
.aside-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.aside-fade-enter-from {
  opacity: 0;
  transform: scale(0.98);
}
.aside-fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

.shell-surface {
  background-color: var(--shell-surface);
  border-radius: var(--shell-radius);
  transition:
    width 0.35s cubic-bezier(0.25, 1, 0.5, 1),
    flex 0.35s cubic-bezier(0.25, 1, 0.5, 1);
}

.shell-sidebar {
  @apply flex-shrink-0 self-stretch min-h-0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.shell-main {
  @apply flex-1 min-w-0 flex flex-col overflow-hidden;
  transition: all 0.35s cubic-bezier(0.25, 1, 0.5, 1);
}

.main {
  @apply overflow-hidden flex-1 flex flex-col;
}

.main-viewport {
  @apply flex-1 min-h-0 overflow-auto;
  transition: all 0.35s cubic-bezier(0.25, 1, 0.5, 1);
}

.main-page {
  @apply h-full;
}

.main-page.no-scroll {
  @apply overflow-hidden;
}

.main-page > * {
  box-sizing: border-box;
  height: 100%;
  min-height: 100%;
  overflow: auto;
}

.main-page.no-scroll > * {
  overflow: hidden;
}

.menu {
  @apply h-full bg-light dark:bg-black;
}

.compact {
  .main-content {
    height: calc(100vh - 130px);
    overflow: auto;
    display: block;
    flex: none;
    position: relative;
  }

  .compact-content {
    height: calc(100vh - 75px);
    position: relative;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
