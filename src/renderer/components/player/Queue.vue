<template>
  <div v-if="internalVisible" class="fixed-overlay" @click="closePanel"></div>

  <div
    v-if="internalVisible"
    class="queue-panel"
    :class="[
      isFullView
        ? closing
          ? 'animate__animated animate__slideOutRight'
          : 'animate__animated animate__slideInRight'
        : !isFullView && !isShellLayout
          ? closing
            ? 'animate__animated animate__slideOutRight'
            : 'animate__animated animate__slideInRight'
          : ''
    ]"
    :data-shell-layout="isShellLayout || undefined"
    :style="panelStyle"
    @animationend="onAnimationEnd"
  >
    <!-- Header -->
    <div class="panel-header" :style="headerStyle">
      <div class="queue-title">QUEUE</div>

      <div class="header-actions">
        <!-- Autoplay / Radio button -->
        <n-tooltip trigger="hover">
          <template #trigger>
            <button
              class="header-icon-btn"
              :class="{ 'is-active': autoLoadMore }"
              :style="autoLoadMore ? activeIconBtnStyle : {}"
              @click="toggleAutoLoadMore"
            >
              <i class="ri-radio-2-line"></i>
            </button>
          </template>
          Autoplay similar tracks
        </n-tooltip>

        <!-- Reset order button -->
        <button
          class="header-text-btn"
          :disabled="!hasReordered"
          :class="{ 'is-disabled': !hasReordered }"
          @click="handleResetQueue"
          title="Reset to original order"
        >
          Reset
        </button>

        <!-- Clear upcoming button -->
        <button
          class="header-text-btn"
          :disabled="upcomingItems.length === 0"
          :class="{ 'is-disabled': upcomingItems.length === 0 }"
          @click="handleClearUpcoming"
          title="Clear upcoming songs"
        >
          Clear
        </button>

        <!-- Close button -->
        <button class="header-icon-btn close-btn" @click="closePanel" title="Close queue">
          <i class="ri-close-line"></i>
        </button>
      </div>
    </div>

    <!-- Panel Body (Continuous Categorized Stream) -->
    <div class="panel-body relative">
      <!-- Empty State -->
      <div v-if="allQueueItems.length === 0" class="empty-queue">
        <i class="ri-music-2-line"></i>
        <p>Queue is empty</p>
      </div>

      <div v-else ref="scrollContainerRef" class="queue-scroll" @scroll="handleScroll">
        <section v-if="historyItems.length > 0" class="queue-section history-section">
          <div class="queue-section-header">
            <span class="queue-section-label">HISTORY</span>
          </div>

          <div
            v-for="entry in historyItems"
            :key="`hist-${entry.song.id}-${entry.globalIndex}`"
            class="queue-item group is-history"
            :class="{
              'drop-target-top':
                dropTargetState?.globalIndex === entry.globalIndex &&
                dropTargetState?.position === 'top',
              'drop-target-bottom':
                dropTargetState?.globalIndex === entry.globalIndex &&
                dropTargetState?.position === 'bottom'
            }"
            draggable="true"
            @dragstart="handleDragStart($event, entry.globalIndex)"
            @dragover="handleDragOver($event, entry.globalIndex)"
            @dragleave="handleDragLeave"
            @drop.prevent.stop="handleDrop(entry.globalIndex)"
            @dragend="handleDragEnd"
            @click="playFromQueue(entry.song, entry.globalIndex, $event)"
            @contextmenu.prevent.stop="openContextMenu($event, entry.song, entry.globalIndex)"
          >
            <!-- Thumbnail with hover scrim -->
            <div class="item-art" @click.stop="togglePlayItem(entry.song, entry.globalIndex)">
              <n-image
                :src="getImgUrl(entry.song?.picUrl, '80y80')"
                :fallback-src="getFallbackArt(entry.song)"
                class="item-img"
                preview-disabled
                object-fit="cover"
                :img-props="{
                  crossorigin: 'anonymous',
                  referrerpolicy: 'no-referrer',
                  style: 'object-fit: cover;',
                  alt: ''
                }"
              />
              <div class="item-hover-scrim">
                <i class="ri-play-fill"></i>
              </div>
            </div>

            <!-- Song Info -->
            <div class="item-info">
              <div class="item-title-row">
                <span class="item-title" :title="entry.song.name">
                  {{ entry.song.name || 'Unknown Track' }}
                </span>
                <span v-if="isSongExplicit(entry.song)" class="explicit-badge" title="Explicit"
                  >E</span
                >
              </div>
              <div class="item-artist">
                <template v-if="getItemArtists(entry.song).length > 0">
                  <span
                    v-for="(ar, i) in getItemArtists(entry.song)"
                    :key="i"
                    class="artist-name"
                    @click.stop="goToArtist(ar)"
                  >
                    {{ ar.name || 'Unknown Artist'
                    }}<span v-if="i < getItemArtists(entry.song).length - 1" class="artist-sep"
                      >,
                    </span>
                  </span>
                </template>
                <template v-else>
                  <span>Unknown Artist</span>
                </template>
              </div>
            </div>

            <!-- Row Actions -->
            <div class="item-actions">
              <button
                class="item-action-btn delete-btn"
                title="Remove from queue"
                @click.stop="handleDeleteSong(entry.song)"
              >
                <i class="ri-close-line"></i>
              </button>
              <button
                class="item-action-btn more-btn"
                title="More options"
                @click.stop="openContextMenuFromBtn($event, entry.song, entry.globalIndex)"
              >
                <i class="ri-more-2-fill"></i>
              </button>
            </div>
          </div>
        </section>

        <section v-if="currentQueueEntry" class="queue-section now-playing-section">
          <div class="queue-section-header">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="queue-section-label">NOW PLAYING</span>
              <template v-if="queueOriginTitle">
                <span class="origin-dot">·</span>
                <span
                  class="origin-link truncate"
                  @click="handleOriginClick"
                  :title="`From ${queueOriginTitle}`"
                >
                  From {{ queueOriginTitle }}
                </span>
              </template>
            </div>
          </div>

          <div
            :ref="
              (el) => {
                currentSongRef = el as HTMLElement;
              }
            "
            class="queue-item group is-playing"
            :class="{
              'drop-target-top':
                dropTargetState?.globalIndex === currentQueueEntry.globalIndex &&
                dropTargetState?.position === 'top',
              'drop-target-bottom':
                dropTargetState?.globalIndex === currentQueueEntry.globalIndex &&
                dropTargetState?.position === 'bottom'
            }"
            :style="playingItemStyle"
            draggable="true"
            @dragstart="handleDragStart($event, currentQueueEntry.globalIndex)"
            @dragover="handleDragOver($event, currentQueueEntry.globalIndex)"
            @dragleave="handleDragLeave"
            @drop.prevent.stop="handleDrop(currentQueueEntry.globalIndex)"
            @dragend="handleDragEnd"
            @click="playFromQueue(currentQueueEntry.song, currentQueueEntry.globalIndex, $event)"
            @contextmenu.prevent.stop="
              openContextMenu($event, currentQueueEntry.song, currentQueueEntry.globalIndex)
            "
          >
            <!-- Thumbnail with playing equalizer badge -->
            <div
              class="item-art"
              @click.stop="togglePlayItem(currentQueueEntry.song, currentQueueEntry.globalIndex)"
            >
              <n-image
                :src="getImgUrl(currentQueueEntry.song?.picUrl, '80y80')"
                :fallback-src="getFallbackArt(currentQueueEntry.song)"
                class="item-img"
                preview-disabled
                object-fit="cover"
                :img-props="{
                  crossorigin: 'anonymous',
                  referrerpolicy: 'no-referrer',
                  style: 'object-fit: cover;',
                  alt: ''
                }"
              />
              <div class="item-playing-badge" :style="{ backgroundColor: accentColor }">
                <i :class="isPlaying ? 'ri-equalizer-line' : 'ri-pause-line'"></i>
              </div>
              <div class="item-hover-scrim">
                <i :class="isPlaying ? 'ri-pause-fill' : 'ri-play-fill'"></i>
              </div>
            </div>

            <!-- Song Info -->
            <div class="item-info">
              <div class="item-title-row">
                <span
                  class="item-title font-semibold"
                  :style="{ color: accentColor }"
                  :title="currentQueueEntry.song.name"
                >
                  {{ currentQueueEntry.song.name || 'Unknown Track' }}
                </span>
                <span
                  v-if="isSongExplicit(currentQueueEntry.song)"
                  class="explicit-badge"
                  title="Explicit"
                  >E</span
                >
              </div>
              <div class="item-artist">
                <template v-if="getItemArtists(currentQueueEntry.song).length > 0">
                  <span
                    v-for="(ar, i) in getItemArtists(currentQueueEntry.song)"
                    :key="i"
                    class="artist-name"
                    @click.stop="goToArtist(ar)"
                  >
                    {{ ar.name || 'Unknown Artist'
                    }}<span
                      v-if="i < getItemArtists(currentQueueEntry.song).length - 1"
                      class="artist-sep"
                      >,
                    </span>
                  </span>
                </template>
                <template v-else>
                  <span>Unknown Artist</span>
                </template>
              </div>
            </div>

            <!-- Row Actions -->
            <div class="item-actions">
              <button
                class="item-action-btn delete-btn"
                title="Remove from queue"
                @click.stop="handleDeleteSong(currentQueueEntry.song)"
              >
                <i class="ri-close-line"></i>
              </button>
              <button
                class="item-action-btn more-btn"
                title="More options"
                @click.stop="
                  openContextMenuFromBtn(
                    $event,
                    currentQueueEntry.song,
                    currentQueueEntry.globalIndex
                  )
                "
              >
                <i class="ri-more-2-fill"></i>
              </button>
            </div>
          </div>
        </section>

        <section v-if="nextInQueueItems.length > 0" class="queue-section next-in-queue-section">
          <div class="queue-section-header">
            <span class="queue-section-label">NEXT IN QUEUE</span>
          </div>

          <div
            v-for="entry in nextInQueueItems"
            :key="`manual-${entry.song.id}-${entry.globalIndex}`"
            class="queue-item group"
            :class="{
              'drop-target-top':
                dropTargetState?.globalIndex === entry.globalIndex &&
                dropTargetState?.position === 'top',
              'drop-target-bottom':
                dropTargetState?.globalIndex === entry.globalIndex &&
                dropTargetState?.position === 'bottom'
            }"
            draggable="true"
            @dragstart="handleDragStart($event, entry.globalIndex)"
            @dragover="handleDragOver($event, entry.globalIndex)"
            @dragleave="handleDragLeave"
            @drop.prevent.stop="handleDrop(entry.globalIndex)"
            @dragend="handleDragEnd"
            @click="playFromQueue(entry.song, entry.globalIndex, $event)"
            @contextmenu.prevent.stop="openContextMenu($event, entry.song, entry.globalIndex)"
          >
            <!-- Thumbnail with hover scrim -->
            <div class="item-art" @click.stop="togglePlayItem(entry.song, entry.globalIndex)">
              <n-image
                :src="getImgUrl(entry.song?.picUrl, '80y80')"
                :fallback-src="getFallbackArt(entry.song)"
                class="item-img"
                preview-disabled
                object-fit="cover"
                :img-props="{
                  crossorigin: 'anonymous',
                  referrerpolicy: 'no-referrer',
                  style: 'object-fit: cover;',
                  alt: ''
                }"
              />
              <div class="item-hover-scrim">
                <i class="ri-play-fill"></i>
              </div>
            </div>

            <!-- Song Info -->
            <div class="item-info">
              <div class="item-title-row">
                <span class="item-title" :title="entry.song.name">
                  {{ entry.song.name || 'Unknown Track' }}
                </span>
                <span v-if="isSongExplicit(entry.song)" class="explicit-badge" title="Explicit"
                  >E</span
                >
              </div>
              <div class="item-artist">
                <template v-if="getItemArtists(entry.song).length > 0">
                  <span
                    v-for="(ar, i) in getItemArtists(entry.song)"
                    :key="i"
                    class="artist-name"
                    @click.stop="goToArtist(ar)"
                  >
                    {{ ar.name || 'Unknown Artist'
                    }}<span v-if="i < getItemArtists(entry.song).length - 1" class="artist-sep"
                      >,
                    </span>
                  </span>
                </template>
                <template v-else>
                  <span>Unknown Artist</span>
                </template>
              </div>
            </div>

            <!-- Row Actions -->
            <div class="item-actions">
              <button
                class="item-action-btn delete-btn"
                title="Remove from queue"
                @click.stop="handleDeleteSong(entry.song)"
              >
                <i class="ri-close-line"></i>
              </button>
              <button
                class="item-action-btn more-btn"
                title="More options"
                @click.stop="openContextMenuFromBtn($event, entry.song, entry.globalIndex)"
              >
                <i class="ri-more-2-fill"></i>
              </button>
            </div>
          </div>
        </section>

        <section v-if="upNextItems.length > 0" class="queue-section up-next-section">
          <div class="queue-section-header">
            <span class="queue-section-label">UP NEXT</span>
          </div>

          <div
            v-for="entry in upNextItems"
            :key="`upnext-${entry.song.id}-${entry.globalIndex}`"
            class="queue-item group"
            :class="{
              'drop-target-top':
                dropTargetState?.globalIndex === entry.globalIndex &&
                dropTargetState?.position === 'top',
              'drop-target-bottom':
                dropTargetState?.globalIndex === entry.globalIndex &&
                dropTargetState?.position === 'bottom'
            }"
            draggable="true"
            @dragstart="handleDragStart($event, entry.globalIndex)"
            @dragover="handleDragOver($event, entry.globalIndex)"
            @dragleave="handleDragLeave"
            @drop.prevent.stop="handleDrop(entry.globalIndex)"
            @dragend="handleDragEnd"
            @click="playFromQueue(entry.song, entry.globalIndex, $event)"
            @contextmenu.prevent.stop="openContextMenu($event, entry.song, entry.globalIndex)"
          >
            <!-- Thumbnail with hover scrim -->
            <div class="item-art" @click.stop="togglePlayItem(entry.song, entry.globalIndex)">
              <n-image
                :src="getImgUrl(entry.song?.picUrl, '80y80')"
                :fallback-src="getFallbackArt(entry.song)"
                class="item-img"
                preview-disabled
                object-fit="cover"
                :img-props="{
                  crossorigin: 'anonymous',
                  referrerpolicy: 'no-referrer',
                  style: 'object-fit: cover;',
                  alt: ''
                }"
              />
              <div class="item-hover-scrim">
                <i class="ri-play-fill"></i>
              </div>
            </div>

            <!-- Song Info -->
            <div class="item-info">
              <div class="item-title-row">
                <span class="item-title" :title="entry.song.name">
                  {{ entry.song.name || 'Unknown Track' }}
                </span>
                <span v-if="isSongExplicit(entry.song)" class="explicit-badge" title="Explicit"
                  >E</span
                >
              </div>
              <div class="item-artist">
                <template v-if="getItemArtists(entry.song).length > 0">
                  <span
                    v-for="(ar, i) in getItemArtists(entry.song)"
                    :key="i"
                    class="artist-name"
                    @click.stop="goToArtist(ar)"
                  >
                    {{ ar.name || 'Unknown Artist'
                    }}<span v-if="i < getItemArtists(entry.song).length - 1" class="artist-sep"
                      >,
                    </span>
                  </span>
                </template>
                <template v-else>
                  <span>Unknown Artist</span>
                </template>
              </div>
            </div>

            <!-- Row Actions -->
            <div class="item-actions">
              <button
                class="item-action-btn delete-btn"
                title="Remove from queue"
                @click.stop="handleDeleteSong(entry.song)"
              >
                <i class="ri-close-line"></i>
              </button>
              <button
                class="item-action-btn more-btn"
                title="More options"
                @click.stop="openContextMenuFromBtn($event, entry.song, entry.globalIndex)"
              >
                <i class="ri-more-2-fill"></i>
              </button>
            </div>
          </div>
        </section>
      </div>

      <!-- Floating "Return to playing" pill button -->
      <transition name="fade">
        <button
          v-if="showReturnPill"
          class="floating-return-pill"
          @click="scrollToCurrentSong(true)"
        >
          <i class="ri-music-fill"></i>
          <span>Return to playing</span>
        </button>
      </transition>
    </div>
    <n-dropdown
      :show="showContextMenu"
      :x="contextMenuX"
      :y="contextMenuY"
      :options="contextMenuOptions"
      :scrollable="false"
      placement="bottom-start"
      :flip="false"
      @clickoutside="showContextMenu = false"
      @select="handleContextMenuSelect"
    />
  </div>
