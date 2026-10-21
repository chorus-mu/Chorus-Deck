<template>
  <div class="flex flex-col gap-6">
    <setting-section title="Audio Quality Mode">
      <setting-item
        icon="ri-sound-module-line"
        title="Streaming Source & Quality"
        description="Choose between pure YouTube high-quality streaming or lossless audio"
      >
        <template #action>
          <div class="flex items-center gap-2 max-md:w-full">
            <button
              type="button"
              class="px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer border"
              :class="
                (setData.audioQualityMode || 'opus') === 'opus'
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-neutral-200 dark:hover:bg-neutral-800'
              "
              @click="setData.audioQualityMode = 'opus'"
            >
              <i class="ri-youtube-line text-sm"></i>
              <span>Opus (YouTube HQ)</span>
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer border"
              :class="
                setData.audioQualityMode === 'lossless'
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-neutral-200 dark:hover:bg-neutral-800'
              "
              @click="setData.audioQualityMode = 'lossless'"
            >
              <i class="ri-disc-line text-sm"></i>
              <span>Lossless (FLAC / Hi-Res)</span>
            </button>
          </div>
        </template>
      </setting-item>

      <div
        class="px-4 py-3 rounded-xl bg-neutral-100/70 dark:bg-neutral-900/40 text-xs text-neutral-500 dark:text-neutral-400 border border-black/5 dark:border-white/5"
      >
        <span v-if="(setData.audioQualityMode || 'opus') === 'opus'">
          <strong class="text-neutral-800 dark:text-neutral-200">Opus Mode:</strong> Pure YouTube
          high-quality music. Fast, instant fetching with local-play responsiveness and 100% stable
          continuous playback.
        </span>
        <span v-else>
          <strong class="text-neutral-800 dark:text-neutral-200">Lossless Mode:</strong> Pure, big,
          very high-quality music. Plays FLAC/ALAC from local lossless collections and verified
          lossless sources (with automatic fallback to YouTube audio if unavailable).
        </span>
      </div>
    </setting-section>

    <setting-section title="Lyrics Settings">
      <setting-item
        icon="ri-text-spacing"
        title="Lyric Granularity"
        description="Choose sync mode: whole sentence/line, word-by-word, or syllable-by-syllable"
      >
        <template #action>
          <n-select
            v-model:value="setData.lyricGranularity"
            :options="lyricGranularityOptions"
            class="w-56 max-md:w-full"
          />
        </template>
      </setting-item>
      <setting-item
        icon="ri-film-line"
        title="Lyrics Animation Style"
        description="Select the transition physics and animation for lyric lines"
      >
        <template #action>
          <n-select
            v-model:value="setData.lyricsAnimationStyle"
            :options="lyricsAnimationOptions"
            class="w-56 max-md:w-full"
          />
        </template>
      </setting-item>

      <setting-item
        icon="ri-music-2-line"
        title="Preferred Lyric Provider"
        description="Priority provider for multi-source lyric searching"
      >
        <template #action>
          <n-select
            v-model:value="setData.preferredLyricProvider"
            :options="preferredProviderOptions"
            class="w-64 max-md:w-full"
          />
        </template>
      </setting-item>
      <setting-item
        icon="ri-align-left"
        title="Lyrics Position"
        description="Alignment of the lyrics text"
      >
        <template #action>
          <n-select
            v-model:value="setData.lyricsTextPosition"
            :options="lyricsPositionOptions"
            class="w-48 max-md:w-full"
          />
        </template>
      </setting-item>
      <setting-item
        icon="ri-font-size-2"
        title="Lyrics Text Size"
        description="Adjust the font size for lyrics"
      >
        <template #action>
          <div class="w-40 flex justify-end">
            <n-slider v-model:value="setData.lyricsTextSize" :min="16" :max="36" :step="1" />
          </div>
        </template>
      </setting-item>
      <setting-item
        icon="ri-line-height"
        title="Lyrics Line Spacing"
        description="Adjust the spacing between lines of lyrics"
      >
        <template #action>
          <div class="w-40 flex justify-end">
            <n-slider v-model:value="setData.lyricsLineSpacing" :min="1.0" :max="4.0" :step="0.1" />
          </div>
        </template>
      </setting-item>
      <setting-item
        icon="ri-cursor-line"
        title="Click to Seek"
        description="Click on a lyric line to seek to that position"
      >
        <n-switch v-model:value="setData.lyricsClick" />
      </setting-item>
      <setting-item
        icon="ri-scroll-to-bottom-line"
        title="Auto Scroll"
        description="Automatically scroll lyrics as the song plays"
      >
        <n-switch v-model:value="setData.lyricsScroll" />
      </setting-item>
      <setting-item
        icon="ri-sun-foggy-line"
        title="Glow Effect"
        description="Enable glow effect for the active lyric line"
      >
        <n-switch v-model:value="setData.lyricsGlowEffect" />
      </setting-item>
      <setting-item
        icon="ri-apple-line"
        title="Apple Music Blur Style"
        description="Use Apple Music style blur for lyrics background"
      >
        <n-switch v-model:value="setData.appleMusicLyricsBlur" />
      </setting-item>
      <setting-item
        icon="ri-blur-off-line"
        title="Standard Blur"
        description="Use standard blur for lyrics background"
      >
        <n-switch v-model:value="setData.lyricsStandardBlur" />
      </setting-item>
      <setting-item
        icon="ri-drag-move-line"
        title="Swipe Lyrics"
        description="Allow swiping on lyrics to change songs"
      >
        <n-switch v-model:value="setData.swipeLyrics" />
      </setting-item>
      <setting-item
        icon="ri-play-line"
        title="Show Play/Pause on Thumbnail"
        description="Show play/pause controls on the lyrics thumbnail"
      >
        <n-switch v-model:value="setData.enableLyricsThumbnailPlayPause" />
      </setting-item>
    </setting-section>

    <setting-section title="Dynamic Island">
      <setting-item
        icon="ri-layout-top-line"
        title="Enable Dynamic Island"
        description="Show dynamic content notch at the top of the screen"
      >
        <n-switch v-model:value="setData.dynamicIslandEnabled" />
      </setting-item>

      <setting-item
        icon="ri-eye-line"
        title="Dynamic Island Visibility"
        description="Select when to show the Dynamic Island"
      >
        <template #action>
          <n-switch
            v-model:value="setData.dynamicIslandVisibility"
            checked-value="permanent"
            unchecked-value="auto-hide"
            :disabled="!setData.dynamicIslandEnabled"
          >
            <template #checked>Permanent</template>
            <template #unchecked>Auto-hide</template>
          </n-switch>
        </template>
      </setting-item>
    </setting-section>

    <setting-section title="Playback Settings">
      <setting-item
        icon="ri-hq-line"
        title="Audio Quality"
        description="Select music playback quality (VIP)"
      >
        <s-select
          v-model="setData.musicQuality"
          :options="qualityOptions"
          width="w-40 max-md:w-full"
        />
      </setting-item>

      <setting-item
        v-if="platform === 'darwin'"
        icon="ri-layout-top-line"
        title="Show Status Bar"
        description="You can display the music control function in your mac status bar (effective after a restart)"
      >
        <n-switch v-model:value="setData.showTopAction">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        icon="ri-play-circle-line"
        title="Auto Play"
        description="Auto resume playback when reopening the app"
      >
        <n-switch v-model:value="setData.autoPlay">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        icon="ri-leaf-line"
        title="Pure Mode"
        description="Show only the cover and lyrics on the play page and hide the corner controls; you can turn it off here anytime"
      >
        <n-switch v-model:value="pureModeEnabled">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        icon="ri-save-line"
        title="Data Saver Mode (Beta)"
        description="Disable lyrics, videos, preloading, background syncs, and force Opus audio to save data."
      >
        <n-switch v-model:value="setData.dataSaverEnabled">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        icon="ri-menu-add-line"
        title="Crossfade"
        description="Fade out the current song and fade in the next song"
      >
        <n-switch v-model:value="setData.crossfadeEnabled">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        v-if="setData.crossfadeEnabled"
        icon="ri-timer-line"
        title="Crossfade Duration"
        description="Duration of the crossfade in seconds"
      >
        <div class="flex items-center gap-4">
          <n-slider
            v-model:value="setData.crossfadeDuration"
            :min="1"
            :max="15"
            :step="1"
            class="w-48"
          />
          <span>{{ setData.crossfadeDuration }}s</span>
        </div>
      </setting-item>

      <setting-item
        v-if="setData.crossfadeEnabled"
        icon="ri-skip-forward-mini-line"
        title="Crossfade Gapless"
        description="Skip silence at the end of the song before crossfading"
      >
        <n-switch v-model:value="setData.crossfadeGapless">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        v-if="setData.crossfadeEnabled"
        icon="ri-magic-line"
        title="Automix"
        description="Automatically determine crossfade points based on song structure"
      >
        <n-switch v-model:value="setData.automixCrossfade">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        v-if="setData.automixCrossfade"
        icon="ri-bug-line"
        title="Automix Debug Overlay"
        description="Show debug information for automix points"
      >
        <n-switch v-model:value="setData.automixDebugOverlay">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        icon="ri-volume-mute-line"
        title="Skip Silence"
        description="Automatically skip silence at the beginning and end of tracks"
      >
        <n-switch v-model:value="setData.skipSilence">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        v-if="setData.skipSilence"
        icon="ri-skip-forward-line"
        title="Skip Silence Instant"
        description="Skip silence instantly without fading"
      >
        <n-switch v-model:value="setData.skipSilenceInstant">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        icon="ri-equalizer-line"
        title="Audio Normalization"
        description="Normalize audio volume across tracks"
      >
        <n-switch v-model:value="setData.audioNormalization">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        icon="ri-cpu-line"
        title="Audio Offload"
        description="Offload audio processing to hardware when possible (disabled by crossfade)"
      >
        <n-switch v-model:value="setData.audioOffload" :disabled="setData.crossfadeEnabled">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        icon="ri-skip-forward-line"
        title="Preload Next Song"
        description="Cache the next song for gapless playback"
      >
        <n-switch v-model:value="setData.preloadNextSongEnabled">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        v-if="setData.preloadNextSongEnabled"
        icon="ri-list-settings-line"
        title="Preload Limit"
        description="Maximum number of songs to preload"
      >
        <div class="flex items-center gap-4">
          <n-slider
            v-model:value="setData.preloadNextSongLimit"
            :min="1"
            :max="10"
            :step="1"
            class="w-48"
          />
          <span>{{ setData.preloadNextSongLimit }}</span>
        </div>
      </setting-item>

      <setting-item
        v-if="setData.preloadNextSongEnabled"
        icon="ri-text-spacing"
        title="Preload Lyrics"
        description="Also cache lyrics for the preloaded songs"
      >
        <n-switch v-model:value="setData.preloadLyricsEnabled">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        icon="ri-forward-10-line"
        title="Seek Seconds Addup"
        description="Add up seek seconds when skipping"
      >
        <n-switch v-model:value="setData.seekExtraSeconds">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        icon="ri-file-copy-2-line"
        title="Similar Content"
        description="Show similar content and related artists"
      >
        <n-switch v-model:value="setData.similarContent">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        icon="ri-sun-line"
        title="Keep Screen On"
        description="Prevent device screen from turning off during playback"
      >
        <n-switch v-model:value="setData.keepScreenOn">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        icon="ri-volume-mute-fill"
        title="Pause On Mute"
        description="Automatically pause playback when volume is muted"
      >
        <n-switch v-model:value="setData.pauseOnMute">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        icon="ri-bluetooth-line"
        title="Resume On Bluetooth Connect"
        description="Automatically resume playback when connecting a bluetooth device"
      >
        <n-switch v-model:value="setData.resumeOnBluetoothConnect">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        icon="ri-cast-line"
        title="Enable Google Cast"
        description="Enable casting to Google Cast devices"
      >
        <n-switch v-model:value="setData.enableGoogleCast">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        icon="ri-error-warning-line"
        title="Auto Skip Next On Error"
        description="Automatically skip to the next track if a playback error occurs"
      >
        <n-switch v-model:value="setData.autoSkipNextOnError">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>
    </setting-section>

    <setting-section title="DSP Settings" class="mt-8">
      <setting-item
        icon="ri-surround-sound-line"
        title="Spatial Audio"
        description="Enable 3D spatial audio effect"
      >
        <n-switch v-model:value="setData.spatialAudioEnabled">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        v-if="setData.spatialAudioEnabled"
        icon="ri-equalizer-line"
        title="Spatial Audio Strength"
        description="Adjust the strength of spatial audio"
      >
        <div class="flex items-center gap-4">
          <n-slider
            v-model:value="setData.spatialAudioStrength"
            :min="0"
            :max="1"
            :step="0.1"
            class="w-48"
          />
          <span>{{ Math.round(setData.spatialAudioStrength * 100) }}%</span>
        </div>
      </setting-item>

      <setting-item
        icon="ri-exchange-line"
        title="Crossfeed"
        description="Blend left and right channels for a more natural headphone sound"
      >
        <n-switch v-model:value="setData.crossfeedEnabled">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item icon="ri-speaker-3-line" title="Bass Boost" description="Boost low frequencies">
        <div class="flex items-center gap-4">
          <n-slider
            v-model:value="setData.bassBoost"
            :min="0"
            :max="1000"
            :step="10"
            class="w-48"
          />
          <span>{{ setData.bassBoost }}</span>
        </div>
      </setting-item>

      <setting-item
        icon="ri-surround-sound-line"
        title="Virtualizer"
        description="Simulate surround sound"
      >
        <div class="flex items-center gap-4">
          <n-slider
            v-model:value="setData.virtualizer"
            :min="0"
            :max="1000"
            :step="10"
            class="w-48"
          />
          <span>{{ setData.virtualizer }}</span>
        </div>
      </setting-item>
    </setting-section>

    <setting-section title="Queue Settings" class="mt-8">
      <setting-item
        icon="ri-history-line"
        title="History Duration"
        description="How long to keep played tracks in history"
      >
        <div class="flex items-center gap-4">
          <n-slider
            v-model:value="setData.historyDuration"
            :min="1"
            :max="100"
            :step="1"
            class="w-48"
          />
          <span>{{ setData.historyDuration }}</span>
        </div>
      </setting-item>

      <setting-item
        icon="ri-save-3-line"
        title="Persistent Queue"
        description="Remember queue across restarts"
      >
        <n-switch v-model:value="setData.persistentQueue">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        icon="ri-arrow-down-circle-line"
        title="Auto Load More"
        description="Automatically load more tracks when queue is near end"
      >
        <n-switch v-model:value="setData.autoLoadMore">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        icon="ri-repeat-2-line"
        title="Disable Load More On Repeat All"
        description="Prevent auto load when queue repeat is set to all"
      >
        <n-switch v-model:value="setData.disableLoadMoreWhenRepeatAll">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        icon="ri-shuffle-line"
        title="Persistent Shuffle Across Queues"
        description="Remember the shuffle state when switching to a different queue"
      >
        <n-switch v-model:value="setData.persistentShuffleAcrossQueues">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        icon="ri-memory-line"
        title="Remember Shuffle and Repeat"
        description="Save the shuffle and repeat status on application exit"
      >
        <n-switch v-model:value="setData.rememberShuffleAndRepeat">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        icon="ri-shuffle-line"
        title="Shuffle Playlist First"
        description="Always shuffle playlist when playing it from the start"
      >
        <n-switch v-model:value="setData.shufflePlaylistFirst">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        icon="ri-file-copy-line"
        title="Prevent Duplicate Tracks in Queue"
        description="Avoid adding the same track twice to the playback queue"
      >
        <n-switch v-model:value="setData.preventDuplicateTracksInQueue">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>

      <setting-item
        icon="ri-stop-circle-line"
        title="Stop Music On Task Clear"
        description="Stop playback when clearing the app from recent tasks"
      >
        <n-switch v-model:value="setData.stopMusicOnTaskClear">
          <template #checked>On</template>
          <template #unchecked>Off</template>
        </n-switch>
      </setting-item>
    </setting-section>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { isDesktop } from '@/utils';
