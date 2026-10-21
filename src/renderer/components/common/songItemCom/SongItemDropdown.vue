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

import { normalizeArtistList } from '@/hooks/MusicHook';
import { usePlayerStore } from '@/store/modules/player';
import { useQueueStore } from '@/store/modules/queue';
import { useSettingsStore } from '@/store/modules/settings';
import type { SongResult } from '@/types/music';
import { isDesktop, secondToMinute } from '@/utils';

const props = defineProps<{
  item: SongResult;
  show: boolean;
  x: number;
  y: number;
  isFavorite: boolean;
  isDislike?: boolean;
  canRemove?: boolean;
  isQueue?: boolean;
  isPlaylist?: boolean;
  removeLabel?: string;
}>();

const emits = defineEmits([
  'update:show',
  'select',
  'play',
  'play-next',
  'toggle-favorite',
  'toggle-dislike',
  'remove'
]);

const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const playerStore = usePlayerStore();
const queueStore = useQueueStore();
const settingsStore = useSettingsStore();

const userPlaylists = ref<any[]>([]);
const pinnedIds = ref<Array<string | number>>([]);

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

const isPinned = computed(() => pinnedIds.value.includes(props.item.id));

const togglePin = () => {
  const sid = props.item.id;
  if (isPinned.value) {
    pinnedIds.value = pinnedIds.value.filter((id) => id !== sid);
    message.info('Unpinned track');
  } else {
    pinnedIds.value.push(sid);
    message.success('Pinned track');
  }
};

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
  },
  { immediate: true }
);

const isLocalSong = computed(
  () =>
    typeof props.item.playMusicUrl === 'string' && props.item.playMusicUrl.startsWith('local://')
);

const getItemArtists = (item: any) => {
  const album = typeof item?.album === 'string' ? item.album : item?.al?.name;
  return normalizeArtistList(item?.ar || item?.artists || [], album);
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

const dropdownOptions = computed<DropdownOption[]>(() => {
  const song = props.item;
  if (!song) return [];

  const isFav = props.isFavorite || playerStore.favoriteIds.includes(song.id);
  const pinned = isPinned.value;

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

  const artists = getItemArtists(song);
  const artistItem: DropdownOption =
    artists.length > 1
      ? {
          label: 'Go to artist',
          key: 'go-artist-menu',
          icon: () => h('i', { class: 'ri-user-line' }),
          children: artists.map((art) => ({
            label: art.name,
            key: `artist:${art.id || art.name}`
          }))
        }
      : {
          label: 'Go to artist',
          key: 'go-artist',
          icon: () => h('i', { class: 'ri-user-line' })
        };

  const options: DropdownOption[] = [
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
    artistItem,
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

  if (props.isPlaylist || (props.canRemove && props.removeLabel)) {
    options.push({
      label:
        props.removeLabel || (isLocalSong.value ? 'Remove from Library' : 'Remove from Playlist'),
      key: 'remove',
      icon: () => h('i', { class: 'ri-delete-bin-line text-red-500' }),
      props: {
        style: 'color: #ef4444;'
      }
    });
  }

  return options;
});

const handleSelect = async (key: string | number) => {
  emits('update:show', false);
  const song = props.item;
  if (!song) return;

  if (key === 'play') {
    emits('play');
  } else if (key === 'create-playlist') {
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
    emits('play-next');
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
    emits('toggle-favorite');
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
  } else if (typeof key === 'string' && key.startsWith('artist:')) {
    const artistKey = key.replace('artist:', '');
    const artists = getItemArtists(song);
    const targetArtist = artists.find(
      (a) => String(a.id) === artistKey || String(a.name) === artistKey
    );
    if (targetArtist) {
      goToArtist(targetArtist);
    } else {
      goToArtist({ name: artistKey });
    }
  } else if (key === 'song-info') {
    const artists =
      getItemArtists(song)
        .map((a) => a.name)
        .join(', ') || 'Unknown';
    const album = (song as any).al?.name || (song as any).album || 'Unknown';
    const durationStr = secondToMinute(
      (song.dt || (song as any).duration || 0) / (song.dt && song.dt > 10000 ? 1000 : 1)
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
            h('div', [h('strong', 'Source: '), (song as any).source || 'default']),
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
    togglePin();
  } else if (key === 'remove') {
    emits('remove', song.id);
  }
};
</script>
