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
import { NDropdown, NInput, useDialog, useMessage } from 'naive-ui';
import { computed, h, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { toSongResult } from '@/api/providers/ytmusic';
import { getYTMPlaylistDetail } from '@/api/ytmusic';
import { usePlayerStore } from '@/store/modules/player';
import { useQueueStore } from '@/store/modules/queue';
import type { SongResult } from '@/types/music';
import { isDesktop } from '@/utils';

export interface AlbumPlaylistItemData {
  id: string | number;
  name: string;
  picUrl?: string;
  primaryColor?: string;
  _isAlbum?: boolean;
  isAlbum?: boolean;
}

const props = defineProps<{
  show: boolean;
  x: number;
  y: number;
  item: AlbumPlaylistItemData | null;
}>();

const emit = defineEmits(['update:show']);

const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const playerStore = usePlayerStore();
const queueStore = useQueueStore();

const userPlaylists = ref<any[]>([]);
const pinnedIds = ref<Array<string | number>>([]);
const favoriteIds = ref<Array<string | number>>([]);

const isPinned = computed(() => (props.item ? pinnedIds.value.includes(props.item.id) : false));
const isFavorite = computed(() => (props.item ? favoriteIds.value.includes(props.item.id) : false));

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

watch(
  () => props.show,
  (val) => {
    if (val) {
      loadUserPlaylists();
      const color = props.item?.primaryColor || playerStore.playMusic?.primaryColor;
      if (color) {
        document.documentElement.style.setProperty('--current-album-color', color);
      }
    }
  }
);

const clampedX = computed(() => {
  const menuWidth = 188;
  const submenuWidth = 188;
  const padding = 8;
  const maxX = Math.max(padding, window.innerWidth - menuWidth - submenuWidth - padding);
  return Math.min(Math.max(padding, props.x), maxX);
});

const clampedY = computed(() => {
  const menuHeight = 360;
  const padding = 8;
  const maxY = Math.max(padding, window.innerHeight - menuHeight - padding);
  return Math.min(Math.max(padding, props.y), maxY);
});

const dropdownOptions = computed<DropdownOption[]>(() => {
  if (!props.item) return [];

  const pinned = isPinned.value;
  const fav = isFavorite.value;

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
      label: fav ? 'Remove from Favorites' : 'Add to Favorites',
      key: 'toggle-favorite',
      icon: () =>
        h('i', {
          class: fav ? 'ri-heart-fill text-red-500' : 'ri-heart-line'
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
    { type: 'divider', key: 'div-2' },
    {
      label: 'Copy link',
      key: 'copy-link',
      icon: () => h('i', { class: 'ri-link' })
    },
    { type: 'divider', key: 'div-3' },
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

const fetchTracks = async (item: AlbumPlaylistItemData): Promise<SongResult[]> => {
  try {
    const res = await getYTMPlaylistDetail(String(item.id));
    if (res?.songs?.length) {
      return res.songs.map(toSongResult);
    }
  } catch (err) {
    console.error('Failed to fetch album/playlist tracks:', err);
  }
  return [];
};

const handleSelect = async (key: string) => {
  emit('update:show', false);
  if (!props.item) return;

  const it = props.item;

  if (key === 'create-playlist') {
    const playlistName = ref('');
    dialog.create({
      title: 'New Playlist',
      content: () =>
        h(NInput, {
          placeholder: 'Enter playlist title...',
          value: playlistName.value,
          autofocus: true,
          'onUpdate:value': (val: string) => {
            playlistName.value = val;
          }
        }),
      positiveText: 'Create',
      negativeText: 'Cancel',
      style: { borderRadius: '16px', maxWidth: '340px' },
      onPositiveClick: async () => {
        const name = playlistName.value.trim();
        if (!name) {
          message.warning('Please enter a playlist title');
          return false;
        }
        try {
          const id = Date.now().toString();
          if (window.api?.dbStorePlaylist) {
            await window.api.dbStorePlaylist(id, name, '');
            const tracks = await fetchTracks(it);
            if (window.api?.dbAddTrackToPlaylist) {
              for (let i = 0; i < tracks.length; i++) {
                await window.api.dbAddTrackToPlaylist(id, String(tracks[i].id), i);
              }
            }
            message.success(`Created "${name}" and added tracks`);
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
    return;
  }

  if (key.startsWith('playlist:')) {
    const plId = key.replace('playlist:', '');
    try {
      const tracks = await fetchTracks(it);
      if (tracks.length && window.api?.dbAddTrackToPlaylist) {
        for (let i = 0; i < tracks.length; i++) {
          await window.api.dbAddTrackToPlaylist(plId, String(tracks[i].id), i);
        }
        message.success(`Added ${tracks.length} tracks to playlist`);
      } else {
        message.warning('No tracks found to add');
      }
    } catch {
      message.error('Failed to add to playlist');
    }
    return;
  }

  if (key === 'play-next') {
    const tracks = await fetchTracks(it);
    if (tracks.length) {
      tracks.forEach((t) => queueStore.addToNextPlay(t));
      message.success(`Added ${it.name} to play next`);
    }
    return;
  }

  if (key === 'add-to-queue' || key === 'play-last') {
    const tracks = await fetchTracks(it);
    if (tracks.length) {
      tracks.forEach((t) => queueStore.addToQueue(t));
      message.success(`Added ${it.name} to queue`);
    }
    return;
  }

  if (key === 'toggle-favorite') {
    if (isFavorite.value) {
      favoriteIds.value = favoriteIds.value.filter((id) => id !== it.id);
      message.info(`Removed ${it.name} from Favorites`);
    } else {
      favoriteIds.value.push(it.id);
      message.success(`Added ${it.name} to Favorites`);
    }
    return;
  }

  if (key === 'copy-link') {
    const isAlbum = it._isAlbum || it.isAlbum;
    const link = `https://music.youtube.com/${isAlbum ? 'browse/' : 'playlist?list='}${it.id}`;
    try {
      await navigator.clipboard.writeText(link);
      message.success('Copied link to clipboard');
    } catch {
      message.error('Failed to copy link');
    }
    return;
  }

  if (key === 'pin') {
    if (isPinned.value) {
      pinnedIds.value = pinnedIds.value.filter((id) => id !== it.id);
      message.info(`Unpinned ${it.name}`);
    } else {
      pinnedIds.value.push(it.id);
      message.success(`Pinned ${it.name}`);
    }
  }
};
</script>