</template>

<script setup lang="ts">
import type { DropdownOption } from 'naive-ui';
import { NDropdown, NImage, NInput, NTooltip, useDialog, useMessage, useThemeVars } from 'naive-ui';
import tinycolor from 'tinycolor2';
import { computed, h, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import logoImg from '@/assets/logo.png';
import { allTime, normalizeArtistList, nowTime, playMusic } from '@/hooks/MusicHook';
import { usePlaybackControl } from '@/hooks/usePlaybackControl';
import { audioService } from '@/services/audioService';
import { usePlayerStore } from '@/store/modules/player';
import { useQueueStore } from '@/store/modules/queue';
import { useSettingsStore } from '@/store/modules/settings';
import type { SongResult } from '@/types/music';
import { getImgUrl, isCompact, secondToMinute } from '@/utils';

const props = withDefaults(
  defineProps<{
    mode?: 'auto' | 'shell' | 'full';
  }>(),
  {
    mode: 'auto'
  }
);

const message = useMessage();
const dialog = useDialog();
const router = useRouter();
const playerStore = usePlayerStore();
const queueStore = useQueueStore();
const settingsStore = useSettingsStore();
const { isPlaying } = usePlaybackControl();
const themeVars = useThemeVars();

const internalVisible = ref(false);
const closing = ref(false);

const isFullView = computed(() => {
  if (props.mode === 'shell') return false;
  if (props.mode === 'full') return true;
  return !!playerStore.musicFull;
});

const isShellLayout = computed(() => {
  if (props.mode === 'shell') return true;
  if (props.mode === 'full') return false;
  return !isCompact.value && !isFullView.value;
});

const isDarkTheme = computed(() => {
  return settingsStore.theme === 'dark' || document.documentElement.classList.contains('dark');
});

const rawAlbumColor = computed(
  () => playMusic.value?.primaryColor || themeVars.value.primaryColor || '#6366f1'
);

const accentColor = computed(() => {
  const base = rawAlbumColor.value;
  const tc = tinycolor(base);
  if (!tc.isValid()) return isDarkTheme.value ? '#c7d2fe' : '#1e1b4b';

  const hsl = tc.toHsl();
  if (isDarkTheme.value) {
    const sat = Math.min(Math.max(hsl.s, 0.5) * 1.1, 1);
    const lum = Math.min(Math.max(hsl.l, 0.72), 0.88);
    return tinycolor({ h: hsl.h, s: sat, l: lum }).toRgbString();
  } else {
    const sat = Math.min(Math.max(hsl.s, 0.6) * 1.25, 1);
    const lum = Math.min(Math.max(hsl.l, 0.2), 0.35);
    return tinycolor({ h: hsl.h, s: sat, l: lum }).toRgbString();
  }
});

const queueBackground = computed(() => {
  if (isFullView.value) {
    if (playMusic.value?.backgroundColor) {
      return playMusic.value.backgroundColor;
    }
    const base = rawAlbumColor.value;
    const tc = tinycolor(base);
    const hsl = tc.isValid() ? tc.toHsl() : { h: 230, s: 0.6, l: 0.4 };
    if (isDarkTheme.value) {
      const topColor = tinycolor({
        h: hsl.h,
        s: Math.min(hsl.s * 0.9, 0.7),
        l: 0.22
      }).toRgbString();
      const bottomColor = tinycolor({
        h: (hsl.h + 25) % 360,
        s: Math.min(hsl.s * 0.8, 0.6),
        l: 0.12
      }).toRgbString();
      return `linear-gradient(180deg, ${topColor} 0%, ${bottomColor} 100%)`;
    } else {
      const topColor = tinycolor({
        h: hsl.h,
        s: Math.min(hsl.s * 0.75, 0.65),
        l: 0.82
      }).toRgbString();
      const bottomColor = tinycolor({
        h: (hsl.h + 20) % 360,
        s: Math.min(hsl.s * 0.65, 0.55),
        l: 0.65
      }).toRgbString();
      return `linear-gradient(180deg, ${topColor} 0%, ${bottomColor} 100%)`;
    }
  }

  return 'var(--shell-surface, #fff)';
});

const panelStyle = computed(() => ({
  '--accent': accentColor.value,
  '--panel-bg': queueBackground.value
}));

const headerStyle = computed(() => ({
  borderBottomColor: isDarkTheme.value ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'
}));

const activeIconBtnStyle = computed(() => ({
  background: `color-mix(in srgb, ${accentColor.value} 22%, transparent)`,
  color: accentColor.value
}));

const playingItemStyle = computed(() => ({
  background: `color-mix(in srgb, ${accentColor.value} 14%, transparent)`
}));

// Header controls state
const autoLoadMore = computed({
  get: () => !!settingsStore.setData?.autoLoadMore,
  set: (val: boolean) => {
    if (settingsStore.setData) {
      settingsStore.setData.autoLoadMore = val;
    }
  }
});

const toggleAutoLoadMore = () => {
  autoLoadMore.value = !autoLoadMore.value;
  if (autoLoadMore.value) {
    message.info('Autoplay similar tracks enabled');
  } else {
    message.info('Autoplay disabled');
  }
};

const hasReordered = computed(() => queueStore.hasReordered);

const handleResetQueue = () => {
  if (!hasReordered.value) return;
  queueStore.resetQueueOrder();
  message.success('Queue order reset to original');
};

const handleClearUpcoming = () => {
  if (upcomingItems.value.length === 0) return;
  queueStore.clearUpcoming();
  message.success('Upcoming tracks cleared');
};

// Queue Data
const allQueueItems = computed(() => (playerStore.queueItems || []) as SongResult[]);
const queueIndex = computed(() => playerStore.queueIndex);

const currentSong = computed(() => {
  if (playerStore.playMusic && playerStore.playMusic.id) {
    return playerStore.playMusic;
  }
  return playMusic.value && playMusic.value.id ? playMusic.value : null;
});

const isCurrentItem = (item: any) => {
  if (!item?.id || !currentSong.value?.id) return false;
  return String(item.id) === String(currentSong.value.id);
};

const historyItems = computed(() => {
  const idx = queueIndex.value;
  if (idx <= 0) return [];
  return allQueueItems.value.slice(0, idx).map((song, i) => ({
    song,
    globalIndex: i
  }));
});

const currentQueueEntry = computed(() => {
  const idx = queueIndex.value;
  if (idx >= 0 && idx < allQueueItems.value.length) {
    return {
      song: allQueueItems.value[idx],
      globalIndex: idx
    };
  }
  return null;
});

const upcomingItems = computed(() => {
  const idx = queueIndex.value;
  if (idx >= allQueueItems.value.length - 1) return [];
  return allQueueItems.value.slice(idx + 1).map((song, i) => ({
    song,
    globalIndex: idx + 1 + i
  }));
});

const nextInQueueItems = computed(() => {
  const manualSet = new Set(queueStore.manualQueueIds.map(String));
  return upcomingItems.value.filter((entry) => manualSet.has(String(entry.song.id)));
});

const upNextItems = computed(() => {
  const manualSet = new Set(queueStore.manualQueueIds.map(String));
  return upcomingItems.value.filter((entry) => !manualSet.has(String(entry.song.id)));
});

const queueOriginTitle = computed(() => {
  return queueStore.queueOrigin?.title || queueStore.queueOrigin?.name || '';
});

const handleOriginClick = () => {
  if (!queueStore.queueOrigin) return;
  const { type, id, path, name, title } = queueStore.queueOrigin;
  if (path) {
    router.push(path);
  } else if (type === 'album' && id) {
    router.push({ name: 'albumDetail', params: { id } });
  } else if (type === 'playlist' && id) {
    router.push({ name: 'playlistDetail', params: { id } });
  } else if (type === 'artist' && id) {
    router.push({ name: 'artistDetail', params: { id } });
  } else if (name || title) {
    router.push({ path: '/search-result', query: { keyword: name || title } });
  }
};

// Helpers
const getFallbackArt = (item: any): string => {
  const sid = item?.id ? String(item.id) : '';
  if (sid.length === 11 && !sid.includes('/')) {
    return `https://i.ytimg.com/vi/${sid}/hqdefault.jpg`;
  }
  return logoImg;
};

const getItemArtists = (item: any) => {
  const album = typeof item?.album === 'string' ? item.album : item?.al?.name;
  return normalizeArtistList(item?.ar || item?.artists || [], album);
};

const isSongExplicit = (song: any): boolean => {
  if (!song) return false;
  if (song.explicit === true || song.fee === 1 || song.mark === 1048576) return true;
  const name = String(song.name || song.title || '');
  return /\b(explicit)\b/i.test(name) || /\[E\]/i.test(name);
};

const goToArtist = (artist: { name: string; id?: string | number }) => {
  if (artist.id) {
    router.push({ name: 'artistDetail', params: { id: artist.id } });
  } else if (artist.name) {
    router.push({ path: '/search-result', query: { keyword: artist.name, type: 'artist' } });
  }
};

const goToAlbum = (song: SongResult) => {
  const album = (song as any).album || (song as any).al;
  const albumId = typeof album === 'object' ? album?.id : null;
  const albumName =
    typeof album === 'object' ? album?.name : typeof album === 'string' ? album : null;
  if (albumId) {
    router.push({ name: 'albumDetail', params: { id: albumId } });
  } else if (albumName) {
    router.push({ path: '/search-result', query: { keyword: albumName, type: 'album' } });
  }
};

const playFromQueue = async (song: SongResult, index: number, event?: MouseEvent) => {
  if ((event?.target as HTMLElement | null)?.closest('.item-actions, .artist-name')) return;

  const currentSongId = playerStore.playMusic?.id;
  if (currentSongId && String(currentSongId) === String(song.id)) {
    if (!isPlaying.value) {
      await playerStore.setPlay(song);
    }
    return;
  }

  await audioService.pause();
  await audioService.stop();
  nowTime.value = 0;
  allTime.value = 0;
  playerStore.queueIndex = index;
  await playerStore.setPlay(song);
};

const togglePlayItem = async (song: SongResult, globalIndex: number) => {
  if (isCurrentItem(song)) {
    if (isPlaying.value) {
      await audioService.pause();
    } else {
      await playerStore.setPlay(song);
    }
    return;
  }
  await playFromQueue(song, globalIndex);
};

const handleDeleteSong = (song: SongResult) => {
  playerStore.removeFromQueue(song.id);
};

// Drag and drop reordering
const draggedGlobalIndex = ref<number | null>(null);
const dropTargetState = ref<{ globalIndex: number; position: 'top' | 'bottom' } | null>(null);

const handleDragStart = (event: DragEvent, globalIndex: number) => {
  event.stopPropagation();
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(globalIndex));
  }
  draggedGlobalIndex.value = globalIndex;
};