import { LYRIC_CONFIG_CHANGE_EVENT, readLyricConfig, writeLyricConfig } from '@/utils/lyricConfig';

import { SETTINGS_DATA_KEY } from '../keys';
import SBtn from '../SBtn.vue';
import SettingItem from '../SettingItem.vue';
import SettingSection from '../SettingSection.vue';
import SSelect from '../SSelect.vue';

const setData = inject(SETTINGS_DATA_KEY)!;
const platform = ref('web');

const pureModeEnabled = ref(readLyricConfig().pureModeEnabled);

const handleLyricConfigChange = () => {
  pureModeEnabled.value = readLyricConfig().pureModeEnabled;
};

onMounted(async () => {
  platform.value = (await window.api.invoke('get-platform')) || 'web';
  window.addEventListener(LYRIC_CONFIG_CHANGE_EVENT, handleLyricConfigChange);
});

onBeforeUnmount(() => {
  window.removeEventListener(LYRIC_CONFIG_CHANGE_EVENT, handleLyricConfigChange);
});

watch(pureModeEnabled, (value) => {
  writeLyricConfig({ ...readLyricConfig(), pureModeEnabled: value });
});

watch(
  () => (setData.value as any)?.dynamicIslandEnabled,
  (val) => {
    if (val) {
      window.api?.launchDynamicIsland?.().catch(() => {});
    }
  }
);

