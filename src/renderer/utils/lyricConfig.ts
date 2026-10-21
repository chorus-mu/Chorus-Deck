import { DEFAULT_LYRIC_CONFIG, LyricConfig } from '@/types/lyric';

export const LYRIC_CONFIG_STORAGE_KEY = 'music-full-config';

export const LYRIC_CONFIG_CHANGE_EVENT = 'music-full-config-change';

export const readLyricConfig = (): LyricConfig => {
  try {
    const savedConfig = localStorage.getItem(LYRIC_CONFIG_STORAGE_KEY);
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      if (parsed.lyricsAnimationStyle !== 'chorus_bouncy') {
        parsed.lyricsAnimationStyle = 'fluid_motion';
      }
      if (!parsed.lyricGranularity) {
        parsed.lyricGranularity = 'karaoke';
      }
      return { ...DEFAULT_LYRIC_CONFIG, ...parsed };
    }
  } catch (error) {
    console.error('Failed to read lyrics configuration:', error);
  }
  return { ...DEFAULT_LYRIC_CONFIG };
};

export const writeLyricConfig = (config: LyricConfig): void => {
  localStorage.setItem(LYRIC_CONFIG_STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent(LYRIC_CONFIG_CHANGE_EVENT));
};
