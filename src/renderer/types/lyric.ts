export type LyricGranularity = 'auto' | 'sentence' | 'word' | 'syllable';

export type LyricAnimationStyle =
  | 'apple_spring'
  | 'smooth_fluid'
  | 'bouncy_pop'
  | 'carousel_3d'
  | 'cyberpunk_glow'
  | 'kinetic_slant'
  | 'minimal_fade'
  | 'chorusmusic_1';

export type LyricProviderPreference =
  | 'auto'
  | 'betterlyrics'
  | 'youlyplus'
  | 'lrclib'
  | 'kugou'
  | 'paxsenix'
  | 'simpmusic';

export interface LyricConfig {
  hideCover: boolean;
  centerLyrics: boolean;
  fontSize: number;
  letterSpacing: number;
  fontWeight: number;
  lineHeight: number;
  showTranslation: boolean;
  showRoma: boolean;
  theme: 'default' | 'light' | 'dark';
  hidePlayBar: boolean;
  translationEngine?: 'none' | 'opencc';
  pureModeEnabled: boolean;
  featherEdge: boolean;
  hideLyrics: boolean;
  focusCurrentLyric: boolean;
  contentWidth: number;

  lyricsTextPosition?: 'LEFT' | 'CENTER' | 'RIGHT';
  lyricsAnimationStyle?: LyricAnimationStyle | string;
  lyricGranularity?: LyricGranularity;
  preferredLyricProvider?: LyricProviderPreference;
  lyricsClick?: boolean;
  lyricsScroll?: boolean;
  lyricsGlowEffect?: boolean;
  appleMusicLyricsBlur?: boolean;

  compactLayout: 'default' | 'ios' | 'android';
  compactCoverStyle: 'record' | 'square' | 'full';
  compactShowLyricLines: number;

  useCustomBackground: boolean;
  backgroundMode: 'solid' | 'gradient' | 'image' | 'css';
  solidColor: string;
  gradientColors: {
    colors: string[];
    direction: string;
  };
  backgroundImage?: string;
  imageBlur: number;
  imageBrightness: number;
  customCss?: string;
}

export const DEFAULT_LYRIC_CONFIG: LyricConfig = {
  hideCover: false,
  centerLyrics: false,
  fontSize: 22,
  letterSpacing: 0,
  fontWeight: 700,
  lineHeight: 2,
  showTranslation: true,
  showRoma: true,
  theme: 'default',
  hidePlayBar: true,
  pureModeEnabled: false,
  featherEdge: true,
  hideLyrics: false,
  focusCurrentLyric: false,
  contentWidth: 75,

  lyricsTextPosition: 'LEFT',
  lyricsAnimationStyle: 'apple_spring',
  lyricGranularity: 'auto',
  preferredLyricProvider: 'auto',
  lyricsClick: true,
  lyricsScroll: true,
  lyricsGlowEffect: true,
  appleMusicLyricsBlur: true,

  compactLayout: 'ios',
  compactCoverStyle: 'full',
  compactShowLyricLines: 3,

  translationEngine: 'none',

  useCustomBackground: false,
  backgroundMode: 'solid',
  solidColor: '#1a1a1a',
  gradientColors: {
    colors: ['#1a1a1a', '#000000'],
    direction: 'to bottom'
  },
  backgroundImage: undefined,
  imageBlur: 0,
  imageBrightness: 100,
  customCss: undefined
};

export interface ILyric {
  sgc: boolean;
  sfy: boolean;
  qfy: boolean;
  lrc: Lrc;
  klyric: Lrc;
  tlyric: Lrc;
  code: number;
}

interface Lrc {
  version: number;
  lyric: string;
}
