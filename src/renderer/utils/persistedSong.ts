import type { Artist, SongResult } from '@/types/music';

export type MinifiedSong = {
  id: SongResult['id'];
  name: SongResult['name'];
  picUrl: SongResult['picUrl'];
  ar: SongResult['ar'];

  al?: NonNullable<SongResult['al']>;
  source?: SongResult['source'];
  dt?: SongResult['dt'];
  duration?: number;
  qualityBadge?: string;
  quality?: string;
  mimeType?: string;
  bitRate?: number;
  streamUserAgent?: string;
  playMusicUrl?: SongResult['playMusicUrl'];
  expiredAt?: number;
};

export type MusicHistoryItem = MinifiedSong & {
  count: number;
  lastPlayTime?: number;
};

const stripDataUrl = (url: string | undefined): string =>
  !url || url.startsWith('data:') ? '' : url;

export const minifySong = (s: SongResult): MinifiedSong => {
  const artistList = s.ar?.length ? s.ar : s.artists;
  return {
    id: s.id,
    name: s.name,
    picUrl: stripDataUrl(s.picUrl),

    ar: (artistList?.map((a) => ({ id: a.id, name: a.name })) ?? []) as Artist[],

    al: (s.al?.id
      ? {
          id: s.al.id,
          name: s.al.name,
          picUrl: stripDataUrl(s.al.picUrl)
        }
      : undefined) as MinifiedSong['al'],
    source: s.source,
    dt: s.dt,
    duration: (s as any).duration,
    qualityBadge:
      (s as any).qualityBadge === 'LOSSLESS' || (s as any).qualityBadge === 'HI-RES'
        ? (s as any).qualityBadge
        : undefined,
    quality: (s as any).quality,
    mimeType: (s as any).mimeType,
    bitRate: (s as any).bitRate,
    streamUserAgent: (s as any).streamUserAgent,
    playMusicUrl: s.playMusicUrl,
    expiredAt: (s as any).expiredAt
  };
};

export const minifySongList = (list: SongResult[] | undefined): MinifiedSong[] =>
  list?.map(minifySong) ?? [];

export const minifyHistoryEntry = (
  s: SongResult & { count?: number; lastPlayTime?: number }
): MusicHistoryItem => ({
  ...minifySong(s),

  count: s.count ?? 1,
  lastPlayTime: s.lastPlayTime
});

export const minifyHistoryList = (
  list: (SongResult & { count?: number; lastPlayTime?: number })[] | undefined
): MusicHistoryItem[] => list?.map(minifyHistoryEntry) ?? [];

const PIC_KEYS = ['picUrl', 'coverImgUrl', 'coverUrl'] as const;

export const stripBase64Covers = <T extends Record<string, any>>(item: T): T => {
  const result: Record<string, any> = { ...item };
  for (const key of PIC_KEYS) {
    const value = result[key];
    if (typeof value === 'string' && value.startsWith('data:')) {
      result[key] = '';
    }
  }
  return result as T;
};

export const stripBase64CoversList = <T extends Record<string, any>>(list: T[] | undefined): T[] =>
  list?.map(stripBase64Covers) ?? [];