const handleDragOver = (event: DragEvent, globalIndex: number) => {
  event.preventDefault();
  event.stopPropagation();
  if (draggedGlobalIndex.value === null || draggedGlobalIndex.value === globalIndex) {
    dropTargetState.value = null;
    return;
  }
  const target = event.currentTarget as HTMLElement | null;
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const relY = event.clientY - rect.top;
  const position = relY < rect.height / 2 ? 'top' : 'bottom';
  dropTargetState.value = { globalIndex, position };
};

const handleDragLeave = (event: DragEvent) => {
  const related = event.relatedTarget as HTMLElement | null;
  const current = event.currentTarget as HTMLElement | null;
  if (current && related && current.contains(related)) return;
  dropTargetState.value = null;
};

const handleDrop = (targetGlobalIndex: number) => {
  if (draggedGlobalIndex.value !== null && dropTargetState.value) {
    const fromIdx = draggedGlobalIndex.value;
    let toIdx = targetGlobalIndex;
    if (dropTargetState.value.position === 'bottom') {
      toIdx = fromIdx < toIdx ? toIdx : toIdx + 1;
    } else {
      toIdx = fromIdx < toIdx ? toIdx - 1 : toIdx;
    }
    toIdx = Math.max(0, Math.min(toIdx, allQueueItems.value.length - 1));
    if (fromIdx !== toIdx) {
      playerStore.moveInQueue(fromIdx, toIdx);
      queueStore.hasReordered = true;
    }
  }
  draggedGlobalIndex.value = null;
  dropTargetState.value = null;
};