const qualityOptions = computed(() => [
  { label: 'Standard', value: 'standard' },
  { label: 'Higher', value: 'higher' },
  { label: 'Extreme', value: 'exhigh' },
  { label: 'Lossless', value: 'lossless' },
  { label: 'Hi-Res', value: 'hires' },
  { label: 'HD Surround', value: 'jyeffect' },
  { label: 'Immersive', value: 'sky' },
  { label: 'Dolby Atmos', value: 'dolby' },
  { label: 'Master', value: 'jymaster' }
]);

const lyricsPositionOptions = [
  { label: 'Left', value: 'LEFT' },
  { label: 'Center', value: 'CENTER' },
  { label: 'Right', value: 'RIGHT' }
];

const lyricGranularityOptions = [
  { label: 'Karaoke (Syllable-by-Syllable Sync)', value: 'karaoke' },
  { label: 'Phrase (Line-by-Line Sync)', value: 'phrase' }
];

const preferredProviderOptions = [
  { label: 'Auto (Smart Best Match)', value: 'auto' },
  { label: 'BetterLyrics (Word / Syllable synced)', value: 'betterlyrics' },
  { label: 'YouLyPlus (Rich Line & Word synced)', value: 'youlyplus' },
  { label: 'LrcLib (Open Line / Word synced)', value: 'lrclib' },
  { label: 'KuGou (Comprehensive Global & C-Pop)', value: 'kugou' },
  { label: 'Paxsenix (Musixmatch / Spotify Mirror)', value: 'paxsenix' },
  { label: 'SimpMusic (YouTube Music Syllables)', value: 'simpmusic' }
];

const lyricsAnimationOptions = [
  { label: 'Fluid Motion', value: 'fluid_motion' },
  { label: 'Chorus-Bouncy', value: 'chorus_bouncy' }
];

const dynamicIslandVisibilityOptions = [
  { label: 'Auto-hide', value: 'auto-hide' },
  { label: 'Permanent', value: 'permanent' }
];
</script>
