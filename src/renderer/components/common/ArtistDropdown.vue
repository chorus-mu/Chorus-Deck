<template>
  <n-dropdown
    v-if="isDesktop()"
    :show="show"
    :x="clampedX"
    :y="clampedY"
    :options="dropdownOptions"
    :scrollable="false"
    :z-index="99999999"
    placement="bottom-start"
    :flip="false"
    @clickoutside="$emit('update:show', false)"
    @select="handleSelect"
  />
</template>

<script lang="ts" setup>
import type { DropdownOption } from 'naive-ui';
import { NDropdown, useMessage } from 'naive-ui';
import { computed, h, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { getYTMArtist } from '@/api/ytmusic';
import { usePlayerStore } from '@/store/modules/player';
import { useQueueStore } from '@/store/modules/queue';
import type { SongResult } from '@/types/music';
import { isDesktop } from '@/utils';

export interface ArtistItemData {
  id: string | number;
  name: string;
  picUrl?: string;
  primaryColor?: string;
}

const props = defineProps<{
  show: boolean;
  x: number;
  y: number;
  artist: ArtistItemData | null;
}>();

const emit = defineEmits(['update:show']);

const router = useRouter();
const message = useMessage();
const playerStore = usePlayerStore();
const queueStore = useQueueStore();

const pinnedIds = ref<Array<string | number>>([]);
const favoriteArtistIds = ref<Array<string | number>>([]);

const isPinned = computed(() => (props.artist ? pinnedIds.value.includes(props.artist.id) : false));
const isFavorite = computed(() =>
  props.artist ? favoriteArtistIds.value.includes(props.artist.id) : false
);

watch(
  () => props.show,
  (val) => {
    if (val) {
      const color = props.artist?.primaryColor || playerStore.playMusic?.primaryColor;
      if (color) {
        document.documentElement.style.setProperty('--current-album-color', color);
      }
    }
  }
);

const clampedX = computed(() => {
  const menuWidth = 188;
  const padding = 8;
  const maxX = Math.max(padding, window.innerWidth - menuWidth - padding);
  return Math.min(Math.max(padding, props.x), maxX);
});

const clampedY = computed(() => {
  const menuHeight = 360;
  const padding = 8;
  const maxY = Math.max(padding, window.innerHeight - menuHeight - padding);
  return Math.min(Math.max(padding, props.y), maxY);
});

const dropdownOptions = computed<DropdownOption[]>(() => {
  if (!props.artist) return [];

  const pinned = isPinned.value;
  const fav = isFavorite.value;

  return [
    {
      label: 'Go to artist',
      key: 'go-artist',
      icon: () => h('i', { class: 'ri-information-line' })
    },
    { type: 'divider', key: 'div-1' },
    {
      label: 'Play artist',
      key: 'play-artist',
      icon: () => h('i', { class: 'ri-play-line' })
    },
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
    { type: 'divider', key: 'div-2' },
    {
      label: fav ? 'Remove from Favorites' : 'Add to Favorites',
      key: 'toggle-favorite',
      icon: () =>
        h('i', {
          class: fav ? 'ri-heart-fill text-red-500' : 'ri-heart-line'
        })
    },
    { type: 'divider', key: 'div-3' },
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

const fetchArtistSongs = async (id: string | number): Promise<SongResult[]> => {
  try {
    const res = await getYTMArtist(String(id));
    if (res?.songs?.length) {
      return res.songs.map((s: any) => ({
        id: s.id,
        name: s.title,
        picUrl:
          s.thumbnail ||
          (s.id && String(s.id).length === 11 && !String(s.id).includes('/')
            ? `https://i.ytimg.com/vi/${s.id}/hqdefault.jpg`
            : ''),
        source: 'ytmusic',
        artists:
          s.artists && s.artists.length > 0
            ? s.artists.map((a: any) => ({ name: a.name }))
            : [{ name: props.artist?.name || 'Unknown' }],
        album: s.album
      }));
    }
  } catch (err) {
    console.error('Failed to fetch artist songs:', err);
  }
  return [];
};

const handleSelect = async (key: string) => {
  emit('update:show', false);
  if (!props.artist) return;

  const ar = props.artist;

  if (key === 'go-artist') {
    router.push({ path: '/artist', query: { id: ar.id } });
    return;
  }

  if (key === 'play-artist') {
    message.loading('Loading artist tracks...', { duration: 1500 });
    const songs = await fetchArtistSongs(ar.id);
    if (songs.length) {
      playerStore.setQueue(songs, false, true);
      message.success(`Playing ${ar.name}`);
    } else {
      message.warning('No playable tracks found');
    }
    return;
  }

  if (key === 'play-next') {
    const songs = await fetchArtistSongs(ar.id);
    if (songs.length) {
      songs.forEach((s) => queueStore.addToNextPlay(s));
      message.success(`Added ${ar.name} to play next`);
    }
    return;
  }

  if (key === 'add-to-queue' || key === 'play-last') {
    const songs = await fetchArtistSongs(ar.id);
    if (songs.length) {
      songs.forEach((s) => queueStore.addToQueue(s));
      message.success(`Added ${ar.name} to queue`);
    }
    return;
  }

  if (key === 'toggle-favorite') {
    if (isFavorite.value) {
      favoriteArtistIds.value = favoriteArtistIds.value.filter((id) => id !== ar.id);
      message.info(`Removed ${ar.name} from Favorites`);
    } else {
      favoriteArtistIds.value.push(ar.id);
      message.success(`Added ${ar.name} to Favorites`);
    }
    return;
  }

  if (key === 'copy-link') {
    const link = `https://music.youtube.com/channel/${ar.id}`;
    try {
      await navigator.clipboard.writeText(link);
      message.success('Copied artist link to clipboard');
    } catch {
      message.error('Failed to copy link');
    }
    return;
  }

  if (key === 'pin') {
    if (isPinned.value) {
      pinnedIds.value = pinnedIds.value.filter((id) => id !== ar.id);
      message.info(`Unpinned ${ar.name}`);
    } else {
      pinnedIds.value.push(ar.id);
      message.success(`Pinned ${ar.name}`);
    }
  }
};
</script>