const handleDragEnd = () => {
  draggedGlobalIndex.value = null;
  dropTargetState.value = null;
};

// Scroll and "Return to playing" pill
const scrollContainerRef = ref<HTMLElement | null>(null);
const currentSongRef = ref<HTMLElement | null>(null);
const showReturnPill = ref(false);

const handleScroll = () => {
  if (!scrollContainerRef.value || !currentSongRef.value) {
    showReturnPill.value = false;
    return;
  }
  const containerRect = scrollContainerRef.value.getBoundingClientRect();
  const currentRect = currentSongRef.value.getBoundingClientRect();

  const isOutOfView =
    currentRect.bottom < containerRect.top - 20 || currentRect.top > containerRect.bottom + 20;

  showReturnPill.value = isOutOfView;
};

const scrollToCurrentSong = (smooth = true) => {
  nextTick(() => {
    if (currentSongRef.value && scrollContainerRef.value) {
      currentSongRef.value.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'center'
      });
      showReturnPill.value = false;
    }
  });
};

const pinnedIds = ref<Array<string | number>>([]);
const isPinned = (song: SongResult) => pinnedIds.value.includes(song.id);
const togglePin = (song: SongResult) => {
  const sid = song.id;
  if (isPinned(song)) {
    pinnedIds.value = pinnedIds.value.filter((id) => id !== sid);
    message.info('Unpinned track');
  } else {
    pinnedIds.value.push(sid);
    message.success('Pinned track');
  }
};

const showContextMenu = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const activeContextSong = ref<SongResult | null>(null);
const userPlaylists = ref<any[]>([]);

const loadUserPlaylists = async () => {
  try {
    if (window.api?.dbGetAllPlaylists) {
      const res = await window.api.dbGetAllPlaylists();
      userPlaylists.value = Array.isArray(res) ? res : [];
    }
  } catch (err) {
    console.error('Failed to load user playlists:', err);
  }
};

const openContextMenu = (event: MouseEvent, song: SongResult, _globalIndex: number) => {
  const menuHeight = 360;
  const menuWidth = 188;
  const submenuWidth = 188;
  const padding = 8;

  let x = event.clientX;
  let y = event.clientY;

  const maxX = Math.max(padding, window.innerWidth - menuWidth - submenuWidth - padding);
  const maxY = Math.max(padding, window.innerHeight - menuHeight - padding);

  x = Math.min(Math.max(padding, x), maxX);
  y = Math.min(Math.max(padding, y), maxY);

  const color = song.primaryColor || playerStore.playMusic?.primaryColor;
  if (color) {
    document.documentElement.style.setProperty('--current-album-color', color);
  }

  activeContextSong.value = song;
  contextMenuX.value = x;
  contextMenuY.value = y;
  showContextMenu.value = true;
};

const openContextMenuFromBtn = (event: MouseEvent, song: SongResult, _globalIndex: number) => {
  const target = event.currentTarget as HTMLElement | null;
  const menuHeight = 360;
  const menuWidth = 188;
  const submenuWidth = 188;
  const padding = 8;

  let x = event.clientX;
  let y = event.clientY;

  if (target) {
    const rect = target.getBoundingClientRect();
    x = rect.right - menuWidth;
    y = rect.bottom + 4;
  }

  const maxX = Math.max(padding, window.innerWidth - menuWidth - submenuWidth - padding);
  const maxY = Math.max(padding, window.innerHeight - menuHeight - padding);

  x = Math.min(Math.max(padding, x), maxX);
  y = Math.min(Math.max(padding, y), maxY);

  const color = song.primaryColor || playerStore.playMusic?.primaryColor;
  if (color) {
    document.documentElement.style.setProperty('--current-album-color', color);
  }

  activeContextSong.value = song;
  contextMenuX.value = x;
  contextMenuY.value = y;
  showContextMenu.value = true;
};

const contextMenuOptions = computed<DropdownOption[]>(() => {
  if (!activeContextSong.value) return [];
  const song = activeContextSong.value;
  const isFav = playerStore.favoriteIds.includes(song.id);
  const pinned = isPinned(song);

  const playlistChildren: DropdownOption[] = [
    {
      label: 'New playlist',
      key: 'create-playlist',
      icon: () => h('i', { class: 'ri-add-line' })
    },
    { type: 'divider', key: 'div-sub-pl' }
  ];

  if (userPlaylists.value.length > 0) {
    userPlaylists.value.forEach((pl: any) => {
      playlistChildren.push({
        label: pl.name || 'Untitled Playlist',
        key: `playlist:${pl.id}`,
        icon: () => h('i', { class: 'ri-play-list-line' })
      });
    });
  } else {
    playlistChildren.push({
      label: 'No playlists',
      key: 'no-playlists',
      disabled: true
    });
  }

  return [
    {
      label: 'Add to playlist',
      key: 'add-to-playlist',
      icon: () => h('i', { class: 'ri-add-box-line' }),
      children: playlistChildren
    },
    {
      label: isFav ? 'Remove from Favorites' : 'Add to Favorites',
      key: 'toggle-favorite',
      icon: () =>
        h('i', {
          class: isFav ? 'ri-heart-fill text-red-500' : 'ri-heart-line'
        })
    },
    { type: 'divider', key: 'div-1' },
    {
      label: 'Play next',
      key: 'play-next',
      icon: () => h('i', { class: 'ri-play-list-add-line' })
    },
    {
      label: 'Add to queue',
      key: 'add-to-queue',
      icon: () => h('i', { class: 'ri-play-list-2-line' })
    },
    {
      label: 'Play last',
      key: 'play-last',
      icon: () => h('i', { class: 'ri-list-check-2' })
    },
    {
      label: 'Go to song radio',
      key: 'start-radio',
      icon: () => h('i', { class: 'ri-broadcast-line' })
    },
    { type: 'divider', key: 'div-2' },
    {
      label: 'Go to album',
      key: 'go-album',
      icon: () => h('i', { class: 'ri-disc-line' })
    },
    {
      label: 'Go to artist',
      key: 'go-artist',
      icon: () => h('i', { class: 'ri-user-line' })
    },
    { type: 'divider', key: 'div-3' },
    {
      label: 'View details',
      key: 'song-info',
      icon: () => h('i', { class: 'ri-information-line' })
    },
    {
      label: 'Copy link',
      key: 'copy-link',
      icon: () => h('i', { class: 'ri-link' })
    },
    { type: 'divider', key: 'div-4' },
    {
      label: pinned ? 'Unpin' : 'Pin',
      key: 'pin',
      icon: () =>
        h('i', {
          class: pinned ? 'ri-pushpin-2-fill text-primary' : 'ri-pushpin-2-line'
        })
    }
  ];
});

const handleContextMenuSelect = async (key: string | number) => {
  showContextMenu.value = false;
  if (!activeContextSong.value) return;
  const song = activeContextSong.value;

  if (key === 'create-playlist') {
    const playlistName = ref('');
    dialog.create({
      title: 'New Playlist',
      content: () =>
        h('div', { class: 'pt-2' }, [
          h(NInput, {
            value: playlistName.value,
            placeholder: 'Playlist title',
            autofocus: true,
            'onUpdate:value': (val: string) => {
              playlistName.value = val;
            }
          })
        ]),
      positiveText: 'Create',
      negativeText: 'Cancel',
      style: { borderRadius: '16px', maxWidth: '340px' },
      onPositiveClick: async () => {
        const name = playlistName.value.trim();
        if (!name) {
          message.warning('Please enter a playlist title');
          return;
        }
        try {
          const id = Date.now().toString();
          if (window.api?.dbStorePlaylist) {
            await window.api.dbStorePlaylist(id, name, '');
            if (window.api?.dbAddTrackToPlaylist) {
              await window.api.dbAddTrackToPlaylist(id, String(song.id), 0);
            }
            message.success(`Created "${name}" and added track`);
            await loadUserPlaylists();
          } else {
            message.info('Playlists are available in desktop mode');
          }
        } catch (err) {
          console.error('Failed to create playlist:', err);
          message.error('Failed to create playlist');
        }
      }
    });
  } else if (key === 'play-next') {
    playerStore.addToNextPlay(song);
    message.success('Added to play next');
  } else if (key === 'add-to-queue') {
    playerStore.addToQueue(song);
    message.success('Added to queue');
  } else if (key === 'play-last') {
    playerStore.addToQueue(song);
    message.success('Added to end of queue');
  } else if (key === 'start-radio') {
    if (settingsStore.setData) {
      settingsStore.setData.autoLoadMore = true;
    }
    message.success(`Started radio from "${song.name}"`);
  } else if (typeof key === 'string' && key.startsWith('playlist:')) {
    const playlistId = key.replace('playlist:', '');
    try {
      if (window.api?.dbAddTrackToPlaylist) {
        await window.api.dbAddTrackToPlaylist(playlistId, String(song.id), 0);
        const pl = userPlaylists.value.find((p) => String(p.id) === String(playlistId));
        message.success(`Added to ${pl?.name || 'playlist'}`);
      } else {
        message.info('Playlists are only supported in desktop mode');
      }
    } catch (err) {
      console.error('Failed to add track to playlist:', err);
      message.error('Failed to add track to playlist');
    }
  } else if (key === 'toggle-favorite') {
    const isFav = playerStore.favoriteIds.includes(song.id);
    if (isFav) {
      playerStore.removeFromFavorite(song.id);
      message.info('Removed from favorites');
    } else {
      playerStore.addToFavorite(song);
      message.success('Added to favorites');
    }
  } else if (key === 'go-album') {
    goToAlbum(song);
  } else if (key === 'go-artist') {
    const artists = getItemArtists(song);
    if (artists.length > 0) {
      goToArtist(artists[0]);
    }
  } else if (key === 'song-info') {
    const artists =
      getItemArtists(song)
        .map((a) => a.name)
        .join(', ') || 'Unknown';
    const album = (song as any).al?.name || (song as any).album || 'Unknown';
    const durationStr = secondToMinute(
      (song.dt || song.duration || 0) / (song.dt && song.dt > 10000 ? 1000 : 1)
    );

    dialog.info({
      title: 'Song Details',
      content: () =>
        h(
          'div',
          { class: 'flex flex-col gap-2 pt-2 text-xs text-neutral-600 dark:text-neutral-300' },
          [
            h('div', [h('strong', 'Title: '), song.name || 'Unknown']),
            h('div', [h('strong', 'Artist: '), artists]),
            h('div', [h('strong', 'Album: '), album]),
            h('div', [h('strong', 'Duration: '), durationStr]),
            h('div', [h('strong', 'Source: '), song.source || 'default']),
            h('div', [h('strong', 'ID: '), String(song.id)])
          ]
        ),
      positiveText: 'Close',
      style: { borderRadius: '16px', maxWidth: '340px' }
    });
  } else if (key === 'copy-link') {
    const link =
      song.playMusicUrl ||
      (song.id && String(song.id).length === 11
        ? `https://music.youtube.com/watch?v=${song.id}`
        : `${song.name} - ${getItemArtists(song)
            .map((a) => a.name)
            .join(', ')}`);
    navigator.clipboard.writeText(link);
    message.success('Copied link');
  } else if (key === 'pin') {
    togglePin(song);
  } else if (key === 'remove') {
    handleDeleteSong(song);
    message.info('Removed from queue');
  }
};

const closePanel = () => {
  show.value = false;
  if (isShellLayout.value) {
    playerStore.asideOpen = false;
  }
};

const show = computed({
  get: () => playerStore.queueVisible,
  set: (value) => {
    playerStore.setQueueVisible(value);
  }
});

let shellCloseTimeout: any = null;

watch(
  show,
  (newValue) => {
    if (shellCloseTimeout) {
      clearTimeout(shellCloseTimeout);
      shellCloseTimeout = null;
    }

    if (newValue) {
      internalVisible.value = true;
      closing.value = false;
      scrollToCurrentSong(false);
      loadUserPlaylists();
    } else {
      if (!internalVisible.value) return;
      closing.value = true;

      if (isShellLayout.value) {
        shellCloseTimeout = setTimeout(() => {
          internalVisible.value = false;
          closing.value = false;
        }, 350);
      }
    }
  },
  { immediate: true }
);

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && internalVisible.value) closePanel();
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  loadUserPlaylists();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

const onAnimationEnd = (event?: AnimationEvent) => {
  if (event && event.target !== event.currentTarget) return;
  if (closing.value) {
    internalVisible.value = false;
    closing.value = false;
  } else if (internalVisible.value) {
    scrollToCurrentSong(false);
  }
};

watch(
  () => currentSong.value?.id,
  (newId, oldId) => {
    if (newId && newId !== oldId && internalVisible.value) {
      scrollToCurrentSong(true);
    }
  }
);

watch(
  () => playerStore.queueIndex,
  (newIdx, oldIdx) => {
    if (newIdx !== oldIdx && internalVisible.value) {
      scrollToCurrentSong(true);
    }
  }
);
</script>

<style lang="scss" scoped>
.fixed-overlay {
  @apply fixed inset-0;
  pointer-events: auto;
  cursor: default;
  z-index: 9999998;
  display: v-bind('isShellLayout || isFullView ? "none" : "block"');
}

.queue-panel {
  @apply flex flex-col overflow-hidden;

  position: v-bind('isShellLayout ? "relative" : "fixed"');
  z-index: v-bind('isFullView ? "9999" : "var(--shell-z-queue, 15)"');
  right: v-bind('isShellLayout ? "auto" : isFullView ? "var(--shell-gap, 12px)" : "0"');
  top: v-bind('isShellLayout ? "auto" : isFullView ? "var(--shell-gap, 12px)" : "0"');
  bottom: v-bind('isShellLayout ? "auto" : isFullView ? "var(--shell-gap, 12px)" : "0"');
  width: v-bind('isShellLayout ? "100%" : "clamp(254px, 20vw, 360px)"');
  height: v-bind(
    'isShellLayout ? "100%" : isFullView ? "calc(100vh - calc(var(--shell-gap, 12px) * 2))" : "100vh"'
  );
  left: auto;
  flex-shrink: 0;

  background: v-bind('queueBackground');
  backdrop-filter: v-bind('isFullView ? "blur(30px) saturate(160%)" : "none"');
  -webkit-backdrop-filter: v-bind('isFullView ? "blur(30px) saturate(160%)" : "none"');
  border: v-bind(
    'isFullView ? (isDarkTheme ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)") : "none"'
  );
  border-radius: v-bind('isShellLayout || isFullView ? "var(--shell-radius)" : "0"');
  margin: 0;
  box-shadow: v-bind(
    'isShellLayout ? "none" : isFullView ? "0 12px 32px rgba(0, 0, 0, 0.12)" : "-4px 0 24px rgba(0, 0, 0, 0.15)"'
  );
  transition: all 0.35s cubic-bezier(0.25, 1, 0.5, 1);
  will-change: transform, opacity;
  backface-visibility: hidden;

  &.animate__slideInRight,
  &.animate__slideOutRight {
    animation-duration: 0.35s !important;
    animation-timing-function: cubic-bezier(0.25, 1, 0.5, 1) !important;
  }
}

.panel-header {
  @apply flex items-center justify-between px-3 py-2 flex-shrink-0;
  height: 42px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);

  .queue-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(140, 140, 140, 0.95);
  }

  .header-actions {
    @apply flex items-center gap-1.5;
  }

  .header-icon-btn {
    @apply w-7 h-7 flex items-center justify-center rounded-full cursor-pointer transition-colors border-0 bg-transparent;
    color: rgba(140, 140, 140, 0.9);

    &:hover {
      @apply bg-black/5 dark:bg-white/10;
      color: rgba(60, 60, 60, 1);
      .dark & {
        color: rgba(240, 240, 240, 1);
      }
    }

    &.close-btn {
      font-size: 16px;
    }

    i {
      font-size: 15px;
    }
  }

  .header-text-btn {
    @apply px-2 py-0.5 rounded text-[11px] font-semibold transition-all border-0 bg-transparent cursor-pointer;
    color: rgba(130, 130, 130, 0.9);

    &:hover:not(.is-disabled) {
      @apply bg-black/5 dark:bg-white/10;
      color: var(--accent);
    }

    &.is-disabled {
      opacity: 0.35;
      cursor: not-allowed;
      pointer-events: none;
    }
  }
}

.panel-body {
  @apply flex flex-col flex-1 overflow-hidden;
}

.queue-scroll {
  @apply flex-1 overflow-y-auto px-2 py-1.5;
  scrollbar-width: thin;
  scrollbar-color: rgba(128, 128, 128, 0.2) transparent;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(128, 128, 128, 0.2);
    border-radius: 4px;
  }
}

.queue-section {
  @apply mb-2;

  &.is-history {
    opacity: 0.65;
    transition: opacity 0.2s ease;
    &:hover {
      opacity: 0.95;
    }
  }
}

.queue-section-header {
  @apply flex items-center justify-between px-2 pt-2.5 pb-1 select-none;

  .queue-section-label {
    font-size: 11px !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.06em !important;
    color: rgba(140, 140, 140, 0.9) !important;
    line-height: 1.2 !important;
  }

  .origin-dot {
    opacity: 0.4;
    font-weight: 400;
  }

  .origin-link {
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    text-transform: none;
    letter-spacing: normal;
    color: var(--accent);
    max-width: 140px;

    &:hover {
      text-decoration: underline;
    }
  }
}

.queue-item {
  @apply relative flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-150 select-none;
  min-height: 48px;
  border: 1px solid transparent;

  &:hover {
    @apply bg-black/5 dark:bg-white/5;

    .item-actions {
      opacity: 1;
      pointer-events: auto;
    }

    .item-art .item-hover-scrim {
      opacity: 1;
    }
  }

  &.is-history {
    opacity: 0.6;
    &:hover {
      opacity: 0.95;
    }
  }

  // Drop target indicators
  &.drop-target-top::before {
    content: '';
    position: absolute;
    top: -2px;
    left: 8px;
    right: 8px;
    height: 2px;
    background: var(--accent);
    border-radius: 2px;
    box-shadow: 0 0 6px var(--accent);
    z-index: 10;
  }

  &.drop-target-bottom::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 8px;
    right: 8px;
    height: 2px;
    background: var(--accent);
    border-radius: 2px;
    box-shadow: 0 0 6px var(--accent);
    z-index: 10;
  }

  .item-art {
    @apply relative flex-shrink-0 cursor-pointer overflow-hidden;
    width: 38px;
    height: 38px;
    border-radius: 6px;

    .item-img {
      @apply w-full h-full object-cover;
      border-radius: 6px;
      :deep(img) {
        border-radius: 6px;
        @apply w-full h-full object-cover;
      }
    }

    .item-playing-badge {
      @apply absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white;
      i {
        font-size: 10px;
      }
    }

    .item-hover-scrim {
      @apply absolute inset-0 flex items-center justify-center text-white opacity-0 transition-opacity;
      background: rgba(0, 0, 0, 0.45);
      border-radius: 6px;

      i {
        font-size: 16px;
      }
    }
  }

  .item-info {
    @apply flex flex-col min-w-0 flex-1 justify-center;

    .item-title-row {
      @apply flex items-center gap-1.5 min-w-0;
    }

    .item-title {
      @apply text-[13px] font-medium truncate;
      line-height: 1.25;
    }

    .explicit-badge {
      @apply flex-shrink-0 text-[9px] font-bold px-1 py-[1px] rounded leading-tight uppercase;
      background: rgba(140, 140, 140, 0.2);
      color: rgba(120, 120, 120, 0.95);
      .dark & {
        background: rgba(255, 255, 255, 0.15);
        color: rgba(220, 220, 220, 0.9);
      }
    }

    .item-artist {
      @apply text-[11px] truncate mt-0.5 opacity-65;
      line-height: 1.2;

      .artist-name {
        cursor: pointer;
        &:hover {
          text-decoration: underline;
          opacity: 1;
        }
      }
    }
  }

  .item-actions {
    @apply flex items-center gap-0.5 flex-shrink-0 opacity-0 transition-opacity;
    pointer-events: none;

    .item-action-btn {
      @apply w-7 h-7 flex items-center justify-center rounded-full cursor-pointer transition-colors border-0 bg-transparent;
      color: rgba(140, 140, 140, 0.9);

      &:hover {
        @apply bg-black/10 dark:bg-white/10;
        color: rgba(40, 40, 40, 1);
        .dark & {
          color: rgba(255, 255, 255, 1);
        }
      }

      &.delete-btn:hover {
        @apply text-red-500 bg-red-500/10;
      }

      i {
        font-size: 15px;
      }
    }
  }
}

.floating-return-pill {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  background: color-mix(in srgb, var(--accent) 88%, #000 12%);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1);
  z-index: 20;

  &:hover {
    transform: translateX(-50%) translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  }

  i {
    font-size: 12px;
  }
}

.empty-queue {
  @apply flex flex-col items-center justify-center flex-1 py-16 text-gray-400 dark:text-gray-500 select-none;

  i {
    font-size: 40px;
    @apply mb-2 opacity-50;
  }
  p {
    @apply text-xs font-medium tracking-wide uppercase;
  }
}

@media (max-width: 768px) {
  .queue-panel:not([data-shell-layout]) {
    position: fixed;
    width: 100%;
    height: 80vh;
    top: auto;
    bottom: 0;
    border-radius: 20px 20px 0 0;
    border-left: none;
  }
}
</style>
